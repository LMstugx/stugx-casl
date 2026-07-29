import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { ReactNode } from "react";
import { EventBus } from "../app/eventBus";
import { createAppEventBus } from "../app/createAppEventBus";
import { AppEvent, AppEvents } from "../app/events";
import { coreBridge, getCoreBackendInfo, type CoreBackendInfo } from "../core/coreBridge";
import type { ReloadInitializationMode } from "../core/coreAdapter";
import { createCometStateFromDto, createEmptyUiCometState } from "../core/coreStateAdapter";
import type { ExecutionGranularity, MicrocyclePhase } from "../core/microcycle";
import type {
  ReverseMicrostepRequest,
  ReverseMicrostepStatus
} from "../core/reverseMicrocycle";
import type {
  ReverseInstructionRequest,
  ReverseInstructionStatus
} from "../core/reverseInstruction";
import { CometState, Diagnostic, VisualPathKind, formatWord } from "../core/types";
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
import {
  categorizeMemoryAddress,
  debuggerMutationWord,
  isValidDebuggerMutationInput,
  sourceMappingConfidenceFor,
  targetDisplayName,
  unpackDebuggerFlags,
  type DebuggerMutationInput,
  type DebuggerMutationRequest,
  type DebuggerMutationResult,
  type DebuggerMemoryCategory,
  type RuntimeWordOverride
} from "../debugger/debuggerMutation";
import type {
  LinkProjectResultDto,
  ModuleAssemblyResult,
  ProjectLinkModuleInput,
  ProjectLinkRequest
} from "../linker/types";

type AssembleStatus = "default" | "running" | "success" | "error";
export type SourceMode = "casl" | "cpp";
export type { ObservationMode } from "../preferences/types";
type RunStopReason = "manual" | "maxSteps" | "waitingInput" | "finished" | "error" | null;
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
  executionGranularity: ExecutionGranularity;
  observationMode: ObservationMode;
  circuitFocusEnabled: boolean;
  inspectorActiveTab: InspectorActiveTab;
  outputDockActiveTab: OutputDockActiveTab;
  applicationFailure: "core-unavailable" | null;
  assemblyId: string | null;
  executionEpoch: number;
  historyEpoch: number;
  runtimeImageRevision: number;
  runtimeOverrides: Record<number, RuntimeWordOverride>;
  programModified: boolean;
  dataModified: boolean;
  mutationInFlight: boolean;
  reverseInFlight: boolean;
  reverseNotice:
    | {
        kind: "microstep";
        restoredPhase: MicrocyclePhase;
        reversedEntryId?: number;
      }
    | {
        kind: "instruction";
        machineAddress?: number;
        mnemonic?: string;
        reversedMicrostepCount: number;
      }
    | null;
};

