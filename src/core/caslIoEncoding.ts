export const CASL_IO_MAX_RECORD_LENGTH = 256;

export function encodeCaslInputRecord(text: string): number[] {
  const words: number[] = [];
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint >= 0x20 && codePoint <= 0x7e) {
      words.push(codePoint);
    } else if (codePoint >= 0xff61 && codePoint <= 0xff9f) {
      words.push(0xa1 + (codePoint - 0xff61));
    } else {
      words.push(0x3f);
    }
    if (words.length === CASL_IO_MAX_RECORD_LENGTH) break;
  }
  return words;
}

export function decodeCaslOutputRecord(words: readonly number[]): string {
  return words.slice(0, CASL_IO_MAX_RECORD_LENGTH).map((word) => {
    const value = word & 0xff;
    if (value >= 0x20 && value <= 0x7e) return String.fromCodePoint(value);
    if (value >= 0xa1 && value <= 0xdf) return String.fromCodePoint(0xff61 + (value - 0xa1));
    return "\ufffd";
  }).join("");
}
