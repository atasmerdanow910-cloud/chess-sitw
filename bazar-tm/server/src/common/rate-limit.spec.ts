import Redis from 'ioredis';
import { MemoryRateLimitStore, RateLimitStore, RedisRateLimitStore } from './rate-limit';

async function behavesLikeAWindow(store: RateLimitStore, key: string): Promise<void> {
  expect(await store.peek(key)).toBe(0);
  expect(await store.hit(key, 200)).toBe(1);
  expect(await store.hit(key, 200)).toBe(2);
  expect(await store.peek(key)).toBe(2);
  await new Promise((r) => setTimeout(r, 260));
  expect(await store.peek(key)).toBe(0);
  expect(await store.hit(key, 200)).toBe(1);
  await store.reset(key);
  expect(await store.peek(key)).toBe(0);
}

describe('rate limit stores', () => {
  it('memory store counts within a window and forgets after it', async () => {
    await behavesLikeAWindow(new MemoryRateLimitStore(), 'k1');
  });

  const redisUrl = process.env.TEST_REDIS_URL;
  (redisUrl ? it : it.skip)('Redis store behaves the same (TEST_REDIS_URL)', async () => {
    const store = new RedisRateLimitStore(new Redis(redisUrl!));
    try {
      await behavesLikeAWindow(store, `test-${Date.now()}`);
    } finally {
      await store.close();
    }
  });
});
