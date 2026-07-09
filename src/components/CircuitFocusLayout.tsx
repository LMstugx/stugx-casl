import { useMemo, useState } from "react";
import { selectGeneratedCaslRows } from "../core/generatedCaslRows";
import type { CometState } from "../core/types";
import { VisualPathKind, formatFlags, formatWord } from "../core/types";
import type { SourceMode } from "../store/useAppStore";
import type { CppToCaslMap } from "../transpiler/cppAst";
import { cppLineForCaslLine } from "../transpiler/cppMapping";
import CometCircuitSvg from "../visual/CometCircuitSvg";
import { summarizeCurrentInstruction } from "../visual/visualState";
import MemoryPanel from "./MemoryPanel";
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
};

type FocusTab = "registers" | "memory";

type FocusInstructionContext = {
  caslLine?: number;
  cppLine?: number;
  address?: number;
  instructionText?: string;
  nextInstructionText?: string;
  sourceText: string;
  pipelineStage: string;
};

function sourceLine(source: string, line?: number): string {
  if (!line) return "No active source line";
  return source.split(/\r?\n/)[line - 1]?.trim() || "No active source line";
}

function compactInstructionText(text?: string): string | undefined {
  return text?.replace(/\s+/g, " ").trim();
}

function instructionMnemonic(text: string | undefined, fallback: string): string {
  const match = /\b(NOP|LD|LAD|ST|ADDA|SUBA|ADDL|SUBL|AND|OR|XOR|CPA|CPL|SLA|SRA|SLL|SRL|PUSH|POP|JUMP|JZE|JNZ|JPL|JMI|JOV|RET)\b/i.exec(text ?? "");
  return match?.[1]?.toUpperCase() ?? fallback;
}

function addressOperandLabel(target: string, index?: string): string {
  return index ? `${target}+${index}` : target;
}

