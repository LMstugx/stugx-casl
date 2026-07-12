import { FilePlus2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/useI18n";
import type { DocumentLanguage } from "../documents/types";

type NewDocumentDialogProps = {
  open: boolean;
  initialLanguage: DocumentLanguage;
  onCancel: () => void;
  onCreate: (language: DocumentLanguage) => void;
};

export default function NewDocumentDialog({ open, initialLanguage, onCancel, onCreate }: NewDocumentDialogProps) {
  const { t } = useI18n();
  const [language, setLanguage] = useState<DocumentLanguage>(initialLanguage);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setLanguage(initialLanguage);
    const returnFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => returnFocus?.focus();
  }, [initialLanguage, open]);

  if (!open) return null;
  return (
    <div className="file-dialog-backdrop" data-testid="new-document-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div
        ref={dialogRef}
        className="file-dialog new-document-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-document-title"
        onKeyDown={(event) => trapDialogKeyboard(event, dialogRef.current, onCancel)}
      >
        <div className="file-dialog-heading">
          <FilePlus2 aria-hidden="true" size={20} />
          <h2 id="new-document-title">{t("file.newDocument")}</h2>
        </div>
        <fieldset className="new-document-options">
          <legend className="visually-hidden">{t("file.newDocument")}</legend>
          <label className={language === "casl" ? "selected" : ""}>
            <input type="radio" name="new-document-language" value="casl" checked={language === "casl"} onChange={() => setLanguage("casl")} />
            <span><strong>CASL II</strong><small>{t("file.newCaslDocument")}</small></span>
          </label>
          <label className={language === "cpp" ? "selected" : ""}>
            <input type="radio" name="new-document-language" value="cpp" checked={language === "cpp"} onChange={() => setLanguage("cpp")} />
            <span><strong>C++</strong><small>{t("file.newCppDocument")}</small></span>
          </label>
        </fieldset>
        <div className="file-dialog-actions">
          <button ref={cancelRef} type="button" className="text-button" onClick={onCancel}>{t("common.cancel")}</button>
          <button type="button" className="text-button primary" data-testid="create-document" onClick={() => onCreate(language)}>{t("file.create")}</button>
        </div>
      </div>
    </div>
  );
}

function trapDialogKeyboard(event: React.KeyboardEvent, dialog: HTMLDivElement | null, onCancel: () => void) {
  if (event.key === "Escape") {
    event.preventDefault();
    onCancel();
    return;
  }
  if (event.key !== "Tab") return;
  const controls = Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])') ?? []);
  if (!controls.length) return;
  const current = controls.indexOf(document.activeElement as HTMLElement);
  const next = event.shiftKey ? (current <= 0 ? controls.length - 1 : current - 1) : (current + 1) % controls.length;
  event.preventDefault();
  controls[next].focus();
}
