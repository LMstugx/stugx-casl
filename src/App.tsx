import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { demoPrograms, getDemoProgram } from "./examples/demoPrograms";
import { getLearningLesson } from "./examples/learningLessons";
import { I18nProvider } from "./i18n/I18nProvider";
import { translateRunState } from "./i18n/locale";
import { useI18n } from "./i18n/useI18n";
import { diagnosticIdentity, renderDiagnostic } from "./diagnostics/renderDiagnostic";
import { formatDiagnosticDeveloperDetail } from "./diagnostics/presentation";
import type { SourceRange } from "./diagnostics/types";
import FileOperationNotice, { type FileOperationNoticeModel } from "./components/FileOperationNotice";
import UnsavedOpenDialog from "./components/UnsavedOpenDialog";
import { BrowserTextFileAdapter } from "./documents/browserTextFileAdapter";
import { DocumentSessionController, type SaveDocumentResult } from "./documents/documentSessionController";
import { createSequentialDocumentIdFactory } from "./documents/idFactory";
import { createIdleFileLifecycleState } from "./documents/lifecycle";
import type { TextFileAdapter } from "./documents/fileAdapter";

type AppProps = { fileAdapter?: TextFileAdapter };

export default function App({ fileAdapter }: AppProps = {}) {
  const resolvedFileAdapter = useMemo(() => fileAdapter ?? new BrowserTextFileAdapter(), [fileAdapter]);
  return (
    <I18nProvider>
      <AppStoreProvider>
        <StudioShell fileAdapter={resolvedFileAdapter} />
      </AppStoreProvider>
    </I18nProvider>
  );
}

