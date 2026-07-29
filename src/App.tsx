import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Toolbar from "./components/Toolbar";
import SourceEditor from "./components/SourceEditor";
import InspectorPanel from "./components/InspectorPanel";
import OutputPanel from "./components/OutputPanel";
import StatusBar from "./components/StatusBar";
import LearningFlowPanel from "./components/LearningFlowPanel";
import DemoGuidePanel from "./components/DemoGuidePanel";
import CircuitFocusLayout from "./components/CircuitFocusLayout";
import CaslCompatibilityMode from "./components/CaslCompatibilityMode";
import CometMicrocyclePanel from "./components/CometMicrocyclePanel";
import ProjectModulesPanel from "./components/ProjectModulesPanel";
import CometCircuitSvg from "./visual/CometCircuitSvg";
import { formatWord } from "./core/types";
import { summarizeCurrentInstruction } from "./visual/visualState";
import { AppStoreProvider, useAppStore } from "./store/useAppStore";
import { cppLineForCaslLine } from "./transpiler/cppMapping";
import { selectFrameSymbolRelations } from "./transpiler/framePlanView";
import { DEFAULT_DEMO_PROGRAM_ID, demoPrograms, getDefaultDemoProgram, getDemoProgram } from "./examples/demoPrograms";
import { getLearningLesson, learningLessons } from "./examples/learningLessons";
import { I18nProvider } from "./i18n/I18nProvider";
import type { LocaleStorage } from "./i18n/localeStorage";
import { translateRunState } from "./i18n/locale";
import { useI18n } from "./i18n/useI18n";
import { diagnosticIdentity, renderDiagnostic } from "./diagnostics/renderDiagnostic";
import { formatDiagnosticDeveloperDetail } from "./diagnostics/presentation";
import type { SourceRange } from "./diagnostics/types";
import FileOperationNotice, { type FileOperationNoticeModel } from "./components/FileOperationNotice";
import UnsavedOpenDialog from "./components/UnsavedOpenDialog";
import NewDocumentDialog from "./components/NewDocumentDialog";
import { BrowserTextFileAdapter } from "./documents/browserTextFileAdapter";
import { DocumentSessionController, type SaveDocumentResult } from "./documents/documentSessionController";
import { createSequentialDocumentIdFactory } from "./documents/idFactory";
import { createDocument, createExternalDocument, isDocumentDirty } from "./documents/documentModel";
import { createIdleFileLifecycleState } from "./documents/lifecycle";
import { DEFAULT_MAX_TEXT_FILE_BYTES, type TextFileAdapter } from "./documents/fileAdapter";
import { prepareSourceReplacement, type SourceReplacementIntent } from "./documents/replacementIntent";
import { getDocumentDisplayName } from "./documents/documentPresentation";
import { useBeforeUnloadDirtyGuard } from "./documents/beforeUnloadGuard";
import { ApplicationPreferenceController } from "./preferences/controller";
import { WebLocalStorageApplicationPreferenceStorage, type ApplicationPreferenceStorage } from "./preferences/storage";
import { StartupSelectionController } from "./startupSelection/controller";
import { WebLocalStorageStartupSelectionStorage, type StartupSelectionStorage } from "./startupSelection/storage";
import { LessonProgressController } from "./lessonProgress/controller";
import { WebLocalStorageLessonProgressStorage, type LessonProgressStorage } from "./lessonProgress/storage";
import { ProductionFailureScreen } from "./production/ProductionFailure";
import {
  addProjectModule,
  commitModuleAssembly,
  commitProjectLink,
  createCaslModule,
  createCaslProjectSession,
  createProjectLinkRequest,
  createSequentialProjectIdentityFactory,
  moduleAssemblyInput,
  moveProjectModule,
  projectHasDirtyModules,
  removeProjectModule,
  renameProjectModule,
  setMainProjectModule,
  setProjectLinking,
  syncProjectModule
} from "./linker/projectSession";
import type { CaslProjectSession, ModuleId } from "./linker/types";

type AppProps = {
  fileAdapter?: TextFileAdapter;
  localeStorage?: LocaleStorage;
  browserLocale?: string;
  preferenceStorage?: ApplicationPreferenceStorage;
  startupSelectionStorage?: StartupSelectionStorage;
  lessonProgressStorage?: LessonProgressStorage;
};
const defaultPreferenceController = new ApplicationPreferenceController(new WebLocalStorageApplicationPreferenceStorage());
const injectedPreferenceControllers = new WeakMap<ApplicationPreferenceStorage, ApplicationPreferenceController>();
const defaultStartupSelectionController = new StartupSelectionController(new WebLocalStorageStartupSelectionStorage());
const injectedStartupSelectionControllers = new WeakMap<StartupSelectionStorage, StartupSelectionController>();
const defaultLessonProgressController = new LessonProgressController(new WebLocalStorageLessonProgressStorage());
const injectedLessonProgressControllers = new WeakMap<LessonProgressStorage, LessonProgressController>();

function preferenceControllerFor(storage?: ApplicationPreferenceStorage): ApplicationPreferenceController {
  if (!storage) return defaultPreferenceController;
  const existing = injectedPreferenceControllers.get(storage);
  if (existing) return existing;
  const controller = new ApplicationPreferenceController(storage);
  injectedPreferenceControllers.set(storage, controller);
  return controller;
}

