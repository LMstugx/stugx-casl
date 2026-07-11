import { X } from "lucide-react";
import { useI18n } from "../i18n/useI18n";
import type { FileOperationFailureKind } from "../documents/fileAdapter";
import type { TranslationKey } from "../i18n/types";

type FileOperationNoticeProps = {
  failure: { kind: FileOperationFailureKind } | null;
  onDismiss: () => void;
};

const failureKeys: Record<FileOperationFailureKind, TranslationKey> = {
  permission: "file.readFailed",
  unsupported: "file.browserUnsupported",
  "invalid-extension": "file.unsupportedType",
  "invalid-encoding": "file.invalidUtf8",
  binary: "file.binaryUnsupported",
  "too-large": "file.tooLarge",
  io: "file.readFailed",
  unknown: "file.readFailed"
};

export default function FileOperationNotice({ failure, onDismiss }: FileOperationNoticeProps) {
  const { t } = useI18n();
  if (!failure) return null;
  return (
    <section className="file-operation-notice" role="alert" aria-labelledby="file-failure-title" data-testid="file-operation-notice">
      <div>
        <strong id="file-failure-title">{t("file.openFailed")}</strong>
        <span>{t(failureKeys[failure.kind])}</span>
      </div>
      <button type="button" className="icon-only" onClick={onDismiss} aria-label={t("common.dismiss")} title={t("common.dismiss")}>
        <X size={16} />
      </button>
    </section>
  );
}
