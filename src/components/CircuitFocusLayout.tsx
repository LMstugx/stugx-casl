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

function sourceLine(source: string, line?: number): string {
  if (!line) return "No active source line";
  return source.split(/\r?\n/)[line - 1]?.trim() || "No active source line";
}

function instructionMnemonic(state: CometState): string {
  const text = state.lastStep?.executedInstruction ?? state.currentInstruction ?? "";
  const match = /\b(NOP|LD|LAD|ST|ADDA|SUBA|ADDL|SUBL|AND|OR|XOR|CPA|CPL|JUMP|JZE|JNZ|JPL|JMI|JOV|RET)\b/i.exec(text);
  return match?.[1]?.toUpperCase() ?? state.runState;
}

function instructionMeaning(state: CometState): string {
  const text = state.lastStep?.executedInstruction ?? state.currentInstruction ?? "";
  const compact = text.replace(/\s+/g, " ").trim();
  const [mnemonic = "", operand = ""] = compact.split(/\s+/, 2);
  const [register = "", target = ""] = operand.split(",").map((part) => part.trim());

  switch (mnemonic.toUpperCase()) {
    case "LD":
      return `${register} <- memory[${target}]`;
    case "LAD":
      return `${register} <- address ${target}`;
    case "ST":
      return `memory[${target}] <- ${register}`;
    case "ADDA":
    case "ADDL":
      return `${register} <- ${register} + ${target}`;
    case "SUBA":
    case "SUBL":
      return `${register} <- ${register} - ${target}`;
    case "AND":
    case "OR":
    case "XOR":
      return `${register} <- ${register} ${mnemonic.toUpperCase()} ${target}`;
    case "CPA":
    case "CPL":
      return `FR <- compare ${register}, ${target}`;
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
      return summarizeCurrentInstruction(state);
  }
}

function timelineStageIndex(state: CometState): number {
  if (!state.assembled || state.runState === "Dirty" || state.runState === "Idle") return 0;
  if (state.runState === "Finished") return 5;
  if (state.visualPath === VisualPathKind.Ready_PrToMar) return 0;
  if (state.visualPath === VisualPathKind.LD_MemoryToMdrToGr) return 2;
  if (state.visualPath === VisualPathKind.ST_GrToMdrToMemory) return 4;
  if (
    state.visualPath === VisualPathKind.ADDA_GrMdrToAluToGr ||
    state.visualPath === VisualPathKind.SUBA_GrMdrToAluToGr ||
    state.visualPath === VisualPathKind.CPA_GrMdrToAluToFr
  ) {
    return 3;
  }
  if (state.visualPath === VisualPathKind.Jump_AddressToPr || state.visualPath === VisualPathKind.ConditionalJump_AddressToPr || state.visualPath === VisualPathKind.ConditionalJump_NotTaken) {
    return 5;
  }
  return 1;
}