type AppStoreActions = {
  setSourceText: (sourceText: string) => void;
  setSourceMode: (sourceMode: SourceMode) => void;
  assemble: () => void;
  run: (maxSteps?: number) => void;
  step: () => void;
  reset: () => void;
  reload: (mode: ReloadInitializationMode) => void;
  mutateDebuggerState: (input: DebuggerMutationInput) => Promise<DebuggerMutationResult>;
  fullClear: () => Promise<boolean>;
  reverseMicrostep: () => Promise<ReverseMicrostepStatus>;
  reverseInstruction: () => Promise<ReverseInstructionStatus>;
  stop: () => void;
  submitConsoleInput: (text: string, endOfFile?: boolean) => void;
  clearOutput: () => void;
  toggleLessonStep: (exampleId: string, stepId: string) => void;
  resetLessonProgress: (exampleId: string) => void;
  clearAllLessonProgress: () => void;
  setExecutionGranularity: (granularity: ExecutionGranularity) => void;
  setObservationMode: (mode: ObservationMode) => void;
  setCircuitFocusEnabled: (enabled: boolean) => void;
  setInspectorActiveTab: (tab: InspectorActiveTab) => void;
  setOutputDockActiveTab: (tab: OutputDockActiveTab) => void;
  replaceCurrentDocument: (
    document: SourceDocument,
    selectedExampleId?: string,
    writeBinding?: DocumentWriteBinding | null
  ) => void;
  selectProjectDocument: (document: SourceDocument, writeBinding: DocumentWriteBinding | null) => void;
  assembleProjectModule: (input: ProjectLinkModuleInput) => Promise<ModuleAssemblyResult>;
  linkProject: (request: ProjectLinkRequest) => Promise<LinkProjectResultDto>;
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
  | { type: "currentDocumentReplaced"; document: SourceDocument; selectedExampleId?: string; writeBinding?: DocumentWriteBinding | null }
  | { type: "projectDocumentSelected"; document: SourceDocument; writeBinding: DocumentWriteBinding | null }
  | { type: "projectLinked"; result: LinkProjectResultDto; cometState: CometState }
  | { type: "projectLinkFailed"; diagnostics: Diagnostic[] }
  | { type: "currentDocumentSaved"; document: SourceDocument; writeBinding: DocumentWriteBinding | null }
  | { type: "fileLifecycleSet"; lifecycle: FileLifecycleState }
  | { type: "assembled"; sourceUnitId: SourceUnitId; sourceText: string; cometState: CometState; assembleStatus: AssembleStatus; assemblyId?: string; generatedCaslSource?: string; cppToCaslMapping?: CppToCaslMap[]; cppStorageObjects?: CppStorageObject[] }
  | { type: "transpileFailed"; sourceUnitId: SourceUnitId; diagnostics: Diagnostic[]; generatedCaslSource: string; cppToCaslMapping: CppToCaslMap[]; cppStorageObjects: CppStorageObject[]; output: string[] }
  | { type: "runStarted"; cometState: CometState; owner: ExecutionOwner }
  | { type: "runProgress"; cometState: CometState; owner: ExecutionOwner }
  | { type: "runStopped"; cometState: CometState; reason: RunStopReason; owner: ExecutionOwner }
  | { type: "stepped"; cometState: CometState; owner: ExecutionOwner }
  | { type: "reset"; cometState: CometState; owner: ExecutionOwner; clearOverrides?: boolean }
  | { type: "coreError"; sourceUnitId: SourceUnitId; owner?: ExecutionOwner }
  | { type: "mutationStarted"; request: DebuggerMutationRequest; nextEpoch: number }
  | { type: "mutationCommitted"; request: DebuggerMutationRequest; nextEpoch: number; cometState: CometState; previousWord: number }
  | { type: "mutationFinished"; mutationId: string }
  | { type: "fullClearStarted"; owner: ExecutionOwner; nextEpoch: number }
  | { type: "fullClearCommitted"; owner: ExecutionOwner; nextEpoch: number; cometState: CometState }
  | { type: "reverseStarted"; request: ReverseMicrostepRequest; nextEpoch: number }
  | { type: "reverseCommitted"; request: ReverseMicrostepRequest; nextEpoch: number; cometState: CometState; restoredPhase: MicrocyclePhase; reversedEntryId?: number }
  | { type: "reverseFinished"; request: ReverseMicrostepRequest; nextEpoch: number; cometState?: CometState }
  | { type: "reverseInstructionStarted"; request: ReverseInstructionRequest; nextEpoch: number }
  | { type: "reverseInstructionCommitted"; request: ReverseInstructionRequest; nextEpoch: number; cometState: CometState; machineAddress?: number; mnemonic?: string; reversedMicrostepCount: number }
  | { type: "reverseInstructionFinished"; request: ReverseInstructionRequest; nextEpoch: number; cometState?: CometState }
  | { type: "clearOutput" }
  | { type: "lessonStepToggled"; exampleId: string; stepId: string }
  | { type: "lessonProgressReset"; exampleId: string }
  | { type: "lessonProgressCleared" }
  | { type: "executionGranularitySet"; granularity: ExecutionGranularity }
  | { type: "observationModeSet"; mode: ObservationMode }
  | { type: "circuitFocusEnabledSet"; enabled: boolean }
  | { type: "inspectorActiveTabSet"; tab: InspectorActiveTab }
  | { type: "outputDockActiveTabSet"; tab: OutputDockActiveTab };

type ExecutionOwner = {
  sourceUnitId: SourceUnitId;
  assemblyId: string | null;
  executionEpoch: number;
};

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
    executionGranularity: "instruction",
    observationMode: preferences.observationMode,
    circuitFocusEnabled: preferences.circuitFocusEnabled,
    inspectorActiveTab: preferences.inspectorActiveTab,
    outputDockActiveTab: preferences.outputDockActiveTab,
    applicationFailure: null,
    assemblyId: null,
    executionEpoch: 0,
    historyEpoch: 0,
    runtimeImageRevision: 0,
    runtimeOverrides: {},
    programModified: false,
    dataModified: false,
    mutationInFlight: false,
    reverseInFlight: false,
    reverseNotice: null
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
      cppStorageObjects: [],
      assemblyId: null,
      executionEpoch: state.executionEpoch + 1,
      historyEpoch: state.historyEpoch + 1,
      runtimeImageRevision: 0,
      runtimeOverrides: {},
      programModified: false,
      dataModified: false,
      mutationInFlight: false,
      reverseInFlight: false,
      reverseNotice: null
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
      cppStorageObjects: [],
      assemblyId: null,
      executionEpoch: state.executionEpoch + 1,
      historyEpoch: state.historyEpoch + 1,
      runtimeImageRevision: 0,
      runtimeOverrides: {},
      programModified: false,
      dataModified: false,
      mutationInFlight: false,
      reverseInFlight: false,
      reverseNotice: null
    };
  }

  if (action.type === "currentDocumentReplaced") {
    return {
      ...state,
      currentDocument: action.document,
      currentWriteBinding: action.writeBinding ?? null,
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
      applicationFailure: null,
      assemblyId: null,
      executionEpoch: state.executionEpoch + 1,
      historyEpoch: state.historyEpoch + 1,
      runtimeImageRevision: 0,
      runtimeOverrides: {},
      programModified: false,
      dataModified: false,
      mutationInFlight: false,
      reverseInFlight: false,
      reverseNotice: null
    };
  }

  if (action.type === "projectDocumentSelected") {
    return {
      ...state,
      currentDocument: action.document,
      currentWriteBinding: action.writeBinding,
      fileLifecycle: createIdleFileLifecycleState(),
      sourceText: action.document.content,
      sourceMode: action.document.language,
      lastAssembledSource: action.document.content,
      isSourceDirty: false,
      diagnostics: [],
      assembleStatus: state.cometState.assembled ? "success" : "default",
      selectedDemoProgramId: "",
      generatedCaslSource: "",
      cppToCaslMapping: [],
      cppStorageObjects: [],
      reverseNotice: null
    };
  }

  if (action.type === "projectLinked") {
    return {
      ...state,
      assembleResult: action.cometState,
      cometState: action.cometState,
      diagnostics: action.cometState.diagnostics,
      assembleStatus: "success",
      runStopReason: null,
      lastAssembledSource: state.sourceText,
      isSourceDirty: false,
      generatedCaslSource: "",
      cppToCaslMapping: [],
      cppStorageObjects: [],
      selectedDemoProgramId: "",
      assemblyId: action.result.link.linkId,
      executionEpoch: state.executionEpoch + 1,
      historyEpoch: action.cometState.historyEpoch,
      runtimeImageRevision: 0,
      runtimeOverrides: {},
      programModified: false,
      dataModified: false,
      mutationInFlight: false,
      reverseInFlight: false,
      reverseNotice: null
    };
  }

  if (action.type === "projectLinkFailed") {
    return {
      ...state,
      diagnostics: action.diagnostics,
      assembleStatus: "error",
      runStopReason: null,
      reverseNotice: null
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
      applicationFailure: null,
      assemblyId: ok ? action.assemblyId ?? `${action.sourceUnitId}:assembly:legacy` : null,
      executionEpoch: state.executionEpoch + 1,
      historyEpoch: state.historyEpoch + 1,
      runtimeImageRevision: 0,
      runtimeOverrides: {},
      programModified: false,
      dataModified: false,
      mutationInFlight: false,
      reverseInFlight: false,
      reverseNotice: null
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
      cppStorageObjects: [],
      assemblyId: null,
      executionEpoch: state.executionEpoch + 1,
      historyEpoch: state.historyEpoch + 1,
      runtimeImageRevision: 0,
      runtimeOverrides: {},
      programModified: false,
      dataModified: false,
      mutationInFlight: false,
      reverseInFlight: false,
      reverseNotice: null
    };
  }

  if (action.type === "runStarted" || action.type === "runProgress") {
    if (!executionOwnerMatches(state, action.owner)) return state;
    return {
      ...state,
      cometState: action.cometState,
      runStopReason: null,
      backendInfo: getCoreBackendInfo(),
      reverseNotice: null
    };
  }

  if (action.type === "runStopped") {
    if (!executionOwnerMatches(state, action.owner)) return state;
    return {
      ...state,
      cometState: action.cometState,
      runStopReason: action.reason,
      backendInfo: getCoreBackendInfo(),
      reverseNotice: null
    };
  }

  if (action.type === "stepped") {
    if (!executionOwnerMatches(state, action.owner)) return state;
    return {
      ...state,
      cometState: action.cometState,
      runStopReason: null,
      backendInfo: getCoreBackendInfo(),
      reverseNotice: null
    };
  }

  if (action.type === "reverseStarted") {
    if (
      state.currentDocument.sourceUnitId !== action.request.sourceUnitId
      || state.assemblyId !== action.request.assemblyId
      || state.executionEpoch !== action.request.executionEpoch
      || state.cometState.historyEpoch !== action.request.historyEpoch
      || state.cometState.timelineRevision !== action.request.timelineRevision
      || state.reverseInFlight
    ) return state;
    return {
      ...state,
      executionEpoch: action.nextEpoch,
      reverseInFlight: true,
      reverseNotice: null
    };
  }

  if (action.type === "reverseCommitted") {
    if (
      state.currentDocument.sourceUnitId !== action.request.sourceUnitId
      || state.assemblyId !== action.request.assemblyId
      || state.executionEpoch !== action.nextEpoch
      || state.cometState.historyEpoch !== action.request.historyEpoch
    ) return state;
    return {
      ...state,
      cometState: action.cometState,
      runStopReason: null,
      backendInfo: getCoreBackendInfo(),
      reverseInFlight: false,
      reverseNotice: {
        kind: "microstep",
        restoredPhase: action.restoredPhase,
        reversedEntryId: action.reversedEntryId
      }
    };
  }

  if (action.type === "reverseFinished") {
    if (
      state.currentDocument.sourceUnitId !== action.request.sourceUnitId
      || state.assemblyId !== action.request.assemblyId
      || state.executionEpoch !== action.nextEpoch
    ) return state;
    return {
      ...state,
      ...(action.cometState ? { cometState: action.cometState } : {}),
      reverseInFlight: false
    };
  }

  if (action.type === "reverseInstructionStarted") {
    if (
      state.currentDocument.sourceUnitId !== action.request.sourceUnitId
      || state.assemblyId !== action.request.assemblyId
      || state.executionEpoch !== action.request.executionEpoch
      || state.cometState.historyEpoch !== action.request.historyEpoch
      || state.cometState.timelineRevision !== action.request.timelineRevision
      || state.reverseInFlight
    ) return state;
    return {
      ...state,
      executionEpoch: action.nextEpoch,
      reverseInFlight: true,
      reverseNotice: null
    };
  }

  if (action.type === "reverseInstructionCommitted") {
    if (
      state.currentDocument.sourceUnitId !== action.request.sourceUnitId
      || state.assemblyId !== action.request.assemblyId
      || state.executionEpoch !== action.nextEpoch
      || state.cometState.historyEpoch !== action.request.historyEpoch
    ) return state;
    return {
      ...state,
      cometState: action.cometState,
      runStopReason: null,
      backendInfo: getCoreBackendInfo(),
      reverseInFlight: false,
      reverseNotice: {
        kind: "instruction",
        machineAddress: action.machineAddress,
        mnemonic: action.mnemonic,
        reversedMicrostepCount: action.reversedMicrostepCount
      }
    };
  }

  if (action.type === "reverseInstructionFinished") {
    if (
      state.currentDocument.sourceUnitId !== action.request.sourceUnitId
      || state.assemblyId !== action.request.assemblyId
      || state.executionEpoch !== action.nextEpoch
    ) return state;
    return {
      ...state,
      ...(action.cometState ? { cometState: action.cometState } : {}),
      reverseInFlight: false
    };
  }

  if (action.type === "reset") {
    if (!executionOwnerMatches(state, action.owner) || state.isSourceDirty) return state;
    return {
      ...state,
      cometState: action.cometState,
      diagnostics: action.cometState.diagnostics,
      assembleStatus: "success",
      runStopReason: null,
      backendInfo: getCoreBackendInfo(),
      executionEpoch: state.executionEpoch + 1,
      historyEpoch: state.historyEpoch + 1,
      runtimeImageRevision: action.clearOverrides ? 0 : state.runtimeImageRevision,
      runtimeOverrides: action.clearOverrides ? {} : state.runtimeOverrides,
      programModified: action.clearOverrides ? false : state.programModified,
      dataModified: action.clearOverrides ? false : state.dataModified,
      mutationInFlight: false,
      reverseInFlight: false,
      reverseNotice: null
    };
  }

  if (action.type === "coreError") {
    if (action.sourceUnitId !== state.currentDocument.sourceUnitId) return state;
    if (action.owner && !executionOwnerMatches(state, action.owner)) return state;
    return {
      ...state,
      assembleResult: null,
      assembleStatus: "error",
      runStopReason: "error",
      backendInfo: getCoreBackendInfo(),
      applicationFailure: "core-unavailable",
      mutationInFlight: false,
      reverseInFlight: false,
      reverseNotice: null
    };
  }

  if (action.type === "mutationStarted") {
    if (!executionOwnerMatches(state, action.request) || state.mutationInFlight) return state;
    return {
      ...state,
      executionEpoch: action.nextEpoch,
      historyEpoch: state.historyEpoch + 1,
      mutationInFlight: true,
      reverseInFlight: false,
      reverseNotice: null
    };
  }

  if (action.type === "mutationCommitted") {
    if (
      state.currentDocument.sourceUnitId !== action.request.sourceUnitId
      || state.assemblyId !== action.request.assemblyId
      || state.executionEpoch !== action.nextEpoch
    ) return state;

    const target = action.request.target;
    const runtimeImageRevision = state.runtimeImageRevision + 1;
    let runtimeOverrides = state.runtimeOverrides;
    let mutationCategory: DebuggerMemoryCategory | undefined;
    if (target.kind === "memory-word") {
      const nextWord = debuggerMutationWord(action.request);
      const address = target.address & 0xffff;
      const existing = state.runtimeOverrides[address];
      const originalWord = existing?.originalWord
        ?? state.cometState.initialMemory?.[address]
        ?? action.previousWord;
      mutationCategory = categorizeMemoryAddress(state.cometState.sourceMap, address, action.cometState.sp);
      if (nextWord === originalWord) {
        runtimeOverrides = { ...state.runtimeOverrides };
        delete runtimeOverrides[address];
      } else {
        runtimeOverrides = {
          ...state.runtimeOverrides,
          [address]: {
            address,
            originalWord,
            currentWord: nextWord,
            category: mutationCategory,
            sourceMappingConfidence: sourceMappingConfidenceFor(mutationCategory, true)
          }
        };
      }
    }
    const overrideValues = Object.values(runtimeOverrides);
    const programModified = overrideValues.some((override) => override.category === "program");
    const dataModified = overrideValues.some((override) => override.category !== "program");
    const traceEvent = createDebuggerTraceEvent(
      state,
      action.request,
      action.previousWord,
      runtimeImageRevision,
      target.kind === "memory-word"
        ? runtimeOverrides[target.address & 0xffff]?.sourceMappingConfidence ?? "exact"
        : undefined,
      mutationCategory
    );
    const cometState = {
      ...action.cometState,
      trace: [traceEvent, ...action.cometState.trace].slice(0, 1000)
    };
    return {
      ...state,
      cometState,
      runtimeImageRevision,
      runtimeOverrides,
      programModified,
      dataModified,
      mutationInFlight: false,
      runStopReason: null,
      backendInfo: getCoreBackendInfo()
    };
  }

  if (action.type === "mutationFinished") {
    return state.mutationInFlight ? { ...state, mutationInFlight: false } : state;
  }

  if (action.type === "fullClearStarted") {
    if (!executionOwnerMatches(state, action.owner) || state.mutationInFlight) return state;
    return {
      ...state,
      executionEpoch: action.nextEpoch,
      historyEpoch: state.historyEpoch + 1,
      mutationInFlight: true,
      reverseInFlight: false,
      reverseNotice: null
    };
  }

  if (action.type === "fullClearCommitted") {
    if (
      state.currentDocument.sourceUnitId !== action.owner.sourceUnitId
      || state.assemblyId !== action.owner.assemblyId
      || state.executionEpoch !== action.nextEpoch
    ) return state;
    return {
      ...state,
      assembleResult: null,
      cometState: action.cometState,
      assembleStatus: "default",
      runStopReason: null,
      lastAssembledSource: "",
      generatedCaslSource: "",
      cppToCaslMapping: [],
      cppStorageObjects: [],
      assemblyId: null,
      runtimeImageRevision: 0,
      runtimeOverrides: {},
      programModified: false,
      dataModified: false,
      mutationInFlight: false,
      reverseInFlight: false,
      reverseNotice: null,
      backendInfo: getCoreBackendInfo()
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

  if (action.type === "executionGranularitySet") {
    return state.executionGranularity === action.granularity
      ? state
      : { ...state, executionGranularity: action.granularity };
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
  const stateRef = useRef(state);
  stateRef.current = state;
  const runControlRef = useRef({ runId: 0, stopRequested: false });
  const assemblySequenceRef = useRef(0);
  const mutationSequenceRef = useRef(0);
  const mutationActiveRef = useRef(false);
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
          const assemblyId = `${sourceUnitId}:assembly:${++assemblySequenceRef.current}`;
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
              assemblyId,
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
          const owner = executionOwnerOf(state);
          try {
            const result = state.executionGranularity === "microcycle"
              ? await coreBridge.microStep()
              : await coreBridge.step();
            const output = [...state.cometState.output];
            if (state.executionGranularity === "instruction" && result.state.lastInstructionKind) {
              output.push(`Step ${result.state.stepCount}: ${result.state.lastInstructionKind} executed.`);
            }
            if (result.state.runState === "Finished" && state.cometState.runState !== "Finished") output.push("Execution finished.");
            if (result.state.runState === "Error" && state.cometState.runState !== "Error") output.push("Runtime error.");
            const cometState = createCometStateFromDto(result.state, { previous: state.cometState, output });
            if (
              cometState.lastStep
              && (state.executionGranularity === "instruction" || cometState.microcycle.instructionComplete)
            ) {
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
            dispatch({ type: "stepped", cometState, owner });
          } catch (error) {
            const message = coreErrorMessage(error);
            eventBus.emit(AppEvent.VmError, { message });
            dispatch({ type: "coreError", sourceUnitId, owner });
          }
        })();
      },
      run: (maxSteps = DEFAULT_RUN_MAX_STEPS) => {
        if (state.isSourceDirty || !state.cometState.assembled || !canExecuteFromCurrentState(state.cometState, state.runStopReason)) return;
        const requestedMaxSteps = typeof maxSteps === "number" && Number.isFinite(maxSteps) ? maxSteps : DEFAULT_RUN_MAX_STEPS;
        const boundedMaxSteps = Math.max(1, Math.floor(requestedMaxSteps));
        const runId = runControlRef.current.runId + 1;
        const sourceUnitId = state.currentDocument.sourceUnitId;
        const owner = executionOwnerOf(state);
        const runUnit = state.executionGranularity === "microcycle" ? "microsteps" : "steps";
        runControlRef.current = { runId, stopRequested: false };
        void (async () => {
          let executedSteps = 0;
          let workingState: CometState = {
            ...state.cometState,
            runState: "Running",
            output: appendOutputLine(
              state.cometState.output,
              `Run started. Max ${runUnit}: ${boundedMaxSteps}.`
            )
          };
          dispatch({ type: "runStarted", cometState: workingState, owner });

          try {
            while (executedSteps < boundedMaxSteps && !isRunTerminal(workingState.runState)) {
              for (let batchIndex = 0; batchIndex < RUN_BATCH_SIZE && executedSteps < boundedMaxSteps; batchIndex += 1) {
                if (runControlRef.current.runId !== runId || runControlRef.current.stopRequested) break;
                const result = state.executionGranularity === "microcycle"
                  ? await coreBridge.microStep()
                  : await coreBridge.step();
                executedSteps += 1;
                const nextState = createCometStateFromDto(result.state, { previous: workingState, output: workingState.output });
                workingState = nextState.runState === "Ready" ? { ...nextState, runState: "Running" } : nextState;
                if (isRunTerminal(workingState.runState)) break;
              }

              if (runControlRef.current.runId !== runId || runControlRef.current.stopRequested || isRunTerminal(workingState.runState) || executedSteps >= boundedMaxSteps) break;
              dispatch({ type: "runProgress", cometState: workingState, owner });
              await yieldToBrowser();
            }

            if (runControlRef.current.runId !== runId) return;

            let finalState = workingState;
            if (runControlRef.current.stopRequested) {
              finalState = {
                ...workingState,
                runState: "Stopped",
                output: appendOutputLine(workingState.output, `Run stopped after ${executedSteps} ${runUnit}.`)
              };
              eventBus.emit(AppEvent.VmRunStopped, { reason: "manual" });
            } else if (workingState.runState === "Finished") {
              finalState = {
                ...workingState,
                output: appendOutputLine(workingState.output, `Run finished after ${executedSteps} ${runUnit}.`)
              };
              eventBus.emit(AppEvent.VmRunStopped, { reason: "finished" });
            } else if (workingState.runState === "Error") {
              finalState = {
                ...workingState,
                output: appendOutputLine(workingState.output, "Runtime error.")
              };
              eventBus.emit(AppEvent.VmRunStopped, { reason: "error" });
              eventBus.emit(AppEvent.VmError, { message: finalState.output[finalState.output.length - 1] ?? "VM error" });
            } else if (workingState.runState === "WaitingInput") {
              finalState = {
                ...workingState,
                output: appendOutputLine(workingState.output, "Execution is waiting for console input.")
              };
              eventBus.emit(AppEvent.VmRunStopped, { reason: "waitingInput" });
            } else if (executedSteps >= boundedMaxSteps) {
              finalState = {
                ...workingState,
                runState: "Stopped",
                output: appendOutputLine(workingState.output, `Max ${runUnit} reached. Possible infinite loop. (${boundedMaxSteps} ${runUnit})`)
              };
              eventBus.emit(AppEvent.VmRunStopped, { reason: "maxSteps" });
            }

            const stopReason = finalRunStopReason(finalState, executedSteps, boundedMaxSteps, runControlRef.current.stopRequested);
            runControlRef.current.stopRequested = false;
            dispatch({ type: "runStopped", cometState: finalState, reason: stopReason, owner });
          } catch (error) {
            const message = coreErrorMessage(error);
            eventBus.emit(AppEvent.VmError, { message });
            eventBus.emit(AppEvent.VmRunStopped, { reason: "error" });
            dispatch({ type: "coreError", sourceUnitId, owner });
          }
        })();
      },
      reset: () => {
        if (state.isSourceDirty || !state.assembleResult || state.cometState.runState === "Running") return;
        runControlRef.current.stopRequested = true;
        const sourceUnitId = state.currentDocument.sourceUnitId;
        const owner = executionOwnerOf(state);
        void (async () => {
          try {
            const dto = await coreBridge.reset();
            let resetDto = dto;
            for (const override of Object.values(state.runtimeOverrides).sort((left, right) => left.address - right.address)) {
              const reapplied = await coreBridge.mutateDebuggerState({
                mutationId: `reset-reapply:${owner.executionEpoch}:${override.address}`,
                sourceUnitId,
                assemblyId: owner.assemblyId!,
                executionEpoch: owner.executionEpoch,
                target: { kind: "memory-word", address: override.address },
                nextWord: override.currentWord
              });
              if (reapplied.status !== "applied") throw new Error("Failed to reapply runtime memory override after reset.");
              resetDto = reapplied.state;
            }
            dispatch({
              type: "reset",
              owner,
              cometState: createCometStateFromDto(resetDto, {
                output: resetDto.runState === "Ready" ? [`Program reset. Entry point: ${formatWord(resetDto.pr)}`] : []
              }),
              clearOverrides: false
            });
          } catch (error) {
            const message = coreErrorMessage(error);
            eventBus.emit(AppEvent.VmError, { message });
            dispatch({ type: "coreError", sourceUnitId, owner });
          }
        })();
      },
      stop: () => {
        if (state.cometState.runState !== "Running") return;
        runControlRef.current.stopRequested = true;
      },
      submitConsoleInput: (text, endOfFile = false) => {
        if (state.cometState.runState !== "WaitingInput") return;
        const sourceUnitId = state.currentDocument.sourceUnitId;
        const owner = executionOwnerOf(state);
        void (async () => {
          try {
            const dto = await coreBridge.enqueueInput(text, endOfFile);
            dispatch({
              type: "stepped",
              owner,
              cometState: createCometStateFromDto(dto, {
                previous: state.cometState,
                output: appendOutputLine(state.cometState.output, endOfFile ? "Console EOF queued." : "Console input queued.")
              })
            });
          } catch (error) {
            eventBus.emit(AppEvent.VmError, { message: coreErrorMessage(error) });
            dispatch({ type: "coreError", sourceUnitId, owner });
          }
        })();
      },
      reload: (mode) => {
        if (state.isSourceDirty || !state.assembleResult || state.cometState.runState === "Running") return;
        runControlRef.current.stopRequested = true;
        const sourceUnitId = state.currentDocument.sourceUnitId;
        const owner = executionOwnerOf(state);
        void (async () => {
          try {
            const dto = await coreBridge.reload(mode);
            dispatch({
              type: "reset",
              owner,
              cometState: createCometStateFromDto(dto, {
                output: [`Program reloaded. DS initialization: ${mode === "assembled" ? "assembled image" : mode === "zero" ? "0000" : "FFFF"}.`]
              }),
              clearOverrides: true
            });
          } catch (error) {
            eventBus.emit(AppEvent.VmError, { message: coreErrorMessage(error) });
            dispatch({ type: "coreError", sourceUnitId, owner });
          }
        })();
      },
      mutateDebuggerState: async (input) => {
        const snapshot = stateRef.current;
        const failure = debuggerMutationFailure(snapshot, input);
        if (failure) return { status: "rejected", reason: failure };
        if (mutationActiveRef.current) return { status: "rejected", reason: "transaction-active" };

        const assemblyId = snapshot.assemblyId;
        if (!assemblyId) return { status: "rejected", reason: "not-loaded" };
        const target = input.target;
        const nextWord = debuggerMutationWord(input);
        const request: DebuggerMutationRequest = {
          mutationId: `debugger-mutation:${++mutationSequenceRef.current}`,
          sourceUnitId: snapshot.currentDocument.sourceUnitId,
          assemblyId,
          executionEpoch: snapshot.executionEpoch,
          ...input
        };
        const nextEpoch = snapshot.executionEpoch + 1;
        mutationActiveRef.current = true;
        runControlRef.current = { runId: runControlRef.current.runId + 1, stopRequested: true };
        dispatch({ type: "mutationStarted", request, nextEpoch });
        stateRef.current = { ...snapshot, executionEpoch: nextEpoch, historyEpoch: snapshot.historyEpoch + 1, mutationInFlight: true };
        try {
          const result = await coreBridge.mutateDebuggerState(request);
          const current = stateRef.current;
          if (
            current.currentDocument.sourceUnitId !== request.sourceUnitId
            || current.assemblyId !== request.assemblyId
            || current.executionEpoch !== nextEpoch
          ) {
            return { status: "stale", reason: staleMutationReason(current, request) };
          }
          if (result.status !== "applied" || result.previousWord === undefined) {
            dispatch({ type: "mutationFinished", mutationId: request.mutationId });
            return {
              status: result.status,
              reason: result.reason ?? "backend-rejected"
            };
          }
          const cometState = createCometStateFromDto(result.state, {
            previous: current.cometState,
            output: current.cometState.output
          });
          if (target.kind === "memory-word") {
            cometState.memory[target.address & 0xffff] = nextWord;
            cometState.changedMemoryAddresses = [target.address & 0xffff];
          }
          dispatch({
            type: "mutationCommitted",
            request,
            nextEpoch,
            cometState,
            previousWord: result.previousWord
          });
          return {
            status: "applied",
            previousWord: result.previousWord,
            nextWord,
            runtimeImageRevision: current.runtimeImageRevision + 1
          };
        } catch (error) {
          eventBus.emit(AppEvent.VmError, { message: coreErrorMessage(error) });
          dispatch({ type: "mutationFinished", mutationId: request.mutationId });
          return { status: "rejected", reason: "backend-rejected" };
        } finally {
          mutationActiveRef.current = false;
        }
      },
      fullClear: async () => {
        const snapshot = stateRef.current;
        if (
          snapshot.mutationInFlight
          || mutationActiveRef.current
          || snapshot.cometState.runState === "Running"
          || snapshot.fileLifecycle.status !== "idle"
        ) return false;
        const owner = executionOwnerOf(snapshot);
        const nextEpoch = snapshot.executionEpoch + 1;
        mutationActiveRef.current = true;
        runControlRef.current = { runId: runControlRef.current.runId + 1, stopRequested: true };
        dispatch({ type: "fullClearStarted", owner, nextEpoch });
        stateRef.current = { ...snapshot, executionEpoch: nextEpoch, historyEpoch: snapshot.historyEpoch + 1, mutationInFlight: true };
        try {
          const dto = await coreBridge.fullClear();
          const current = stateRef.current;
          if (
            current.currentDocument.sourceUnitId !== owner.sourceUnitId
            || current.assemblyId !== owner.assemblyId
            || current.executionEpoch !== nextEpoch
          ) return false;
          dispatch({
            type: "fullClearCommitted",
            owner,
            nextEpoch,
            cometState: createCometStateFromDto(dto, { output: [] })
          });
          return true;
        } catch (error) {
          eventBus.emit(AppEvent.VmError, { message: coreErrorMessage(error) });
          dispatch({ type: "mutationFinished", mutationId: "full-clear" });
          return false;
        } finally {
          mutationActiveRef.current = false;
        }
      },
      reverseMicrostep: async () => {
        const snapshot = stateRef.current;
        if (
          snapshot.reverseInFlight
          || snapshot.mutationInFlight
          || snapshot.executionGranularity !== "microcycle"
          || snapshot.cometState.runState === "Running"
          || !snapshot.cometState.reverseAvailability.available
          || !snapshot.assemblyId
          || snapshot.isSourceDirty
        ) return "unavailable";

        const request: ReverseMicrostepRequest = {
          sourceUnitId: snapshot.currentDocument.sourceUnitId,
          assemblyId: snapshot.assemblyId,
          executionEpoch: snapshot.executionEpoch,
          historyEpoch: snapshot.cometState.historyEpoch,
          timelineRevision: snapshot.cometState.timelineRevision
        };
        const nextEpoch = snapshot.executionEpoch + 1;
        runControlRef.current = {
          runId: runControlRef.current.runId + 1,
          stopRequested: true
        };
        dispatch({ type: "reverseStarted", request, nextEpoch });
        stateRef.current = {
          ...snapshot,
          executionEpoch: nextEpoch,
          reverseInFlight: true,
          reverseNotice: null
        };

        try {
          const result = await coreBridge.reverseMicrostep(
            request.historyEpoch,
            request.timelineRevision
          );
          const current = stateRef.current;
          if (
            current.currentDocument.sourceUnitId !== request.sourceUnitId
            || current.assemblyId !== request.assemblyId
            || current.executionEpoch !== nextEpoch
            || current.cometState.historyEpoch !== request.historyEpoch
          ) {
            dispatch({ type: "reverseFinished", request, nextEpoch });
            return "stale";
          }
          const cometState = createCometStateFromDto(result.state, {
            previous: snapshot.cometState,
            output: snapshot.cometState.output
          });
          if (result.status !== "reversed") {
            dispatch({
              type: "reverseFinished",
              request,
              nextEpoch,
              cometState
            });
            return result.status;
          }
          dispatch({
            type: "reverseCommitted",
            request,
            nextEpoch,
            cometState,
            restoredPhase: result.restoredPhase ?? "none",
            reversedEntryId: result.reversedEntryId ?? undefined
          });
          return "reversed";
        } catch (error) {
          eventBus.emit(AppEvent.VmError, { message: coreErrorMessage(error) });
          dispatch({ type: "reverseFinished", request, nextEpoch });
          return "cancelled";
        }
      },
      reverseInstruction: async () => {
        const snapshot = stateRef.current;
        if (
          snapshot.reverseInFlight
          || snapshot.mutationInFlight
          || snapshot.cometState.runState === "Running"
          || !snapshot.cometState.reverseInstructionAvailability.available
          || !snapshot.assemblyId
          || snapshot.isSourceDirty
        ) return "unavailable";

        const request: ReverseInstructionRequest = {
          sourceUnitId: snapshot.currentDocument.sourceUnitId,
          assemblyId: snapshot.assemblyId,
          executionEpoch: snapshot.executionEpoch,
          historyEpoch: snapshot.cometState.historyEpoch,
          timelineRevision: snapshot.cometState.timelineRevision
        };
        const nextEpoch = snapshot.executionEpoch + 1;
        runControlRef.current = {
          runId: runControlRef.current.runId + 1,
          stopRequested: true
        };
        dispatch({ type: "reverseInstructionStarted", request, nextEpoch });
        stateRef.current = {
          ...snapshot,
          executionEpoch: nextEpoch,
          reverseInFlight: true,
          reverseNotice: null
        };

        try {
          const result = await coreBridge.reverseInstruction(
            request.historyEpoch,
            request.timelineRevision
          );
          const current = stateRef.current;
          if (
            current.currentDocument.sourceUnitId !== request.sourceUnitId
            || current.assemblyId !== request.assemblyId
            || current.executionEpoch !== nextEpoch
            || current.cometState.historyEpoch !== request.historyEpoch
          ) {
            dispatch({ type: "reverseInstructionFinished", request, nextEpoch });
            return "stale";
          }
          const cometState = createCometStateFromDto(result.state, {
            previous: snapshot.cometState,
            output: snapshot.cometState.output
          });
          if (result.status !== "reversed") {
            dispatch({
              type: "reverseInstructionFinished",
              request,
              nextEpoch,
              cometState
            });
            return result.status;
          }
          dispatch({
            type: "reverseInstructionCommitted",
            request,
            nextEpoch,
            cometState,
            machineAddress: result.machineAddress ?? undefined,
            mnemonic: result.mnemonic ?? undefined,
            reversedMicrostepCount: result.reversedMicrostepCount
          });
          return "reversed";
        } catch (error) {
          eventBus.emit(AppEvent.VmError, { message: coreErrorMessage(error) });
          dispatch({ type: "reverseInstructionFinished", request, nextEpoch });
          return "cancelled";
        }
      },
      clearOutput: () => dispatch({ type: "clearOutput" }),
      toggleLessonStep: (exampleId, stepId) => dispatch({ type: "lessonStepToggled", exampleId, stepId }),
      resetLessonProgress: (exampleId) => dispatch({ type: "lessonProgressReset", exampleId }),
      clearAllLessonProgress: () => {
        onAllLessonProgressClear?.();
        dispatch({ type: "lessonProgressCleared" });
      },
      setExecutionGranularity: (granularity) => dispatch({ type: "executionGranularitySet", granularity }),
      setObservationMode: (mode) => dispatch({ type: "observationModeSet", mode }),
      setCircuitFocusEnabled: (enabled) => dispatch({ type: "circuitFocusEnabledSet", enabled }),
      setInspectorActiveTab: (tab) => dispatch({ type: "inspectorActiveTabSet", tab }),
      setOutputDockActiveTab: (tab) => dispatch({ type: "outputDockActiveTabSet", tab }),
      replaceCurrentDocument: (document, selectedExampleId = "", writeBinding = null) => {
        runControlRef.current = { runId: runControlRef.current.runId + 1, stopRequested: true };
        dispatch({ type: "currentDocumentReplaced", document, selectedExampleId, writeBinding });
      },
      selectProjectDocument: (document, writeBinding) => {
        runControlRef.current = { runId: runControlRef.current.runId + 1, stopRequested: true };
        dispatch({ type: "projectDocumentSelected", document, writeBinding });
      },
      assembleProjectModule: async (input) => coreBridge.assembleModule(input),
      linkProject: async (request) => {
        try {
          const result = await coreBridge.linkProject(request);
          const moduleNames = new Map(request.modules.map((module) => [module.moduleId, module.displayName]));
          const decodedState = createCometStateFromDto(result.state);
          const cometState = {
            ...decodedState,
            sourceMap: decodedState.sourceMap.map((mapping) => ({
              ...mapping,
              moduleName: mapping.moduleId ? moduleNames.get(mapping.moduleId as ProjectLinkModuleInput["moduleId"]) : undefined
            }))
          };
          if (result.ok && result.link.ok && cometState.assembled) {
            dispatch({ type: "projectLinked", result, cometState });
          } else {
            dispatch({ type: "projectLinkFailed", diagnostics: cometState.diagnostics });
          }
          return result;
        } catch (error) {
          eventBus.emit(AppEvent.VmError, { message: coreErrorMessage(error) });
          throw error;
        }
      },
      commitSavedDocument: (document, writeBinding) => dispatch({ type: "currentDocumentSaved", document, writeBinding }),
      setFileLifecycle: (lifecycle) => dispatch({ type: "fileLifecycleSet", lifecycle })
    }),
    [eventBus, onAllLessonProgressClear, state.assembleResult, state.cometState, state.executionGranularity, state.isSourceDirty, state.runStopReason, state.runtimeOverrides, state.sourceMode, state.sourceText]
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
  return runState === "Finished" || runState === "WaitingInput" || runState === "Error" || runState === "Stopped";
}

