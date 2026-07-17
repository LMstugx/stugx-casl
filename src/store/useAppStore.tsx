import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { ReactNode } from "react";
import { EventBus } from "../app/eventBus";
import { createAppEventBus } from "../app/createAppEventBus";
import { AppEvent, AppEvents } from "../app/events";
import { coreBridge, getCoreBackendInfo, type CoreBackendInfo } from "../core/coreBridge";
import { createCometStateFromDto, createEmptyUiCometState } from "../core/coreStateAdapter";
import { CometState, Diagnostic } from "../core/types";
import { getDefaultDemoProgram, type DemoProgram } from "../examples/demoPrograms";
import { learningLessons } from "../examples/learningLessons";
import { createExampleDocument, createUntitledDocument, editDocument, isDocumentDirty } from "../documents/documentModel";
import { createSequentialDocumentIdFactory } from "../documents/idFactory";
import { createIdleFileLifecycleState, type FileLifecycleState } from "../documents/lifecycle";
import { languageToExtension } from "../documents/validation";
import type { DocumentIdFactory, DocumentWriteBinding, SourceDocument, SourceUnitId } from "../documents/types";
import { selectApplicationPreferences } from "../preferences/selectors";
import { DEFAULT_APPLICATION_PREFERENCES, type InspectorActiveTab, type ObservationMode, type OutputDockActiveTab, type ResolvedApplicationPreferencesV1 } from "../preferences/types";
import { serializeApplicationPreferences } from "../preferences/validation";
import { cloneLessonProgress, isPersistableLessonStep } from "../lessonProgress/model";
import type { LessonProgressState } from "../lessonProgress/types";
import { CppStorageObject, CppToCaslMap, transpileCppToCasl } from "../transpiler/cppTranspiler";

type AssembleStatus = "default" | "running" | "success" | "error";
export type SourceMode = "casl" | "cpp";
export type { ObservationMode } from "../preferences/types";
type RunStopReason = "manual" | "maxSteps" | "finished" | "error" | null;
export type LessonProgress = LessonProgressState;

const DEFAULT_RUN_MAX_STEPS = 1000;
const RUN_BATCH_SIZE = 20;

export type PreparedCoreSource =
  | {
      ok: true;
      coreSourceText: string;
      generatedCaslSource: string;
      mapping: CppToCaslMap[];
      storageObjects: CppStorageObject[];
      diagnostics: Diagnostic[];
      outputPrefix: string[];
    }
  | {
      ok: false;
      coreSourceText: "";
      generatedCaslSource: string;
      mapping: CppToCaslMap[];
      storageObjects: CppStorageObject[];
      diagnostics: Diagnostic[];
      outputPrefix: string[];
    };

type AppStoreState = {
  currentDocument: SourceDocument;
  currentWriteBinding: DocumentWriteBinding | null;
  fileLifecycle: FileLifecycleState;
  sourceText: string;
  sourceMode: SourceMode;
  lastAssembledSource: string;
  isSourceDirty: boolean;
  assembleResult: CometState | null;
  cometState: CometState;
  diagnostics: Diagnostic[];
  assembleStatus: AssembleStatus;
  runStopReason: RunStopReason;
  backendInfo: CoreBackendInfo;
  generatedCaslSource: string;
  cppToCaslMapping: CppToCaslMap[];
  cppStorageObjects: CppStorageObject[];
  selectedDemoProgramId: string;
  lessonProgress: LessonProgress;
  observationMode: ObservationMode;
  circuitFocusEnabled: boolean;
  inspectorActiveTab: InspectorActiveTab;
  outputDockActiveTab: OutputDockActiveTab;
  applicationFailure: "core-unavailable" | null;
};

