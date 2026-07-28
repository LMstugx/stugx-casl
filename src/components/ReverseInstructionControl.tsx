import { Undo2 } from "lucide-react";
import { useRef } from "react";
import type {
  ReverseInstructionAvailability,
  ReverseInstructionStatus
} from "../core/reverseInstruction";
import type { TranslationKey } from "../i18n/types";
import { useI18n } from "../i18n/useI18n";
import { formatWord } from "../core/types";

const REASON_KEYS: Readonly<Record<ReverseInstructionAvailability["reason"], TranslationKey>> = {
  available: "reverseInstruction.description",
  "no-history": "reverseInstruction.unavailable",
  running: "cometMode.reverse.running",
  "waiting-input": "cometMode.reverse.io",
  "svc-boundary": "cometMode.reverse.svc",
  "io-boundary": "cometMode.reverse.io",
  "mutation-boundary": "cometMode.reverse.mutation",
  "reset-boundary": "cometMode.reverse.reset",
  "reload-boundary": "cometMode.reverse.reload",
  "full-clear-boundary": "cometMode.reverse.fullClear",
  "assembly-boundary": "reverseInstruction.unavailable",
  "source-replacement-boundary": "reverseInstruction.unavailable",
  "history-capacity-boundary": "cometMode.reverse.capacity",
  "history-epoch-mismatch": "cometMode.reverse.otherExecution",
  "execution-epoch-mismatch": "cometMode.reverse.otherExecution",
  "timeline-revision-mismatch": "cometMode.reverse.otherExecution",
  "runtime-not-loaded": "reverseInstruction.unavailable",
  "partial-instruction-history": "reverseInstruction.partial",
  "history-corrupt": "cometMode.reverse.corrupt"
};

type ReverseInstructionNotice = {
  machineAddress?: number;
  mnemonic?: string;
  reversedMicrostepCount: number;
};

type ReverseInstructionControlProps = {
  availability: ReverseInstructionAvailability;
  reverseInFlight?: boolean;
  notice?: ReverseInstructionNotice | null;
  onReverse?: () => Promise<ReverseInstructionStatus>;
};

export default function ReverseInstructionControl({
  availability,
  reverseInFlight = false,
  notice = null,
  onReverse
}: ReverseInstructionControlProps) {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const disabled = reverseInFlight || !availability.available || !onReverse;
  const reason = reverseInFlight
    ? t("cometMode.reverse.running")
    : t(REASON_KEYS[availability.reason]);
  const noticeText = notice
    ? notice.machineAddress !== undefined && notice.mnemonic
      ? t("reverseInstruction.reversedAt", {
          address: formatWord(notice.machineAddress),
          mnemonic: notice.mnemonic
        })
      : t("reverseInstruction.reversed")
    : "";

  const handleReverse = async () => {
    if (disabled) return;
    const status = await onReverse?.();
    if (status !== "reversed") return;
    requestAnimationFrame(() => {
      if (!buttonRef.current?.disabled) buttonRef.current?.focus();
    });
  };

  return (
    <div className="reverse-instruction-control">
      <button
        ref={buttonRef}
        type="button"
        className="secondary-button reverse-instruction-button"
        data-testid="reverse-instruction-button"
        disabled={reverseInFlight}
        aria-disabled={disabled}
        aria-describedby="reverse-instruction-reason"
        onClick={() => void handleReverse()}
      >
        <Undo2 size={17} aria-hidden="true" />
        <span>{t("reverseInstruction.label")}</span>
      </button>
      <span id="reverse-instruction-reason" className="reverse-instruction-reason">
        {reason}
      </span>
      <p
        className="reverse-instruction-live"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="reverse-instruction-notice"
      >
        {noticeText}
      </p>
    </div>
  );
}
