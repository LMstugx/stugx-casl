import { useEffect, useMemo, useRef, useState } from "react";
import { selectGeneratedCaslRows } from "../core/generatedCaslRows";
import { selectMachineCodeRows } from "../core/machineCodeRows";
import type { CometState } from "../core/types";
import { VisualPathKind, formatFlags, formatWord } from "../core/types";
import type { ObservationMode, SourceMode } from "../store/useAppStore";
import type { CppStorageObject, CppToCaslMap } from "../transpiler/cppAst";
import { cppLineForCaslLine } from "../transpiler/cppMapping";
import { doubleOperationForCaslLine, resolveCppStorageObjects, type DoubleOperationContext } from "../transpiler/cppStorageObjects";
import {
  currentStaticLabelForMapping,
  findFrameSlotMappingInCaslText,
  frameSlotMappingsForSourceLine,
  selectStackFramePreviewState,
  stackFramePreviewMappings,
  type FrameSlotMapping,
  type FrameSlotPreview,
  type StackFramePreviewState
} from "../transpiler/framePlanView";
import CometCircuitSvg from "../visual/CometCircuitSvg";
import { summarizeCurrentInstruction } from "../visual/visualState";
import RegisterPanel from "./RegisterPanel";
import { handleHorizontalTabListKeyDown } from "./tabKeyboard";
import { translateRunState } from "../i18n/locale";
import { useI18n } from "../i18n/useI18n";
import type { Translate, TranslationKey } from "../i18n/types";

type TimelineItem = {
  key: string;
  index: number;
  label: string;
  phase: string;
};

type CircuitFocusLayoutProps = {
  state: CometState;
  sourceMode: SourceMode;
  sourceText: string;
  generatedCaslSource: string;
  cppToCaslMapping: CppToCaslMap[];
  cppStorageObjects?: CppStorageObject[];
  isSourceDirty: boolean;
  timelineItems: TimelineItem[];
  observationMode?: ObservationMode;
  onObservationModeChange?: (mode: ObservationMode) => void;
  initialSelectedFrameSlotId?: string;
  initialSelectionSource?: FrameSlotSelectionSource;
};

const observationModes: Array<{ id: ObservationMode; labelKey: TranslationKey; summary: string }> = [
  { id: "cpu-flow", labelKey: "observation.cpuFlow", summary: "Circuit / active path / main memory" },
  { id: "register-stack", labelKey: "observation.registerStack", summary: "GR, PR, SP, FR, stack, memory" },
  { id: "code-machine", labelKey: "observation.codeMachine", summary: "Source, CASL, machine code, trace" }
];

type FocusInstructionContext = {
  caslLine?: number;
  cppLine?: number;
  address?: number;
  instructionText?: string;
  nextInstructionText?: string;
  sourceText: string;
  pipelineStage: string;
};

type FocusPanelDensity = "normal" | "compact";

type FrameSlotSelectionSource = "stack-frame-view" | "source-context" | "source-editor" | "generated-casl";

type SelectedFrameSlot = {
  mappingId: string;
  functionName: string;
  slotName: string;
  symbolName: string;
  sourceLine?: number;
  staticLabel?: string;
  selectionSource: FrameSlotSelectionSource;
};

function sourceLine(source: string, line?: number): string {
  if (!line) return "No active source line";
  return source.split(/\r?\n/)[line - 1]?.trim() || "No active source line";
}

function compactInstructionText(text?: string): string | undefined {
  return text?.replace(/\s+/g, " ").trim();
}

function instructionMnemonic(text: string | undefined, fallback: string): string {
  const match = /\b(NOP|LD|LAD|ST|ADDA|SUBA|ADDL|SUBL|AND|OR|XOR|CPA|CPL|SLA|SRA|SLL|SRL|PUSH|POP|CALL|JUMP|JZE|JNZ|JPL|JMI|JOV|RET)\b/i.exec(text ?? "");
  return match?.[1]?.toUpperCase() ?? fallback;
}

function addressOperandLabel(target: string, index?: string): string {
  return index ? `${target}+${index}` : target;
}

function instructionMeaning(text: string | undefined, fallback: string, visualPath: VisualPathKind | undefined, t?: Translate): string {
  const compact = (text ?? "").replace(/\s+/g, " ").trim();
  const [mnemonic = "", operand = ""] = compact.split(/\s+/, 2);
  const [register = "", target = "", index = ""] = operand.split(",").map((part) => part.trim());
  const addressOperand = addressOperandLabel(target, index);

  switch (mnemonic.toUpperCase()) {
    case "LD":
      return `${register} <- memory[${addressOperand}]`;
    case "LAD":
      return `${register} <- address ${addressOperand}`;
    case "ST":
      return `memory[${addressOperand}] <- ${register}`;
    case "ADDA":
    case "ADDL":
      return `${register} <- ${register} + ${addressOperand}`;
    case "SUBA":
    case "SUBL":
      return `${register} <- ${register} - ${addressOperand}`;
    case "AND":
    case "OR":
    case "XOR":
      return `${register} <- ${register} ${mnemonic.toUpperCase()} ${addressOperand}`;
    case "CPA":
    case "CPL":
      return `FR <- compare ${register}, ${addressOperand}`;
    case "SLA":
    case "SRA":
    case "SLL":
    case "SRL":
      return `${register} <- ${mnemonic.toUpperCase()} ${register} by ${addressOperand}`;
    case "PUSH":
      return `stack[--SP] <- effective address ${addressOperand}`;
    case "POP":
      return `${register} <- memory[SP]; SP++`;
    case "CALL":
      return `stack[--SP] <- return address; PR <- ${addressOperand}`;
    case "JUMP":
      return `PR <- ${operand}`;
    case "JZE":
    case "JNZ":
    case "JPL":
    case "JMI":
    case "JOV":
      return `conditional PR <- ${operand}`;
    case "RET":
      return visualPath === VisualPathKind.RET_StackToPr ? "PR <- memory[SP]; SP++" : t?.("instruction.finishExecution") ?? "finish execution";
    case "NOP":
      return "sequential execution";
    default:
      return fallback;
  }
}

function timelineStageIndex(state: CometState): number {
  if (!state.assembled || state.runState === "Dirty" || state.runState === "Idle") return 0;
  if (state.runState === "Finished") return 5;
  if (state.visualPath === VisualPathKind.Ready_PrToMar) return 0;
  if (state.visualPath === VisualPathKind.LD_MemoryToMdrToGr) return 2;
  if (state.visualPath === VisualPathKind.ST_GrToMdrToMemory) return 4;
  if (state.visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || state.visualPath === VisualPathKind.POP_StackToGr || state.visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr || state.visualPath === VisualPathKind.RET_StackToPr) return 4;
  if (
    state.visualPath === VisualPathKind.ADDA_GrMdrToAluToGr ||
    state.visualPath === VisualPathKind.SUBA_GrMdrToAluToGr ||
    state.visualPath === VisualPathKind.CPA_GrMdrToAluToFr ||
    state.visualPath === VisualPathKind.Shift_AddressToAluToGr
  ) {
    return 3;
  }
  if (state.visualPath === VisualPathKind.Jump_AddressToPr || state.visualPath === VisualPathKind.ConditionalJump_AddressToPr || state.visualPath === VisualPathKind.ConditionalJump_NotTaken) {
    return 5;
  }
  return 1;
}

function pipelineStageLabel(state: CometState): string {
  return ["Fetch", "Decode", "Operand Read", "Execute", "Write Back", "Next"][timelineStageIndex(state)] ?? "Fetch";
}

const pipelineStageKeys: TranslationKey[] = [
  "timeline.fetch",
  "timeline.decode",
  "timeline.operandRead",
  "timeline.execute",
  "timeline.writeBack",
  "timeline.next"
];

function translatedPipelineStage(t: Translate, state: CometState): string {
  return t(pipelineStageKeys[timelineStageIndex(state)] ?? "timeline.fetch");
}

function activeVisualPath(state: CometState): VisualPathKind {
  return state.lastStep?.visualPath ?? state.visualPath ?? VisualPathKind.None;
}

function isAluVisualPath(visualPath: VisualPathKind): boolean {
  return visualPath === VisualPathKind.ADDA_GrMdrToAluToGr || visualPath === VisualPathKind.SUBA_GrMdrToAluToGr || visualPath === VisualPathKind.CPA_GrMdrToAluToFr || visualPath === VisualPathKind.Shift_AddressToAluToGr;
}

function activeRegisterIndexFromInstruction(instructionText?: string): number | undefined {
  const match = /GR([0-7])/i.exec(instructionText ?? "");
  return match ? Number(match[1]) : undefined;
}

function activeMemoryAddress(state: CometState): number | undefined {
  if (activeVisualPath(state) === VisualPathKind.Shift_AddressToAluToGr) return undefined;
  return state.lastMemoryWriteAddress ?? state.lastMemoryReadAddress ?? state.changedMemoryAddresses[0] ?? state.mar;
}

function traceChangeText(event: CometState["trace"][number]): string {
  if (event.instruction === "CALL") {
    const target = event.effectiveAddress !== undefined ? formatWord(event.effectiveAddress) : "----";
    const returnAddress = event.returnAddress !== undefined ? formatWord(event.returnAddress) : "----";
    const stackAddress = event.stackAddress !== undefined ? formatWord(event.stackAddress) : "SP";
    const sp =
      event.stackPointerValueBefore !== undefined && event.stackPointerValueAfter !== undefined
        ? `${formatWord(event.stackPointerValueBefore)} -> ${formatWord(event.stackPointerValueAfter)}`
        : "updated";
    const depth =
      event.callDepthBefore !== undefined && event.callDepthAfter !== undefined
        ? `${event.callDepthBefore} -> ${event.callDepthAfter}`
        : "updated";
    return `CALL target ${target}; return ${returnAddress}; SP ${sp}; MEM[${stackAddress}] write; callDepth ${depth}`;
  }
  if (event.instruction === "RET") {
    if (event.visualPath === VisualPathKind.RET_StackToPr || event.changedMemoryAddress !== undefined) {
      const stackAddress = event.stackAddress ?? event.changedMemoryAddress;
      const returnAddress = event.returnAddress ?? event.pr;
      const sp =
        event.stackPointerValueBefore !== undefined && event.stackPointerValueAfter !== undefined
          ? `${formatWord(event.stackPointerValueBefore)} -> ${formatWord(event.stackPointerValueAfter)}`
          : "updated";
      const depth =
        event.callDepthBefore !== undefined && event.callDepthAfter !== undefined
          ? `${event.callDepthBefore} -> ${event.callDepthAfter}`
          : "updated";
      return `RET stack return; MEM[${stackAddress !== undefined ? formatWord(stackAddress) : "SP"}] -> PR ${returnAddress !== undefined ? formatWord(returnAddress) : "----"}; SP ${sp}; callDepth ${depth}`;
    }
    return "RET top-level finish; no stack access";
  }
  if (event.instruction === "PUSH" || event.instruction === "POP") {
    return event.detail;
  }
  if (event.changedRegister) {
    if (event.changedRegisterValueBefore !== undefined && event.changedRegisterValueAfter !== undefined) {
      return `${event.changedRegister}: ${formatWord(event.changedRegisterValueBefore)} -> ${formatWord(event.changedRegisterValueAfter)}`;
    }
    return `${event.changedRegister} updated`;
  }
  if (event.changedMemoryAddress !== undefined) {
    if (event.changedMemoryValueBefore !== undefined && event.changedMemoryValueAfter !== undefined) {
      return `MEM[${formatWord(event.changedMemoryAddress)}]: ${formatWord(event.changedMemoryValueBefore)} -> ${formatWord(event.changedMemoryValueAfter)}`;
    }
    return `MEM[${formatWord(event.changedMemoryAddress)}] updated`;
  }
  return event.visualPath ?? "control";
}