type AppStoreActions = {
  setSourceText: (sourceText: string) => void;
  setSourceMode: (sourceMode: SourceMode) => void;
  assemble: () => void;
  run: (maxSteps?: number) => void;
  step: () => void;
  reset: () => void;
  stop: () => void;
  clearOutput: () => void;
  toggleLessonStep: (exampleId: string, stepId: string) => void;
  resetLessonProgress: (exampleId: string) => void;
  clearAllLessonProgress: () => void;
  setObservationMode: (mode: ObservationMode) => void;
  setCircuitFocusEnabled: (enabled: boolean) => void;
  setInspectorActiveTab: (tab: InspectorActiveTab) => void;
  setOutputDockActiveTab: (tab: OutputDockActiveTab) => void;
  replaceCurrentDocument: (document: SourceDocument, selectedExampleId?: string) => void;
  commitSavedDocument: (document: SourceDocument, writeBinding: DocumentWriteBinding | null) => void;
  setFileLifecycle: (lifecycle: FileLifecycleState) => void;
};

type AppStore = AppStoreState & AppStoreActions & {
  documentDirty: boolean;
  sourceUnitId: SourceUnitId;
};

export type AppStoreAction =
  | { type: "setSourceText"; sourceText: string }
  | { type: "setSourceMode"; sourceMode: SourceMode }
  | { type: "currentDocumentReplaced"; document: SourceDocument; selectedExampleId?: string }
  | { type: "currentDocumentSaved"; document: SourceDocument; writeBinding: DocumentWriteBinding | null }
  | { type: "fileLifecycleSet"; lifecycle: FileLifecycleState }
  | { type: "assembled"; sourceUnitId: SourceUnitId; sourceText: string; cometState: CometState; assembleStatus: AssembleStatus; generatedCaslSource?: string; cppToCaslMapping?: CppToCaslMap[]; cppStorageObjects?: CppStorageObject[] }
  | { type: "transpileFailed"; sourceUnitId: SourceUnitId; diagnostics: Diagnostic[]; generatedCaslSource: string; cppToCaslMapping: CppToCaslMap[]; cppStorageObjects: CppStorageObject[]; output: string[] }
  | { type: "runStarted"; cometState: CometState }
  | { type: "runProgress"; cometState: CometState }
  | { type: "runStopped"; cometState: CometState; reason: RunStopReason }
  | { type: "stepped"; cometState: CometState }
  | { type: "reset"; cometState: CometState }
  | { type: "coreError"; sourceUnitId: SourceUnitId }
  | { type: "clearOutput" }
  | { type: "lessonStepToggled"; exampleId: string; stepId: string }
  | { type: "lessonProgressReset"; exampleId: string }
  | { type: "lessonProgressCleared" }
  | { type: "observationModeSet"; mode: ObservationMode }
  | { type: "circuitFocusEnabledSet"; enabled: boolean }
  | { type: "inspectorActiveTabSet"; tab: InspectorActiveTab }
  | { type: "outputDockActiveTabSet"; tab: OutputDockActiveTab };

type AppStoreProviderProps = {
  children: ReactNode;
  eventBus?: EventBus<AppEvents>;
  initialExample?: DemoProgram | null;
  initialPreferences?: ResolvedApplicationPreferencesV1;
  initialLessonProgress?: LessonProgress;
  onApplicationPreferencesChange?: (preferences: ResolvedApplicationPreferencesV1) => void;
  onLessonProgressChange?: (progress: LessonProgress) => void;
  onAllLessonProgressClear?: () => void;
};

const AppStoreContext = createContext<AppStore | null>(null);
const AppEventBusContext = createContext<EventBus<AppEvents> | null>(null);