function StudioShell({ fileAdapter }: { fileAdapter: TextFileAdapter }) {
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
    currentDocument,
    currentWriteBinding,
    documentDirty,
    sourceUnitId,
    fileLifecycle,
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
    setObservationMode,
    replaceCurrentDocument,
    commitSavedDocument,
    setFileLifecycle
  } = useAppStore();
  const [isCircuitFocusMode, setCircuitFocusMode] = useState(false);
  const [editorSelectedFrameSlotId, setEditorSelectedFrameSlotId] = useState<string | undefined>();
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string | undefined>();
  const [diagnosticNavigationRange, setDiagnosticNavigationRange] = useState<SourceRange | undefined>();
  const [showUnsavedOpenGuard, setShowUnsavedOpenGuard] = useState(false);
  const [fileNotice, setFileNotice] = useState<FileOperationNoticeModel | null>(null);
  const openIdsRef = useRef(createSequentialDocumentIdFactory("browser-open"));
  const currentDocumentRef = useRef(currentDocument);
  const writeBindingRef = useRef(currentWriteBinding);
  const mountedRef = useRef(true);
  const documentController = useMemo(() => new DocumentSessionController(fileAdapter, openIdsRef.current), [fileAdapter]);
  currentDocumentRef.current = currentDocument;

  useEffect(() => {
    const previous = writeBindingRef.current;
    if (previous && (!currentWriteBinding || currentWriteBinding.documentId !== previous.documentId)) {
      documentController.releaseDocumentBinding(previous.documentId);
    }
    writeBindingRef.current = currentWriteBinding;
  }, [currentWriteBinding, documentController]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      documentController.invalidateActiveOperation();
      if (fileAdapter instanceof BrowserTextFileAdapter) fileAdapter.dispose();
    };
  }, [documentController, fileAdapter]);

  const performOpen = useCallback(async (allowDiscard: boolean) => {
    const snapshot = currentDocumentRef.current;
    setFileNotice(null);
    const pending = documentController.requestOpen({
      currentDocument: snapshot,
      allowDiscard,
      isCurrentDocument: (documentId) => currentDocumentRef.current.documentId === documentId
    });
    const operationId = documentController.operationId;
    if (operationId) {
      setFileLifecycle({ status: "opening", operationId, pendingDocumentId: snapshot.documentId, lastFailure: null });
    }
    const result = await pending;
    if (!mountedRef.current) return;
    if (result.status === "opened" && currentDocumentRef.current.documentId === snapshot.documentId) {
      documentController.releaseDocumentBinding(snapshot.documentId);
      setSelectedDiagnosticId(undefined);
      setDiagnosticNavigationRange(undefined);
      setEditorSelectedFrameSlotId(undefined);
      currentDocumentRef.current = result.document;
      replaceCurrentDocument(result.document);
      return;
    }
    if (result.status === "failed") {
      setFileNotice({ type: "failure", operation: "open", failure: result.failure });
      setFileLifecycle({ ...createIdleFileLifecycleState(), lastFailure: result.failure });
      return;
    }
    setFileLifecycle(createIdleFileLifecycleState());
  }, [documentController, replaceCurrentDocument, setFileLifecycle]);

  const performSave = useCallback(async (forceSaveAs = false): Promise<SaveDocumentResult> => {
    const snapshot = currentDocumentRef.current;
    const willSaveAs = forceSaveAs || !currentWriteBinding || snapshot.saveCapability !== "save";
    setFileNotice(null);
    const pending = willSaveAs
      ? documentController.requestSaveAs({ currentDocument: snapshot, writeBinding: currentWriteBinding, getCurrentDocument: () => currentDocumentRef.current })
      : documentController.requestSave({ currentDocument: snapshot, writeBinding: currentWriteBinding, getCurrentDocument: () => currentDocumentRef.current });
    const operationId = documentController.operationId;
    if (operationId) {
      setFileLifecycle({ status: willSaveAs ? "save-as" : "saving", operationId, pendingDocumentId: snapshot.documentId, lastFailure: null });
    }
    const result = await pending;
    if (!mountedRef.current) return { status: "stale-ignored" };
    if (result.status === "saved") {
      currentDocumentRef.current = result.document;
      commitSavedDocument(result.document, result.writeBinding);
      setFileNotice({
        type: "success",
        outcome: result.stillDirty ? "still-dirty" : result.strategy === "download" ? "saved-copy" : "saved"
      });
      setFileLifecycle(createIdleFileLifecycleState());
      return result;
    }
    if (result.status === "failed") {
      setFileNotice({ type: "failure", operation: "save", failure: result.failure });
      setFileLifecycle({ ...createIdleFileLifecycleState(), lastFailure: result.failure });
      return result;
    }
    if (result.status === "unsupported") {
      const failure = { kind: "unsupported" as const };
      setFileNotice({ type: "failure", operation: "save", failure });
      setFileLifecycle({ ...createIdleFileLifecycleState(), lastFailure: failure });
      return result;
    }
    setFileLifecycle(createIdleFileLifecycleState());
    return result;
  }, [commitSavedDocument, currentWriteBinding, documentController, setFileLifecycle]);

  const requestOpen = useCallback(() => {
    if (documentDirty) {
      setShowUnsavedOpenGuard(true);
      return;
    }
    void performOpen(false);
  }, [documentDirty, performOpen]);
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
  const selectedDiagnostic = diagnostics.find((diagnostic) => diagnostic.identity === selectedDiagnosticId);
  const selectedDiagnosticRange: SourceRange | undefined = diagnosticNavigationRange ?? selectedDiagnostic?.source.sourceRange;
  const selectedDiagnosticMessage = selectedDiagnostic?.rendered.message;
  useEffect(() => {
    if (selectedDiagnosticId && !diagnostics.some((diagnostic) => diagnostic.identity === selectedDiagnosticId)) {
      setSelectedDiagnosticId(undefined);
      setDiagnosticNavigationRange(undefined);
    }
  }, [diagnostics, selectedDiagnosticId]);
  useEffect(() => {
    setSelectedDiagnosticId(undefined);
    setDiagnosticNavigationRange(undefined);
    setEditorSelectedFrameSlotId(undefined);
  }, [sourceUnitId]);
  const selectedDemoProgram = getDemoProgram(selectedDemoProgramId);
  const selectedDemoMatchesSource = Boolean(selectedDemoProgram && selectedDemoProgram.source === sourceText && selectedDemoProgram.mode === sourceMode);
  const selectedLesson = selectedDemoProgram && selectedDemoMatchesSource ? getLearningLesson(selectedDemoProgram.id) : undefined;
  const selectedLessonProgress = selectedDemoProgram && selectedLesson ? (lessonProgress[selectedDemoProgram.id] ?? {}) : {};
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
        isOpeningFile={fileLifecycle.status === "opening"}
        onOpenFile={requestOpen}
        saveMode={currentWriteBinding && currentDocument.saveCapability === "save" ? "save" : "save-as"}
        isSavingFile={fileLifecycle.status === "saving" || fileLifecycle.status === "save-as"}
        onSaveFile={() => void performSave(!currentWriteBinding || currentDocument.saveCapability !== "save")}
        onAssemble={assemble}
        onRun={() => run()}
        onStep={step}
        onReset={reset}
        onStop={stop}
      />
      <UnsavedOpenDialog
        open={showUnsavedOpenGuard}
        displayName={currentDocument.displayName}
        isSaving={fileLifecycle.status === "saving" || fileLifecycle.status === "save-as"}
        onCancel={() => setShowUnsavedOpenGuard(false)}
        onSave={() => {
          void (async () => {
            const result = await performSave(false);
            if (result.status !== "saved" || result.stillDirty) return;
            setShowUnsavedOpenGuard(false);
            await performOpen(true);
          })();
        }}
        onDiscard={() => {
          setShowUnsavedOpenGuard(false);
          void performOpen(true);
        }}
      />
      <FileOperationNotice notice={fileNotice} onDismiss={() => setFileNotice(null)} />

      {isCircuitFocusMode ? (
        <CircuitFocusLayout
          key={sourceUnitId}
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
                <label className="demo-program-picker" title={selectedDemoProgram?.name ?? t("file.externalFile")}>
                  <span>Demo</span>
                  <select
                    data-testid="demo-program-select"
                    value={selectedDemoProgramId}
                    title={selectedDemoProgram?.name ?? t("file.externalFile")}
                    aria-label={`Demo program: ${selectedDemoProgram?.name ?? t("file.externalFile")}`}
                    onChange={(event) => selectDemoProgram(event.target.value)}
                  >
                    {!selectedDemoProgram ? <option value="">{t("file.externalFile")}</option> : null}
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
                    <span className="source-mode-full">C++ subset</span><span className="source-mode-compact">C++</span>
                  </button>
                </div>
              </div>
              <span className="source-document-label" title={currentDocument.displayName} aria-label={`${currentDocument.displayName}${documentDirty ? `, ${t("status.dirty")}` : ""}`}>
                <span className="source-file-name">{currentDocument.displayName}</span>
                {documentDirty ? <span className="source-dirty-indicator" aria-hidden="true">*</span> : null}
              </span>
            </header>
            <SourceEditor
              source={sourceText}
              language={sourceMode}
              currentLine={editorCurrentLine}
              onChange={(nextSource) => {
                setSelectedDiagnosticId(undefined);
                setDiagnosticNavigationRange(undefined);
                setSourceText(nextSource);
              }}
              diagnosticRange={selectedDiagnosticRange}
              diagnosticMessage={selectedDiagnosticMessage}
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

          {selectedDemoProgram ? (
            <DemoGuidePanel
              program={selectedDemoProgram}
              lesson={selectedLesson}
              lessonProgress={selectedLessonProgress}
              onToggleLessonStep={toggleLessonStep}
              onResetLessonProgress={resetLessonProgress}
            />
          ) : null}

          <section className="panel errors-panel">
            <header className="panel-header">
              <h2>{t("diagnostic.errors")}</h2>
              <span aria-label={`${t("diagnostic.errors")}: ${diagnostics.length}`}>{diagnostics.length}</span>
            </header>
            {diagnostics.length === 0 ? <p className="muted diagnostic-empty-state">{t("empty.noDiagnostics")}</p> : null}
            <div className="diagnostic-list" role="listbox" aria-label={t("diagnostic.errors")}>
            {diagnostics.map(({ source, rendered, identity, displayLine }) => {
              const isSelected = selectedDiagnosticId === identity;
              const developerDetail = formatDiagnosticDeveloperDetail(source.rawContext);
              return (
              <div key={identity} className="diagnostic-entry" data-selected={isSelected ? "true" : "false"}>
                <button
                  type="button"
                  className="diagnostic"
                  role="option"
                  data-diagnostic-code={source.code ?? "legacy"}
                  aria-selected={isSelected}
                  aria-label={`${t("status.error")}. ${t("diagnostic.line", { line: displayLine })}. ${rendered.message}`}
                  onClick={() => {
                    setSelectedDiagnosticId(identity);
                    setDiagnosticNavigationRange(source.sourceRange);
                  }}
                >
                  <span className="visually-hidden">{t("status.error")}</span>
                  <span className="diagnostic-location">{t("diagnostic.line", { line: displayLine })}</span>
                  <span className="diagnostic-message" title={rendered.message}>{rendered.message}</span>
                </button>
                {source.code || source.producer || source.rawContext || source.relatedLocations?.length ? (
                  <details className="diagnostic-related">
                    <summary>{t("common.details")}</summary>
                    {source.code ? <span className="diagnostic-technical-detail" title={source.code}>{t("diagnostic.code", { code: source.code })}</span> : null}
                    {source.producer ? <span className="diagnostic-technical-detail" title={source.producer}>{t("diagnostic.producer", { producer: source.producer })}</span> : null}
                    {developerDetail ? <span className="diagnostic-raw-context"><strong>{t("diagnostic.rawContext")}</strong><code title={developerDetail}>{developerDetail}</code></span> : null}
                    {source.relatedLocations?.length ? <strong>{t("diagnostic.relatedLocations")}</strong> : null}
                    {source.relatedLocations?.map((location, relatedIndex) => (
                      <button
                        key={`${location.sourceRange.start.line}:${location.sourceRange.start.column}:${relatedIndex}`}
                        type="button"
                        className="diagnostic-related-location"
                        aria-label={`${location.label === "diagnostic.openingDelimiterHere" ? t("diagnostic.openingDelimiterHere") : t("diagnostic.firstDeclaredHere")}, ${t("diagnostic.line", { line: location.sourceRange.start.line })}`}
                        onClick={() => {
                          setSelectedDiagnosticId(identity);
                          setDiagnosticNavigationRange(location.sourceRange);
                        }}
                      >
                        <span>{location.label === "diagnostic.openingDelimiterHere" ? t("diagnostic.openingDelimiterHere") : t("diagnostic.firstDeclaredHere")}</span>
                        <code>{t("diagnostic.line", { line: location.sourceRange.start.line })}</code>
                      </button>
                    ))}
                  </details>
                ) : null}
              </div>
            )})}
            </div>
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
