import { useMemo, useState } from "react";
import { selectGeneratedCaslRows } from "../core/generatedCaslRows";
import { selectMachineCodeRows } from "../core/machineCodeRows";
import type { CometState } from "../core/types";
import { VisualPathKind, formatFlags, formatWord } from "../core/types";
import type { ObservationMode, SourceMode } from "../store/useAppStore";
import type { CppToCaslMap } from "../transpiler/cppAst";
import { cppLineForCaslLine } from "../transpiler/cppMapping";
import CometCircuitSvg from "../visual/CometCircuitSvg";
import { summarizeCurrentInstruction } from "../visual/visualState";
import RegisterPanel from "./RegisterPanel";

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
  isSourceDirty: boolean;
  timelineItems: TimelineItem[];
  observationMode?: ObservationMode;
  onObservationModeChange?: (mode: ObservationMode) => void;
};

const observationModes: Array<{ id: ObservationMode; label: string; summary: string }> = [
  { id: "cpu-flow", label: "CPU Flow", summary: "Circuit / active path / main memory" },
  { id: "register-stack", label: "Registers / Stack", summary: "GR, PR, SP, FR, stack, memory" },
  { id: "code-machine", label: "Code / Machine", summary: "Source, CASL, machine code, trace" }
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

function instructionMeaning(text: string | undefined, fallback: string, visualPath?: VisualPathKind): string {
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
      return visualPath === VisualPathKind.RET_StackToPr ? "PR <- memory[SP]; SP++" : "finish execution";
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
  const hasGeneratedCasl = sourceMode === "cpp" && generatedCaslSource.trim().length > 0;
  const programTitle = hasGeneratedCasl ? "Generated CASL Program" : sourceMode === "cpp" ? "C++ Program" : "CASL Program";
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
          <h2>Program</h2>
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
  return (
    <section className="panel focus-display-panel" data-testid="focus-display-panel">
      <header className="panel-header">
        <h2>OUT Display</h2>
        <span>OUT</span>
      </header>
      <div className="focus-display-value" data-testid="focus-display-value">
        No output
      </div>
    </section>
  );
}

function FocusCurrentInstructionPanel({ state, isSourceDirty, focus }: { state: CometState; isSourceDirty: boolean; focus: FocusInstructionContext }) {
  const instructionText = focus.instructionText ?? summarizeCurrentInstruction(state);
  const semanticText = instructionMeaning(focus.instructionText, summarizeCurrentInstruction(state), activeVisualPath(state));

  return (
    <section className="panel focus-current-panel" data-testid="focus-current-instruction-panel">
      <header className="panel-header">
        <h2 title="Current Instruction">Instruction</h2>
        <span className="pipeline-pill">{isSourceDirty ? "Dirty" : focus.pipelineStage}</span>
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
          aria-label={`Current ${focus.address !== undefined ? formatWord(focus.address) : "----"} / Next PR ${formatWord(state.pr)}${focus.nextInstructionText ? ` / Next ${focus.nextInstructionText}` : ""} / MAR ${formatWord(state.mar)} / FR ${formatFlags(state.fr)}`}
        >
          <span className="compact-label" title="Current PR">Cur PR</span>
          <code className="mono-value">{focus.address !== undefined ? formatWord(focus.address) : "----"}</code>
          <span className="compact-label">MAR</span>
          <code className="mono-value">{formatWord(state.mar)}</code>
          <span className="compact-label">Next PR</span>
          <code className="mono-value">{formatWord(state.pr)}</code>
          <span className="compact-label">FR</span>
          <code className="mono-value">{formatFlags(state.fr)}</code>
          {focus.nextInstructionText ? (
            <>
              <span className="compact-label">Next</span>
              <code className="nowrap-symbol" title={focus.nextInstructionText}>{focus.nextInstructionText}</code>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FocusTimeline({ state, timelineItems }: { state: CometState; timelineItems: TimelineItem[] }) {
  const stages = ["Fetch", "Decode", "Operand Read", "Execute", "Write Back", "Next"];
  const activeIndex = timelineStageIndex(state);
  const stageLabel = pipelineStageLabel(state);

  return (
    <section className="panel focus-timeline-panel" data-testid="focus-step-timeline">
      <header className="panel-header">
        <div>
          <h2>Step Timeline</h2>
          <span>Instruction pipeline view</span>
        </div>
        <span>Pipeline: {stageLabel}</span>
      </header>
      <div className="focus-stage-timeline">
        {stages.map((stage, index) => (
          <div key={stage} className={`focus-stage ${index < activeIndex ? "completed" : index === activeIndex ? "current" : "pending"}`}>
            <span>{index + 1}</span>
            <strong>{stage}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function FocusTracePanel({ state }: { state: CometState }) {
  return (
    <section className="panel focus-trace-panel" data-testid="focus-trace-panel">
      <header className="panel-header">
        <div>
          <h2>Trace</h2>
          <span>Recent steps</span>
        </div>
        <span>{state.trace.length}</span>
      </header>
      <div className="focus-trace-list">
        {state.trace.length === 0 ? <p className="muted">No steps yet.</p> : null}
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

function FocusMemoryWindowPanel({ state, rowCount = 9, title = "Main Memory" }: { state: CometState; rowCount?: number; title?: string }) {
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
          <h2>{title}</h2>
          <span>{rowCount} row window</span>
        </div>
        <span>@{formatWord(centerAddress)}</span>
      </header>
      <div className="focus-memory-window-body">
        <div className="focus-memory-window-row focus-memory-window-head" aria-hidden="true">
          <span>Addr</span>
          <span>Value</span>
          <span>Label</span>
          <span>Mark</span>
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
            <span className="text-ellipsis" title={row.markers.join(" ")}>{row.markers.join(" ")}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FocusRegisterStackDashboard({ state }: { state: CometState }) {
  return (
    <section className="focus-register-stack-dashboard" data-testid="focus-register-stack-dashboard">
      <section className="panel focus-register-bank" data-testid="focus-register-bank">
        <header className="panel-header">
          <div>
            <h2>Register Bank</h2>
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
  focus
}: Pick<CircuitFocusLayoutProps, "sourceMode" | "sourceText" | "generatedCaslSource" | "cppToCaslMapping"> & { focus: FocusInstructionContext }) {
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
          <h2>Generated CASL</h2>
          <span>{hasGeneratedCasl ? "C++ lowering output" : "CASL source rows"}</span>
        </div>
      </header>
      <div className="focus-code-table focus-generated-casl-table">
        <div className="focus-code-row focus-code-head" aria-hidden="true">
          <span className="focus-code-cell-primary">Line</span>
          <span className="focus-code-cell-primary">Label</span>
          <span className="focus-code-cell-primary">Op</span>
          <span className="focus-code-cell-primary">Operand</span>
          <span className="focus-code-cell-secondary">Mapping</span>
        </div>
        {rows.slice(0, 18).map((row) => (
          <div key={`${row.lineNumber}-${row.raw}`} className={`focus-code-row ${row.isCurrent ? "current" : ""}`} data-testid={row.isCurrent ? "focus-generated-casl-current" : "focus-generated-casl-row"}>
            <code className="mono-value focus-code-cell-primary">{String(row.lineNumber).padStart(2, "0")}</code>
            <span className="text-ellipsis focus-code-cell-primary" title={row.label || "-"}>{row.label || "-"}</span>
            <span className="nowrap-symbol focus-code-cell-primary" title={row.opcode || "-"}>{row.opcode || "-"}</span>
            <span className="nowrap-symbol focus-code-cell-primary" title={row.operand || row.raw}>{row.operand || row.raw}</span>
            <span className="text-ellipsis focus-code-cell-secondary" title={row.mappingKinds.join(", ") || "-"}>{row.mappingKinds.join(", ") || "-"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FocusMachineCodePanel({ state, cppToCaslMapping }: { state: CometState; cppToCaslMapping: CppToCaslMap[] }) {
  const rows = selectMachineCodeRows(state, cppToCaslMapping);

  return (
    <section className="panel focus-machine-code-panel" data-testid="focus-machine-code-panel">
      <header className="panel-header">
        <div>
          <h2>Machine Code</h2>
          <span>COMET II words</span>
        </div>
        <span>{rows.length}</span>
      </header>
      <div className="focus-code-table focus-machine-code-table">
        <div className="focus-code-row focus-code-head" aria-hidden="true">
          <span className="focus-code-cell-primary">Addr</span>
          <span className="focus-code-cell-primary">Word</span>
          <span className="focus-code-cell-primary">Source</span>
          <span className="focus-code-cell-secondary">Meaning</span>
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

function FocusSourceMappingPanel({ focus, sourceMode }: { focus: FocusInstructionContext; sourceMode: SourceMode }) {
  const addressText = focus.address === undefined ? "----" : formatWord(focus.address);
  const instructionText = focus.instructionText ?? "No active instruction";

  return (
    <section className="panel focus-source-mapping-panel" data-testid="focus-source-mapping-panel">
      <header className="panel-header">
        <div>
          <h2>Current Source Mapping</h2>
          <span>{sourceMode === "cpp" ? "C++ -> CASL" : "CASL -> machine"}</span>
        </div>
      </header>
      <div className="focus-source-mapping-body">
        <span className="compact-label">Address</span>
        <code className="mono-value">{addressText}</code>
        <span className="compact-label">CASL</span>
        <code className="nowrap-symbol" title={instructionText}>{instructionText}</code>
        <span className="compact-label">Source</span>
        <code className="nowrap-symbol" title={focus.sourceText}>{focus.sourceText}</code>
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

function callStackInfo(state: CometState, focus: FocusInstructionContext): CallStackInfo {
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
      ? "Stack return"
      : state.callDepth > 0
        ? "Stack return"
        : "Top-level finish";
  const edgeText =
    visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr
      ? `Call target ${targetLabel ?? (latest?.effectiveAddress !== undefined ? formatWord(latest.effectiveAddress) : "target")}; return ${latest?.returnAddress !== undefined ? formatWord(latest.returnAddress) : "----"}`
      : visualPath === VisualPathKind.RET_StackToPr
        ? `Return to ${latest?.returnAddress !== undefined ? formatWord(latest.returnAddress) : "caller"} from MEM[${latest?.stackAddress !== undefined ? formatWord(latest.stackAddress) : "SP"}]`
        : state.callDepth === 0
          ? "Program finish"
          : "Waiting for subroutine RET";
  const stackActivityText =
    visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr
      ? "Return address write"
      : visualPath === VisualPathKind.RET_StackToPr
        ? "Return address read"
        : state.callDepth === 0
          ? "Stack activity: none"
          : "waiting";

  return {
    depthText: String(state.callDepth),
    transitionText,
    topReturnText: topReturnAddress !== undefined ? formatWord(topReturnAddress) : "none",
    storedAtText: stackAddress !== undefined ? `MEM[${formatWord(stackAddress)}]` : "none",
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

  if (row.note === "selected register") return 10;
  if (row.label === "EA") return 14;
  if (row.label === "ALU.Y" && row.active) return 16;
  if (row.label === "MDR" && row.active) return 18;
  if (row.label.startsWith("MEM[") && row.active) return 20;
  if (row.label === "MEM" && row.active) return 20;
  if (row.label === "FR" && row.active) return 24;
  if (row.label === "BASE") return 56;
  if (row.note === "index value") return 58;
  if (row.label === "MAR") return 60;
  if (row.label === "SP") return 68;
  return row.active ? 40 : 90;
}

function orderSignalProbeRows(rows: ProbeRow[], visualPath: VisualPathKind): ProbeRow[] {
  return [...rows].sort((left, right) => signalProbePriority(left, visualPath) - signalProbePriority(right, visualPath));
}

function signalProbeRows(state: CometState, focus: FocusInstructionContext): ProbeRow[] {
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
      title: `${registerLabel} selected register`,
      value: registerValue,
      note: "selected register",
      active: registerIndex !== undefined || latest?.changedRegister === registerLabel
    },
    {
      label: "MDR",
      title: "Memory data register",
      value: formatWord(state.mdr),
      note: "memory data register",
      active: visualPath === VisualPathKind.LD_MemoryToMdrToGr || visualPath === VisualPathKind.ST_GrToMdrToMemory || visualPath === VisualPathKind.ADDA_GrMdrToAluToGr || visualPath === VisualPathKind.SUBA_GrMdrToAluToGr || visualPath === VisualPathKind.CPA_GrMdrToAluToFr || visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.POP_StackToGr || visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr || visualPath === VisualPathKind.RET_StackToPr
    },
    {
      label: "ALU.Y",
      title: "ALU output Y",
      value: isAluVisualPath(visualPath) ? formatWord(state.gr[probeRegisterIndex] ?? 0) : "inactive",
      note: "ALU result",
      active: isAluVisualPath(visualPath)
    },
    {
      label: "FR",
      title: "Flag register",
      value: formatFlags(state.fr),
      note: "flags",
      active: visualPath === VisualPathKind.CPA_GrMdrToAluToFr || visualPath === VisualPathKind.ADDA_GrMdrToAluToGr || visualPath === VisualPathKind.SUBA_GrMdrToAluToGr || visualPath === VisualPathKind.Shift_AddressToAluToGr
    },
    {
      label: "MEM",
      title: memoryAddress !== undefined ? `Memory target MEM[${formatWord(memoryAddress)}]` : "Memory target",
      value: memoryValue,
      note: memoryAddress !== undefined ? `target MEM[${formatWord(memoryAddress)}]` : "target memory",
      active: memoryAddress !== undefined && (state.lastMemoryReadAddress === memoryAddress || state.lastMemoryWriteAddress === memoryAddress || state.changedMemoryAddresses.includes(memoryAddress))
    },
    {
      label: "SP",
      title: "Stack pointer",
      value: stackPointerValue,
      note: visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.POP_StackToGr || visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr || visualPath === VisualPathKind.RET_StackToPr ? "stack pointer" : "stack preview only",
      active: visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.POP_StackToGr || visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr || visualPath === VisualPathKind.RET_StackToPr
    }
  ];

  if (visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.POP_StackToGr || visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr || visualPath === VisualPathKind.RET_StackToPr) {
    rows.push({
      label: "STACK",
      displayLabel: "Stack",
      title: visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr ? "Stack write" : "Stack read",
      value: memoryAddress !== undefined ? `MEM[${formatWord(memoryAddress)}]` : "inactive",
      note: visualPath === VisualPathKind.PUSH_EffectiveAddressToStack
        ? "Stack write"
        : visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr
          ? "Return address write"
          : visualPath === VisualPathKind.RET_StackToPr
            ? "Return address read"
            : "Stack read",
      active: true
    });
  }

  if (visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr || visualPath === VisualPathKind.RET_StackToPr) {
    rows.push(
      {
        label: "RETADDR",
        displayLabel: "Return",
        title: "Return address",
        value: latest?.returnAddress !== undefined ? formatWord(latest.returnAddress) : formatWord(state.pr),
        note: visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr ? "return address" : "return target",
        active: true
      },
      {
        label: "CALLDEPTH",
        displayLabel: "Depth",
        title: "Call depth",
        value:
          latest?.callDepthBefore !== undefined && latest.callDepthAfter !== undefined
            ? `${latest.callDepthBefore} -> ${latest.callDepthAfter}`
            : String(state.callDepth),
        note: "call frames",
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
        displayLabel: "Base",
        title: "Base address operand",
        value: formatWord(state.lastBaseAddress ?? 0),
        note: "address operand",
        active: true
      },
      {
        label: "INDEX",
        displayLabel: "Index",
        title: `Index register GR${state.lastIndexRegister}`,
        value: `GR${state.lastIndexRegister}=${formatWord(state.lastIndexValue ?? 0)}`,
        note: "index register",
        active: true
      },
      {
        label: "EA",
        title: "Effective address",
        value: formatWord(state.lastEffectiveAddress),
        note: "base + index",
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
  const info = callStackInfo(state, focus);
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <section className="panel focus-call-stack" data-testid="focus-call-stack">
      <header className="panel-header">
        <div>
          <h2>Call Stack</h2>
          <span>{info.active ? "Return activity" : "Subroutine context"}</span>
        </div>
        <span>Depth {info.depthText}</span>
      </header>
      <div className="call-stack-body card-overflow-safe" data-active={info.active ? "true" : "false"} data-density={density}>
        <div className="call-stack-summary" data-testid="call-stack-summary">
          <div>
            <span className="compact-label">Depth</span>
            <code data-testid="call-stack-depth">{info.depthText}</code>
            <small className="secondary-note">{info.transitionText ? "changed" : "current"}</small>
          </div>
          <div>
            <span className="compact-label">Mode</span>
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
            Details
          </summary>
          <div id="call-stack-detail-rows" className="call-stack-detail-rows">
          <div className="call-stack-row">
            <span className="compact-label">Return</span>
            <code data-testid="call-stack-return-address">{info.topReturnText}</code>
            <small className="secondary-note text-ellipsis" title={info.stackActivityText}>{info.stackActivityText}</small>
          </div>
          <div className="call-stack-row">
            <span className="compact-label">Stored at</span>
            <code className="nowrap-symbol" title={info.storedAtText}>{info.storedAtText}</code>
            <small className="secondary-note text-ellipsis" title={info.edgeText}>{info.edgeText}</small>
          </div>
          <div className="call-stack-row">
            <span className="compact-label">Routine</span>
            <code data-testid="call-stack-routine">{info.routineText}</code>
            <small className="secondary-note">current / target</small>
          </div>
          <div className="call-stack-row call-stack-row-wide">
            <span className="compact-label">Depth change</span>
            <code className="nowrap-symbol" title={info.transitionText ?? "none"}>{info.transitionText ?? "none"}</code>
          </div>
          </div>
        </details>
      </div>
    </section>
  );
}

function FocusSignalProbePanel({ state, focus, density = "normal" }: { state: CometState; focus: FocusInstructionContext; density?: FocusPanelDensity }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const rows = signalProbeRows(state, focus);
  const activeRows = rows.filter((row) => row.active);
  const inactiveRows = rows.filter((row) => !row.active);
  const primaryLimit = 3;
  const primaryRows = [...activeRows, ...inactiveRows].slice(0, primaryLimit);
  const detailRows = [...activeRows, ...inactiveRows].slice(primaryLimit);
  const recent = density === "compact" ? [] : state.trace.slice(0, 3);

  return (
    <section className="panel focus-signal-probe" data-testid="focus-signal-probe">
      <header className="panel-header">
        <div>
          <h2>Signal Probe</h2>
          <span>Read-only nodes</span>
        </div>
        <span>compact</span>
      </header>
      <div className="signal-probe-body card-overflow-safe" data-density={density}>
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
              + {detailRows.length} more
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
          aria-label={recent.length ? "Recent signal changes" : "No signal changes yet."}
        >
          {recent.length ? (
            recent.map((event) => <span key={`${event.index}-${event.address}`} title={traceChangeText(event)}>{traceChangeText(event)}</span>)
          ) : (
            <span title="No signal changes yet.">No signal changes yet.</span>
          )}
        </div>
      </div>
    </section>
  );
}

function FocusStackPreviewPanel({ state }: { state: CometState }) {
  const rows = stackPreviewRows(state);
  const visualPath = activeVisualPath(state);
  const stackActive =
    visualPath === VisualPathKind.PUSH_EffectiveAddressToStack ||
    visualPath === VisualPathKind.POP_StackToGr ||
    visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr ||
    visualPath === VisualPathKind.RET_StackToPr;
  const writeNote =
    visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr
      ? "Return address write"
      : visualPath === VisualPathKind.PUSH_EffectiveAddressToStack
        ? "Stack write"
        : "WRITE";
  const readNote =
    visualPath === VisualPathKind.RET_StackToPr
      ? "Return address read"
      : visualPath === VisualPathKind.POP_StackToGr
        ? "Stack read"
        : "READ";

  return (
    <section className="panel focus-stack-preview" data-testid="focus-stack-preview">
      <header className="panel-header">
        <div>
          <h2>Stack Preview</h2>
          <span>{stackActive ? "Stack path active." : "Stack path preview only."}</span>
        </div>
        <span>SP {formatWord(state.sp)}</span>
      </header>
      <div className="stack-preview-body" data-testid="stack-preview-window">
        <div className="stack-preview-grid stack-preview-head" aria-hidden="true">
          <span>Addr</span>
          <span>Value</span>
          <span>Note</span>
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

function ObservationModeSelector({
  mode,
  onChange
}: {
  mode: ObservationMode;
  onChange: (mode: ObservationMode) => void;
}) {
  const current = observationModes.find((item) => item.id === mode) ?? observationModes[0];

  return (
    <section className="panel observation-mode-bar" data-testid="observation-mode-selector">
      <div className="observation-mode-copy">
        <h2>Observation Mode</h2>
        <span>{current.summary}</span>
      </div>
      <div className="segmented observation-mode-tabs" role="tablist" aria-label="Observation mode">
        {observationModes.map((item) => (
          <button
            key={item.id}
            type="button"
            className={mode === item.id ? "selected" : ""}
            role="tab"
            aria-selected={mode === item.id}
            aria-label={`Observation mode: ${item.label}`}
            title={item.summary}
            data-testid={`observation-mode-${item.id}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function FocusSourceContextPanel({ focus, sourceMode }: { focus: FocusInstructionContext; sourceMode: SourceMode }) {
  return (
    <section className="panel focus-source-context" data-testid="focus-source-context">
      <header className="panel-header">
        <h2>Source Context</h2>
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
  isSourceDirty,
  timelineItems,
  observationMode = "cpu-flow",
  onObservationModeChange = () => undefined,
}: CircuitFocusLayoutProps) {
  const focus = focusInstructionContext(state, sourceMode, sourceText, cppToCaslMapping);
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
            <FocusGeneratedCaslPanel sourceMode={sourceMode} sourceText={sourceText} generatedCaslSource={generatedCaslSource} cppToCaslMapping={cppToCaslMapping} focus={focus} />
            <FocusMachineCodePanel state={state} cppToCaslMapping={cppToCaslMapping} />
          </section>
        ) : observationMode === "register-stack" ? (
          <FocusRegisterStackDashboard state={state} />
        ) : (
          <section className="panel focus-circuit-panel" data-testid="focus-circuit-panel">
            <header className="panel-header">
              <div>
                <h2>Circuit Focus Mode</h2>
                <span>{circuitSubtitle}</span>
              </div>
              <span className={`run-pill ${state.runState.toLowerCase()}`}>Machine: {state.runState}</span>
            </header>
            <CometCircuitSvg state={state} sourceMapFocus={{ line: focus.caslLine, address: focus.address, instruction: focus.instructionText }} />
          </section>
        )}
        {observationMode === "code-machine" ? <FocusSourceMappingPanel focus={focus} sourceMode={sourceMode} /> : <FocusTimeline state={state} timelineItems={timelineItems} />}
      </section>

      <aside className="focus-right-column">
        {observationMode === "cpu-flow" ? (
          <>
            <FocusMemoryWindowPanel state={state} rowCount={9} />
            <FocusSignalProbePanel state={state} focus={focus} />
            <FocusTracePanel state={state} />
            <FocusSourceContextPanel focus={focus} sourceMode={sourceMode} />
          </>
        ) : observationMode === "register-stack" ? (
          <>
            <FocusStackPreviewPanel state={state} />
            <FocusCallStackPanel state={state} focus={focus} density="compact" />
            <FocusSignalProbePanel state={state} focus={focus} density="compact" />
            <FocusTracePanel state={state} />
          </>
        ) : (
          <>
            <FocusTracePanel state={state} />
            <FocusCallStackPanel state={state} focus={focus} density="compact" />
            <FocusSignalProbePanel state={state} focus={focus} density="compact" />
          </>
        )}
      </aside>
    </main>
  );
}