export function createInitialAppState(
  ids: DocumentIdFactory = createSequentialDocumentIdFactory("app"),
  preferences: ResolvedApplicationPreferencesV1 = DEFAULT_APPLICATION_PREFERENCES,
  initialDemo: DemoProgram | null = getDefaultDemoProgram() ?? null,
  initialLessonProgress: LessonProgress = {}
): AppStoreState {
  const currentDocument = initialDemo
    ? createExampleDocument(initialDemo, ids)
    : createUntitledDocument("casl", ids);
  return {
    currentDocument,
    currentWriteBinding: null,
    fileLifecycle: createIdleFileLifecycleState(),
    sourceText: currentDocument.content,
    sourceMode: currentDocument.language,
    lastAssembledSource: currentDocument.content,
    isSourceDirty: false,
    assembleResult: null,
    cometState: createEmptyUiCometState("Idle", ["Editor ready. Assemble to load the current source."]),
    diagnostics: [],
    assembleStatus: "default",
    runStopReason: null,
    backendInfo: getCoreBackendInfo(),
    generatedCaslSource: "",
    cppToCaslMapping: [],
    cppStorageObjects: [],
    selectedDemoProgramId: initialDemo?.id ?? "",
    lessonProgress: cloneLessonProgress(initialLessonProgress),
    observationMode: preferences.observationMode,
    circuitFocusEnabled: preferences.circuitFocusEnabled,
    inspectorActiveTab: preferences.inspectorActiveTab,
    outputDockActiveTab: preferences.outputDockActiveTab,
    applicationFailure: null
  };
}

export function prepareSourceForCoreAssembly(sourceText: string, sourceMode: SourceMode): PreparedCoreSource {
  if (sourceMode === "casl") {
    return {
      ok: true,
      coreSourceText: sourceText,
      generatedCaslSource: "",
      mapping: [],
      storageObjects: [],
      diagnostics: [],
      outputPrefix: []
    };
  }

  const result = transpileCppToCasl(sourceText);
  if (!result.ok) {
    return {
      ok: false,
      coreSourceText: "",
      generatedCaslSource: result.caslSource,
      mapping: result.mapping,
      storageObjects: result.storageObjects,
      diagnostics: result.diagnostics,
      outputPrefix: ["C++ subset transpile failed.", ...result.diagnostics.map((diagnostic) => `Line ${diagnostic.line}: ${diagnostic.message}`)]
    };
  }

  return {
    ok: true,
    coreSourceText: result.caslSource,
    generatedCaslSource: result.caslSource,
    mapping: result.mapping,
    storageObjects: result.storageObjects,
    diagnostics: [],
    outputPrefix: ["C++ subset transpiled to CASL.", `Generated CASL lines: ${result.caslSource.split(/\r?\n/).length}`]
  };
}

