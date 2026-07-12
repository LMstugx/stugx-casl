import type { TranslationKey } from "../i18n/types";
import type { SourceDocument } from "./types";

type Translate = (key: TranslationKey) => string;

export function getDocumentDisplayName(document: SourceDocument, translate: Translate): string {
  if (document.origin === "untitled") return translate("file.untitled");
  return document.fileName ?? document.displayName;
}
