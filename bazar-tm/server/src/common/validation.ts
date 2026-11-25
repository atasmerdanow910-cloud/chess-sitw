import { Transform } from 'class-transformer';

/** Trims surrounding spaces of string fields before validation. */
export const Trim = () => Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Names and titles: letters, digits, punctuation and spaces, but no control or invisible characters. */
export const PRINTABLE = /^[^\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+$/u;
