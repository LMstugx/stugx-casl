import { formatWord, word } from "./types";

export type CaslNumericDisplayMode = "hex" | "signed" | "unsigned" | "binary";

export function signedWordValue(value: number): number {
  const normalized = word(value);
  return (normalized & 0x8000) !== 0 ? normalized - 0x10000 : normalized;
}

export function formatCaslWord(value: number, mode: CaslNumericDisplayMode): string {
  const normalized = word(value);
  if (mode === "hex") return `#${formatWord(normalized)}`;
  if (mode === "signed") return String(signedWordValue(normalized));
  if (mode === "unsigned") return String(normalized);
  return normalized.toString(2).padStart(16, "0").replace(/(.{4})(?=.)/g, "$1 ");
}