export function appStoreReducer(state: AppStoreState, action: AppStoreAction): AppStoreState {
  if (action.type === "setSourceText") {
    if (action.sourceText === state.sourceText) return state;
    return {
      ...state,
      currentDocument: editDocument(state.currentDocument, action.sourceText),
      sourceText: action.sourceText,
      isSourceDirty: true,
      assembleResult: null,
      diagnostics: [],
      cometState: createEmptyUiCometState("Dirty", ["Source modified. Assemble to load the current source."]),
      assembleStatus: "default",
      runStopReason: null,
      generatedCaslSource: "",
      cppToCaslMapping: [],
      cppStorageObjects: []
    };
  }

  if (action.type === "setSourceMode") {
    if (action.sourceMode === state.sourceMode) return state;
    return {
      ...state,
      currentDocument: {
        ...state.currentDocument,
        language: action.sourceMode,
        extension: languageToExtension(action.sourceMode),
        revision: state.currentDocument.revision + 1,
        saveCapability: "save-as-only"
      },
      currentWriteBinding: null,
      sourceMode: action.sourceMode,
      isSourceDirty: true,
      assembleResult: null,
      diagnostics: [],
      cometState: createEmptyUiCometState("Dirty", [`Source mode changed to ${action.sourceMode === "cpp" ? "C++ subset" : "CASL"}. Assemble to load the current source.`]),
      assembleStatus: "default",
      runStopReason: null,
      generatedCaslSource: "",
      cppToCaslMapping: [],
      cppStorageObjects: []
    };
  }

  if (action.type === "currentDocumentReplaced") {
    return {
      ...state,
      currentDocument: action.document,
      currentWriteBinding: null,
      fileLifecycle: createIdleFileLifecycleState(),
      sourceText: action.document.content,
      sourceMode: action.document.language,
      lastAssembledSource: "",
      isSourceDirty: false,
      assembleResult: null,
      cometState: createEmptyUiCometState("Idle", []),
      diagnostics: [],
      assembleStatus: "default",
      runStopReason: null,
      generatedCaslSource: "",
      cppToCaslMapping: [],
      cppStorageObjects: [],
      selectedDemoProgramId: action.selectedExampleId ?? "",
      applicationFailure: null
    };
  }

  if (action.type === "fileLifecycleSet") {
    return state.fileLifecycle === action.lifecycle ? state : { ...state, fileLifecycle: action.lifecycle };
  }

  if (action.type === "currentDocumentSaved") {
    if (
      action.document.documentId !== state.currentDocument.documentId
      || action.document.sourceUnitId !== state.currentDocument.sourceUnitId
    ) return state;
    return { ...state, currentDocument: action.document, currentWriteBinding: action.writeBinding };
  }

  if (action.type === "assembled") {
    if (action.sourceUnitId !== state.currentDocument.sourceUnitId) return state;
    const diagnostics = action.cometState.diagnostics;
    const ok = action.assembleStatus === "success";
    return {
      ...state,
      lastAssembledSource: action.sourceText,
      isSourceDirty: false,
      assembleResult: ok ? action.cometState : null,
      cometState: action.cometState,
      diagnostics,
      assembleStatus: action.assembleStatus,
      runStopReason: null,
      backendInfo: getCoreBackendInfo(),
      generatedCaslSource: action.generatedCaslSource ?? "",
      cppToCaslMapping: action.cppToCaslMapping ?? [],
      cppStorageObjects: (action.cppStorageObjects ?? []).map((object) => ({ ...object, sourceUnitId: action.sourceUnitId })),
      applicationFailure: null
    };
  }

  if (action.type === "transpileFailed") {
    if (action.sourceUnitId !== state.currentDocument.sourceUnitId) return state;
    return {
      ...state,
      assembleResult: null,
      diagnostics: action.diagnostics,
      assembleStatus: "error",
      runStopReason: "error",
      cometState: createEmptyUiCometState("Error", action.output),
      backendInfo: getCoreBackendInfo(),
      generatedCaslSource: action.generatedCaslSource,
      cppToCaslMapping: action.cppToCaslMapping,
      cppStorageObjects: []
    };
  }

  if (action.type === "runStarted" || action.type === "runProgress") {
    return {
      ...state,
      cometState: action.cometState,
      runStopReason: null,
      backendInfo: getCoreBackendInfo()
    };
  }

  if (action.type === "runStopped") {
    return {
      ...state,
      cometState: action.cometState,
      runStopReason: action.reason,
      backendInfo: getCoreBackendInfo()
    };
  }

  if (action.type === "stepped") {
    return {
      ...state,
      cometState: action.cometState,
      runStopReason: null,
      backendInfo: getCoreBackendInfo()
    };
  }

  if (action.type === "reset") {
    return {
      ...state,
      cometState: action.cometState,
      diagnostics: action.cometState.diagnostics,
      assembleStatus: "success",
      runStopReason: null,
      backendInfo: getCoreBackendInfo()
    };
  }

  if (action.type === "coreError") {
    if (action.sourceUnitId !== state.currentDocument.sourceUnitId) return state;
    return {
      ...state,
      assembleResult: null,
      assembleStatus: "error",
      runStopReason: "error",
      backendInfo: getCoreBackendInfo(),
      applicationFailure: "core-unavailable"
    };
  }

  if (action.type === "clearOutput") {
    return {
      ...state,
      cometState: { ...state.cometState, output: [] }
    };
  }

  if (action.type === "lessonStepToggled") {
    if (
      state.currentDocument.origin !== "example" ||
      state.selectedDemoProgramId !== action.exampleId ||
      !isPersistableLessonStep(learningLessons, action.exampleId, action.stepId)
    ) return state;
    const currentExampleProgress = state.lessonProgress[action.exampleId] ?? {};
    return {
      ...state,
      lessonProgress: {
        ...state.lessonProgress,
        [action.exampleId]: {
          ...currentExampleProgress,
          [action.stepId]: !currentExampleProgress[action.stepId]
        }
      }
    };
  }

  if (action.type === "lessonProgressReset") {
    if (!state.lessonProgress[action.exampleId]) return state;
    const nextProgress = { ...state.lessonProgress };
    delete nextProgress[action.exampleId];
    return {
      ...state,
      lessonProgress: nextProgress
    };
  }

  if (action.type === "lessonProgressCleared") {
    return Object.keys(state.lessonProgress).length === 0 ? state : { ...state, lessonProgress: {} };
  }

  if (action.type === "observationModeSet") {
    if (state.observationMode === action.mode) return state;
    return {
      ...state,
      observationMode: action.mode
    };
  }

  if (action.type === "circuitFocusEnabledSet") {
    return state.circuitFocusEnabled === action.enabled ? state : { ...state, circuitFocusEnabled: action.enabled };
  }

  if (action.type === "inspectorActiveTabSet") {
    return state.inspectorActiveTab === action.tab ? state : { ...state, inspectorActiveTab: action.tab };
  }

  if (action.type === "outputDockActiveTabSet") {
    return state.outputDockActiveTab === action.tab ? state : { ...state, outputDockActiveTab: action.tab };
  }

  return state;
}