function traceMainEvent(event: CometState["trace"][number]): string {
  const source = compactInstructionText(event.source);
  if (event.instruction === "RET" && event.visualPath === VisualPathKind.RET_StackToPr) return `#${event.index} RET stack return`;
  if (event.instruction === "RET") return `#${event.index} RET finish`;
  if (source) return `#${event.index} ${source}`;
  return `#${event.index} ${event.instruction} PR ${formatWord(event.pr ?? event.address)}`;
}

function tracePrimaryEffect(event: CometState["trace"][number]): string {
  if (event.instruction === "CALL") {
    const target = event.effectiveAddress !== undefined ? formatWord(event.effectiveAddress) : "----";
    const returnAddress = event.returnAddress !== undefined ? formatWord(event.returnAddress) : "----";
    return `target ${target}; return ${returnAddress}`;
  }
  if (event.instruction === "RET" && event.visualPath === VisualPathKind.RET_StackToPr) {
    const stackAddress = event.stackAddress ?? event.changedMemoryAddress;
    const returnAddress = event.returnAddress ?? event.pr;
    return `PR <- MEM[${stackAddress !== undefined ? formatWord(stackAddress) : "SP"}] ${returnAddress !== undefined ? formatWord(returnAddress) : "----"}`;
  }
  if (event.instruction === "RET") return "program finished";
  if (event.changedRegister) {
    const before = event.changedRegisterValueBefore === undefined ? "----" : formatWord(event.changedRegisterValueBefore);
    const after = event.changedRegisterValueAfter === undefined ? "----" : formatWord(event.changedRegisterValueAfter);
    return `${event.changedRegister}: ${before} -> ${after}`;
  }
  if (event.changedMemoryAddress !== undefined) {
    const before = event.changedMemoryValueBefore === undefined ? "----" : formatWord(event.changedMemoryValueBefore);
    const after = event.changedMemoryValueAfter === undefined ? "----" : formatWord(event.changedMemoryValueAfter);
    return `MEM[${formatWord(event.changedMemoryAddress)}]: ${before} -> ${after}`;
  }
  return event.detail || event.visualPath || "sequential";
}

function traceSecondaryNote(event: CometState["trace"][number]): string {
  const notes: string[] = [];
  if (event.stackPointerValueBefore !== undefined && event.stackPointerValueAfter !== undefined) {
    notes.push(`SP: ${formatWord(event.stackPointerValueBefore)} -> ${formatWord(event.stackPointerValueAfter)}`);
  }
  if (event.callDepthBefore !== undefined && event.callDepthAfter !== undefined) {
    notes.push(`callDepth: ${event.callDepthBefore} -> ${event.callDepthAfter}`);
  }
  if (event.runState) notes.push(`State: ${event.runState}`);
  return notes.join(" | ") || event.visualPath || "No secondary effect";
}

function focusInstructionContext(state: CometState, sourceMode: SourceMode, sourceText: string, cppToCaslMapping: CppToCaslMap[]): FocusInstructionContext {
  const caslLine = state.lastStep?.executedLine ?? state.currentLine;
  const address = state.lastStep?.executedAddress ?? state.currentAddress;
  const instructionText = state.lastStep?.executedInstruction ?? state.currentInstruction ?? summarizeCurrentInstruction(state);
  const nextInstructionText =
    state.lastStep && state.currentInstruction && state.currentInstruction !== instructionText
      ? compactInstructionText(state.currentInstruction)
      : undefined;
  const cppLine = sourceMode === "cpp" ? cppLineForCaslLine(cppToCaslMapping, caslLine) : undefined;
  const activeSourceLine = sourceMode === "cpp" ? cppLine : caslLine;

  return {
    caslLine,
    cppLine,
    address,
    instructionText,
    nextInstructionText,
    sourceText: sourceLine(sourceText, activeSourceLine),
    pipelineStage: pipelineStageLabel(state)
  };
}

function FocusProgramPanel({
  state,
  sourceMode,
  sourceText,
  generatedCaslSource,
  cppToCaslMapping,
  focus,
}: Pick<CircuitFocusLayoutProps, "state" | "sourceMode" | "sourceText" | "generatedCaslSource" | "cppToCaslMapping"> & { focus: FocusInstructionContext }) {
  const { t } = useI18n();
  const hasGeneratedCasl = sourceMode === "cpp" && generatedCaslSource.trim().length > 0;
  const programTitle = hasGeneratedCasl ? `${t("codeMachine.generated")} CASL` : sourceMode === "cpp" ? "C++" : "CASL";
  const currentLine = hasGeneratedCasl ? focus.caslLine : sourceMode === "cpp" ? focus.cppLine : focus.caslLine;
  const rows = hasGeneratedCasl
    ? selectGeneratedCaslRows(generatedCaslSource, cppToCaslMapping, focus.caslLine, focus.cppLine).map((row) => ({
        lineNumber: row.lineNumber,
        text: row.raw,
        isCurrent: row.isCurrent,
        isRelated: row.isRelated,
      }))
    : sourceText.split(/\r?\n/).map((text, index) => ({
        lineNumber: index + 1,
        text,
        isCurrent: currentLine === index + 1,
        isRelated: false,
      }));

  return (
    <section className="panel focus-program-panel" data-testid="focus-program-panel">
      <header className="panel-header">
        <div>
          <h2>{t("common.program")}</h2>
          <span>{programTitle}</span>
        </div>
      </header>
      <div className="focus-program-lines">
        {rows.map((row) => (
          <div
            key={`${row.lineNumber}-${row.text}`}
            className={`focus-program-line ${row.isCurrent ? "current" : ""} ${row.isRelated ? "related" : ""}`}
            data-testid={row.isCurrent ? "focus-program-current-line" : undefined}
            data-current={row.isCurrent ? "true" : "false"}
          >
            <span className="focus-program-arrow">{row.isCurrent ? ">" : ""}</span>
            <span className="focus-program-line-number">{row.lineNumber.toString().padStart(2, "0")}</span>
            <code className="nowrap-symbol" title={row.text || " "}>{row.text || " "}</code>
          </div>
        ))}
      </div>
    </section>
  );
}

function FocusDisplayPanel() {
  const { t } = useI18n();
  return (
    <section className="panel focus-display-panel" data-testid="focus-display-panel">
      <header className="panel-header">
        <h2>{t("common.outDisplay")}</h2>
        <span>OUT</span>
      </header>
      <div className="focus-display-value" data-testid="focus-display-value">
        {t("empty.noOutput")}
      </div>
    </section>
  );
}