function startupSelectionControllerFor(storage?: StartupSelectionStorage): StartupSelectionController {
  if (!storage) return defaultStartupSelectionController;
  const existing = injectedStartupSelectionControllers.get(storage);
  if (existing) return existing;
  const controller = new StartupSelectionController(storage);
  injectedStartupSelectionControllers.set(storage, controller);
  return controller;
}

function lessonProgressControllerFor(storage?: LessonProgressStorage): LessonProgressController {
  if (!storage) return defaultLessonProgressController;
  const existing = injectedLessonProgressControllers.get(storage);
  if (existing) return existing;
  const controller = new LessonProgressController(storage);
  injectedLessonProgressControllers.set(storage, controller);
  return controller;
}

export default function App(props: AppProps = {}) {
  return (
    <I18nProvider storage={props.localeStorage} browserLocale={props.browserLocale}>
      <BootstrappedApp {...props} />
    </I18nProvider>
  );
}

function BootstrappedApp({ fileAdapter, preferenceStorage, startupSelectionStorage, lessonProgressStorage }: AppProps) {
  const resolvedFileAdapter = useMemo(() => fileAdapter ?? new BrowserTextFileAdapter(), [fileAdapter]);
  const preferenceController = useMemo(() => preferenceControllerFor(preferenceStorage), [preferenceStorage]);
  const startupSelectionController = useMemo(
    () => startupSelectionControllerFor(startupSelectionStorage),
    [startupSelectionStorage]
  );
  const lessonProgressController = useMemo(
    () => lessonProgressControllerFor(lessonProgressStorage),
    [lessonProgressStorage]
  );
  const initialPreferences = useMemo(() => preferenceController.hydrate(), [preferenceController]);
  const initialExample = useMemo(() => {
    const resolution = startupSelectionController.resolveBootstrap(demoPrograms, DEFAULT_DEMO_PROGRAM_ID);
    return resolution.status === "resolved"
      ? getDemoProgram(resolution.exampleId) ?? getDefaultDemoProgram() ?? null
      : null;
  }, [startupSelectionController]);
  const initialLessonProgress = useMemo(
    () => lessonProgressController.hydrate(learningLessons),
    [lessonProgressController]
  );
  const persistPreferences = useCallback((preferences: Parameters<ApplicationPreferenceController["persist"]>[0]) => {
    preferenceController.persist(preferences);
  }, [preferenceController]);
  const persistLessonProgress = useCallback((progress: Parameters<LessonProgressController["persist"]>[0]) => {
    lessonProgressController.persist(progress, learningLessons);
  }, [lessonProgressController]);
  const clearLessonProgress = useCallback(() => lessonProgressController.clear(), [lessonProgressController]);
  return (
    <AppStoreProvider
      initialExample={initialExample}
      initialPreferences={initialPreferences}
      initialLessonProgress={initialLessonProgress}
      onApplicationPreferencesChange={persistPreferences}
      onLessonProgressChange={persistLessonProgress}
      onAllLessonProgressClear={clearLessonProgress}
    >
      <StudioShell fileAdapter={resolvedFileAdapter} startupSelectionController={startupSelectionController} />
    </AppStoreProvider>
  );
}

