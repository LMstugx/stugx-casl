import { useMemo } from "react";
import Toolbar from "./components/Toolbar";
import SourceEditor from "./components/SourceEditor";
import InspectorPanel from "./components/InspectorPanel";
import OutputPanel from "./components/OutputPanel";
import StatusBar from "./components/StatusBar";
import CometCircuitSvg from "./visual/CometCircuitSvg";
import { formatWord } from "./core/types";
import { summarizeCurrentInstruction } from "./visual/visualState";
import { AppStoreProvider, useAppStore } from "./store/useAppStore";
import { cppLineForCaslLine } from "./transpiler/cppMapping";

export default function App() {
  return (
    <AppStoreProvider>
      <StudioShell />
    </AppStoreProvider>
  );
}

function StudioShell() {
  const {
    sourceText,
    sourceMode,
    isSourceDirty,
    diagnostics: storeDiagnostics,
    cometState: state,
    assembleStatus,
    backendInfo,
    generatedCaslSource,
    cppToCaslMapping,
    setSourceText,
    setSourceMode,
    assemble,
    step,
    reset,
    clearOutput
  } = useAppStore();
  const canStep = !isSourceDirty && state.assembled && state.runState !== "Finished" && state.runState !== "Error";
  const canReset = !isSourceDirty && (state.assembled || state.runState === "Finished");
  const diagnostics = useMemo(() => storeDiagnostics.filter((diagnostic) => diagnostic.severity === "error"), [storeDiagnostics]);
  const editorCurrentLine = sourceMode === "cpp" ? cppLineForCaslLine(cppToCaslMapping, state.currentLine) : state.currentLine;

  return (
    <div className="app-shell">
      <Toolbar assembleStatus={assembleStatus} canStep={canStep} canReset={canReset} isRunning={state.runState === "Running"} onAssemble={assemble} onStep={step} onReset={reset} />

      <main className="workspace">
        <section className="left-column">
          <section className="panel source-panel">
            <header className="panel-header">
              <h2>Source Editor</h2>
              <div className="source-header-actions">
                <div className="segmented source-mode" aria-label="Source mode">
                  <button type="button" className={sourceMode === "casl" ? "selected" : ""} data-testid="source-mode-casl" onClick={() => setSourceMode("casl")}>
                    CASL
                  </button>
                  <button type="button" className={sourceMode === "cpp" ? "selected" : ""} data-testid="source-mode-cpp" onClick={() => setSourceMode("cpp")}>
                    C++ subset
                  </button>
                </div>
                <span>{sourceMode === "cpp" ? "example.cpp" : "example.casl"}</span>
              </div>
            </header>
            <SourceEditor source={sourceText} language={sourceMode} currentLine={editorCurrentLine} onChange={setSourceText} />
          </section>

          <section className="panel current-panel">
            <header className="panel-header">
              <h2>Current Instruction</h2>
            </header>
            <div className="current-instruction">
              <strong>{summarizeCurrentInstruction(state)}</strong>
              <span>PR {formatWord(state.pr)}</span>
            </div>
          </section>

          <section className="panel errors-panel">
            <header className="panel-header">
              <h2>Errors</h2>
              <span>{diagnostics.length}</span>
            </header>
            {diagnostics.length === 0 ? <p className="muted">No diagnostics.</p> : null}
            {diagnostics.map((diagnostic) => (
              <div key={`${diagnostic.line}-${diagnostic.message}`} className="diagnostic">
                Line {diagnostic.line}: {diagnostic.message}
              </div>
            ))}
          </section>
        </section>

        <section className="center-column">
          <section className="panel circuit-panel">
            <header className="panel-header">
              <div>
                <h2>COMET II Simulator</h2>
              <span>{isSourceDirty ? "Modified / Not assembled" : sourceMode === "cpp" ? "Generated CASL driving COMET-II" : "State-driven SVG circuit"}</span>
              </div>
              <span className={`run-pill ${state.runState.toLowerCase()}`}>{state.runState}</span>
            </header>
            <CometCircuitSvg state={state} />
          </section>

          <section className="panel timeline-panel">
            <header className="panel-header">
              <h2>Step Timeline</h2>
              <span>{state.stepIndex} / 4</span>
            </header>
            <div className="timeline">
              {["Ready", "LD", "ADDA", "ST", "RET"].map((label, index) => {
                const phase = state.stepIndex === index ? "current" : state.stepIndex > index ? "completed" : "pending";
                return (
                <button key={label} className={`timeline-node ${phase}`} type="button" aria-disabled="true" title={label}>
                  <span>{index}</span>
                  <strong>{label}</strong>
                </button>
                );
              })}
            </div>
          </section>
        </section>

        <aside className="right-column">
          <InspectorPanel state={state} />
        </aside>
      </main>

      <OutputPanel
        lines={state.output}
        messages={diagnostics.map((diagnostic) => `Line ${diagnostic.line}: ${diagnostic.message}`)}
        generatedCaslSource={generatedCaslSource}
        cppToCaslMapping={cppToCaslMapping}
        currentCaslLine={sourceMode === "cpp" ? state.currentLine : undefined}
        currentCppLine={editorCurrentLine}
        onClear={clearOutput}
      />
      <StatusBar state={state} backendInfo={backendInfo} />
    </div>
  );
}
