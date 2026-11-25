/**
 * Turkmen phone numbers. Accepts "+993 65 123456", "993 65-12-34-56" or the 8 local digits "65123456".
 * Returns the stored form "+99365123456", or null when the number is not a valid Turkmen number.
 * The same rule is used in the app (lib/features/cart/checkout_sheet.dart).
 */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 32) return null;
  if (/[^\d\s+()-]/.test(input)) return null;
  const digits = input.replace(/\D/g, '');
  let local: string | null = null;
  if (digits.length === 11 && digits.startsWith('993')) local = digits.slice(3);
  else if (digits.length === 8) local = digits;
  if (!local || local.startsWith('0')) return null;
  return `+993${local}`;
}
