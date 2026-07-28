import { AlertTriangle, Eraser, Pencil } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { CaslNumericDisplayMode } from "../core/caslNumericFormat";
import { formatCaslWord } from "../core/caslNumericFormat";
import {
  packDebuggerFlags,
  parseDebuggerWord,
  targetDisplayName,
  type DebuggerMemoryCategory,
  type DebuggerMutationResult,
  type DebuggerMutationTarget
} from "../debugger/debuggerMutation";
import { useI18n } from "../i18n/useI18n";

type DebuggerEditDialogProps = {
  target: DebuggerMutationTarget | null;
  currentWord: number;
  numericMode: CaslNumericDisplayMode;
  memoryCategory?: DebuggerMemoryCategory;
  label?: string;
  onCancel: () => void;
  onApply: (target: DebuggerMutationTarget, nextWord: number) => Promise<DebuggerMutationResult>;
};

export function DebuggerEditDialog({
  target,
  currentWord,
  numericMode,
  memoryCategory,
  label,
  onCancel,
  onApply
}: DebuggerEditDialogProps) {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [valueText, setValueText] = useState("");
  const [frFlags, setFrFlags] = useState({ o: false, n: false, z: false, c: false });
  const [programConfirmed, setProgramConfirmed] = useState(false);
  const [error, setError] = useState<"invalid-format" | "out-of-range" | "backend" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!target) return;
    setValueText(formatCaslWord(currentWord, numericMode));
    setFrFlags({
      o: Boolean(currentWord & 0b1000),
      z: Boolean(currentWord & 0b0100),
      c: Boolean(currentWord & 0b0010),
      n: Boolean(currentWord & 0b0001)
    });
    setProgramConfirmed(false);
    setError(null);
    setSubmitting(false);
    const returnFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => returnFocus?.focus();
  }, [currentWord, numericMode, target]);

  if (!target) return null;
  const isFr = target.kind === "flag-register";
  const isProgramWord = target.kind === "memory-word" && memoryCategory === "program";
  const previewWord = isFr ? null : parseDebuggerWord(valueText, numericMode);
  const isUnusualStackPointer = target.kind === "stack-pointer"
    && previewWord?.ok === true
    && previewWord.word < 0x8000;
  const title = target.kind === "memory-word" ? t("caslMode.editMemoryWord") : t("caslMode.editRegister");
  const apply = async () => {
    const parsed = isFr
      ? { ok: true as const, word: packDebuggerFlags(frFlags) }
      : parseDebuggerWord(valueText, numericMode);
    if (!parsed.ok) {
      setError(parsed.reason);
      return;
    }
    if (isProgramWord && !programConfirmed) {
      setError("backend");
      return;
    }
    setSubmitting(true);
    const result = await onApply(target, parsed.word);
    setSubmitting(false);
    if (result.status === "applied") onCancel();
    else setError("backend");
  };

  return (
    <div className="file-dialog-backdrop" data-testid="debugger-edit-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div
        ref={dialogRef}
        className="file-dialog debugger-edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={(event) => trapDialogKeyboard(event, dialogRef.current, onCancel)}
      >
        <div className="file-dialog-heading">
          <Pencil aria-hidden="true" size={19} />
          <div>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>{targetDisplayName(target)}{label ? ` - ${label}` : ""}</p>
          </div>
        </div>

        <dl className="debugger-edit-summary">
          <div><dt>{t("caslMode.currentValue")}</dt><dd><code>{formatCaslWord(currentWord, numericMode)}</code></dd></div>
          <div><dt>{t("caslMode.numberFormat")}</dt><dd>{numericMode}</dd></div>
          {memoryCategory ? <div><dt>{t("caslMode.kind")}</dt><dd>{memoryCategory}</dd></div> : null}
        </dl>

        {isFr ? (
          <fieldset className="debugger-fr-editor">
            <legend>FR</legend>
            {([
              ["o", "OF"],
              ["n", "SF"],
              ["z", "ZF"],
              ["c", "CF"]
            ] as const).map(([flag, label]) => (
              <label key={flag}>
                <input
                  type="checkbox"
                  checked={frFlags[flag]}
                  onChange={(event) => setFrFlags((current) => ({ ...current, [flag]: event.target.checked }))}
                />
                {label}
              </label>
            ))}
          </fieldset>
        ) : (
          <label className="debugger-value-field">
            {t("caslMode.newValue")}
            <input
              value={valueText}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error === "invalid-format" || error === "out-of-range" || undefined}
              aria-describedby={error ? errorId : descriptionId}
              onChange={(event) => {
                setValueText(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void apply();
                }
              }}
            />
          </label>
        )}

        {isProgramWord ? (
          <div className="debugger-program-warning" role="note">
            <AlertTriangle aria-hidden="true" size={18} />
            <div>
              <strong>{t("caslMode.programWord")}</strong>
              <p>{t("caslMode.programWordWarning")}</p>
              <label>
                <input
                  type="checkbox"
                  checked={programConfirmed}
                  onChange={(event) => {
                    setProgramConfirmed(event.target.checked);
                    setError(null);
                  }}
                />
                {t("caslMode.confirmRuntimeOverride")}
              </label>
            </div>
          </div>
        ) : null}

        {isUnusualStackPointer ? (
          <div className="debugger-program-warning debugger-stack-warning" role="note">
            <AlertTriangle aria-hidden="true" size={18} />
            <div>
              <strong>SP</strong>
              <p>{t("caslMode.stackPointerWarning")}</p>
            </div>
          </div>
        ) : null}

        {error ? (
          <p id={errorId} className="debugger-form-error" role="alert">
            {error === "invalid-format"
              ? t("caslMode.invalidNumber")
              : error === "out-of-range"
                ? t("caslMode.valueOutOfRange")
                : isProgramWord && !programConfirmed
                  ? t("caslMode.confirmRuntimeOverride")
                  : t("caslMode.editRejected")}
          </p>
        ) : null}

        <div className="file-dialog-actions">
          <button ref={cancelRef} type="button" className="text-button" disabled={submitting} onClick={onCancel}>{t("common.cancel")}</button>
          <button type="button" className="text-button primary" disabled={submitting || (isProgramWord && !programConfirmed)} onClick={() => void apply()}>
            {t("caslMode.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}

type FullClearDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<boolean>;
};

export function FullClearDialog({ open, onCancel, onConfirm }: FullClearDialogProps) {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    const returnFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => returnFocus?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div className="file-dialog-backdrop" data-testid="full-clear-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <div
        ref={dialogRef}
        className="file-dialog debugger-full-clear-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={(event) => trapDialogKeyboard(event, dialogRef.current, onCancel)}
      >
        <div className="file-dialog-heading">
          <Eraser aria-hidden="true" size={20} />
          <div>
            <h2 id={titleId}>{t("caslMode.confirmFullClear")}</h2>
            <p id={descriptionId}>{t("caslMode.fullClearDescription")}</p>
          </div>
        </div>
        <p className="debugger-clear-source-note">{t("caslMode.fullClearPreservesSource")}</p>
        <div className="file-dialog-actions">
          <button ref={cancelRef} type="button" className="text-button" disabled={submitting} onClick={onCancel}>{t("common.cancel")}</button>
          <button
            type="button"
            className="text-button destructive"
            disabled={submitting}
            onClick={() => {
              setSubmitting(true);
              void onConfirm().then((cleared) => {
                setSubmitting(false);
                if (cleared) onCancel();
              });
            }}
          >
            {t("caslMode.fullClear")}
          </button>
        </div>
      </div>
    </div>
  );
}

function trapDialogKeyboard(
  event: React.KeyboardEvent,
  dialog: HTMLDivElement | null,
  onCancel: () => void
) {
  if (event.key === "Escape") {
    event.preventDefault();
    onCancel();
    return;
  }
  if (event.key !== "Tab") return;
  const controls = Array.from(
    dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])') ?? []
  );
  if (!controls.length) return;
  const current = controls.indexOf(document.activeElement as HTMLElement);
  const next = event.shiftKey
    ? (current <= 0 ? controls.length - 1 : current - 1)
    : (current + 1) % controls.length;
  event.preventDefault();
  controls[next].focus();
}