export function AppStoreProvider({
  children,
  eventBus: providedEventBus,
  initialExample,
  initialPreferences = DEFAULT_APPLICATION_PREFERENCES,
  initialLessonProgress = {},
  onApplicationPreferencesChange,
  onLessonProgressChange,
  onAllLessonProgressClear
}: AppStoreProviderProps) {
  const eventBus = useMemo(() => providedEventBus ?? createAppEventBus(), [providedEventBus]);
  const documentIdsRef = useRef(createSequentialDocumentIdFactory("app"));
  const initialStateRef = useRef<AppStoreState | null>(null);
  if (!initialStateRef.current) initialStateRef.current = createInitialAppState(documentIdsRef.current, initialPreferences, initialExample, initialLessonProgress);
  const [state, dispatch] = useReducer(appStoreReducer, initialStateRef.current);
  const runControlRef = useRef({ runId: 0, stopRequested: false });
  const preferenceSnapshot = useMemo(
    () => selectApplicationPreferences(state),
    [state.circuitFocusEnabled, state.inspectorActiveTab, state.observationMode, state.outputDockActiveTab]
  );
  const lastPreferenceSnapshotRef = useRef(serializeApplicationPreferences(preferenceSnapshot));
  const lastLessonProgressRef = useRef(state.lessonProgress);

  useEffect(() => {
    const serialized = serializeApplicationPreferences(preferenceSnapshot);
    if (serialized === lastPreferenceSnapshotRef.current) return;
    lastPreferenceSnapshotRef.current = serialized;
    onApplicationPreferencesChange?.(preferenceSnapshot);
  }, [onApplicationPreferencesChange, preferenceSnapshot]);

  useEffect(() => {
    if (state.lessonProgress === lastLessonProgressRef.current) return;
    lastLessonProgressRef.current = state.lessonProgress;
    onLessonProgressChange?.(state.lessonProgress);
  }, [onLessonProgressChange, state.lessonProgress]);

  const actions = useMemo<AppStoreActions>(
    () => ({
      setSourceText: (sourceText) => {
        runControlRef.current.stopRequested = true;
        dispatch({ type: "setSourceText", sourceText });
      },
      setSourceMode: (sourceMode) => {
        runControlRef.current.stopRequested = true;
        dispatch({ type: "setSourceMode", sourceMode });
      },
      assemble: () => {
        void (async () => {
          const sourceUnitId = state.currentDocument.sourceUnitId;
          try {
            eventBus.emit(AppEvent.CoreAssembleStarted, { sourceLength: state.sourceText.length });
            const prepared = prepareSourceForCoreAssembly(state.sourceText, state.sourceMode);
            if (!prepared.ok) {
              eventBus.emit(AppEvent.CoreAssembleFailed, { diagnostics: prepared.diagnostics });
              dispatch({
                type: "transpileFailed",
                sourceUnitId,
                diagnostics: prepared.diagnostics,
                generatedCaslSource: prepared.generatedCaslSource,
                cppToCaslMapping: prepared.mapping,
                cppStorageObjects: prepared.storageObjects,
                output: prepared.outputPrefix
              });
              return;
            }
            const result = await coreBridge.assemble(prepared.coreSourceText);
            const baseState = createCometStateFromDto(result.state);
            const cometState = prepared.outputPrefix.length ? { ...baseState, output: [...prepared.outputPrefix, ...baseState.output] } : baseState;
            if (cometState.runState === "Error") {
              eventBus.emit(AppEvent.CoreAssembleFailed, { diagnostics: cometState.diagnostics });
            } else {
              eventBus.emit(AppEvent.CoreAssembleSucceeded, {
                instructionCount: cometState.program?.length ?? 0,
                startAddress: cometState.pr
              });
            }
            dispatch({
              type: "assembled",
              sourceUnitId,
              sourceText: state.sourceText,
              cometState,
              assembleStatus: cometState.runState === "Error" ? "error" : "success",
              generatedCaslSource: prepared.generatedCaslSource,
              cppToCaslMapping: prepared.mapping,
              cppStorageObjects: prepared.storageObjects
            });
          } catch (error) {
            const message = coreErrorMessage(error);
            eventBus.emit(AppEvent.VmError, { message });
            dispatch({ type: "coreError", sourceUnitId });
          }
        })();
      },
      step: () => {
        if (state.isSourceDirty || !state.cometState.assembled || !canExecuteFromCurrentState(state.cometState, state.runStopReason)) return;
        void (async () => {
          const sourceUnitId = state.currentDocument.sourceUnitId;
          try {
            const result = await coreBridge.step();
            const output = [...state.cometState.output];
            if (result.state.lastInstructionKind) output.push(`Step ${result.state.stepCount}: ${result.state.lastInstructionKind} executed.`);
            if (result.state.runState === "Finished" && state.cometState.runState !== "Finished") output.push("Execution finished.");
            if (result.state.runState === "Error" && state.cometState.runState !== "Error") output.push("Runtime error.");
            const cometState = createCometStateFromDto(result.state, { previous: state.cometState, output });
            if (cometState.lastStep) {
              eventBus.emit(AppEvent.VmStepCompleted, {
                stepCount: cometState.stepIndex,
                instruction: cometState.lastStep.executedInstruction
              });
            }
            if (cometState.runState === "Finished") {
              eventBus.emit(AppEvent.VmRunStopped, { reason: "finished" });
            }
            if (cometState.runState === "Error") {
              eventBus.emit(AppEvent.VmError, { message: cometState.output[cometState.output.length - 1] ?? "VM error" });
              eventBus.emit(AppEvent.VmRunStopped, { reason: "error" });
            }
            dispatch({ type: "stepped", cometState });
          } catch (error) {
            const message = coreErrorMessage(error);
            eventBus.emit(AppEvent.VmError, { message });
            dispatch({ type: "coreError", sourceUnitId });
          }
        })();
      },
      run: (maxSteps = DEFAULT_RUN_MAX_STEPS) => {
        if (state.isSourceDirty || !state.cometState.assembled || !canExecuteFromCurrentState(state.cometState, state.runStopReason)) return;
        const requestedMaxSteps = typeof maxSteps === "number" && Number.isFinite(maxSteps) ? maxSteps : DEFAULT_RUN_MAX_STEPS;
        const boundedMaxSteps = Math.max(1, Math.floor(requestedMaxSteps));
        const runId = runControlRef.current.runId + 1;
        const sourceUnitId = state.currentDocument.sourceUnitId;
        runControlRef.current = { runId, stopRequested: false };
        void (async () => {
          let executedSteps = 0;
          let workingState: CometState = {
            ...state.cometState,
            runState: "Running",
            output: appendOutputLine(state.cometState.output, `Run started. Max steps: ${boundedMaxSteps}.`)
          };
          dispatch({ type: "runStarted", cometState: workingState });

          try {
            while (executedSteps < boundedMaxSteps && !isRunTerminal(workingState.runState)) {
              for (let batchIndex = 0; batchIndex < RUN_BATCH_SIZE && executedSteps < boundedMaxSteps; batchIndex += 1) {
                if (runControlRef.current.runId !== runId || runControlRef.current.stopRequested) break;
                const result = await coreBridge.step();
                executedSteps += 1;
                const nextState = createCometStateFromDto(result.state, { previous: workingState, output: workingState.output });
                workingState = nextState.runState === "Ready" ? { ...nextState, runState: "Running" } : nextState;
                if (isRunTerminal(workingState.runState)) break;
              }

              if (runControlRef.current.runId !== runId || runControlRef.current.stopRequested || isRunTerminal(workingState.runState) || executedSteps >= boundedMaxSteps) break;
              dispatch({ type: "runProgress", cometState: workingState });
              await yieldToBrowser();
            }

            if (runControlRef.current.runId !== runId) return;

            let finalState = workingState;
            if (runControlRef.current.stopRequested) {
              finalState = {
                ...workingState,
                runState: "Stopped",
                output: appendOutputLine(workingState.output, `Run stopped after ${executedSteps} steps.`)
              };
              eventBus.emit(AppEvent.VmRunStopped, { reason: "manual" });
            } else if (workingState.runState === "Finished") {
              finalState = {
                ...workingState,
                output: appendOutputLine(workingState.output, `Run finished after ${executedSteps} steps.`)
              };
              eventBus.emit(AppEvent.VmRunStopped, { reason: "finished" });
            } else if (workingState.runState === "Error") {
              finalState = {
                ...workingState,
                output: appendOutputLine(workingState.output, "Runtime error.")
              };
              eventBus.emit(AppEvent.VmRunStopped, { reason: "error" });
              eventBus.emit(AppEvent.VmError, { message: finalState.output[finalState.output.length - 1] ?? "VM error" });
            } else if (executedSteps >= boundedMaxSteps) {
              finalState = {
                ...workingState,
                runState: "Stopped",
                output: appendOutputLine(workingState.output, `Max steps reached. Possible infinite loop. (${boundedMaxSteps} steps)`)
              };
              eventBus.emit(AppEvent.VmRunStopped, { reason: "maxSteps" });
            }

            const stopReason = finalRunStopReason(finalState, executedSteps, boundedMaxSteps, runControlRef.current.stopRequested);
            runControlRef.current.stopRequested = false;
            dispatch({ type: "runStopped", cometState: finalState, reason: stopReason });
          } catch (error) {
            const message = coreErrorMessage(error);
            eventBus.emit(AppEvent.VmError, { message });
            eventBus.emit(AppEvent.VmRunStopped, { reason: "error" });
            dispatch({ type: "coreError", sourceUnitId });
          }
        })();
      },
      reset: () => {
        if (state.isSourceDirty || !state.assembleResult || state.cometState.runState === "Running") return;
        runControlRef.current.stopRequested = true;
        const sourceUnitId = state.currentDocument.sourceUnitId;
        void (async () => {
          try {
            const dto = await coreBridge.reset();
            dispatch({
              type: "reset",
              cometState: createCometStateFromDto(dto, {
                output: dto.runState === "Ready" ? ["Program reset. Entry point: START (0020)"] : []
              })
            });
          } catch (error) {
            const message = coreErrorMessage(error);
            eventBus.emit(AppEvent.VmError, { message });
            dispatch({ type: "coreError", sourceUnitId });
          }
        })();
      },
      stop: () => {
        if (state.cometState.runState !== "Running") return;
        runControlRef.current.stopRequested = true;
      },
      clearOutput: () => dispatch({ type: "clearOutput" }),
      toggleLessonStep: (exampleId, stepId) => dispatch({ type: "lessonStepToggled", exampleId, stepId }),
      resetLessonProgress: (exampleId) => dispatch({ type: "lessonProgressReset", exampleId }),
      clearAllLessonProgress: () => {
        onAllLessonProgressClear?.();
        dispatch({ type: "lessonProgressCleared" });
      },
      setObservationMode: (mode) => dispatch({ type: "observationModeSet", mode }),
      setCircuitFocusEnabled: (enabled) => dispatch({ type: "circuitFocusEnabledSet", enabled }),
      setInspectorActiveTab: (tab) => dispatch({ type: "inspectorActiveTabSet", tab }),
      setOutputDockActiveTab: (tab) => dispatch({ type: "outputDockActiveTabSet", tab }),
      replaceCurrentDocument: (document, selectedExampleId = "") => {
        runControlRef.current = { runId: runControlRef.current.runId + 1, stopRequested: true };
        dispatch({ type: "currentDocumentReplaced", document, selectedExampleId });
      },
      commitSavedDocument: (document, writeBinding) => dispatch({ type: "currentDocumentSaved", document, writeBinding }),
      setFileLifecycle: (lifecycle) => dispatch({ type: "fileLifecycleSet", lifecycle })
    }),
    [eventBus, onAllLessonProgressClear, state.assembleResult, state.cometState, state.isSourceDirty, state.runStopReason, state.sourceMode, state.sourceText]
  );

  const value = useMemo<AppStore>(() => ({
    ...state,
    ...actions,
    documentDirty: isDocumentDirty(state.currentDocument),
    sourceUnitId: state.currentDocument.sourceUnitId
  }), [state, actions]);
  return (
    <AppEventBusContext.Provider value={eventBus}>
      <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
    </AppEventBusContext.Provider>
  );
}

