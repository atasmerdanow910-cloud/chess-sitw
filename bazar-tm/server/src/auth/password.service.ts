import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { randomInt } from 'node:crypto';

const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '87654321',
  '11111111',
  '00000000',
  '12341234',
  'password',
  'password1',
  'qwerty123',
  'qwertyui',
  'iloveyou',
  'parol123',
  'turkmenistan',
]);

/**
 * Passwords are stored only as Argon2id hashes (OWASP parameters: 19 MiB, 2 passes).
 * A dummy check runs for unknown phones, so response time does not reveal who is registered.
 */
@Injectable()
export class PasswordService {
  private dummyHash: Promise<string> | null = null;

  hash(password: string): Promise<string> {
    return hash(password);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  /** Spends the same time as a real check. Always false. */
  async verifyDummy(password: string): Promise<false> {
    this.dummyHash ??= hash('bazar-tm-timing-equalizer');
    await this.verify(await this.dummyHash, password);
    return false;
  }

  /** Returns why a password is too weak, or null when it is fine. */
  weakness(password: string, phone?: string | null): string | null {
    if (password.length < 8) return 'too_short';
    if (password.length > 128) return 'too_long';
    if (/^(.)\1+$/.test(password)) return 'one_character';
    if (COMMON_PASSWORDS.has(password.toLowerCase())) return 'too_common';
    const digits = password.replace(/\D/g, '');
    if (phone && digits.length >= 8 && digits === password && phone.replace(/\D/g, '').endsWith(digits)) return 'is_phone';
    return null;
  }

  /** Temporary password the owner gives to a user who forgot theirs (no look-alike characters). */
  temporary(): string {
    const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 10; i++) out += alphabet[randomInt(alphabet.length)];
    return out;
  }
}
