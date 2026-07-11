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
import { I18nProvider } from "./i18n/I18nProvider";
import { translateRunState } from "./i18n/locale";
import { useI18n } from "./i18n/useI18n";
import { diagnosticIdentity, renderDiagnostic } from "./diagnostics/renderDiagnostic";
import type { SourceRange } from "./diagnostics/types";

export default function App() {
  return (
    <I18nProvider>
      <AppStoreProvider>
        <StudioShell />
      </AppStoreProvider>
    </I18nProvider>
  );
}

function StudioShell() {
  const { locale, t } = useI18n();
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
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string | undefined>();
  const isRunning = state.runState === "Running";
  const canExecute = state.runState === "Ready" || (state.runState === "Stopped" && runStopReason === "manual");
  const canRun = !isSourceDirty && state.assembled && canExecute;
  const canStep = !isSourceDirty && state.assembled && canExecute;
  const canReset = !isSourceDirty && !isRunning && (state.assembled || state.runState === "Finished" || state.runState === "Stopped" || state.sourceMap.length > 0);
  const diagnostics = useMemo(
    () => storeDiagnostics
      .filter((diagnostic) => diagnostic.severity === "error")
      .map((diagnostic) => ({
        source: diagnostic,
        rendered: renderDiagnostic(diagnostic, locale),
        identity: diagnosticIdentity(diagnostic),
        displayLine: diagnostic.sourceRange?.start.line ?? diagnostic.line
      })),
    [locale, storeDiagnostics]
  );
  const editorCurrentLine = sourceMode === "cpp" ? cppLineForCaslLine(cppToCaslMapping, state.currentLine) : state.currentLine;
  const selectedDiagnosticRange: SourceRange | undefined = diagnostics.find((diagnostic) => diagnostic.identity === selectedDiagnosticId)?.source.sourceRange;
  useEffect(() => {
    if (selectedDiagnosticId && !diagnostics.some((diagnostic) => diagnostic.identity === selectedDiagnosticId)) setSelectedDiagnosticId(undefined);
  }, [diagnostics, selectedDiagnosticId]);
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
    const compactProgram = state.program && state.program.length > 0 && state.program.length <= 4 ? [t("status.ready"), ...state.program.map((instruction) => instruction.op)] : [];
    if (compactProgram.length > 0 || state.trace.length === 0) {
      const labels = compactProgram.length > 0 ? compactProgram : [t("status.ready"), "LD", "ADDA", "ST", "RET"];
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
  }, [state.program, state.runState, state.stepIndex, state.trace, t]);

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
              <h2 title="Source Editor">{t("panel.source")}</h2>
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
              onChange={(nextSource) => {
                setSelectedDiagnosticId(undefined);
                setSourceText(nextSource);
              }}
              diagnosticRange={selectedDiagnosticRange}
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
              <h2>{t("diagnostic.errors")}</h2>
              <span>{diagnostics.length}</span>
            </header>
            {diagnostics.length === 0 ? <p className="muted">{t("empty.noDiagnostics")}</p> : null}
            {diagnostics.map(({ source, rendered, identity, displayLine }) => (
              <div key={identity} className="diagnostic-entry" data-selected={selectedDiagnosticId === identity ? "true" : "false"}>
                <button
                  type="button"
                  className="diagnostic"
                  data-diagnostic-code={source.code ?? "legacy"}
                  aria-pressed={selectedDiagnosticId === identity}
                  onClick={() => setSelectedDiagnosticId(identity)}
                >
                  <span className="diagnostic-location">{t("diagnostic.line", { line: displayLine })}</span>
                  <span className="diagnostic-message">{rendered.message}</span>
                  {source.code ? <span className="diagnostic-code" title={t("diagnostic.code", { code: source.code })}>{source.code}</span> : null}
                </button>
                {source.code || source.producer || source.rawContext || source.relatedLocations?.length ? (
                  <details className="diagnostic-related">
                    <summary>{t("common.details")}</summary>
                    {source.code ? <span>{t("diagnostic.code", { code: source.code })}</span> : null}
                    {source.producer ? <span>{t("diagnostic.producer", { producer: source.producer })}</span> : null}
                    {source.rawContext ? <span title={source.rawContext}>{t("diagnostic.rawContext")}: {source.rawContext}</span> : null}
                    {source.relatedLocations?.length ? <strong>{t("diagnostic.relatedLocations")}</strong> : null}
                    {source.relatedLocations?.map((location, relatedIndex) => (
                      <span key={`${location.sourceRange.start.line}:${location.sourceRange.start.column}:${relatedIndex}`}>
                        {location.label === "diagnostic.openingDelimiterHere" ? t("diagnostic.openingDelimiterHere") : t("diagnostic.firstDeclaredHere")} - {t("diagnostic.line", { line: location.sourceRange.start.line })}
                      </span>
                    ))}
                  </details>
                ) : null}
              </div>
            ))}
          </section>
        </section>

        <section className="center-column">
          <section className="panel circuit-panel">
            <header className="panel-header">
              <div>
                <h2 title={t("circuit.simulator")}>{t("circuit.simulator")}</h2>
              <span>{isSourceDirty ? t("status.dirty") : sourceMode === "cpp" ? t("circuit.generatedCaslDriving") : t("circuit.focusMode")}</span>
              </div>
              <span className={`run-pill ${state.runState.toLowerCase()}`}>{translateRunState(t, state.runState)}</span>
            </header>
            <CometCircuitSvg state={state} />
          </section>

          <LearningFlowPanel state={state} sourceMode={sourceMode} sourceText={sourceText} generatedCaslSource={generatedCaslSource} cppToCaslMapping={cppToCaslMapping} />

          <section className="panel timeline-panel">
            <header className="panel-header">
              <h2>{t("timeline.title")}</h2>
              <span>{state.trace.length ? `${t("timeline.recent")} / ${state.stepIndex}` : `${state.stepIndex} / 4`}</span>
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
        messages={diagnostics.map(({ rendered, displayLine }) => `${t("diagnostic.line", { line: displayLine })}: ${rendered.message}`)}
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
