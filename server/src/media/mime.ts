/**
 * Detects the real file type from its first bytes ("magic numbers").
 * We never trust the file name or the Content-Type sent by the phone.
 */
export type Detected =
  | { kind: 'image'; mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' }
  | { kind: 'video'; mime: 'video/mp4' | 'video/webm' | 'video/3gpp' | 'video/quicktime' }
  | { kind: 'audio'; mime: 'audio/mp4' | 'audio/ogg' | 'audio/webm' | 'audio/mpeg' | 'audio/aac' };

const ascii = (buf: Buffer, start: number, end: number) => buf.subarray(start, end).toString('latin1');

export function detectMime(buf: Buffer): Detected | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: 'image', mime: 'image/jpeg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { kind: 'image', mime: 'image/png' };
  }
  if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WEBP') return { kind: 'image', mime: 'image/webp' };
  if (ascii(buf, 0, 4) === 'OggS') return { kind: 'audio', mime: 'audio/ogg' };
  if (ascii(buf, 0, 3) === 'ID3') return { kind: 'audio', mime: 'audio/mpeg' };
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
    // Frame sync: layer bits 00 mean AAC (ADTS), otherwise MP3.
    const layer = (buf[1] >> 1) & 0x03;
    return layer === 0 ? { kind: 'audio', mime: 'audio/aac' } : { kind: 'audio', mime: 'audio/mpeg' };
  }
  if (buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    // Matroska/WebM: voice notes are usually audio-only webm; treat by declared purpose later.
    return { kind: 'video', mime: 'video/webm' };
  }
  if (ascii(buf, 4, 8) === 'ftyp') {
    const brand = ascii(buf, 8, 12);
    if (/^(heic|heix|heim|heis|mif1|msf1)$/.test(brand)) return { kind: 'image', mime: 'image/heic' };
    if (/^M4A|^M4B/.test(brand)) return { kind: 'audio', mime: 'audio/mp4' };
    if (/^3g/.test(brand)) return { kind: 'video', mime: 'video/3gpp' };
    if (brand === 'qt  ') return { kind: 'video', mime: 'video/quicktime' };
    return { kind: 'video', mime: 'video/mp4' };
  }
  return null;
}
