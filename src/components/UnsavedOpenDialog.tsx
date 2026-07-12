import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "../i18n/useI18n";
import type { SourceReplacementIntent } from "../documents/replacementIntent";

type UnsavedOpenDialogProps = {
  open: boolean;
  displayName: string;
  onCancel: () => void;
  onDiscard: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  intent?: SourceReplacementIntent;
};

export default function UnsavedOpenDialog({ open, displayName, onCancel, onDiscard, onSave, isSaving = false, intent = { kind: "open-file" } }: UnsavedOpenDialogProps) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const returnFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      returnFocus?.focus();
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
            <h2 id="unsaved-open-title">{t("file.unsavedChanges")}</h2>
            <p id="unsaved-open-description">{intent.kind === "open-file" ? t("file.changesWillBeLost", { fileName: displayName }) : t("file.unsavedChangesWillBeLost")}</p>
          </div>
        </div>
        <div className="file-dialog-actions">
          <button ref={cancelRef} type="button" className="text-button" disabled={isSaving} onClick={onCancel}>{t("common.cancel")}</button>
          {onSave ? <button type="button" className="text-button primary" data-testid="save-and-open" data-replacement-action="save" disabled={isSaving} aria-busy={isSaving || undefined} onClick={onSave}>{isSaving ? t("file.saving") : t(saveActionKey(intent))}</button> : null}
          <button type="button" className="text-button destructive" data-testid="discard-and-open" disabled={isSaving} onClick={onDiscard}>
            {t(discardActionKey(intent))}
          </button>
        </div>
      </div>
    </div>
  );
}

function saveActionKey(intent: SourceReplacementIntent): "file.saveAndOpen" | "file.saveAndCreate" | "file.saveAndSwitch" {
  if (intent.kind === "new-document") return "file.saveAndCreate";
  if (intent.kind === "select-example") return "file.saveAndSwitch";
  return "file.saveAndOpen";
}

function discardActionKey(intent: SourceReplacementIntent): "file.discardAndOpen" | "file.discardAndCreate" | "file.discardAndSwitch" {
  if (intent.kind === "new-document") return "file.discardAndCreate";
  if (intent.kind === "select-example") return "file.discardAndSwitch";
  return "file.discardAndOpen";
}