function FocusCurrentInstructionPanel({ state, isSourceDirty, focus }: { state: CometState; isSourceDirty: boolean; focus: FocusInstructionContext }) {
  const { t } = useI18n();
  const instructionText = focus.instructionText ?? summarizeCurrentInstruction(state);
  const semanticText = instructionMeaning(focus.instructionText, summarizeCurrentInstruction(state), activeVisualPath(state), t);

  return (
    <section className="panel focus-current-panel" data-testid="focus-current-instruction-panel">
      <header className="panel-header">
        <h2 title={t("instruction.current")}>{t("instruction.current")}</h2>
        <span className="pipeline-pill">{isSourceDirty ? t("status.dirty") : translatedPipelineStage(t, state)}</span>
      </header>
      <div className="focus-current-body card-overflow-safe">
        <div className="focus-current-header">
          <strong data-testid="focus-current-mnemonic" className="nowrap-symbol" title={instructionMnemonic(focus.instructionText, state.runState)}>
            {instructionMnemonic(focus.instructionText, state.runState)}
          </strong>
          <code className="nowrap-symbol" title={instructionText}>{instructionText}</code>
        </div>
        <p className="focus-current-semantic wrap-explanation" title={semanticText}>{semanticText}</p>
        <div
          className="focus-current-runtime compact-grid"
          data-testid="focus-current-runtime-summary"
          aria-label={`${t("instruction.runtimeSummary")}: ${t("instruction.currentPr")} ${focus.address !== undefined ? formatWord(focus.address) : "----"} / ${t("instruction.nextPr")} ${formatWord(state.pr)}${focus.nextInstructionText ? ` / ${t("instruction.nextInstruction")} ${focus.nextInstructionText}` : ""} / MAR ${formatWord(state.mar)} / FR ${formatFlags(state.fr)}`}
        >
          <span className="compact-label" title={t("instruction.currentPr")}>{t("instruction.currentPr")}</span>
          <code className="mono-value">{focus.address !== undefined ? formatWord(focus.address) : "----"}</code>
          <span className="compact-label">MAR</span>
          <code className="mono-value">{formatWord(state.mar)}</code>
          <span className="compact-label">{t("instruction.nextPr")}</span>
          <code className="mono-value">{formatWord(state.pr)}</code>
          <span className="compact-label">FR</span>
          <code className="mono-value">{formatFlags(state.fr)}</code>
          {focus.nextInstructionText ? (
            <>
              <span className="compact-label">{t("table.next")}</span>
              <code className="nowrap-symbol" title={focus.nextInstructionText}>{focus.nextInstructionText}</code>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FocusTimeline({ state, timelineItems }: { state: CometState; timelineItems: TimelineItem[] }) {
  const { t } = useI18n();
  const stages = pipelineStageKeys.map((key) => ({ key, label: t(key) }));
  const activeIndex = timelineStageIndex(state);
  const stageLabel = translatedPipelineStage(t, state);

  return (
    <section className="panel focus-timeline-panel" data-testid="focus-step-timeline">
      <header className="panel-header">
        <div>
          <h2>{t("timeline.title")}</h2>
          <span>{t("timeline.pipelineView")}</span>
        </div>
        <span>{t("timeline.pipeline")}: {stageLabel}</span>
      </header>
      <div className="focus-stage-timeline">
        {stages.map((stage, index) => (
          <div key={stage.key} className={`focus-stage ${index < activeIndex ? "completed" : index === activeIndex ? "current" : "pending"}`} title={index < activeIndex ? t("timeline.completed") : index === activeIndex ? t("table.current") : t("timeline.pending")}>
            <span>{index + 1}</span>
            <strong>{stage.label}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function FocusTracePanel({ state }: { state: CometState }) {
  const { t } = useI18n();
  return (
    <section className="panel focus-trace-panel" data-testid="focus-trace-panel">
      <header className="panel-header">
        <div>
          <h2>{t("inspector.trace")}</h2>
          <span>{t("timeline.recent")}</span>
        </div>
        <span>{state.trace.length}</span>
      </header>
      <div className="focus-trace-list">
        {state.trace.length === 0 ? <p className="muted">{t("empty.noTraceEntries")}</p> : null}
        {state.trace.slice(0, 6).map((event, index) => (
          <article
            key={`${event.index}-${event.address}`}
            className={`focus-trace-item ${index === 0 ? "latest" : ""}`}
            data-testid={index === 0 ? "focus-trace-latest" : "focus-trace-item"}
            data-instruction={event.instruction}
            data-latest={index === 0 ? "true" : "false"}
          >
            <strong>#{event.index}</strong>
            <div className="focus-trace-lines">
              <code className="trace-main text-ellipsis" title={traceMainEvent(event)}>{traceMainEvent(event)}</code>
              <span className="trace-effect text-ellipsis" title={tracePrimaryEffect(event)}>{tracePrimaryEffect(event)}</span>
              <small className="trace-note text-ellipsis" title={traceSecondaryNote(event)}>{traceSecondaryNote(event)}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function memoryWindowCenterAddress(state: CometState): number {
  return activeMemoryAddress(state) ?? state.currentAddress ?? state.pr;
}

function FocusMemoryWindowPanel({ state, rowCount = 9, title }: { state: CometState; rowCount?: number; title?: string }) {
  const { t } = useI18n();
  const centerAddress = memoryWindowCenterAddress(state);
  const startAddress = wrapAddress(centerAddress - Math.floor(rowCount / 2));
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const address = wrapAddress(startAddress + index);
    const markers = [
      address === state.pr ? "PR" : "",
      address === state.mar ? "MAR" : "",
      address === state.lastMemoryReadAddress ? "READ" : "",
      address === state.lastMemoryWriteAddress ? "WRITE" : ""
    ].filter(Boolean);
    return {
      address,
      value: state.memory[address] ?? 0,
      label: labelForAddress(state, address) ?? "",
      markers
    };
  });

  return (
    <section className="panel focus-memory-window" data-testid="focus-memory-window">
      <header className="panel-header">
        <div>
          <h2>{title ?? t("registerStack.mainMemory")}</h2>
          <span>{rowCount} row window</span>
        </div>
        <span>@{formatWord(centerAddress)}</span>
      </header>
      <div className="focus-memory-window-body">
        <div className="focus-memory-window-row focus-memory-window-head" aria-hidden="true">
          <span>{t("table.address")}</span>
          <span>{t("table.value")}</span>
          <span>{t("table.label")}</span>
          <span>{t("table.mark")}</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.address}
            className="focus-memory-window-row"
            data-testid="focus-memory-window-row"
            data-address={formatWord(row.address)}
            data-pr={row.markers.includes("PR") ? "true" : "false"}
            data-mar={row.markers.includes("MAR") ? "true" : "false"}
            data-read={row.markers.includes("READ") ? "true" : "false"}
            data-write={row.markers.includes("WRITE") ? "true" : "false"}
          >
            <code className="mono-value">{formatWord(row.address)}</code>
            <code className="mono-value">{formatWord(row.value)}</code>
            <span className="text-ellipsis" title={row.label}>{row.label}</span>
            <span className="text-ellipsis" title={row.markers.join(" ")}>{row.markers.map((marker) => marker === "READ" ? t("common.read") : marker === "WRITE" ? t("common.write") : marker).join(" ")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FocusRegisterStackDashboard({ state }: { state: CometState }) {
  const { t } = useI18n();
  return (
    <section className="focus-register-stack-dashboard" data-testid="focus-register-stack-dashboard">
      <section className="panel focus-register-bank" data-testid="focus-register-bank">
        <header className="panel-header">
          <div>
            <h2>{t("registerStack.registerBank")}</h2>
            <span>GR0-GR7 / PR / SP / FR</span>
          </div>
        </header>
        <RegisterPanel state={state} embedded />
      </section>
      <FocusMemoryWindowPanel state={state} rowCount={10} />
    </section>
  );
}

function FocusGeneratedCaslPanel({
  sourceMode,
  sourceText,
  generatedCaslSource,
  cppToCaslMapping,
  focus,
  frameSlotMappings,
  selectedFrameSlotId,
  onSelectFrameSlot
}: Pick<CircuitFocusLayoutProps, "sourceMode" | "sourceText" | "generatedCaslSource" | "cppToCaslMapping"> & {
  focus: FocusInstructionContext;
  frameSlotMappings: FrameSlotMapping[];
  selectedFrameSlotId?: string;
  onSelectFrameSlot: (mapping: FrameSlotMapping, source: FrameSlotSelectionSource) => void;
}) {
  const { t } = useI18n();
  const hasGeneratedCasl = sourceMode === "cpp" && generatedCaslSource.trim().length > 0;
  const rows = hasGeneratedCasl
    ? selectGeneratedCaslRows(generatedCaslSource, cppToCaslMapping, focus.caslLine, focus.cppLine)
    : sourceText.split(/\r?\n/).map((raw, index) => ({
        lineNumber: index + 1,
        label: "",
        opcode: "",
        operand: "",
        raw,
        mappingKinds: [],
        relatedCppLine: undefined,
        isCurrent: focus.caslLine === index + 1,
        isRelated: false,
        isGeneratedMeta: false
      }));

  return (
    <section className="panel focus-generated-casl-panel" data-testid="focus-generated-casl-panel">
      <header className="panel-header">
        <div>
          <h2>{t("tabs.generatedCasl")}</h2>
          <span>{hasGeneratedCasl ? "C++ lowering output" : "CASL source rows"}</span>
        </div>
      </header>
      <div className="focus-code-table focus-generated-casl-table">
        <div className="focus-code-row focus-code-head" aria-hidden="true">
          <span className="focus-code-cell-primary">{t("codeMachine.line")}</span>
          <span className="focus-code-cell-primary">{t("table.label")}</span>
          <span className="focus-code-cell-primary">{t("codeMachine.opcode")}</span>
          <span className="focus-code-cell-primary">{t("codeMachine.operand")}</span>
          <span className="focus-code-cell-secondary">{t("table.mapping")}</span>
        </div>
        {rows.slice(0, 18).map((row) => {
          const slotMapping = findFrameSlotMappingInCaslText(frameSlotMappings, `${row.label} ${row.operand}`);
          const slotLabel = slotMapping ? currentStaticLabelForMapping(slotMapping) : undefined;

          return (
            <div
              key={`${row.lineNumber}-${row.raw}`}
              className={`focus-code-row ${row.isCurrent ? "current" : ""} ${slotMapping ? "has-frame-slot" : ""}`}
              data-testid={row.isCurrent ? "focus-generated-casl-current" : "focus-generated-casl-row"}
            >
              <code className="mono-value focus-code-cell-primary">{String(row.lineNumber).padStart(2, "0")}</code>
              <span className="text-ellipsis focus-code-cell-primary" title={row.label || "-"}>{row.label || "-"}</span>
              <span className="nowrap-symbol focus-code-cell-primary" title={row.opcode || "-"}>{row.opcode || "-"}</span>
              <span className="nowrap-symbol focus-code-cell-primary" title={row.operand || row.raw}>{row.operand || row.raw}</span>
              <span className="focus-code-cell-secondary focus-code-slot-cell" title={row.mappingKinds.join(", ") || "-"}>
                <span className="text-ellipsis">{row.mappingKinds.join(", ") || "-"}</span>
                {slotMapping ? (
                  <button
                    type="button"
                    className="frame-slot-link-badge"
                    data-testid="generated-casl-slot-badge"
                    data-slot-id={slotMapping.mappingId}
                    data-selected={selectedFrameSlotId === slotMapping.mappingId ? "true" : "false"}
                    aria-pressed={selectedFrameSlotId === slotMapping.mappingId}
                    aria-label={`Select FramePlan slot for ${slotLabel ?? slotMapping.symbolName}`}
                    title={`FramePlan slot: ${slotMapping.symbolName} / ${slotLabel ?? "no static label"}`}
                    onClick={() => onSelectFrameSlot(slotMapping, "generated-casl")}
                  >
                    slot
                  </button>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FocusMachineCodePanel({ state, cppToCaslMapping }: { state: CometState; cppToCaslMapping: CppToCaslMap[] }) {
  const { t } = useI18n();
  const rows = selectMachineCodeRows(state, cppToCaslMapping);

  return (
    <section className="panel focus-machine-code-panel" data-testid="focus-machine-code-panel">
      <header className="panel-header">
        <div>
          <h2>{t("tabs.machineCode")}</h2>
          <span>COMET II words</span>
        </div>
        <span>{rows.length}</span>
      </header>
      <div className="focus-code-table focus-machine-code-table">
        <div className="focus-code-row focus-code-head" aria-hidden="true">
          <span className="focus-code-cell-primary">{t("table.address")}</span>
          <span className="focus-code-cell-primary">{t("codeMachine.word")}</span>
          <span className="focus-code-cell-primary">{t("table.source")}</span>
          <span className="focus-code-cell-secondary">{t("table.meaning")}</span>
        </div>
        {rows.slice(0, 18).map((row) => (
          <div
            key={`${row.address}-${row.sourceLineIndex}`}
            className={`focus-code-row ${row.isCurrentIr ? "current" : ""} ${row.isRead ? "read" : ""} ${row.isWritten ? "write" : ""}`}
            data-testid={row.isCurrentIr ? "focus-machine-code-current" : "focus-machine-code-row"}
          >
            <code className="mono-value focus-code-cell-primary">{formatWord(row.address)}</code>
            <code className="mono-value focus-code-cell-primary">{formatWord(row.word)}</code>
            <span className="nowrap-symbol focus-code-cell-primary" title={row.sourceText}>{row.sourceText}</span>
            <span className="text-ellipsis focus-code-cell-secondary focus-code-cell-meaning" title={row.meaning}>{row.meaning}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FocusSourceMappingPanel({
  focus,
  sourceMode,
  sourceSlotMappings,
  selectedFrameSlotId,
  onSelectFrameSlot
}: {
  focus: FocusInstructionContext;
  sourceMode: SourceMode;
  sourceSlotMappings: FrameSlotMapping[];
  selectedFrameSlotId?: string;
  onSelectFrameSlot: (mapping: FrameSlotMapping, source: FrameSlotSelectionSource) => void;
}) {
  const { t } = useI18n();
  const addressText = focus.address === undefined ? "----" : formatWord(focus.address);
  const instructionText = focus.instructionText ?? t("instruction.noActive");

  return (
    <section className="panel focus-source-mapping-panel" data-testid="focus-source-mapping-panel">
      <header className="panel-header">
        <div>
          <h2 title={t("circuit.currentSourceMapping")}>{t("circuit.currentSourceMapping")}</h2>
          <span>{sourceMode === "cpp" ? "C++ -> CASL" : "CASL -> machine"}</span>
        </div>
      </header>
      <div className="focus-source-mapping-body">
        <span className="compact-label">{t("instruction.machineAddress")}</span>
        <code className="mono-value">{addressText}</code>
        <span className="compact-label">{t("instruction.caslLine")}</span>
        <code className="nowrap-symbol" title={instructionText}>{instructionText}</code>
        <span className="compact-label">{t("instruction.sourceLine")}</span>
        <code className="nowrap-symbol" title={focus.sourceText}>{focus.sourceText}</code>
        {sourceMode === "cpp" && sourceSlotMappings.length > 0 ? (
          <>
            <span className="compact-label">{t("stackFrame.frameSlot")}</span>
            <div className="source-frame-slot-chips" data-testid="source-frame-slot-chips">
              {sourceSlotMappings.map((mapping) => (
                <button
                  key={mapping.mappingId}
                  type="button"
                  className="frame-slot-link-badge source-frame-slot-chip"
                  data-testid="source-frame-slot-chip"
                  data-slot-id={mapping.mappingId}
                  data-selected={selectedFrameSlotId === mapping.mappingId ? "true" : "false"}
                  aria-pressed={selectedFrameSlotId === mapping.mappingId}
                  aria-label={`Select FramePlan slot for source symbol ${mapping.symbolName}`}
                  title={`Source symbol ${mapping.symbolName} -> ${mapping.currentLabelForDebug ?? "future slot"}`}
                  onClick={() => onSelectFrameSlot(mapping, "source-context")}
                >
                  {mapping.symbolName}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

type ProbeRow = {
  label: string;
  displayLabel?: string;
  title?: string;
  value: string;
  note: string;
  active: boolean;
};

function frameSlotProbeRows(mapping: FrameSlotMapping | undefined, t: Translate): ProbeRow[] {
  if (!mapping) return [];
  return mapping.signalProbeRelationRows.slice(0, 3).map((row) => ({
    label: `SLOT_${row.label}`,
    displayLabel: row.label === "Slot" ? t("stackFrame.frameSlot") : row.label === "Current" ? t("signalProbe.currentRelation") : row.label === "Future" ? t("signalProbe.futureRelation") : row.label,
    title: row.title,
    value: row.value,
    note: row.note,
    active: false
  }));
}

type StackPreviewRow = {
  address: number;
  value: number;
  isSp: boolean;
  isRead: boolean;
  isWrite: boolean;
};

type CallStackInfo = {
  depthText: string;
  transitionText?: string;
  topReturnText: string;
  storedAtText: string;
  routineText: string;
  retModeText: string;
  edgeText: string;
  stackActivityText: string;
  active: boolean;
};

function wrapAddress(address: number): number {
  return address & 0xffff;
}

function stackPreviewRows(state: CometState): StackPreviewRow[] {
  return Array.from({ length: 7 }, (_, index) => {
    const address = wrapAddress(state.sp - 2 + index);
    return {
      address,
      value: state.memory[address] ?? 0,
      isSp: address === state.sp,
      isRead: address === state.lastMemoryReadAddress,
      isWrite: address === state.lastMemoryWriteAddress
    };
  });
}

function labelForAddress(state: CometState, address: number | undefined): string | undefined {
  if (address === undefined) return undefined;
  return state.sourceMap.find((entry) => entry.address === address && entry.label)?.label;
}

function routineLabelForAddress(state: CometState, address: number | undefined): string {
  if (address === undefined) return "none";
  const labeledRows = state.sourceMap
    .filter((entry) => entry.label && entry.address <= address)
    .sort((left, right) => right.address - left.address);
  return labeledRows[0]?.label ?? "anonymous";
}

function functionNameFromRoutineLabel(label: string): string | undefined {
  if (label === "MAIN") return "main";
  if (label.startsWith("FUNC_")) return label.slice(5).toLowerCase();
  return undefined;
}

function callStackInfo(state: CometState, focus: FocusInstructionContext, t: Translate): CallStackInfo {
  const latest = state.trace[0];
  const visualPath = activeVisualPath(state);
  const stackActive =
    visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr ||
    visualPath === VisualPathKind.RET_StackToPr;
  const topReturnAddress = state.callDepth > 0 ? state.memory[state.sp] : latest?.returnAddress;
  const stackAddress = state.callDepth > 0 ? state.sp : latest?.stackAddress;
  const targetLabel = labelForAddress(state, latest?.effectiveAddress ?? state.lastEffectiveAddress);
  const currentRoutine = visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr
    ? targetLabel ?? (latest?.effectiveAddress !== undefined ? formatWord(latest.effectiveAddress) : "target")
    : routineLabelForAddress(state, focus.address);
  const transitionText =
    latest?.callDepthBefore !== undefined && latest.callDepthAfter !== undefined
      ? `${latest.callDepthBefore} -> ${latest.callDepthAfter}`
      : undefined;
  const retModeText =
    visualPath === VisualPathKind.RET_StackToPr
      ? t("callStack.stackReturn")
      : state.callDepth > 0
        ? t("callStack.stackReturn")
        : t("callStack.topLevelFinish");
  const edgeText =
    visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr
      ? `Call target ${targetLabel ?? (latest?.effectiveAddress !== undefined ? formatWord(latest.effectiveAddress) : "target")}; return ${latest?.returnAddress !== undefined ? formatWord(latest.returnAddress) : "----"}`
      : visualPath === VisualPathKind.RET_StackToPr
        ? `Return to ${latest?.returnAddress !== undefined ? formatWord(latest.returnAddress) : "caller"} from MEM[${latest?.stackAddress !== undefined ? formatWord(latest.stackAddress) : "SP"}]`
        : state.callDepth === 0
          ? t("callStack.programFinish")
          : "Waiting for subroutine RET";
  const stackActivityText =
    visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr
      ? t("stackPreview.returnAddressWrite")
      : visualPath === VisualPathKind.RET_StackToPr
        ? t("stackPreview.returnAddressRead")
        : state.callDepth === 0
          ? "Stack activity: none"
          : "waiting";

  return {
    depthText: String(state.callDepth),
    transitionText,
    topReturnText: topReturnAddress !== undefined ? formatWord(topReturnAddress) : t("common.none"),
    storedAtText: stackAddress !== undefined ? `MEM[${formatWord(stackAddress)}]` : t("common.none"),
    routineText: currentRoutine,
    retModeText,
    edgeText,
    stackActivityText,
    active: stackActive || state.callDepth > 0
  };
}

function signalProbePriority(row: ProbeRow, visualPath: VisualPathKind): number {
  const stackPath =
    visualPath === VisualPathKind.PUSH_EffectiveAddressToStack ||
    visualPath === VisualPathKind.POP_StackToGr ||
    visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr ||
    visualPath === VisualPathKind.RET_StackToPr;

  if (visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr || visualPath === VisualPathKind.RET_StackToPr) {
    if (row.label === "RETADDR") return 10;
    if (row.label === "SP") return 15;
    if (row.label === "STACK") return 20;
    if (row.label === "CALLDEPTH") return 52;
  }

  if (stackPath) {
    if (row.label === "SP") return 10;
    if (row.label === "STACK") return 15;
    if (row.label.startsWith("MEM[")) return 20;
    if (row.label === "MDR") return 24;
  }

  if (/^GR[0-7]$/.test(row.label)) return 10;
  if (row.label === "EA") return 14;
  if (row.label === "ALU.Y" && row.active) return 16;
  if (row.label === "MDR" && row.active) return 18;
  if (row.label.startsWith("MEM[") && row.active) return 20;
  if (row.label === "MEM" && row.active) return 20;
  if (row.label === "FR" && row.active) return 24;
  if (row.label === "BASE") return 56;
  if (row.label === "INDEX") return 58;
  if (row.label === "MAR") return 60;
  if (row.label === "SP") return 68;
  return row.active ? 40 : 90;
}

function orderSignalProbeRows(rows: ProbeRow[], visualPath: VisualPathKind): ProbeRow[] {
  return [...rows].sort((left, right) => signalProbePriority(left, visualPath) - signalProbePriority(right, visualPath));
}

function signalProbeRows(state: CometState, focus: FocusInstructionContext, t: Translate): ProbeRow[] {
  const visualPath = activeVisualPath(state);
  const latest = state.trace[0];
  const registerIndex = activeRegisterIndexFromInstruction(focus.instructionText);
  const changedRegisterIndex = latest?.changedRegister && /^GR[0-7]$/.test(latest.changedRegister) ? Number(latest.changedRegister.slice(2)) : undefined;
  const probeRegisterIndex = changedRegisterIndex ?? registerIndex ?? 0;
  const registerLabel = `GR${probeRegisterIndex}`;
  const registerValue =
    latest?.changedRegister === registerLabel && latest.changedRegisterValueBefore !== undefined && latest.changedRegisterValueAfter !== undefined
      ? `${formatWord(latest.changedRegisterValueBefore)} -> ${formatWord(latest.changedRegisterValueAfter)}`
      : formatWord(state.gr[probeRegisterIndex] ?? 0);
  const memoryAddress = activeMemoryAddress(state);
  const memoryValue =
    latest?.changedMemoryAddress === memoryAddress && latest.changedMemoryValueBefore !== undefined && latest.changedMemoryValueAfter !== undefined
      ? `${formatWord(latest.changedMemoryValueBefore)} -> ${formatWord(latest.changedMemoryValueAfter)}`
      : memoryAddress !== undefined
        ? formatWord(state.memory[memoryAddress] ?? 0)
        : "inactive";
  const stackPointerValue =
    latest?.stackPointerValueBefore !== undefined && latest.stackPointerValueAfter !== undefined
      ? `${formatWord(latest.stackPointerValueBefore)} -> ${formatWord(latest.stackPointerValueAfter)}`
      : formatWord(state.sp);

  const rows: ProbeRow[] = [
    {
      label: registerLabel,
      title: `${registerLabel} ${t("signalProbe.selectedRegister")}`,
      value: registerValue,
      note: t("signalProbe.selectedRegister"),
      active: registerIndex !== undefined || latest?.changedRegister === registerLabel
    },
    {
      label: "MDR",
      title: t("signalProbe.memoryDataRegister"),
      value: formatWord(state.mdr),
      note: t("signalProbe.memoryDataRegister"),
      active: visualPath === VisualPathKind.LD_MemoryToMdrToGr || visualPath === VisualPathKind.ST_GrToMdrToMemory || visualPath === VisualPathKind.ADDA_GrMdrToAluToGr || visualPath === VisualPathKind.SUBA_GrMdrToAluToGr || visualPath === VisualPathKind.CPA_GrMdrToAluToFr || visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.POP_StackToGr || visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr || visualPath === VisualPathKind.RET_StackToPr
    },
    {
      label: "ALU.Y",
      title: t("signalProbe.aluResult"),
      value: isAluVisualPath(visualPath) ? formatWord(state.gr[probeRegisterIndex] ?? 0) : "inactive",
      note: t("signalProbe.aluResult"),
      active: isAluVisualPath(visualPath)
    },
    {
      label: "FR",
      title: t("signalProbe.flags"),
      value: formatFlags(state.fr),
      note: t("signalProbe.flags"),
      active: visualPath === VisualPathKind.CPA_GrMdrToAluToFr || visualPath === VisualPathKind.ADDA_GrMdrToAluToGr || visualPath === VisualPathKind.SUBA_GrMdrToAluToGr || visualPath === VisualPathKind.Shift_AddressToAluToGr
    },
    {
      label: "MEM",
      title: memoryAddress !== undefined ? `${t("signalProbe.targetMemory")} MEM[${formatWord(memoryAddress)}]` : t("signalProbe.targetMemory"),
      value: memoryValue,
      note: memoryAddress !== undefined ? `${t("signalProbe.targetMemory")} MEM[${formatWord(memoryAddress)}]` : t("signalProbe.targetMemory"),
      active: memoryAddress !== undefined && (state.lastMemoryReadAddress === memoryAddress || state.lastMemoryWriteAddress === memoryAddress || state.changedMemoryAddresses.includes(memoryAddress))
    },
    {
      label: "SP",
      title: t("signalProbe.stackPointer"),
      value: stackPointerValue,
      note: visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.POP_StackToGr || visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr || visualPath === VisualPathKind.RET_StackToPr ? t("signalProbe.stackPointer") : t("signalProbe.stackPreviewOnly"),
      active: visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.POP_StackToGr || visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr || visualPath === VisualPathKind.RET_StackToPr
    }
  ];

  if (visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.POP_StackToGr || visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr || visualPath === VisualPathKind.RET_StackToPr) {
    rows.push({
      label: "STACK",
      displayLabel: t("signalProbe.stack"),
      title: visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr ? t("signalProbe.stackWrite") : t("signalProbe.stackRead"),
      value: memoryAddress !== undefined ? `MEM[${formatWord(memoryAddress)}]` : "inactive",
      note: visualPath === VisualPathKind.PUSH_EffectiveAddressToStack
        ? t("signalProbe.stackWrite")
        : visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr
          ? t("stackPreview.returnAddressWrite")
          : visualPath === VisualPathKind.RET_StackToPr
            ? t("stackPreview.returnAddressRead")
            : t("signalProbe.stackRead"),
      active: true
    });
  }

  if (visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr || visualPath === VisualPathKind.RET_StackToPr) {
    rows.push(
      {
        label: "RETADDR",
        displayLabel: t("callStack.return"),
        title: t("signalProbe.returnAddress"),
        value: latest?.returnAddress !== undefined ? formatWord(latest.returnAddress) : formatWord(state.pr),
        note: t("signalProbe.returnAddress"),
        active: true
      },
      {
        label: "CALLDEPTH",
        displayLabel: t("callStack.depth"),
        title: t("callStack.depth"),
        value:
          latest?.callDepthBefore !== undefined && latest.callDepthAfter !== undefined
            ? `${latest.callDepthBefore} -> ${latest.callDepthAfter}`
            : String(state.callDepth),
        note: t("callStack.depth"),
        active: true
      }
    );
  }

  if (state.lastIndexRegister !== undefined && state.lastEffectiveAddress !== undefined) {
    rows.splice(
      1,
      0,
      {
        label: "BASE",
        displayLabel: t("signalProbe.base"),
        title: t("signalProbe.base"),
        value: formatWord(state.lastBaseAddress ?? 0),
        note: t("codeMachine.operandAddress"),
        active: true
      },
      {
        label: "INDEX",
        displayLabel: t("signalProbe.index"),
        title: `${t("signalProbe.index")} GR${state.lastIndexRegister}`,
        value: `GR${state.lastIndexRegister}=${formatWord(state.lastIndexValue ?? 0)}`,
        note: t("signalProbe.index"),
        active: true
      },
      {
        label: "EA",
        title: t("signalProbe.effectiveAddress"),
        value: formatWord(state.lastEffectiveAddress),
        note: `${t("signalProbe.base")} + ${t("signalProbe.index")}`,
        active: true
      },
      {
        label: "MAR",
        value: formatWord(state.mar),
        note: "address register",
        active: true
      }
    );
  }

  return orderSignalProbeRows(rows, visualPath);
}

function FocusCallStackPanel({ state, focus, density = "normal" }: { state: CometState; focus: FocusInstructionContext; density?: FocusPanelDensity }) {
  const { t } = useI18n();
  const info = callStackInfo(state, focus, t);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <section className="panel focus-call-stack" data-testid="focus-call-stack">
      <header className="panel-header">
        <div>
          <h2>{t("callStack.title")}</h2>
          <span>{info.active ? t("callStack.returnActivity") : t("callStack.subroutineContext")}</span>
        </div>
        <span>{t("callStack.depth")} {info.depthText}</span>
      </header>
      <div className="call-stack-body card-overflow-safe" data-active={info.active ? "true" : "false"} data-density={density}>
        <div className="call-stack-summary" data-testid="call-stack-summary">
          <div>
            <span className="compact-label">{t("callStack.depth")}</span>
            <code data-testid="call-stack-depth">{info.depthText}</code>
            <small className="secondary-note">{info.transitionText ? t("callStack.changed") : t("callStack.current")}</small>
          </div>
          <div>
            <span className="compact-label">{t("callStack.mode")}</span>
            <code data-testid="call-stack-ret-mode">{info.retModeText}</code>
            <small className="secondary-note text-ellipsis" title={info.edgeText}>{info.edgeText}</small>
          </div>
        </div>
        <details
          className="call-stack-details"
          data-testid="call-stack-details"
          open={detailsOpen}
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
        >
          <summary
            data-testid="call-stack-details-summary"
            aria-expanded={detailsOpen}
            aria-controls="call-stack-detail-rows"
            title="Toggle Call Stack detail rows"
          >
            {t("common.details")}
          </summary>
          <div id="call-stack-detail-rows" className="call-stack-detail-rows">
          <div className="call-stack-row">
            <span className="compact-label">{t("callStack.return")}</span>
            <code data-testid="call-stack-return-address">{info.topReturnText}</code>
            <small className="secondary-note text-ellipsis" title={info.stackActivityText}>{info.stackActivityText}</small>
          </div>
          <div className="call-stack-row">
            <span className="compact-label">{t("callStack.storedAt")}</span>
            <code className="nowrap-symbol" title={info.storedAtText}>{info.storedAtText}</code>
            <small className="secondary-note text-ellipsis" title={info.edgeText}>{info.edgeText}</small>
          </div>
          <div className="call-stack-row">
            <span className="compact-label">{t("callStack.routine")}</span>
            <code data-testid="call-stack-routine">{info.routineText}</code>
            <small className="secondary-note">current / target</small>
          </div>
          <div className="call-stack-row call-stack-row-wide">
            <span className="compact-label">{t("callStack.depthChange")}</span>
            <code className="nowrap-symbol" title={info.transitionText ?? t("common.none")}>{info.transitionText ?? t("common.none")}</code>
          </div>
          </div>
        </details>
      </div>
    </section>
  );
}

function FocusSignalProbePanel({
  state,
  focus,
  density = "normal",
  selectedFrameSlot,
  doubleOperation
}: {
  state: CometState;
  focus: FocusInstructionContext;
  density?: FocusPanelDensity;
  selectedFrameSlot?: FrameSlotMapping;
  doubleOperation?: DoubleOperationContext;
}) {
  const { t } = useI18n();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [slotDetailsOpen, setSlotDetailsOpen] = useState(false);
  const rows = [...doubleSignalProbeRows(doubleOperation, state, t), ...signalProbeRows(state, focus, t)];
  const activeRows = rows.filter((row) => row.active);
  const inactiveRows = rows.filter((row) => !row.active);
  const primaryLimit = 3;
  const primaryRows = [...activeRows, ...inactiveRows].slice(0, primaryLimit);
  const detailRows = [...activeRows, ...inactiveRows].slice(primaryLimit);
  const slotRelationRows = frameSlotProbeRows(selectedFrameSlot, t);
  const recent = density === "compact" ? [] : state.trace.slice(0, 3);

  return (
    <section className="panel focus-signal-probe" data-testid="focus-signal-probe">
      <header className="panel-header">
        <div>
          <h2>{t("signalProbe.title")}</h2>
          <span>{t("signalProbe.readOnlyNodes")}</span>
        </div>
        <span>{t("common.compact")}</span>
      </header>
      <div className="signal-probe-body card-overflow-safe" data-density={density}>
        {selectedFrameSlot ? (
          <div
            className="signal-probe-slot-relation"
            data-testid="signal-probe-frame-slot-relation"
            data-runtime-state="false"
            title={selectedFrameSlot.explanation}
          >
            <div className="signal-probe-slot-relation-head">
              <span>{t("signalProbe.frameSlotRelation")}</span>
              <code title={selectedFrameSlot.symbolName}>{selectedFrameSlot.symbolName}</code>
            </div>
            <div className="signal-probe-rows signal-probe-slot-rows">
              {slotRelationRows.map((row) => (
                <div key={row.label} className="signal-probe-row compact-grid" data-testid="signal-probe-frame-slot-row" data-active="false">
                  <span className="compact-label signal-probe-label" title={row.title ?? row.label}>{row.displayLabel ?? row.label}</span>
                  <code className="mono-value" title={row.value}>{row.value}</code>
                  <small className="secondary-note text-ellipsis" title={row.note}>{row.note}</small>
                </div>
              ))}
            </div>
            <details
              className="signal-probe-details signal-probe-slot-details"
              data-testid="signal-probe-frame-slot-details"
              open={slotDetailsOpen}
              onToggle={(event) => setSlotDetailsOpen(event.currentTarget.open)}
            >
              <summary
                data-testid="signal-probe-frame-slot-details-summary"
                aria-expanded={slotDetailsOpen}
                aria-controls="signal-probe-frame-slot-detail-note"
                title="Toggle design-only frame slot relation details"
              >
                {t("signalProbe.designNote")}
              </summary>
              <p
                id="signal-probe-frame-slot-detail-note"
                className="secondary-note wrap-explanation"
                title={`${selectedFrameSlot.currentCircuitRelation}. ${selectedFrameSlot.futureCircuitRelation}. Runtime frame value is not available in simple mode.`}
              >
                {selectedFrameSlot.currentCircuitRelation}. {t("signalProbe.futureRelation")}: {selectedFrameSlot.futureCircuitRelation}. {t("signalProbe.runtimeValueUnavailable")}.
              </p>
            </details>
          </div>
        ) : null}
        <div className="signal-probe-rows" data-testid="signal-probe-compact-rows">
          {primaryRows.map((row) => (
            <div key={row.label} className="signal-probe-row compact-grid" data-testid="signal-probe-row" data-active={row.active ? "true" : "false"}>
              <span className="compact-label signal-probe-label" title={row.title ?? row.label}>{row.displayLabel ?? row.label}</span>
              <code className="mono-value" title={row.value}>{row.value}</code>
              <small className="secondary-note text-ellipsis" title={row.note}>{row.note}</small>
            </div>
          ))}
        </div>
        {detailRows.length ? (
          <details
            className="signal-probe-details"
            data-testid="signal-probe-details"
            open={detailsOpen}
            onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
          >
            <summary
              data-testid="signal-probe-details-summary"
              aria-expanded={detailsOpen}
              aria-controls="signal-probe-detail-rows"
              title={`Show ${detailRows.length} additional signal probe rows`}
            >
              {detailsOpen ? t("common.showLess") : t("common.showMoreCount", { count: detailRows.length })}
            </summary>
            <div id="signal-probe-detail-rows" className="signal-probe-rows detail-rows">
              {detailRows.map((row) => (
                <div key={row.label} className="signal-probe-row compact-grid" data-testid="signal-probe-row" data-active={row.active ? "true" : "false"}>
                  <span className="compact-label signal-probe-label" title={row.title ?? row.label}>{row.displayLabel ?? row.label}</span>
                  <code className="mono-value" title={row.value}>{row.value}</code>
                  <small className="secondary-note text-ellipsis" title={row.note}>{row.note}</small>
                </div>
              ))}
            </div>
          </details>
        ) : null}
        <div
          className="signal-probe-evolution"
          data-testid="signal-probe-evolution"
          aria-label={recent.length ? t("signalProbe.recentChanges") : t("signalProbe.noChanges")}
        >
          {recent.length ? (
            recent.map((event) => <span key={`${event.index}-${event.address}`} title={traceChangeText(event)}>{traceChangeText(event)}</span>)
          ) : (
            <span title={t("signalProbe.noChanges")}>{t("signalProbe.noChanges")}</span>
          )}
        </div>
      </div>
    </section>
  );
}

function doubleSignalProbeRows(operation: DoubleOperationContext | undefined, state: CometState, t: Translate): ProbeRow[] {
  if (!operation) return [];
  const wordIndex = operation.wordIndex;
  const current = operation.currentObject;
  const source = operation.sourceObject;
  const destination = operation.destinationObject;
  const sourceAddress = source?.words[wordIndex]?.address;
  const destinationAddress = destination?.words[wordIndex]?.address;
  const objectText = operation.kind === "double-copy"
    ? `${source?.symbolName ?? "?"} -> ${destination?.symbolName ?? "?"}`
    : current?.symbolName ?? "?";
  const rows: ProbeRow[] = [
    {
      label: "DOUBLE_OBJECT",
      displayLabel: t("signalProbe.object"),
      title: t("signalProbe.object"),
      value: objectText,
      note: "double / binary64",
      active: true
    },
    {
      label: "DOUBLE_WORD",
      displayLabel: t("signalProbe.wordIndex"),
      title: t("signalProbe.wordIndex"),
      value: `${wordIndex + 1} / 4`,
      note: current?.words[wordIndex]?.bitRange ?? source?.words[wordIndex]?.bitRange ?? "",
      active: true
    }
  ];
  if (sourceAddress !== undefined) {
    rows.push({
      label: "DOUBLE_SOURCE",
      displayLabel: t("signalProbe.sourceAddress"),
      title: t("signalProbe.sourceAddress"),
      value: formatWord(sourceAddress),
      note: `${source?.symbolName}.word${wordIndex}`,
      active: true
    });
  }
  if (destinationAddress !== undefined || current?.words[wordIndex]?.address !== undefined) {
    const address = destinationAddress ?? current?.words[wordIndex]?.address;
    rows.push({
      label: "DOUBLE_DESTINATION",
      displayLabel: t("signalProbe.destinationAddress"),
      title: t("signalProbe.destinationAddress"),
      value: address === undefined ? "----" : formatWord(address),
      note: `${(destination ?? current)?.symbolName}.word${wordIndex}`,
      active: true
    });
  }
  rows.push({
    label: "DOUBLE_VALUE",
    displayLabel: t("signalProbe.transferredWord"),
    title: t("signalProbe.transferredWord"),
    value: formatWord(state.mdr),
    note: "MDR",
    active: true
  });
  return rows;
}

function FocusStackPreviewPanel({ state }: { state: CometState }) {
  const { t } = useI18n();
  const rows = stackPreviewRows(state);
  const visualPath = activeVisualPath(state);
  const stackActive =
    visualPath === VisualPathKind.PUSH_EffectiveAddressToStack ||
    visualPath === VisualPathKind.POP_StackToGr ||
    visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr ||
    visualPath === VisualPathKind.RET_StackToPr;
  const writeNote =
    visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr
      ? t("stackPreview.returnAddressWrite")
      : visualPath === VisualPathKind.PUSH_EffectiveAddressToStack
        ? t("stackPreview.stackWrite")
        : t("common.write");
  const readNote =
    visualPath === VisualPathKind.RET_StackToPr
      ? t("stackPreview.returnAddressRead")
      : visualPath === VisualPathKind.POP_StackToGr
        ? t("stackPreview.stackRead")
        : t("common.read");

  return (
    <section className="panel focus-stack-preview" data-testid="focus-stack-preview">
      <header className="panel-header">
        <div>
          <h2>{t("stackPreview.title")}</h2>
          <span>{stackActive ? t("stackPreview.pathActive") : t("stackPreview.pathPreviewOnly")}</span>
        </div>
        <span>SP {formatWord(state.sp)}</span>
      </header>
      <div className="stack-preview-body" data-testid="stack-preview-window">
        <div className="stack-preview-grid stack-preview-head" aria-hidden="true">
          <span>{t("table.address")}</span>
          <span>{t("table.value")}</span>
          <span>{t("stackPreview.note")}</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.address}
            className={`stack-preview-grid stack-preview-row ${row.isSp ? "current" : ""} ${row.isRead ? "read" : ""} ${row.isWrite ? "write" : ""}`}
            data-testid="stack-preview-row"
            data-address={formatWord(row.address)}
            data-sp={row.isSp ? "true" : "false"}
            data-read={row.isRead ? "true" : "false"}
            data-write={row.isWrite ? "true" : "false"}
          >
            <code className="mono-value">{formatWord(row.address)}</code>
            <code className="mono-value">{formatWord(row.value)}</code>
            <span className="text-ellipsis" title={row.isWrite ? (row.isSp ? `${writeNote} / SP` : writeNote) : row.isRead ? readNote : row.isSp ? "SP" : ""}>
              {row.isWrite ? (row.isSp ? `${writeNote} / SP` : writeNote) : row.isRead ? readNote : row.isSp ? "SP" : ""}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

const STACK_FRAME_ARGUMENT_REGISTERS = ["GR1", "GR2", "GR3"] as const;

const FALLBACK_FRAME_SLOTS: FrameSlotPreview[] = [
  {
    mappingId: "fallback:return-address",
    name: "return-address",
    kind: "return-address",
    offset: 0,
    storage: "return-address-current",
    currentLowering: "call-stack-return-address",
    labelForDebug: "Return address slot"
  },
  {
    mappingId: "fallback:argument",
    name: "argument slots",
    kind: "argument",
    offset: 1,
    storage: "register-argument",
    currentLowering: "static-label",
    labelForDebug: "Future argument slots"
  },
  {
    mappingId: "fallback:local",
    name: "local slots",
    kind: "local",
    offset: 2,
    storage: "static-label-current",
    currentLowering: "static-label",
    labelForDebug: "Future local variable slots"
  },
  {
    mappingId: "fallback:temporary",
    name: "temporary slots",
    kind: "temporary",
    offset: 3,
    storage: "future-stack-slot",
    currentLowering: "not-emitted",
    labelForDebug: "Future temporary slots"
  },
  {
    mappingId: "fallback:saved-fp",
    name: "saved-fp",
    kind: "saved-fp",
    offset: 4,
    storage: "future-stack-slot",
    currentLowering: "not-emitted",
    labelForDebug: "Optional saved FP"
  }
];

function frameSlotKindLabel(kind: FrameSlotPreview["kind"], t: Translate): string {
  switch (kind) {
    case "return-address":
      return t("stackFrame.returnAddress");
    case "saved-fp":
      return "saved FP";
    case "argument":
      return t("stackFrame.argument");
    case "local":
      return t("stackFrame.local");
    case "temporary":
      return t("stackFrame.temporary");
    default:
      return kind;
  }
}

function slotKindLabel(slot: FrameSlotPreview, t: Translate): string {
  return frameSlotKindLabel(slot.kind, t);
}

function currentLoweringLabel(slot: FrameSlotPreview): string {
  if (slot.currentLowering === "call-stack-return-address") return "CALL stack";
  if (slot.currentLowering === "static-label") return `static label ${slot.labelForDebug ?? slot.name}`;
  if (slot.currentLowering === "register") return slot.storage;
  return "not emitted";
}

function futureStorageLabel(mapping: FrameSlotMapping): string {
  if (mapping.futureStorage === "return-address-current") return "return-address-current";
  if (mapping.futureStorage === "register-argument") return "register-argument";
  return "future-stack-slot";
}

function staticLabelReference(mapping: FrameSlotMapping): string {
  if (mapping.currentLowering !== "static-label" || !mapping.currentLabelForDebug) return "not emitted";
  return `${mapping.currentLabelForDebug} DS 1`;
}

function selectionSourceLabel(source: FrameSlotSelectionSource | undefined, t: Translate): string {
  if (source === "generated-casl") return t("stackFrame.generatedCasl");
  if (source === "source-editor") return t("stackFrame.sourceEditor");
  if (source === "source-context") return t("stackFrame.sourceContext");
  if (source === "stack-frame-view") return t("stackFrame.title");
  return t("common.none");
}

function frameSlotMappingsForSourceText(mappings: FrameSlotMapping[], sourceText: string): FrameSlotMapping[] {
  const tokens = new Set(sourceText.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? []);
  return mappings.filter((mapping) => mapping.slotKind !== "return-address" && tokens.has(mapping.symbolName));
}

function slotRowsForPreview(activeFunction: ReturnType<typeof selectStackFramePreviewState>["activeFunction"]): FrameSlotPreview[] {
  if (!activeFunction) return FALLBACK_FRAME_SLOTS;
  return [
    activeFunction.returnAddressSlot,
    ...activeFunction.argumentSlots,
    ...activeFunction.localSlots,
    ...activeFunction.temporarySlots
  ];
}

function FrameSlotDetail({
  mapping,
  slot,
  selectionSource,
  emptyText = "Select a slot row to inspect design-only mapping."
}: {
  mapping?: FrameSlotMapping;
  slot?: FrameSlotPreview;
  selectionSource?: FrameSlotSelectionSource;
  emptyText?: string;
}) {
  const { t } = useI18n();
  if (!mapping) {
    return (
      <div className="stack-frame-slot-detail stack-frame-slot-detail-empty" data-testid="stack-frame-slot-detail" data-runtime-state="false">
        <span className="secondary-note">{emptyText}</span>
      </div>
    );
  }

  const selectedCurrentLowering = slot ? currentLoweringLabel(slot) : mapping.currentLowering;
  const sourceLabel = selectionSourceLabel(selectionSource, t);

  return (
    <div
      className="stack-frame-slot-detail"
      data-testid="stack-frame-slot-detail"
      data-runtime-state="false"
      data-selection-source={selectionSource ?? ""}
      title={mapping.explanation}
    >
      <div className="stack-frame-slot-detail-title">
        <span>{t("stackFrame.slotDetail")}</span>
        <code title={mapping.symbolName}>{mapping.symbolName}</code>
      </div>
      <div className="stack-frame-slot-detail-grid">
        <div>
          <span className="compact-label">{t("stackFrame.symbol")}</span>
          <code title={mapping.symbolName}>{mapping.symbolName}</code>
        </div>
        <div>
          <span className="compact-label">{t("stackFrame.kind")}</span>
          <code title={mapping.slotKind}>{frameSlotKindLabel(mapping.slotKind, t)}</code>
        </div>
        <div>
          <span className="compact-label">{t("stackFrame.currentLowering")}</span>
          <code title={selectedCurrentLowering}>{selectedCurrentLowering}</code>
        </div>
        <div>
          <span className="compact-label">{t("stackFrame.futureStorage")}</span>
          <code title={futureStorageLabel(mapping)}>{futureStorageLabel(mapping)}</code>
        </div>
        <div>
          <span className="compact-label">{t("stackFrame.currentCaslLabel")}</span>
          <code title={staticLabelReference(mapping)}>{staticLabelReference(mapping)}</code>
        </div>
        <div>
          <span className="compact-label">{t("stackFrame.sourceLine")}</span>
          <code title={mapping.sourceLine ? `line ${mapping.sourceLine}` : "not mapped"}>
            {mapping.sourceLine ? `line ${mapping.sourceLine}` : "not mapped"}
          </code>
        </div>
        <div className="stack-frame-slot-detail-wide">
          <span className="compact-label">{t("stackFrame.selectionSource")}</span>
          <code title={sourceLabel}>{sourceLabel}</code>
        </div>
        <div className="stack-frame-slot-detail-wide">
          <span className="compact-label">{t("stackFrame.circuitNow")}</span>
          <code data-testid="slot-current-circuit-relation" title={mapping.currentCircuitRelation}>{mapping.currentCircuitRelation}</code>
        </div>
        <div className="stack-frame-slot-detail-wide">
          <span className="compact-label">{t("stackFrame.circuitFuture")}</span>
          <code data-testid="slot-future-circuit-relation" title={mapping.futureCircuitRelation}>{mapping.futureCircuitRelation}</code>
        </div>
      </div>
      <p className="secondary-note wrap-explanation" title={`${t("stackFrame.runtimeState")}: ${t("signalProbe.runtimeValueUnavailable")}.`}>
        {t("stackFrame.runtimeState")}: {t("signalProbe.runtimeValueUnavailable")}.
      </p>
    </div>
  );
}

function FocusStackFrameViewPanel({
  state,
  focus,
  preview,
  selectedFrameSlotId,
  selectionSource,
  onSelectFrameSlot,
  onFunctionChange
}: {
  state: CometState;
  focus: FocusInstructionContext;
  preview: StackFramePreviewState;
  selectedFrameSlotId?: string;
  selectionSource?: FrameSlotSelectionSource;
  onSelectFrameSlot: (mapping: FrameSlotMapping, source: FrameSlotSelectionSource) => void;
  onFunctionChange: (functionName: string) => void;
}) {
  const { t } = useI18n();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const preferredFunctionName = functionNameFromRoutineLabel(routineLabelForAddress(state, focus.address));
  const activeFunction = preview.activeFunction;
  const modeText = t("stackFrame.simpleStaticLocals");
  const argumentText = STACK_FRAME_ARGUMENT_REGISTERS.join(" / ");
  const functionText = preview.selectedFunctionName ?? preferredFunctionName ?? "none";
  const frameSizeText = activeFunction ? `${activeFunction.frameSizeWords} ${t("codeMachine.word")}` : t("stackFrame.unavailable");
  const slotRows = slotRowsForPreview(activeFunction);
  const selectedSlot = slotRows.find((slot) => slot.mappingId === selectedFrameSlotId);
  const selectedMapping = activeFunction?.slotMappings.find((mapping) => mapping.mappingId === selectedSlot?.mappingId);
  const previewStatus = preview.available ? t("stackFrame.available") : preview.reason ?? t("stackFrame.unavailable");
  const warningsText = preview.warnings.join(" ");

  return (
    <section className="panel focus-stack-frame-view" data-testid="focus-stack-frame-view">
      <header className="panel-header">
        <div>
          <h2 title={t("stackFrame.title")}>{t("stackFrame.title")}</h2>
          <span>{preview.available ? t("stackFrame.framePlanPreview") : t("stackFrame.designPlaceholder")}</span>
        </div>
        <span data-testid="stack-frame-current-mode">{modeText}</span>
      </header>
      <div
        className="stack-frame-view-body card-overflow-safe"
        data-testid="stack-frame-view-state"
        data-mode={preview.mode}
        data-runtime-state={preview.isRuntimeState ? "true" : "false"}
        data-has-live-frame="false"
      >
        <div className="stack-frame-view-badges" aria-label={`${t("stackFrame.title")}: ${t("stackFrame.designPreview")}`}>
          <span data-testid="stack-frame-design-preview-badge" title="FramePlan metadata is a design preview only.">{t("stackFrame.designPreview")}</span>
          <span data-testid="stack-frame-not-runtime-state" title="This panel does not display live runtime frame slots.">{t("stackFrame.notRuntimeState")}</span>
        </div>
        <p className="stack-frame-view-note wrap-explanation" title="No live stack frame locals yet. Current C++ locals lower to static namespaced labels. FramePlan is preview metadata only.">
          No live stack frame locals yet. C++ locals lower to static labels. FramePlan is preview only.
        </p>
        <div className="stack-frame-view-rows">
          <div className="stack-frame-view-row" data-testid="stack-frame-mode-row">
            <span className="compact-label">{t("stackFrame.mode")}</span>
            <code className="nowrap-symbol" title={modeText}>{modeText}</code>
            <small className="secondary-note text-ellipsis" title="Current simple lowering mode">static-namespaced-labels</small>
          </div>
          <div className="stack-frame-view-row" data-testid="stack-frame-preview-row">
            <span className="compact-label">{t("stackFrame.plan")}</span>
            <code className="nowrap-symbol" title={previewStatus}>{preview.available ? t("stackFrame.available") : t("stackFrame.unavailable")}</code>
            <small className="secondary-note text-ellipsis" title={previewStatus}>{previewStatus}</small>
          </div>
          <div className="stack-frame-view-row" data-testid="stack-frame-return-register-row">
            <span className="compact-label">{t("stackFrame.returnValue")}</span>
            <code className="mono-value">{activeFunction?.returnValueRegister ?? "GR0"}</code>
            <small className="secondary-note text-ellipsis" title="GR0 carries function return values.">return value</small>
          </div>
          <div className="stack-frame-view-row" data-testid="stack-frame-argument-registers-row">
            <span className="compact-label">{t("stackFrame.arguments")}</span>
            <code className="nowrap-symbol" title={argumentText}>{argumentText}</code>
            <small className="secondary-note text-ellipsis" title="GR1-GR3 are register arguments.">register arguments</small>
          </div>
          <div className="stack-frame-view-row" data-testid="stack-frame-frame-size-row">
            <span className="compact-label">{t("stackFrame.frameSize")}</span>
            <code className="nowrap-symbol" title={frameSizeText}>{frameSizeText}</code>
            <small className="secondary-note text-ellipsis" title="Design-only approximate size; not emitted as CASL.">design-only</small>
          </div>
          <div className="stack-frame-view-row" data-testid="stack-frame-static-labels-row">
            <span className="compact-label">{t("stackFrame.locals")}</span>
            <code className="nowrap-symbol" title="MAIN_X / FUNC_ADD_A / FUNC_ADD_B">static labels</code>
            <small className="secondary-note text-ellipsis" title="Static namespaced labels such as MAIN_X and FUNC_ADD_A.">MAIN_X / FUNC_ADD_A</small>
          </div>
          <div className="stack-frame-view-row" data-testid="stack-frame-call-depth-row">
            <span className="compact-label">CALL/RET</span>
            <code className="mono-value" title={`callDepth ${state.callDepth}`}>{state.callDepth}</code>
            <small className="secondary-note text-ellipsis" title="CALL / RET stack currently stores return addresses only.">return addresses only</small>
          </div>
        </div>
        {preview.available && preview.functions.length > 1 ? (
          <label className="stack-frame-view-function" data-testid="stack-frame-function-control">
            <span className="compact-label">{t("stackFrame.function")}</span>
            <select
              data-testid="stack-frame-function-select"
              aria-label="Stack frame preview function"
              title={`Preview function: ${functionText}`}
              value={preview.selectedFunctionName ?? ""}
              onChange={(event) => onFunctionChange(event.currentTarget.value)}
            >
              {preview.functions.map((fn) => (
                <option key={fn.functionName} value={fn.functionName} title={fn.functionName}>
                  {fn.functionName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <details
          className="stack-frame-view-details"
          data-testid="stack-frame-view-details"
          open={detailsOpen}
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
        >
          <summary
            data-testid="stack-frame-view-details-summary"
            aria-expanded={detailsOpen}
            aria-controls="stack-frame-view-detail-rows"
            title="Toggle Stack Frame View concept details"
          >
            StackFramePlan / FrameSlot {t("common.details")}
          </summary>
          <div id="stack-frame-view-detail-rows" className="stack-frame-view-detail-rows">
            <div className="stack-frame-view-row">
              <span className="compact-label">{t("stackFrame.function")}</span>
              <code className="nowrap-symbol" title={functionText}>{functionText}</code>
              <small className="secondary-note text-ellipsis" title="Preview selection only; does not affect VM state.">preview selection</small>
            </div>
            {slotRows.map((slot) => (
              <button
                type="button"
                key={`${slot.kind}-${slot.name}-${slot.offset}`}
                className="stack-frame-view-row stack-frame-view-slot-row"
                data-testid="stack-frame-future-slot"
                data-slot-id={slot.mappingId}
                data-slot-kind={slot.kind}
                data-status="future"
                data-selected={selectedFrameSlotId === slot.mappingId ? "true" : "false"}
                aria-pressed={selectedFrameSlotId === slot.mappingId}
                title={`Select ${slot.name} ${slot.kind} slot mapping`}
                onClick={() => {
                  const mapping = activeFunction?.slotMappings.find((candidate) => candidate.mappingId === slot.mappingId);
                  if (mapping) onSelectFrameSlot(mapping, "stack-frame-view");
                }}
              >
                <span className="compact-label" title={slot.kind}>{slotKindLabel(slot, t)}</span>
                <code className="nowrap-symbol" title={slot.name}>{slot.name}</code>
                <small className="secondary-note text-ellipsis" title={`${currentLoweringLabel(slot)} at offset +${slot.offset}`}>
                  +{slot.offset} / {currentLoweringLabel(slot)}
                </small>
              </button>
            ))}
            <FrameSlotDetail mapping={selectedMapping} slot={selectedSlot} selectionSource={selectionSource} />
            {warningsText ? (
              <div className="stack-frame-view-row stack-frame-view-row-wide" data-testid="stack-frame-warning-row">
                <span className="compact-label">{t("stackFrame.warnings")}</span>
                <code className="nowrap-symbol" title={warningsText}>design-only</code>
                <small className="secondary-note text-ellipsis" title={warningsText}>{warningsText}</small>
              </div>
            ) : null}
          </div>
        </details>
      </div>
    </section>
  );
}

function FocusFrameSlotRelationPanel({
  mapping,
  selectionSource,
  frameSlotMappings,
  selectedFrameSlotId,
  onSelectFrameSlot
}: {
  mapping?: FrameSlotMapping;
  selectionSource?: FrameSlotSelectionSource;
  frameSlotMappings: FrameSlotMapping[];
  selectedFrameSlotId?: string;
  onSelectFrameSlot: (mapping: FrameSlotMapping, source: FrameSlotSelectionSource) => void;
}) {
  const { t } = useI18n();
  const symbolMappings = frameSlotMappings.filter((slot) => slot.slotKind !== "return-address").slice(0, 8);

  return (
    <section className="panel focus-frame-slot-relation" data-testid="focus-frame-slot-relation">
      <header className="panel-header">
        <div>
          <h2>{t("stackFrame.frameSlot")}</h2>
          <span>{t("signalProbe.currentRelation")}</span>
        </div>
        <span>{t("stackFrame.notRuntimeState")}</span>
      </header>
      <div className="focus-frame-slot-relation-body">
        {symbolMappings.length > 0 ? (
          <div className="source-editor-frame-symbols focus-related-frame-symbols" data-testid="related-frame-symbols" aria-label={t("accessibility.relatedFrameSymbols")}>
            <span className="compact-label">{t("stackFrame.relatedSymbols")}</span>
            <div className="source-editor-frame-symbol-list">
              {symbolMappings.map((slot) => (
                <button
                  key={slot.mappingId}
                  type="button"
                  className="source-editor-frame-symbol-marker"
                  data-testid="source-editor-frame-symbol-marker"
                  data-slot-id={slot.mappingId}
                  data-symbol-kind={slot.slotKind}
                  data-selected={selectedFrameSlotId === slot.mappingId ? "true" : "false"}
                  aria-pressed={selectedFrameSlotId === slot.mappingId}
                  aria-label={t("accessibility.selectFrameSlotForSymbol", { symbol: slot.symbolName })}
                  title={`${slot.symbolName}. Current: ${slot.currentCircuitRelation}. Future: ${slot.futureCircuitRelation}. Runtime: not available in simple mode.`}
                  onClick={() => onSelectFrameSlot(slot, "source-editor")}
                >
                  <code>{slot.symbolName}</code>
                  <span>{frameSlotKindLabel(slot.slotKind, t)}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <FrameSlotDetail
          mapping={mapping}
          selectionSource={selectionSource}
          emptyText="Select a source chip or Generated CASL slot badge."
        />
      </div>
    </section>
  );
}

function ObservationModeSelector({
  mode,
  onChange
}: {
  mode: ObservationMode;
  onChange: (mode: ObservationMode) => void;
}) {
  const { t } = useI18n();
  const current = observationModes.find((item) => item.id === mode) ?? observationModes[0];

  return (
    <section className="panel observation-mode-bar" data-testid="observation-mode-selector">
      <div className="observation-mode-copy">
        <h2 title={t("accessibility.observationMode")}>{t("accessibility.observationMode")}</h2>
        <span>{current.summary}</span>
      </div>
      <div className="segmented observation-mode-tabs" role="tablist" aria-label={t("accessibility.observationMode")} aria-orientation="horizontal" onKeyDown={handleHorizontalTabListKeyDown}>
        {observationModes.map((item) => {
          const label = t(item.labelKey);
          return (
          <button
            key={item.id}
            type="button"
            className={mode === item.id ? "selected" : ""}
            role="tab"
            aria-selected={mode === item.id}
            tabIndex={mode === item.id ? 0 : -1}
            aria-label={`${t("accessibility.observationMode")}: ${label}`}
            title={item.summary}
            data-testid={`observation-mode-${item.id}`}
            onClick={() => onChange(item.id)}
          >
            {label}
          </button>
          );
        })}
      </div>
    </section>
  );
}

function FocusSourceContextPanel({ focus, sourceMode }: { focus: FocusInstructionContext; sourceMode: SourceMode }) {
  const { t } = useI18n();
  return (
    <section className="panel focus-source-context" data-testid="focus-source-context">
      <header className="panel-header">
        <h2>{t("registerStack.sourceContext")}</h2>
        <span>{sourceMode === "cpp" ? "C++" : "CASL"}</span>
      </header>
      <code className="nowrap-symbol" data-testid="focus-source-context-text" title={focus.sourceText}>{focus.sourceText}</code>
    </section>
  );
}

export default function CircuitFocusLayout({
  state,
  sourceMode,
  sourceText,
  generatedCaslSource,
  cppToCaslMapping,
  cppStorageObjects = [],
  isSourceDirty,
  timelineItems,
  observationMode = "cpu-flow",
  onObservationModeChange = () => undefined,
  initialSelectedFrameSlotId,
  initialSelectionSource = "source-editor",
}: CircuitFocusLayoutProps) {
  const { t } = useI18n();
  const [selectedFrameFunctionName, setSelectedFrameFunctionName] = useState<string | undefined>();
  const [selectedFrameSlot, setSelectedFrameSlot] = useState<SelectedFrameSlot | undefined>();
  const lastAppliedInitialFrameSlotId = useRef<string | undefined>();
  const focus = focusInstructionContext(state, sourceMode, sourceText, cppToCaslMapping);
  const resolvedStorageObjects = useMemo(() => resolveCppStorageObjects(cppStorageObjects, state), [cppStorageObjects, state.symbols]);
  const doubleOperation = useMemo(
    () => doubleOperationForCaslLine(cppToCaslMapping, resolvedStorageObjects, focus.caslLine),
    [cppToCaslMapping, focus.caslLine, resolvedStorageObjects]
  );
  const preferredFunctionName = functionNameFromRoutineLabel(routineLabelForAddress(state, focus.address));
  const framePreview = useMemo(
    () => selectStackFramePreviewState(sourceMode, sourceText, selectedFrameFunctionName ?? selectedFrameSlot?.functionName, preferredFunctionName),
    [sourceMode, sourceText, selectedFrameFunctionName, selectedFrameSlot?.functionName, preferredFunctionName]
  );
  const frameSlotMappings = useMemo(() => stackFramePreviewMappings(framePreview), [framePreview]);
  const selectedFrameSlotMapping = selectedFrameSlot
    ? frameSlotMappings.find((mapping) => mapping.mappingId === selectedFrameSlot.mappingId)
    : undefined;
  const sourceLineSlotMappings = frameSlotMappingsForSourceLine(frameSlotMappings, focus.cppLine);
  const sourceSlotMappings = sourceLineSlotMappings.length > 0 ? sourceLineSlotMappings : frameSlotMappingsForSourceText(frameSlotMappings, focus.sourceText);
  const selectFrameSlot = (mapping: FrameSlotMapping, selectionSource: FrameSlotSelectionSource) => {
    setSelectedFrameFunctionName(mapping.functionName);
    setSelectedFrameSlot({
      mappingId: mapping.mappingId,
      functionName: mapping.functionName,
      slotName: mapping.frameSlotName,
      symbolName: mapping.symbolName,
      sourceLine: mapping.sourceLine,
      staticLabel: currentStaticLabelForMapping(mapping),
      selectionSource
    });
  };
  const selectFrameFunction = (functionName: string) => {
    setSelectedFrameFunctionName(functionName);
    if (selectedFrameSlotMapping?.functionName !== functionName) {
      setSelectedFrameSlot(undefined);
    }
  };

  useEffect(() => {
    if (selectedFrameSlot && !selectedFrameSlotMapping) {
      setSelectedFrameSlot(undefined);
    }
  }, [selectedFrameSlot, selectedFrameSlotMapping]);

  useEffect(() => {
    if (!initialSelectedFrameSlotId) {
      lastAppliedInitialFrameSlotId.current = undefined;
      return;
    }
    if (lastAppliedInitialFrameSlotId.current === initialSelectedFrameSlotId) return;
    if (selectedFrameSlot?.mappingId === initialSelectedFrameSlotId) {
      lastAppliedInitialFrameSlotId.current = initialSelectedFrameSlotId;
      return;
    }
    const mapping = frameSlotMappings.find((candidate) => candidate.mappingId === initialSelectedFrameSlotId);
    if (!mapping) return;
    lastAppliedInitialFrameSlotId.current = initialSelectedFrameSlotId;
    setSelectedFrameFunctionName(mapping.functionName);
    setSelectedFrameSlot({
      mappingId: mapping.mappingId,
      functionName: mapping.functionName,
      slotName: mapping.frameSlotName,
      symbolName: mapping.symbolName,
      sourceLine: mapping.sourceLine,
      staticLabel: currentStaticLabelForMapping(mapping),
      selectionSource: initialSelectionSource
    });
  }, [frameSlotMappings, initialSelectedFrameSlotId, initialSelectionSource]);

  const circuitSubtitle = useMemo(() => {
    if (isSourceDirty) return "Modified source; assemble before stepping.";
    if (!state.assembled) return "Assemble a program to visualize data and control paths.";
    return "Visualize the flow of data and control in COMET-II.";
  }, [isSourceDirty, state.assembled]);

  return (
    <main className="circuit-focus-workspace" data-testid="circuit-focus-layout" data-observation-mode={observationMode}>
      <ObservationModeSelector mode={observationMode} onChange={onObservationModeChange} />

      <aside className="focus-left-column">
        <FocusProgramPanel state={state} sourceMode={sourceMode} sourceText={sourceText} generatedCaslSource={generatedCaslSource} cppToCaslMapping={cppToCaslMapping} focus={focus} />
        <FocusCurrentInstructionPanel state={state} isSourceDirty={isSourceDirty} focus={focus} />
        <FocusDisplayPanel />
      </aside>

      <section className="focus-center-column">
        {observationMode === "code-machine" ? (
          <section className="focus-code-machine-grid" data-testid="focus-code-machine-grid">
            <FocusGeneratedCaslPanel
              sourceMode={sourceMode}
              sourceText={sourceText}
              generatedCaslSource={generatedCaslSource}
              cppToCaslMapping={cppToCaslMapping}
              focus={focus}
              frameSlotMappings={frameSlotMappings}
              selectedFrameSlotId={selectedFrameSlot?.mappingId}
              onSelectFrameSlot={selectFrameSlot}
            />
            <FocusMachineCodePanel state={state} cppToCaslMapping={cppToCaslMapping} />
          </section>
        ) : observationMode === "register-stack" ? (
          <FocusRegisterStackDashboard state={state} />
        ) : (
          <section className="panel focus-circuit-panel" data-testid="focus-circuit-panel">
            <header className="panel-header">
              <div>
                <h2 title={t("circuit.focusMode")}>{t("circuit.focusMode")}</h2>
                <span>{circuitSubtitle}</span>
              </div>
              <span className={`run-pill ${state.runState.toLowerCase()}`}>{t("circuit.machine")}: {translateRunState(t, state.runState)}</span>
            </header>
            <CometCircuitSvg state={state} sourceMapFocus={{ line: focus.caslLine, address: focus.address, instruction: focus.instructionText }} />
          </section>
        )}
        {observationMode === "code-machine" ? (
          <FocusSourceMappingPanel
            focus={focus}
            sourceMode={sourceMode}
            sourceSlotMappings={sourceSlotMappings}
            selectedFrameSlotId={selectedFrameSlot?.mappingId}
            onSelectFrameSlot={selectFrameSlot}
          />
        ) : <FocusTimeline state={state} timelineItems={timelineItems} />}
      </section>

      <aside className="focus-right-column">
        {observationMode === "cpu-flow" ? (
          <>
            <FocusMemoryWindowPanel state={state} rowCount={9} />
            <FocusSignalProbePanel state={state} focus={focus} doubleOperation={doubleOperation} />
            <FocusTracePanel state={state} />
            <FocusSourceContextPanel focus={focus} sourceMode={sourceMode} />
          </>
        ) : observationMode === "register-stack" ? (
          <>
            <FocusStackPreviewPanel state={state} />
            <FocusCallStackPanel state={state} focus={focus} density="compact" />
            <FocusStackFrameViewPanel
              state={state}
              focus={focus}
              preview={framePreview}
              selectedFrameSlotId={selectedFrameSlot?.mappingId}
              selectionSource={selectedFrameSlot?.selectionSource}
              onSelectFrameSlot={selectFrameSlot}
              onFunctionChange={selectFrameFunction}
            />
            <FocusSignalProbePanel state={state} focus={focus} density="compact" selectedFrameSlot={selectedFrameSlotMapping} doubleOperation={doubleOperation} />
            <FocusTracePanel state={state} />
          </>
        ) : (
          <>
            <FocusFrameSlotRelationPanel
              mapping={selectedFrameSlotMapping}
              selectionSource={selectedFrameSlot?.selectionSource}
              frameSlotMappings={frameSlotMappings}
              selectedFrameSlotId={selectedFrameSlot?.mappingId}
              onSelectFrameSlot={selectFrameSlot}
            />
            <FocusTracePanel state={state} />
            <FocusCallStackPanel state={state} focus={focus} density="compact" />
          </>
        )}
      </aside>
    </main>
  );
}
