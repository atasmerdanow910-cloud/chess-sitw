import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const passwords = new PasswordService();

  it('hashes with Argon2id and verifies', async () => {
    const hashed = await passwords.hash('Bazar-test-2026');
    expect(hashed).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(await passwords.verify(hashed, 'Bazar-test-2026')).toBe(true);
    expect(await passwords.verify(hashed, 'bazar-test-2026')).toBe(false);
    expect(await passwords.verify('not-a-hash', 'x')).toBe(false);
  });

  it.each([
    ['1234567', 'too_short'],
    ['aaaaaaaa', 'one_character'],
    ['Password', 'too_common'],
    ['12345678', 'too_common'],
    ['65123456', 'is_phone'],
  ])('calls %s weak (%s)', (password, reason) => {
    expect(passwords.weakness(password, '+99365123456')).toBe(reason);
  });

  it('accepts reasonable passwords, digits included', () => {
    expect(passwords.weakness('Merjen2026')).toBeNull();
    expect(passwords.weakness('48151623')).toBeNull();
  });

  it('makes temporary passwords that pass its own rules', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const t = passwords.temporary();
      expect(t).toMatch(/^[a-hjkmnp-z2-9]{10}$/);
      expect(passwords.weakness(t)).toBeNull();
      seen.add(t);
    }
    expect(seen.size).toBe(50);
  });
});