function instructionMeaning(text: string | undefined, fallback: string): string {
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
    case "JUMP":
      return `PR <- ${operand}`;
    case "JZE":
    case "JNZ":
    case "JPL":
    case "JMI":
    case "JOV":
      return `conditional PR <- ${operand}`;
    case "RET":
      return "finish execution";
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
  if (state.visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || state.visualPath === VisualPathKind.POP_StackToGr) return 4;
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
            <code>{row.text || " "}</code>
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
  return (
    <section className="panel focus-current-panel" data-testid="focus-current-instruction-panel">
      <header className="panel-header">
        <h2>Current Instruction</h2>
        <span className="pipeline-pill">{isSourceDirty ? "Dirty" : focus.pipelineStage}</span>
      </header>
      <div className="focus-current-body">
        <strong data-testid="focus-current-mnemonic">{instructionMnemonic(focus.instructionText, state.runState)}</strong>
        <code>{focus.instructionText ?? summarizeCurrentInstruction(state)}</code>
        <span>{instructionMeaning(focus.instructionText, summarizeCurrentInstruction(state))}</span>
        <small>
          Current {focus.address !== undefined ? formatWord(focus.address) : "----"} / Next PR {formatWord(state.pr)}
          {focus.nextInstructionText ? ` / Next ${focus.nextInstructionText}` : ""} / MAR {formatWord(state.mar)} / FR {formatFlags(state.fr)}
        </small>
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
            <code>
              PR {formatWord(event.pr ?? event.address)} / {event.instruction}
            </code>
            <span>{traceChangeText(event)}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

type ProbeRow = {
  label: string;
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
      value: registerValue,
      note: "selected register",
      active: registerIndex !== undefined || latest?.changedRegister === registerLabel
    },
    {
      label: "MDR",
      value: formatWord(state.mdr),
      note: "memory buffer",
      active: visualPath === VisualPathKind.LD_MemoryToMdrToGr || visualPath === VisualPathKind.ST_GrToMdrToMemory || visualPath === VisualPathKind.ADDA_GrMdrToAluToGr || visualPath === VisualPathKind.SUBA_GrMdrToAluToGr || visualPath === VisualPathKind.CPA_GrMdrToAluToFr
    },
    {
      label: "ALU.Y",
      value: isAluVisualPath(visualPath) ? formatWord(state.gr[probeRegisterIndex] ?? 0) : "inactive",
      note: "ALU result",
      active: isAluVisualPath(visualPath)
    },
    {
      label: "FR",
      value: formatFlags(state.fr),
      note: "flags",
      active: visualPath === VisualPathKind.CPA_GrMdrToAluToFr || visualPath === VisualPathKind.ADDA_GrMdrToAluToGr || visualPath === VisualPathKind.SUBA_GrMdrToAluToGr || visualPath === VisualPathKind.Shift_AddressToAluToGr
    },
    {
      label: memoryAddress !== undefined ? `MEM[${formatWord(memoryAddress)}]` : "MEM",
      value: memoryValue,
      note: "target memory",
      active: memoryAddress !== undefined && (state.lastMemoryReadAddress === memoryAddress || state.lastMemoryWriteAddress === memoryAddress || state.changedMemoryAddresses.includes(memoryAddress))
    },
    {
      label: "SP",
      value: stackPointerValue,
      note: visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.POP_StackToGr ? "stack pointer" : "stack preview only",
      active: visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.POP_StackToGr
    }
  ];

  if (visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.POP_StackToGr) {
    rows.push({
      label: "STACK",
      value: memoryAddress !== undefined ? `MEM[${formatWord(memoryAddress)}]` : "inactive",
      note: visualPath === VisualPathKind.PUSH_EffectiveAddressToStack ? "stack write" : "stack read",
      active: true
    });
  }

  if (state.lastIndexRegister !== undefined && state.lastEffectiveAddress !== undefined) {
    rows.splice(
      1,
      0,
      {
        label: "BASE",
        value: formatWord(state.lastBaseAddress ?? 0),
        note: "address operand",
        active: true
      },
      {
        label: `GR${state.lastIndexRegister}`,
        value: formatWord(state.lastIndexValue ?? 0),
        note: "index value",
        active: true
      },
      {
        label: "EA",
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

  return rows;
}

function FocusSignalProbePanel({ state, focus }: { state: CometState; focus: FocusInstructionContext }) {
  const rows = signalProbeRows(state, focus);
  const recent = state.trace.slice(0, 5);

  return (
    <section className="panel focus-signal-probe" data-testid="focus-signal-probe">
      <header className="panel-header">
        <div>
          <h2>Signal Probe</h2>
          <span>Read-only nodes</span>
        </div>
        <span>compact</span>
      </header>
      <div className="signal-probe-body">
        <div className="signal-probe-grid">
          {rows.map((row) => (
            <div key={row.label} className="signal-probe-row" data-testid="signal-probe-row" data-active={row.active ? "true" : "false"}>
              <span>{row.label}</span>
              <code>{row.value}</code>
              <small>{row.note}</small>
            </div>
          ))}
        </div>
        <div className="signal-probe-evolution" data-testid="signal-probe-evolution">
          {recent.length === 0 ? <span>No signal changes yet.</span> : recent.map((event) => <span key={`${event.index}-${event.address}`}>{traceChangeText(event)}</span>)}
        </div>
      </div>
    </section>
  );
}

function FocusStackPreviewPanel({ state }: { state: CometState }) {
  const rows = stackPreviewRows(state);

  return (
    <section className="panel focus-stack-preview" data-testid="focus-stack-preview">
      <header className="panel-header">
        <div>
          <h2>Stack Preview</h2>
          <span>Stack path preview only.</span>
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
            <code>{formatWord(row.address)}</code>
            <code>{formatWord(row.value)}</code>
            <span>{row.isWrite ? (row.isSp ? "WRITE / SP" : "WRITE") : row.isRead ? "READ" : row.isSp ? "<- SP" : ""}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FocusInspector({ state }: { state: CometState }) {
  const [activeTab, setActiveTab] = useState<FocusTab>("registers");

  return (
    <section className="panel focus-inspector-panel" data-testid="focus-registers-panel">
      <header className="panel-header">
        <div>
          <h2>Registers / Memory</h2>
          <span>Machine: {state.runState}</span>
        </div>
      </header>
      <div className="tab-list compact-tabs" role="tablist" aria-label="Circuit focus inspector">
        <button className={activeTab === "registers" ? "tab-button active" : "tab-button"} type="button" role="tab" aria-selected={activeTab === "registers"} onClick={() => setActiveTab("registers")}>
          Registers
        </button>
        <button className={activeTab === "memory" ? "tab-button active" : "tab-button"} type="button" role="tab" aria-selected={activeTab === "memory"} onClick={() => setActiveTab("memory")}>
          Memory
        </button>
      </div>
      <div className="tab-content focus-inspector-content">
        {activeTab === "registers" ? <RegisterPanel state={state} embedded /> : <MemoryPanel state={state} embedded />}
      </div>
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
}: CircuitFocusLayoutProps) {
  const focus = focusInstructionContext(state, sourceMode, sourceText, cppToCaslMapping);
  const circuitSubtitle = useMemo(() => {
    if (isSourceDirty) return "Modified source; assemble before stepping.";
    if (!state.assembled) return "Assemble a program to visualize data and control paths.";
    return "Visualize the flow of data and control in COMET-II.";
  }, [isSourceDirty, state.assembled]);

  return (
    <main className="circuit-focus-workspace" data-testid="circuit-focus-layout">
      <aside className="focus-left-column">
        <FocusProgramPanel state={state} sourceMode={sourceMode} sourceText={sourceText} generatedCaslSource={generatedCaslSource} cppToCaslMapping={cppToCaslMapping} focus={focus} />
        <FocusCurrentInstructionPanel state={state} isSourceDirty={isSourceDirty} focus={focus} />
        <FocusDisplayPanel />
      </aside>

      <section className="focus-center-column">
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
        <FocusTimeline state={state} timelineItems={timelineItems} />
      </section>

      <aside className="focus-right-column">
        <FocusInspector state={state} />
        <FocusSignalProbePanel state={state} focus={focus} />
        <FocusStackPreviewPanel state={state} />
        <FocusTracePanel state={state} />
        <section className="panel focus-source-context" data-testid="focus-source-context">
          <header className="panel-header">
            <h2>Source Context</h2>
            <span>{sourceMode === "cpp" ? "C++" : "CASL"}</span>
          </header>
          <code data-testid="focus-source-context-text">{focus.sourceText}</code>
        </section>
      </aside>
    </main>
  );
}