function FocusProgramPanel({
  state,
  sourceMode,
  sourceText,
  generatedCaslSource,
  cppToCaslMapping,
}: Pick<CircuitFocusLayoutProps, "state" | "sourceMode" | "sourceText" | "generatedCaslSource" | "cppToCaslMapping">) {
  const hasGeneratedCasl = sourceMode === "cpp" && generatedCaslSource.trim().length > 0;
  const programTitle = hasGeneratedCasl ? "Generated CASL Program" : sourceMode === "cpp" ? "C++ Program" : "CASL Program";
  const currentLine = hasGeneratedCasl ? state.currentLine : sourceMode === "cpp" ? cppLineForCaslLine(cppToCaslMapping, state.currentLine) : state.currentLine;
  const rows = hasGeneratedCasl
    ? selectGeneratedCaslRows(generatedCaslSource, cppToCaslMapping, state.currentLine, cppLineForCaslLine(cppToCaslMapping, state.currentLine)).map((row) => ({
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
        <h2>Display</h2>
        <span>OUT</span>
      </header>
      <div className="focus-display-value" data-testid="focus-display-value">
        No output
      </div>
    </section>
  );
}

function FocusCurrentInstructionPanel({ state, isSourceDirty }: { state: CometState; isSourceDirty: boolean }) {
  return (
    <section className="panel focus-current-panel" data-testid="focus-current-instruction-panel">
      <header className="panel-header">
        <h2>Current Instruction</h2>
        <span className={`run-pill ${state.runState.toLowerCase()}`}>{isSourceDirty ? "Dirty" : state.runState}</span>
      </header>
      <div className="focus-current-body">
        <strong data-testid="focus-current-mnemonic">{instructionMnemonic(state)}</strong>
        <code>{state.lastStep?.executedInstruction ?? state.currentInstruction ?? summarizeCurrentInstruction(state)}</code>
        <span>{instructionMeaning(state)}</span>
        <small>
          PR {formatWord(state.pr)} / MAR {formatWord(state.mar)} / FR {formatFlags(state.fr)}
        </small>
      </div>
    </section>
  );
}

function FocusTimeline({ state, timelineItems }: { state: CometState; timelineItems: TimelineItem[] }) {
  const stages = ["Fetch", "Decode", "Operand Read", "Execute", "Write Back", "Next"];
  const activeIndex = timelineStageIndex(state);

  return (
    <section className="panel focus-timeline-panel" data-testid="focus-step-timeline">
      <header className="panel-header">
        <div>
          <h2>Step Timeline</h2>
          <span>Instruction pipeline view</span>
        </div>
        <span>{timelineItems[0]?.label ?? state.runState}</span>
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
        {state.trace.slice(0, 6).map((event) => (
          <article key={`${event.index}-${event.address}`} className="focus-trace-item">
            <strong>#{event.index}</strong>
            <code>
              PR {formatWord(event.pr ?? event.address)} / {event.instruction}
            </code>
            <span>{event.changedRegister ? `${event.changedRegister} updated` : event.changedMemoryAddress !== undefined ? `MEM[${formatWord(event.changedMemoryAddress)}] updated` : event.visualPath ?? "control"}</span>
          </article>
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
          <span>{state.runState}</span>
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
  const currentCppLine = sourceMode === "cpp" ? cppLineForCaslLine(cppToCaslMapping, state.currentLine) : undefined;
  const currentSource = sourceMode === "cpp" ? sourceLine(sourceText, currentCppLine) : sourceLine(sourceText, state.currentLine);
  const circuitSubtitle = useMemo(() => {
    if (isSourceDirty) return "Modified source; assemble before stepping.";
    if (!state.assembled) return "Assemble a program to visualize data and control paths.";
    return "Visualize the flow of data and control in COMET-II.";
  }, [isSourceDirty, state.assembled]);

  return (
    <main className="circuit-focus-workspace" data-testid="circuit-focus-layout">
      <aside className="focus-left-column">
        <FocusProgramPanel state={state} sourceMode={sourceMode} sourceText={sourceText} generatedCaslSource={generatedCaslSource} cppToCaslMapping={cppToCaslMapping} />
        <FocusDisplayPanel />
        <FocusCurrentInstructionPanel state={state} isSourceDirty={isSourceDirty} />
      </aside>

      <section className="focus-center-column">
        <section className="panel focus-circuit-panel" data-testid="focus-circuit-panel">
          <header className="panel-header">
            <div>
              <h2>Circuit Focus Mode</h2>
              <span>{circuitSubtitle}</span>
            </div>
            <span className={`run-pill ${state.runState.toLowerCase()}`}>{state.runState}</span>
          </header>
          <CometCircuitSvg state={state} />
        </section>
        <FocusTimeline state={state} timelineItems={timelineItems} />
      </section>

      <aside className="focus-right-column">
        <FocusInspector state={state} />
        <FocusTracePanel state={state} />
        <section className="panel focus-source-context">
          <header className="panel-header">
            <h2>Source Context</h2>
            <span>{sourceMode === "cpp" ? "C++" : "CASL"}</span>
          </header>
          <code>{currentSource}</code>
        </section>
      </aside>
    </main>
  );
}
