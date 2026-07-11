import { useEffect, useMemo, useState } from "react";
import Toolbar from "./components/Toolbar";
import SourceEditor from "./components/SourceEditor";
import InspectorPanel from "./components/InspectorPanel";
import OutputPanel from "./components/OutputPanel";
import StatusBar from "./components/StatusBar";
import LearningFlowPanel from "./components/LearningFlowPanel";
import DemoGuidePanel from "./components/DemoGuidePanel";
import CircuitFocusLayout from "./components/CircuitFocusLayout";
import CometCircuitSvg from "./visual/CometCircuitSvg";
import { formatWord } from "./core/types";
import { summarizeCurrentInstruction } from "./visual/visualState";
import { AppStoreProvider, useAppStore } from "./store/useAppStore";
import { cppLineForCaslLine } from "./transpiler/cppMapping";
import { selectFrameSymbolRelations } from "./transpiler/framePlanView";
import { demoPrograms, getDefaultDemoProgram, getDemoProgram } from "./examples/demoPrograms";
import { getLearningLesson } from "./examples/learningLessons";

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
    runStopReason,
    backendInfo,
    generatedCaslSource,
    cppToCaslMapping,
    selectedDemoProgramId,
    lessonProgress,
    observationMode,
    setSourceText,
    setSourceMode,
    selectDemoProgram,
    assemble,
    run,
    step,
    reset,
    stop,
    clearOutput,
    toggleLessonStep,
    resetLessonProgress,
    setObservationMode
  } = useAppStore();
  const [isCircuitFocusMode, setCircuitFocusMode] = useState(false);
  const [editorSelectedFrameSlotId, setEditorSelectedFrameSlotId] = useState<string | undefined>();
  const isRunning = state.runState === "Running";
  const canExecute = state.runState === "Ready" || (state.runState === "Stopped" && runStopReason === "manual");
  const canRun = !isSourceDirty && state.assembled && canExecute;
  const canStep = !isSourceDirty && state.assembled && canExecute;
  const canReset = !isSourceDirty && !isRunning && (state.assembled || state.runState === "Finished" || state.runState === "Stopped" || state.sourceMap.length > 0);
  const diagnostics = useMemo(() => storeDiagnostics.filter((diagnostic) => diagnostic.severity === "error"), [storeDiagnostics]);
  const editorCurrentLine = sourceMode === "cpp" ? cppLineForCaslLine(cppToCaslMapping, state.currentLine) : state.currentLine;
  const selectedDemoProgram = getDemoProgram(selectedDemoProgramId) ?? getDefaultDemoProgram();
  const selectedDemoMatchesSource = selectedDemoProgram.source === sourceText && selectedDemoProgram.mode === sourceMode;
  const selectedLesson = selectedDemoMatchesSource ? getLearningLesson(selectedDemoProgram.id) : undefined;
  const selectedLessonProgress = selectedLesson ? (lessonProgress[selectedDemoProgram.id] ?? {}) : {};
  const frameSymbolRelations = useMemo(() => selectFrameSymbolRelations(sourceMode, sourceText), [sourceMode, sourceText]);
  useEffect(() => {
    if (editorSelectedFrameSlotId && !frameSymbolRelations.some((relation) => relation.mappingId === editorSelectedFrameSlotId)) {
      setEditorSelectedFrameSlotId(undefined);
    }
  }, [editorSelectedFrameSlotId, frameSymbolRelations]);
  const timelineItems = useMemo(() => {
    const compactProgram = state.program && state.program.length > 0 && state.program.length <= 4 ? ["Ready", ...state.program.map((instruction) => instruction.op)] : [];
    if (compactProgram.length > 0 || state.trace.length === 0) {
      const labels = compactProgram.length > 0 ? compactProgram : ["Ready", "LD", "ADDA", "ST", "RET"];
      return labels.map((label, index) => ({
        key: label,
        index,
        label,
        phase: state.runState === "Finished" || state.stepIndex > index ? "completed" : state.stepIndex === index ? "current" : "pending"
      }));
    }
    return state.trace
      .slice(0, 5)
      .reverse()
      .map((event) => ({
        key: `${event.index}-${event.address}`,
        index: event.index,
        label: event.instruction,
        phase: event.index === state.stepIndex && state.runState !== "Finished" ? "current" : "completed"
      }));
  }, [state.program, state.runState, state.stepIndex, state.trace]);

  return (
    <div className={isCircuitFocusMode ? "app-shell circuit-focus-active" : "app-shell"}>
      <Toolbar
        assembleStatus={assembleStatus}
        canRun={canRun}
        canStep={canStep}
        canReset={canReset}
        isRunning={isRunning}
        isCircuitFocusMode={isCircuitFocusMode}
        onToggleCircuitFocusMode={() => setCircuitFocusMode((value) => !value)}
        onAssemble={assemble}
        onRun={() => run()}
        onStep={step}
        onReset={reset}
        onStop={stop}
      />

      {isCircuitFocusMode ? (
        <CircuitFocusLayout
          state={state}
          sourceMode={sourceMode}
          sourceText={sourceText}
          generatedCaslSource={generatedCaslSource}
          cppToCaslMapping={cppToCaslMapping}
          isSourceDirty={isSourceDirty}
          timelineItems={timelineItems}
          observationMode={observationMode}
          onObservationModeChange={setObservationMode}
          initialSelectedFrameSlotId={editorSelectedFrameSlotId}
          initialSelectionSource="source-editor"
        />
      ) : (
      <main className="workspace">
        <section className="left-column">
          <section className="panel source-panel">
            <header className="panel-header">
              <h2 title="Source Editor">Source</h2>
              <div className="source-header-actions">
                <label className="demo-program-picker" title={selectedDemoProgram.name}>
                  <span>Demo</span>
                  <select
                    data-testid="demo-program-select"
                    value={selectedDemoProgramId}
                    title={selectedDemoProgram.name}
                    aria-label={`Demo program: ${selectedDemoProgram.name}`}
                    onChange={(event) => selectDemoProgram(event.target.value)}
                  >
                    {demoPrograms.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="segmented source-mode" aria-label="Source mode">
                  <button type="button" className={sourceMode === "casl" ? "selected" : ""} data-testid="source-mode-casl" aria-pressed={sourceMode === "casl"} title="Use CASL source mode" onClick={() => setSourceMode("casl")}>
                    CASL
                  </button>
                  <button type="button" className={sourceMode === "cpp" ? "selected" : ""} data-testid="source-mode-cpp" aria-pressed={sourceMode === "cpp"} title="Use C++ subset source mode" onClick={() => setSourceMode("cpp")}>
                    C++ subset
                  </button>
                </div>
                <span className="source-file-label" title={sourceMode === "cpp" ? "example.cpp" : "example.casl"}>{sourceMode === "cpp" ? "example.cpp" : "example.casl"}</span>
              </div>
            </header>
            <SourceEditor
              source={sourceText}
              language={sourceMode}
              currentLine={editorCurrentLine}
              onChange={setSourceText}
              frameSymbolRelations={frameSymbolRelations}
              selectedFrameSlotId={editorSelectedFrameSlotId}
              onSelectFrameSymbol={(relation) => setEditorSelectedFrameSlotId(relation.mappingId)}
            />
          </section>

          <section className="panel current-panel">
            <header className="panel-header">
              <h2 title="Current Instruction">Current Instruction</h2>
            </header>
            <div className="current-instruction">
              <strong>{summarizeCurrentInstruction(state)}</strong>
              <span>PR {formatWord(state.pr)}</span>
            </div>
          </section>

          <DemoGuidePanel
            program={selectedDemoProgram}
            lesson={selectedLesson}
            lessonProgress={selectedLessonProgress}
            onToggleLessonStep={toggleLessonStep}
            onResetLessonProgress={resetLessonProgress}
          />

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
                <h2 title="COMET II Simulator">COMET II Simulator</h2>
              <span>{isSourceDirty ? "Modified / Not assembled" : sourceMode === "cpp" ? "Generated CASL driving COMET-II" : "State-driven SVG circuit"}</span>
              </div>
              <span className={`run-pill ${state.runState.toLowerCase()}`}>{state.runState}</span>
            </header>
            <CometCircuitSvg state={state} />
          </section>

          <LearningFlowPanel state={state} sourceMode={sourceMode} sourceText={sourceText} generatedCaslSource={generatedCaslSource} cppToCaslMapping={cppToCaslMapping} />

          <section className="panel timeline-panel">
            <header className="panel-header">
              <h2>Step Timeline</h2>
              <span>{state.trace.length ? `recent / ${state.stepIndex}` : `${state.stepIndex} / 4`}</span>
            </header>
            <div className="timeline">
              {timelineItems.map((item) => (
                <div key={item.key} className={`timeline-node ${item.phase}`} aria-current={item.phase === "current" ? "step" : undefined} title={item.label}>
                  <span>{item.index}</span>
                  <strong>{item.label}</strong>
                </div>
              ))}
            </div>
          </section>
        </section>

        <aside className="right-column">
          <InspectorPanel state={state} />
        </aside>
      </main>
      )}

      <OutputPanel
        lines={state.output}
        messages={diagnostics.map((diagnostic) => `Line ${diagnostic.line}: ${diagnostic.message}`)}
        generatedCaslSource={generatedCaslSource}
        cppToCaslMapping={cppToCaslMapping}
        currentCaslLine={sourceMode === "cpp" ? state.currentLine : undefined}
        currentCppLine={editorCurrentLine}
        state={state}
        sourceMode={sourceMode}
        autoOpenGenerated={sourceMode === "cpp" && !isSourceDirty && Boolean(generatedCaslSource)}
        onClear={clearOutput}
      />
      <StatusBar state={state} backendInfo={backendInfo} />
    </div>
  );
}
