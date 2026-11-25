import { CanActivate, ExecutionContext, HttpStatus, Inject, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import Redis from 'ioredis';
import { ApiError } from './api-error';
import type { AuthUser } from './auth-user';

/** Counters with a time window. Memory for one server; Redis when several servers share the limits. */
export interface RateLimitStore {
  /** Counts one more hit and returns the number of hits in the current window. */
  hit(key: string, windowMs: number): Promise<number>;
  /** Hits in the current window without counting a new one. */
  peek(key: string): Promise<number>;
  reset(key: string): Promise<void>;
  close?(): Promise<void>;
}

export const RATE_LIMIT_STORE = Symbol('RATE_LIMIT_STORE');

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  private hits = 0;

  async hit(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    if (++this.hits % 1000 === 0) this.sweep(now);
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return 1;
    }
    bucket.count += 1;
    return bucket.count;
  }

  async peek(key: string): Promise<number> {
    const bucket = this.buckets.get(key);
    return bucket && bucket.resetAt > Date.now() ? bucket.count : 0;
  }

  async reset(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  private sweep(now: number): void {
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
  }
}

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: Redis) {}

  async hit(key: string, windowMs: number): Promise<number> {
    const k = `rl:${key}`;
    // INCR and set the expiry only when the window starts (PEXPIRE ... NX), in one round trip.
    const result = await this.redis.multi().incr(k).pexpire(k, windowMs, 'NX').exec();
    return Number(result?.[0]?.[1] ?? 1);
  }

  async peek(key: string): Promise<number> {
    return Number((await this.redis.get(`rl:${key}`)) ?? 0);
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`rl:${key}`);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

export interface RateLimitRule {
  /** Bucket name, e.g. "auth". */
  name: string;
  limit: number;
  windowMs: number;
}

const RATE_LIMIT_KEY = 'bazar:rate-limit';

/** Limits requests per client IP (and per user when signed in). Mobile networks share IPs, so limits are generous. */
export const RateLimit = (rule: RateLimitRule) => SetMetadata(RATE_LIMIT_KEY, rule);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rule = this.reflector.getAllAndOverride<RateLimitRule | undefined>(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
    if (!rule) return true;
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const who = req.user ? `u:${req.user.id}` : `ip:${req.ip ?? 'unknown'}`;
    const count = await this.store.hit(`${rule.name}:${who}`, rule.windowMs);
    if (count > rule.limit) {
      throw new ApiError('too_many_requests', HttpStatus.TOO_MANY_REQUESTS, 'Too many requests, try again later', {
        retryAfterSeconds: Math.ceil(rule.windowMs / 1000),
      });
    }
    return true;
  }
}
