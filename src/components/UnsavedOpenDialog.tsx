import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "../i18n/useI18n";

type UnsavedOpenDialogProps = {
  open: boolean;
  displayName: string;
  onCancel: () => void;
  onDiscard: () => void;
};

export default function UnsavedOpenDialog({ open, displayName, onCancel, onDiscard }: UnsavedOpenDialogProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="file-dialog-backdrop"
      data-testid="unsaved-open-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className="file-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-open-title"
        aria-describedby="unsaved-open-description"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
            return;
          }
          if (event.key !== "Tab") return;
          const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? []);
          if (!controls.length) return;
          const current = controls.indexOf(document.activeElement as HTMLElement);
          const next = event.shiftKey ? (current <= 0 ? controls.length - 1 : current - 1) : (current + 1) % controls.length;
          event.preventDefault();
          controls[next].focus();
        }}
      >
        <div className="file-dialog-heading">
          <AlertTriangle aria-hidden="true" size={20} />
          <div>
            <h2 id="unsaved-open-title">{t("file.unsavedTitle")}</h2>
            <p id="unsaved-open-description">{t("file.changesWillBeLost", { fileName: displayName })}</p>
          </div>
        </div>
        <div className="file-dialog-actions">
          <button ref={cancelRef} type="button" className="text-button" onClick={onCancel}>{t("common.cancel")}</button>
          <button type="button" className="text-button destructive" data-testid="discard-and-open" onClick={onDiscard}>
            {t("file.discardAndOpen")}
          </button>
        </div>
      </div>
    </div>
  );
}
