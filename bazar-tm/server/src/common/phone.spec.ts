import { normalizePhone } from './phone';

describe('normalizePhone', () => {
  it.each([
    ['+993 65 123456', '+99365123456'],
    ['+993 (61) 76-54-32', '+99361765432'],
    ['99371123456', '+99371123456'],
    ['65123456', '+99365123456'],
    [' 12 345678 ', '+99312345678'],
  ])('accepts %s', (input, stored) => {
    expect(normalizePhone(input)).toBe(stored);
  });

  it.each(['', '6512345', '+7 999 1234567', '+993 05 123456', '+993 65 1234567', '65-12-34-5x', 'x'.repeat(40), 12345678])('rejects %s', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});