function StudioShell({
  fileAdapter,
  startupSelectionController
}: {
  fileAdapter: TextFileAdapter;
  startupSelectionController: StartupSelectionController;
}) {
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
    cppStorageObjects,
    selectedDemoProgramId,
    lessonProgress,
    executionGranularity,
    observationMode,
    circuitFocusEnabled,
    inspectorActiveTab,
    outputDockActiveTab,
    applicationFailure,
    assemblyId,
    executionEpoch,
    runtimeImageRevision,
    runtimeOverrides,
    programModified,
    dataModified,
    mutationInFlight,
    reverseInFlight,
    reverseNotice,
    currentDocument,
    currentWriteBinding,
    documentDirty,
    sourceUnitId,
    fileLifecycle,
    setSourceText,
    setSourceMode,
    assemble,
    run,
    step,
    reset,
    reload,
    mutateDebuggerState,
    fullClear,
    reverseMicrostep,
    reverseInstruction,
    stop,
    submitConsoleInput,
    clearOutput,
    toggleLessonStep,
    resetLessonProgress,
    setExecutionGranularity,
    setObservationMode,
    setCircuitFocusEnabled,
    setInspectorActiveTab,
    setOutputDockActiveTab,
    replaceCurrentDocument,
    selectProjectDocument,
    assembleProjectModule,
    linkProject,
    commitSavedDocument,
    setFileLifecycle
  } = useAppStore();
  const [editorSelectedFrameSlotId, setEditorSelectedFrameSlotId] = useState<string | undefined>();
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string | undefined>();
  const [diagnosticNavigationRange, setDiagnosticNavigationRange] = useState<SourceRange | undefined>();
  const diagnosticListRef = useRef<HTMLDivElement>(null);
  const [showNewDocumentDialog, setShowNewDocumentDialog] = useState(false);
  const [pendingReplacementIntent, setPendingReplacementIntent] = useState<SourceReplacementIntent | null>(null);
  const [fileNotice, setFileNotice] = useState<FileOperationNoticeModel | null>(null);
  const projectIdsRef = useRef(createSequentialProjectIdentityFactory("casl-project"));
  const initialProjectSession = useMemo(
    () => sourceMode === "casl"
      ? createCaslProjectSession(currentDocument, currentWriteBinding, projectIdsRef.current)
      : null,
    []
  );
  const [projectSession, setProjectSession] = useState<CaslProjectSession | null>(initialProjectSession);
  const projectSessionRef = useRef<CaslProjectSession | null>(initialProjectSession);
  const retainedProjectDocumentIdsRef = useRef(new Set(
    initialProjectSession?.modules.map((module) => module.document.documentId) ?? []
  ));
  const [projectBusy, setProjectBusy] = useState(false);
  const [projectNotice, setProjectNotice] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<"modern" | "casl" | "comet">("modern");
  const openIdsRef = useRef(createSequentialDocumentIdFactory("browser-open"));
  const currentDocumentRef = useRef(currentDocument);
  const writeBindingRef = useRef(currentWriteBinding);
  const mountedRef = useRef(true);
  const documentController = useMemo(() => new DocumentSessionController(fileAdapter, openIdsRef.current), [fileAdapter]);
  currentDocumentRef.current = currentDocument;
  const commitProjectSession = useCallback((next: CaslProjectSession | null) => {
    projectSessionRef.current = next;
    retainedProjectDocumentIdsRef.current = new Set(
      next?.modules.map((module) => module.document.documentId) ?? []
    );
    setProjectSession(next);
  }, []);
  const syncActiveProjectModule = useCallback(() => {
    const session = projectSessionRef.current;
    if (!session || currentDocumentRef.current.language !== "casl") return session;
    const next = syncProjectModule(
      session,
      session.activeModuleId,
      currentDocumentRef.current,
      writeBindingRef.current
    );
    commitProjectSession(next);
    return next;
  }, [commitProjectSession]);
  const selectWorkspaceMode = useCallback((mode: "modern" | "casl" | "comet") => {
    setWorkspaceMode(mode);
    setExecutionGranularity(mode === "comet" ? "microcycle" : "instruction");
  }, [setExecutionGranularity]);

  useEffect(() => {
    const previous = writeBindingRef.current;
    if (
      previous
      && (!currentWriteBinding || currentWriteBinding.documentId !== previous.documentId)
      && !retainedProjectDocumentIdsRef.current.has(previous.documentId)
    ) {
      documentController.releaseDocumentBinding(previous.documentId);
    }
    writeBindingRef.current = currentWriteBinding;
  }, [currentWriteBinding, documentController]);

  useEffect(() => {
    const session = projectSessionRef.current;
    if (currentDocument.language !== "casl") {
      if (session) {
        for (const module of session.modules) {
          if (module.writeBinding) documentController.releaseDocumentBinding(module.document.documentId);
        }
      }
      commitProjectSession(null);
      return;
    }
    const owned = session?.modules.some((module) => module.moduleId === session.activeModuleId
      && module.document.documentId === currentDocument.documentId
    );
    if (session && owned) {
      commitProjectSession(syncProjectModule(
        session,
        session.activeModuleId,
        currentDocument,
        currentWriteBinding
      ));
      return;
    }
    if (session) {
      for (const module of session.modules) {
        if (module.writeBinding) documentController.releaseDocumentBinding(module.document.documentId);
      }
    }
    commitProjectSession(createCaslProjectSession(
      currentDocument,
      currentWriteBinding,
      projectIdsRef.current
    ));
  }, [commitProjectSession, currentDocument, currentWriteBinding, documentController]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      documentController.invalidateActiveOperation();
      if (fileAdapter instanceof BrowserTextFileAdapter) fileAdapter.dispose();
    };
  }, [documentController, fileAdapter]);

  const performReplacement = useCallback(async (intent: SourceReplacementIntent, allowDiscard: boolean) => {
    const snapshot = currentDocumentRef.current;
    setFileNotice(null);
    const pending = documentController.requestReplacement({
      intent,
      currentDocument: snapshot,
      currentExampleId: selectedDemoProgramId,
      allowDiscard,
      isCurrentDocument: (documentId) => currentDocumentRef.current.documentId === documentId
    });
    const operationId = documentController.operationId;
    if (operationId) {
      const status = intent.kind === "open-file" ? "opening" : intent.kind === "new-document" ? "creating-document" : "switching-example";
      setFileLifecycle({ status, operationId, pendingDocumentId: snapshot.documentId, lastFailure: null });
    }
    const result = await pending;
    if (!mountedRef.current) return;
    if (result.status === "replaced" && currentDocumentRef.current.documentId === snapshot.documentId) {
      documentController.releaseDocumentBinding(snapshot.documentId);
      setSelectedDiagnosticId(undefined);
      setDiagnosticNavigationRange(undefined);
      setEditorSelectedFrameSlotId(undefined);
      currentDocumentRef.current = result.document;
      replaceCurrentDocument(result.document, result.selectedExampleId);
      if (
        intent.kind === "select-example" &&
        result.document.origin === "example" &&
        result.selectedExampleId &&
        getDemoProgram(result.selectedExampleId)
      ) {
        startupSelectionController.persistSuccessfulExample(result.selectedExampleId, demoPrograms);
      }
      setPendingReplacementIntent(null);
      setFileLifecycle(createIdleFileLifecycleState());
      return;
    }
    if (result.status === "requires-unsaved-decision") {
      setPendingReplacementIntent(result.intent);
      setFileLifecycle({ status: "confirming-replace", operationId: null, pendingDocumentId: snapshot.documentId, lastFailure: null });
      return;
    }
    if (result.status === "failed") {
      setFileNotice({ type: "failure", operation: intent.kind === "open-file" ? "open" : intent.kind === "new-document" ? "create" : "switch", failure: result.failure });
      setFileLifecycle({ ...createIdleFileLifecycleState(), lastFailure: result.failure });
      setPendingReplacementIntent(null);
      return;
    }
    setFileLifecycle(createIdleFileLifecycleState());
  }, [documentController, replaceCurrentDocument, selectedDemoProgramId, setFileLifecycle, startupSelectionController]);

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

  const requestReplacement = useCallback((intent: SourceReplacementIntent) => {
    const preparation = prepareSourceReplacement(currentDocumentRef.current, intent, selectedDemoProgramId);
    if (preparation.status === "no-op") return;
    if (preparation.status === "requires-unsaved-decision") {
      setPendingReplacementIntent(intent);
      setFileLifecycle({ status: "confirming-replace", operationId: null, pendingDocumentId: currentDocumentRef.current.documentId, lastFailure: null });
      return;
    }
    void performReplacement(intent, false);
  }, [performReplacement, selectedDemoProgramId, setFileLifecycle]);
  const requestOpen = useCallback(() => requestReplacement({ kind: "open-file" }), [requestReplacement]);
  const selectModule = useCallback((moduleId: ModuleId) => {
    const synced = syncActiveProjectModule();
    const target = synced?.modules.find((module) => module.moduleId === moduleId);
    if (!synced || !target || synced.activeModuleId === moduleId) return;
    const next = { ...synced, activeModuleId: moduleId };
    commitProjectSession(next);
    currentDocumentRef.current = target.document;
    writeBindingRef.current = target.writeBinding;
    selectProjectDocument(target.document, target.writeBinding);
    setSelectedDiagnosticId(undefined);
    setDiagnosticNavigationRange(undefined);
  }, [commitProjectSession, selectProjectDocument, syncActiveProjectModule]);

  const addNewModule = useCallback(() => {
    const session = syncActiveProjectModule();
    if (!session) return;
    if (session.modules.length >= 64) {
      setProjectNotice(t("project.moduleLimit"));
      return;
    }
    const sequence = session.modules.length + 1;
    const document = createDocument({
      language: "casl",
      origin: "untitled",
      displayName: `Module${sequence}.cas`,
      content: `MODULE${sequence} START\n        RET\n        END\n`,
      saveCapability: "save-as-only",
      lineEnding: "lf"
    }, openIdsRef.current);
    const module = createCaslModule(document, null, projectIdsRef.current);
    const next = addProjectModule(session, module);
    commitProjectSession(next);
    currentDocumentRef.current = document;
    writeBindingRef.current = null;
    selectProjectDocument(document, null);
    setProjectNotice(null);
  }, [commitProjectSession, selectProjectDocument, syncActiveProjectModule, t]);

  const openProjectModule = useCallback(() => {
    void (async () => {
      const session = syncActiveProjectModule();
      if (!session || projectBusy) return;
      if (session.modules.length >= 64) {
        setProjectNotice(t("project.moduleLimit"));
        return;
      }
      setProjectBusy(true);
      try {
        const result = await fileAdapter.openTextFile({
          acceptedExtensions: [".cas"],
          maxBytes: DEFAULT_MAX_TEXT_FILE_BYTES
        });
        if (result.status !== "success") return;
        if (result.value.language !== "casl") {
          setProjectNotice(t("project.openCaslOnly"));
          return;
        }
        const document = createExternalDocument(result.value, openIdsRef.current);
        const module = createCaslModule(document, null, projectIdsRef.current);
        const current = projectSessionRef.current;
        if (!current || current.projectId !== session.projectId) return;
        const next = addProjectModule(current, module);
        commitProjectSession(next);
        currentDocumentRef.current = document;
        writeBindingRef.current = null;
        selectProjectDocument(document, null);
        setProjectNotice(null);
      } finally {
        if (mountedRef.current) setProjectBusy(false);
      }
    })();
  }, [commitProjectSession, fileAdapter, projectBusy, selectProjectDocument, syncActiveProjectModule, t]);

  const removeModule = useCallback((moduleId: ModuleId) => {
    const session = syncActiveProjectModule();
    const target = session?.modules.find((module) => module.moduleId === moduleId);
    if (!session || !target || session.modules.length <= 1) return;
    if (isDocumentDirty(target.document) && !globalThis.confirm(t("project.removeDirtyConfirm"))) return;
    const next = removeProjectModule(session, moduleId);
    if (target.writeBinding) documentController.releaseDocumentBinding(target.document.documentId);
    commitProjectSession(next);
    if (session.activeModuleId === moduleId) {
      const replacement = next.modules.find((module) => module.moduleId === next.activeModuleId);
      if (replacement) {
        currentDocumentRef.current = replacement.document;
        writeBindingRef.current = replacement.writeBinding;
        selectProjectDocument(replacement.document, replacement.writeBinding);
      }
    }
  }, [commitProjectSession, documentController, selectProjectDocument, syncActiveProjectModule, t]);

  const assembleModules = useCallback((moduleIds: readonly ModuleId[]) => {
    void (async () => {
      const session = syncActiveProjectModule();
      if (!session || projectBusy) return;
      setProjectBusy(true);
      setProjectNotice(null);
      let next = session;
      let failed = false;
      try {
        for (const moduleId of moduleIds) {
          const module = next.modules.find((candidate) => candidate.moduleId === moduleId);
          if (!module) continue;
          const moduleAssemblyId = projectIdsRef.current.nextModuleAssemblyId(moduleId);
          const input = moduleAssemblyInput(module, moduleAssemblyId);
          const result = await assembleProjectModule(input);
          const current = projectSessionRef.current;
          if (!current || current.projectId !== session.projectId) return;
          const currentModule = current.modules.find((candidate) => candidate.moduleId === moduleId);
          if (
            !currentModule
            || currentModule.sourceUnitId !== input.sourceUnitId
            || currentModule.document.content !== input.source
          ) {
            return;
          }
          next = commitModuleAssembly(next, moduleId, result);
          failed ||= !result.ok;
          commitProjectSession(next);
        }
        if (failed) setProjectNotice(t("project.assembleFailed"));
      } finally {
        if (mountedRef.current) setProjectBusy(false);
      }
    })();
  }, [assembleProjectModule, commitProjectSession, projectBusy, syncActiveProjectModule, t]);

  const linkCurrentProject = useCallback(() => {
    void (async () => {
      const session = syncActiveProjectModule();
      if (!session || projectBusy) return;
      const request = createProjectLinkRequest(session, projectIdsRef.current);
      if (!request) {
        setProjectNotice(t("project.assembleFailed"));
        return;
      }
      const requestId = `${request.linkId}:request`;
      commitProjectSession(setProjectLinking(session, requestId));
      setProjectBusy(true);
      try {
        const result = await linkProject(request);
        const current = projectSessionRef.current;
        if (!current || current.projectId !== request.projectId || current.linkState.status !== "linking") return;
        commitProjectSession(commitProjectLink(current, result.link));
        setProjectNotice(result.ok ? t("project.linkCompleted") : t("project.linkFailed"));
      } finally {
        if (mountedRef.current) setProjectBusy(false);
      }
    })();
  }, [commitProjectSession, linkProject, projectBusy, syncActiveProjectModule, t]);
  const replacementBusy = projectBusy
    || fileLifecycle.status === "opening"
    || fileLifecycle.status === "confirming-replace"
    || fileLifecycle.status === "creating-document"
    || fileLifecycle.status === "switching-example";
  const documentDisplayName = getDocumentDisplayName(currentDocument, t);
  useBeforeUnloadDirtyGuard(documentDirty || Boolean(projectSession && projectHasDirtyModules(projectSession)));
  const isRunning = state.runState === "Running";
  const canExecute = state.runState === "Ready" || (state.runState === "Stopped" && runStopReason === "manual");
  const canRun = !projectBusy && !isSourceDirty && state.assembled && canExecute;
  const canStep = !projectBusy && !isSourceDirty && state.assembled && canExecute;
  const canReset = !projectBusy && !isSourceDirty && !isRunning && (state.assembled || state.runState === "Finished" || state.runState === "Stopped" || state.sourceMap.length > 0);
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
  const activeRuntimeMapping = state.sourceMap.find((mapping) =>
    mapping.address === (state.currentAddress ?? state.pr)
  );
  const runtimeMapsToActiveDocument = !activeRuntimeMapping?.sourceUnitId
    || activeRuntimeMapping.sourceUnitId === sourceUnitId;
  const editorCurrentLine = runtimeMapsToActiveDocument
    ? sourceMode === "cpp"
      ? cppLineForCaslLine(cppToCaslMapping, state.currentLine)
      : state.currentLine
    : undefined;
  const selectedDiagnostic = diagnostics.find((diagnostic) => diagnostic.identity === selectedDiagnosticId);
  const selectedDiagnosticDeveloperDetail = selectedDiagnostic
    ? formatDiagnosticDeveloperDetail(selectedDiagnostic.source.rawContext)
    : undefined;
  const selectedDiagnosticRange: SourceRange | undefined = diagnosticNavigationRange ?? selectedDiagnostic?.source.sourceRange;
  const selectedDiagnosticMessage = selectedDiagnostic?.rendered.message;
  useEffect(() => {
    if (selectedDiagnosticId && !diagnostics.some((diagnostic) => diagnostic.identity === selectedDiagnosticId)) {
      setSelectedDiagnosticId(undefined);
      setDiagnosticNavigationRange(undefined);
    }
  }, [diagnostics, selectedDiagnosticId]);
  useEffect(() => {
    if (!selectedDiagnosticId) return;
    diagnosticListRef.current
      ?.querySelector<HTMLElement>('[data-selected="true"]')
      ?.scrollIntoView({ block: "nearest" });
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
  const runtimeSourceMapping = useMemo(() => {
    if (sourceMode !== "casl" || !projectSession) return undefined;
    const address = state.currentAddress ?? state.pr;
    return state.sourceMap.find((mapping) => mapping.address === address)
      ?? state.sourceMap.find((mapping) => mapping.address === state.lastStep?.executedAddress);
  }, [projectSession, sourceMode, state.currentAddress, state.lastStep?.executedAddress, state.pr, state.sourceMap]);
  const runtimeObservationModule = useMemo(
    () => runtimeSourceMapping?.moduleId
      ? projectSession?.modules.find((module) => module.moduleId === runtimeSourceMapping.moduleId)
      : undefined,
    [projectSession, runtimeSourceMapping?.moduleId]
  );
  const runtimeObservationSourceText = runtimeObservationModule?.document.content ?? sourceText;
  const runtimeObservationSourceName = runtimeSourceMapping?.moduleName
    ?? runtimeObservationModule?.displayName
    ?? runtimeSourceMapping?.moduleId;
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
        key: `${index}:${label}`,
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

  if (applicationFailure) {
    return <ProductionFailureScreen kind={backendInfo.kind === "wasm" ? "wasm-initialization" : "unexpected"} locale={locale} />;
  }

  return (
    <div className={(workspaceMode === "modern" && circuitFocusEnabled) || workspaceMode === "comet" ? "app-shell circuit-focus-active" : "app-shell"}>
      <Toolbar
        assembleStatus={projectBusy ? "running" : assembleStatus}
        canRun={canRun}
        canStep={canStep}
        canReset={canReset}
        isRunning={isRunning}
        isCircuitFocusMode={circuitFocusEnabled}
        onToggleCircuitFocusMode={() => {
          selectWorkspaceMode("modern");
          setCircuitFocusEnabled(!circuitFocusEnabled);
        }}
        isReplacingSource={replacementBusy}
        onNewDocument={() => setShowNewDocumentDialog(true)}
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
      <NewDocumentDialog
        open={showNewDocumentDialog}
        initialLanguage={currentDocument.language}
        onCancel={() => setShowNewDocumentDialog(false)}
        onCreate={(language) => {
          setShowNewDocumentDialog(false);
          requestReplacement({ kind: "new-document", language });
        }}
      />
      <UnsavedOpenDialog
        open={pendingReplacementIntent !== null}
        intent={pendingReplacementIntent ?? { kind: "open-file" }}
        displayName={documentDisplayName}
        isSaving={fileLifecycle.status === "saving" || fileLifecycle.status === "save-as"}
        onCancel={() => {
          setPendingReplacementIntent(null);
          setFileLifecycle(createIdleFileLifecycleState());
        }}
        onSave={() => {
          void (async () => {
            const intent = pendingReplacementIntent;
            if (!intent) return;
            const result = await performSave(false);
            if (result.status !== "saved" || result.stillDirty) return;
            setPendingReplacementIntent(null);
            await performReplacement(intent, true);
          })();
        }}
        onDiscard={() => {
          const intent = pendingReplacementIntent;
          setPendingReplacementIntent(null);
          if (intent) void performReplacement(intent, true);
        }}
      />
      <FileOperationNotice notice={fileNotice} onDismiss={() => setFileNotice(null)} />

      <div className={projectSession ? "workspace-region project-session-active" : "workspace-region"}>
      {projectSession ? (
        <>
          <ProjectModulesPanel
            session={projectSession}
            busy={projectBusy}
            onAddNew={addNewModule}
            onOpen={openProjectModule}
            onSelect={selectModule}
            onRemove={removeModule}
            onRename={(moduleId, displayName) => {
              const session = syncActiveProjectModule();
              if (session) commitProjectSession(renameProjectModule(session, moduleId, displayName));
            }}
            onSetMain={(moduleId) => {
              const session = syncActiveProjectModule();
              if (session) commitProjectSession(setMainProjectModule(session, moduleId));
            }}
            onMove={(moduleId, direction) => {
              const session = syncActiveProjectModule();
              if (session) commitProjectSession(moveProjectModule(session, moduleId, direction));
            }}
            onAssembleCurrent={() => assembleModules([projectSession.activeModuleId])}
            onAssembleAll={() => assembleModules(projectSession.moduleOrder)}
            onLink={linkCurrentProject}
            onSaveCurrent={() => void performSave(!currentWriteBinding || currentDocument.saveCapability !== "save")}
          />
          {projectNotice ? (
            <p className="project-notice" role="status">{projectNotice}</p>
          ) : null}
        </>
      ) : null}
      <nav className="workspace-mode-switch" aria-label={t("compatibility.workspaceView")}>
        <button
          type="button"
          data-testid="modern-mode-toggle"
          className={workspaceMode === "modern" ? "selected" : ""}
          aria-pressed={workspaceMode === "modern"}
          onClick={() => selectWorkspaceMode("modern")}
        >
          {t("compatibility.modernStudio")}
        </button>
        <button
          type="button"
          className={workspaceMode === "casl" ? "selected" : ""}
          data-testid="casl-mode-toggle"
          aria-pressed={workspaceMode === "casl"}
          onClick={() => selectWorkspaceMode("casl")}
        >
          {t("caslMode.title")}
        </button>
        <button
          type="button"
          className={workspaceMode === "comet" ? "selected" : ""}
          data-testid="comet-mode-toggle"
          aria-pressed={workspaceMode === "comet"}
          onClick={() => selectWorkspaceMode("comet")}
        >
          {t("cometMode.title")}
        </button>
      </nav>
      {workspaceMode === "casl" ? (
        <CaslCompatibilityMode
          state={state}
          sourceText={sourceMode === "cpp" && generatedCaslSource ? generatedCaslSource : runtimeObservationSourceText}
          sourceDisplayName={runtimeObservationSourceName}
          isSourceDirty={isSourceDirty}
          onReset={reset}
          onReload={reload}
          onSubmitConsoleInput={submitConsoleInput}
          assemblyId={assemblyId}
          executionEpoch={executionEpoch}
          runtimeImageRevision={runtimeImageRevision}
          runtimeOverrides={runtimeOverrides}
          programModified={programModified}
          dataModified={dataModified}
          mutationInFlight={mutationInFlight}
          fileOperationActive={fileLifecycle.status !== "idle"}
          onMutate={mutateDebuggerState}
          onFullClear={fullClear}
          reverseInFlight={reverseInFlight}
          reverseInstructionNotice={reverseNotice?.kind === "instruction" ? reverseNotice : null}
          onReverseInstruction={reverseInstruction}
          observationMode={observationMode}
          onObservationModeChange={setObservationMode}
        />
      ) : workspaceMode === "comet" ? (
        <div
          className="comet-mode-workspace"
          data-testid="comet-mode-workspace"
          data-execution-granularity={executionGranularity}
        >
          <CometMicrocyclePanel
            state={state}
            reverseInFlight={reverseInFlight}
            reverseNotice={reverseNotice?.kind === "microstep" ? reverseNotice : null}
            reverseInstructionNotice={reverseNotice?.kind === "instruction" ? reverseNotice : null}
            onReverse={reverseMicrostep}
            onReverseInstruction={reverseInstruction}
          />
          <CircuitFocusLayout
            key={sourceUnitId}
            state={state}
            sourceMode={sourceMode}
            sourceText={runtimeObservationSourceText}
            sourceDisplayName={runtimeObservationSourceName}
            generatedCaslSource={generatedCaslSource}
            cppToCaslMapping={cppToCaslMapping}
            cppStorageObjects={cppStorageObjects}
            isSourceDirty={isSourceDirty}
            timelineItems={timelineItems}
            observationMode={observationMode}
            onObservationModeChange={setObservationMode}
            executionMode="comet"
            reverseNotice={reverseNotice?.kind ?? null}
            manualEditActive={programModified || dataModified}
            initialSelectedFrameSlotId={editorSelectedFrameSlotId}
            initialSelectionSource="source-editor"
          />
        </div>
      ) : circuitFocusEnabled ? (
        <CircuitFocusLayout
          key={sourceUnitId}
          state={state}
          sourceMode={sourceMode}
          sourceText={runtimeObservationSourceText}
          sourceDisplayName={runtimeObservationSourceName}
          generatedCaslSource={generatedCaslSource}
          cppToCaslMapping={cppToCaslMapping}
          cppStorageObjects={cppStorageObjects}
          isSourceDirty={isSourceDirty}
          timelineItems={timelineItems}
          observationMode={observationMode}
          onObservationModeChange={setObservationMode}
          executionMode="modern"
          reverseNotice={reverseNotice?.kind ?? null}
          manualEditActive={programModified || dataModified}
          initialSelectedFrameSlotId={editorSelectedFrameSlotId}
          initialSelectionSource="source-editor"
        />
      ) : (
      <main className="workspace">
        <section className="left-column">
          <section className="panel source-panel">
            <header className="panel-header source-panel-header" data-testid="source-panel-header">
              <h2 title="Source Editor">{t("panel.source")}</h2>
              <label className="demo-program-picker" title={selectedDemoProgram?.name ?? t("file.externalFile")} aria-busy={replacementBusy || undefined}>
                <span>Demo</span>
                <select
                  data-testid="demo-program-select"
                  value={selectedDemoProgramId}
                  disabled={replacementBusy || fileLifecycle.status === "saving" || fileLifecycle.status === "save-as"}
                  title={selectedDemoProgram?.name ?? t("file.externalFile")}
                  aria-label={`Demo program: ${selectedDemoProgram?.name ?? t("file.externalFile")}`}
                  onChange={(event) => requestReplacement({ kind: "select-example", exampleId: event.target.value })}
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
                <button type="button" disabled={projectBusy} className={sourceMode === "casl" ? "selected" : ""} data-testid="source-mode-casl" aria-pressed={sourceMode === "casl"} title="Use CASL source mode" onClick={() => setSourceMode("casl")}>
                  CASL
                </button>
                <button type="button" disabled={projectBusy} className={sourceMode === "cpp" ? "selected" : ""} data-testid="source-mode-cpp" aria-pressed={sourceMode === "cpp"} title="Use C++ subset source mode" onClick={() => setSourceMode("cpp")}>
                  <span className="source-mode-full">C++ subset</span><span className="source-mode-compact">C++</span>
                </button>
              </div>
              <span className="source-document-label" title={documentDisplayName} aria-label={`${documentDisplayName}${documentDirty ? `, ${t("status.dirty")}` : ""}`}>
                <span className="source-file-name">{documentDisplayName}</span>
                {documentDirty ? <span className="source-dirty-indicator" aria-hidden="true">*</span> : null}
              </span>
            </header>
            <SourceEditor
              source={sourceText}
              language={sourceMode}
              currentLine={editorCurrentLine}
              readOnly={projectBusy}
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

          <section className="panel errors-panel" data-testid="errors-panel" data-has-diagnostics={diagnostics.length > 0 ? "true" : "false"}>
            <header className="panel-header errors-panel-header">
              <h2>{t("diagnostic.errors")}</h2>
              <span aria-label={`${t("diagnostic.errors")}: ${diagnostics.length}`}>{diagnostics.length}</span>
            </header>
            {diagnostics.length === 0 ? <p className="muted diagnostic-empty-state">{t("empty.noDiagnostics")}</p> : null}
            {diagnostics.length > 0 ? (
            <div ref={diagnosticListRef} className="diagnostic-list" role="listbox" aria-label={t("diagnostic.errors")} data-testid="diagnostic-list">
            {diagnostics.map(({ source, rendered, identity, displayLine }) => {
              const isSelected = selectedDiagnosticId === identity;
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
              </div>
            )})}
            </div>
            ) : null}
            {selectedDiagnostic ? (
              <section
                className="diagnostic-context"
                data-testid="diagnostic-context"
                aria-label={`${t("diagnostic.errors")} ${t("common.details")}`}
              >
                <div className="diagnostic-context-summary">
                  <strong title={selectedDiagnostic.rendered.message}>{selectedDiagnostic.rendered.message}</strong>
                  <span>{t("diagnostic.line", { line: selectedDiagnostic.displayLine })}</span>
                </div>
                {selectedDiagnostic.source.code ? (
                  <span className="diagnostic-technical-detail" title={selectedDiagnostic.source.code}>
                    {t("diagnostic.code", { code: selectedDiagnostic.source.code })}
                  </span>
                ) : null}
                {selectedDiagnostic.source.producer ? (
                  <span className="diagnostic-technical-detail" title={selectedDiagnostic.source.producer}>
                    {t("diagnostic.producer", { producer: selectedDiagnostic.source.producer })}
                  </span>
                ) : null}
                {selectedDiagnostic.source.relatedLocations?.length || selectedDiagnosticDeveloperDetail ? (
                  <details className="diagnostic-related diagnostic-context-details">
                    <summary>{t("common.details")}</summary>
                    {selectedDiagnostic.source.relatedLocations?.length ? <strong>{t("diagnostic.relatedLocations")}</strong> : null}
                    {selectedDiagnostic.source.relatedLocations?.map((location, relatedIndex) => (
                      <button
                        key={`${location.sourceRange.start.line}:${location.sourceRange.start.column}:${relatedIndex}`}
                        type="button"
                        className="diagnostic-related-location"
                        aria-label={`${location.label === "diagnostic.openingDelimiterHere" ? t("diagnostic.openingDelimiterHere") : t("diagnostic.firstDeclaredHere")}, ${t("diagnostic.line", { line: location.sourceRange.start.line })}`}
                        onClick={() => setDiagnosticNavigationRange(location.sourceRange)}
                      >
                        <span>{location.label === "diagnostic.openingDelimiterHere" ? t("diagnostic.openingDelimiterHere") : t("diagnostic.firstDeclaredHere")}</span>
                        <code>{t("diagnostic.line", { line: location.sourceRange.start.line })}</code>
                      </button>
                    ))}
                    {selectedDiagnosticDeveloperDetail ? (
                      <span className="diagnostic-raw-context">
                        <strong>{t("diagnostic.rawContext")}</strong>
                        <code title={selectedDiagnosticDeveloperDetail}>{selectedDiagnosticDeveloperDetail}</code>
                      </span>
                    ) : null}
                  </details>
                ) : null}
              </section>
            ) : null}
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
          <InspectorPanel
            state={state}
            initialTab={inspectorActiveTab}
            onActiveTabChange={setInspectorActiveTab}
            storageObjects={cppStorageObjects}
            cppToCaslMapping={cppToCaslMapping}
            sourceUnitId={sourceUnitId}
          />
        </aside>
      </main>
      )}
      </div>

      <OutputPanel
        lines={state.output}
        messages={diagnostics.map(({ rendered, displayLine }) => `${t("diagnostic.line", { line: displayLine })}: ${rendered.message}`)}
        generatedCaslSource={generatedCaslSource}
        cppToCaslMapping={cppToCaslMapping}
        currentCaslLine={sourceMode === "cpp" ? state.currentLine : undefined}
        currentCppLine={editorCurrentLine}
        state={state}
        sourceMode={sourceMode}
        initialTab={outputDockActiveTab}
        onActiveTabChange={setOutputDockActiveTab}
        autoOpenGenerated={sourceMode === "cpp" && !isSourceDirty && Boolean(generatedCaslSource)}
        onConsoleInput={submitConsoleInput}
        onClear={clearOutput}
      />
      <StatusBar state={state} backendInfo={backendInfo} />
    </div>
  );
}
