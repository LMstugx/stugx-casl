import { X } from "lucide-react";
import { useI18n } from "../i18n/useI18n";
import type { FileOperationFailureKind } from "../documents/fileAdapter";
import type { TranslationKey } from "../i18n/types";

type FileOperationNoticeProps = {
  failure?: { kind: FileOperationFailureKind } | null;
  notice?: FileOperationNoticeModel | null;
  onDismiss: () => void;
};

export type FileOperationNoticeModel =
  | { type: "failure"; operation: "open" | "save" | "create" | "switch"; failure: { kind: FileOperationFailureKind } }
  | { type: "success"; outcome: "saved" | "saved-copy" | "still-dirty" };

const failureKeys: Record<FileOperationFailureKind, TranslationKey> = {
  permission: "file.permissionDenied",
  unsupported: "file.browserUnsupported",
  "invalid-extension": "file.unsupportedType",
  "invalid-filename": "file.invalidFileName",
  "invalid-encoding": "file.invalidUtf8",
  binary: "file.binaryUnsupported",
  "too-large": "file.tooLarge",
  io: "file.readFailed",
  "stale-target": "file.staleTarget",
  unknown: "file.readFailed"
};

export default function FileOperationNotice({ failure, notice, onDismiss }: FileOperationNoticeProps) {
  const { t } = useI18n();
  const resolved = notice ?? (failure ? { type: "failure" as const, operation: "open" as const, failure } : null);
  if (!resolved) return null;
  const successKey = resolved.type === "success"
    ? resolved.outcome === "saved" ? "file.saved" : resolved.outcome === "saved-copy" ? "file.savedCopy" : "file.changesDuringSaveUnsaved"
    : null;
  const failureTitleKey = resolved.type === "failure"
    ? resolved.operation === "save" ? "file.saveFailed" : resolved.operation === "create" ? "file.createFailed" : resolved.operation === "switch" ? "file.switchFailed" : "file.openFailed"
    : null;
  const title = resolved.type === "success" ? t(successKey!) : t(failureTitleKey!);
  const failureDescriptionKey = resolved.type !== "failure" || resolved.operation === "create" || resolved.operation === "switch"
    ? null
    : resolved.operation === "save" && (resolved.failure.kind === "io" || resolved.failure.kind === "unknown" || resolved.failure.kind === "unsupported")
      ? "file.saveFailed"
      : failureKeys[resolved.failure.kind];
  const description = resolved.type === "success"
    ? resolved.outcome === "saved-copy" ? t("file.downloadCopy") : ""
    : failureDescriptionKey ? t(failureDescriptionKey) : "";
  return (
    <section className={`file-operation-notice ${resolved.type}`} role={resolved.type === "failure" ? "alert" : "status"} aria-live={resolved.type === "success" ? "polite" : undefined} aria-labelledby="file-operation-title" data-testid="file-operation-notice">
      <div>
        <strong id="file-operation-title">{title}</strong>
        {description ? <span>{description}</span> : null}
      </div>
      <button type="button" className="icon-only" onClick={onDismiss} aria-label={t("common.dismiss")} title={t("common.dismiss")}>
        <X size={16} />
      </button>
    </section>
  );
}
