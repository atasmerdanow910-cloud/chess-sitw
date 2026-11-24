/**
 * Normalizes a Turkmenistan phone number to "+993XXXXXXXX".
 * Accepts "+993 65 123456", "99365123456", "8 65 123456", "65123456".
 * Returns null if it is not a valid number.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  let national: string | null = null;
  if (digits.length === 11 && digits.startsWith('993')) national = digits.slice(3);
  else if (digits.length === 9 && digits.startsWith('8')) national = digits.slice(1);
  else if (digits.length === 8) national = digits;
  if (!national || !/^[1-9]\d{7}$/.test(national)) return null;
  return `+993${national}`;
}

/** "+99365123456" -> "+993 65 ** ** 56" for places where the full number is not needed. */
export function maskPhone(phone: string): string {
  if (phone.length < 12) return phone;
  return `${phone.slice(0, 4)} ${phone.slice(4, 6)} ** ** ${phone.slice(-2)}`;
}