function canExecuteFromCurrentState(cometState: CometState, runStopReason: RunStopReason): boolean {
  return cometState.runState === "Ready" || (cometState.runState === "Stopped" && runStopReason === "manual");
}

function finalRunStopReason(finalState: CometState, executedSteps: number, maxSteps: number, stopRequested: boolean): RunStopReason {
  if (stopRequested) return "manual";
  if (finalState.runState === "WaitingInput") return "waitingInput";
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

function executionOwnerOf(state: AppStoreState): ExecutionOwner {
  return {
    sourceUnitId: state.currentDocument.sourceUnitId,
    assemblyId: state.assemblyId,
    executionEpoch: state.executionEpoch
  };
}

function executionOwnerMatches(state: AppStoreState, owner: ExecutionOwner): boolean {
  return state.currentDocument.sourceUnitId === owner.sourceUnitId
    && state.assemblyId === owner.assemblyId
    && state.executionEpoch === owner.executionEpoch;
}

function debuggerMutationFailure(
  state: AppStoreState,
  input: DebuggerMutationInput
): DebuggerMutationResult["reason"] | undefined {
  if (!isValidDebuggerMutationInput(input)) return "invalid-value";
  if (state.mutationInFlight) return "transaction-active";
  if (state.isSourceDirty) return "source-dirty";
  if (!state.assemblyId || !state.cometState.assembled) return "not-loaded";
  if (state.cometState.runState === "Running") return "running";
  if (state.fileLifecycle.status !== "idle") return "file-operation-active";
  return undefined;
}

function staleMutationReason(
  state: AppStoreState,
  request: DebuggerMutationRequest
): NonNullable<DebuggerMutationResult["reason"]> {
  if (state.currentDocument.sourceUnitId !== request.sourceUnitId) return "stale-source-unit";
  if (state.assemblyId !== request.assemblyId) return "stale-assembly";
  return "stale-execution-epoch";
}

function createDebuggerTraceEvent(
  state: AppStoreState,
  request: DebuggerMutationRequest,
  previousWord: number,
  runtimeImageRevision: number,
  sourceMappingConfidence?: RuntimeWordOverride["sourceMappingConfidence"],
  memoryCategory?: DebuggerMemoryCategory
): CometState["trace"][number] {
  const target = targetDisplayName(request.target);
  const isMemory = request.target.kind === "memory-word";
  const isProgramWord = isMemory && memoryCategory === "program";
  const memoryAddress = request.target.kind === "memory-word" ? request.target.address & 0xffff : undefined;
  const nextWord = debuggerMutationWord(request);
  const flagDetail = "nextFlags" in request
    ? (() => {
        const previous = unpackDebuggerFlags(previousWord);
        return `OF: ${Number(previous.of)} -> ${Number(request.nextFlags.of)}; SF: ${Number(previous.sf)} -> ${Number(request.nextFlags.sf)}; ZF: ${Number(previous.zf)} -> ${Number(request.nextFlags.zf)}`;
      })()
    : undefined;
  return {
    kind: isMemory ? "debugger-memory-edit" : "debugger-register-edit",
    eventId: request.mutationId,
    index: state.cometState.stepIndex,
    address: memoryAddress ?? state.cometState.pr,
    instruction: isProgramWord
      ? "Manual machine-word override"
      : isMemory
        ? "Manual memory edit"
        : "Manual register edit",
    detail: flagDetail ?? `${target}: ${formatWord(previousWord)} -> ${formatWord(nextWord)}`,
    pr: state.cometState.pr,
    visualPath: VisualPathKind.None,
    changedRegister: isMemory ? undefined : target,
    changedRegisterValueBefore: isMemory ? undefined : previousWord,
    changedRegisterValueAfter: isMemory ? undefined : nextWord,
    changedMemoryAddress: memoryAddress,
    changedMemoryValueBefore: isMemory ? previousWord : undefined,
    changedMemoryValueAfter: isMemory ? nextWord : undefined,
    runState: "Ready",
    sourceUnitId: request.sourceUnitId,
    assemblyId: request.assemblyId,
    executionEpoch: state.executionEpoch,
    runtimeImageRevision,
    mutationTarget: target,
    sourceMappingConfidence
  };
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
