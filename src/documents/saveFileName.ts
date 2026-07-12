import type { DocumentExtension, DocumentLanguage } from "./types";
import { extensionFromFileName, languageToExtension, safeDisplayFileName } from "./validation";

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

export function defaultFileNameForLanguage(language: DocumentLanguage): string {
  return language === "casl" ? "main.cas" : "main.cpp";
}

export function sanitizeSuggestedFileName(input: string | null | undefined, language: DocumentLanguage): string {
  const basename = safeDisplayFileName(input ?? "")
    .replace(/[<>:"|?*]/g, "")
    .replace(/[. ]+$/g, "")
    .trim();
  if (!basename || basename === "." || basename === ".." || WINDOWS_RESERVED.test(basename)) {
    return defaultFileNameForLanguage(language);
  }
  const expected = languageToExtension(language);
  const extension = extensionFromFileName(basename);
  return extension ? basename : `${basename}${expected}`;
}

export function ensureExpectedExtension(fileName: string, language: DocumentLanguage): string | null {
  const sanitized = sanitizeSuggestedFileName(fileName, language);
  const extension = extensionFromFileName(sanitized);
  return extension === languageToExtension(language) ? sanitized : null;
}

export function validateSavedFileName(fileName: string, language: DocumentLanguage): { fileName: string; extension: DocumentExtension } | null {
  const normalized = ensureExpectedExtension(fileName, language);
  if (!normalized) return null;
  return { fileName: normalized, extension: languageToExtension(language) };
}