function coreErrorMessage(error: unknown): string {
  void error;
  return "Core backend unavailable";
}

function isRunTerminal(runState: CometState["runState"]): boolean {
  return runState === "Finished" || runState === "Error" || runState === "Stopped";
}

function canExecuteFromCurrentState(cometState: CometState, runStopReason: RunStopReason): boolean {
  return cometState.runState === "Ready" || (cometState.runState === "Stopped" && runStopReason === "manual");
}

function finalRunStopReason(finalState: CometState, executedSteps: number, maxSteps: number, stopRequested: boolean): RunStopReason {
  if (stopRequested) return "manual";
  if (finalState.runState === "Finished") return "finished";
  if (finalState.runState === "Error") return "error";
  if (finalState.runState === "Stopped" && executedSteps >= maxSteps) return "maxSteps";
  if (finalState.runState === "Stopped") return "manual";
  return null;
}

function appendOutputLine(output: string[], line: string): string[] {
  if (output[output.length - 1] === line) return output;
  return [...output, line];
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}

export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new Error("useAppStore must be used within AppStoreProvider.");
  }
  return store;
}

export function useAppEventBus(): EventBus<AppEvents> {
  const eventBus = useContext(AppEventBusContext);
  if (!eventBus) {
    throw new Error("useAppEventBus must be used within AppStoreProvider.");
  }
  return eventBus;
}
