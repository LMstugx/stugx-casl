import { createContext, useContext, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import { EventBus } from "../app/eventBus";
import { createAppEventBus } from "../app/createAppEventBus";
import { AppEvent, AppEvents } from "../app/events";
import { coreBridge, getCoreBackendInfo, type CoreBackendInfo } from "../core/coreBridge";
import { DEFAULT_CASL_SOURCE } from "../core/defaultSource";
import { createCometStateFromDto, createEmptyUiCometState } from "../core/coreStateAdapter";
import { CometState, Diagnostic } from "../core/types";

type AssembleStatus = "default" | "running" | "success" | "error";

type AppStoreState = {
  sourceText: string;
  lastAssembledSource: string;
  isSourceDirty: boolean;
  assembleResult: CometState | null;
  cometState: CometState;
  diagnostics: Diagnostic[];
  assembleStatus: AssembleStatus;
  backendInfo: CoreBackendInfo;
};

type AppStoreActions = {
  setSourceText: (sourceText: string) => void;
  assemble: () => void;
  step: () => void;
  reset: () => void;
  clearOutput: () => void;
};

type AppStore = AppStoreState & AppStoreActions;

export type AppStoreAction =
  | { type: "setSourceText"; sourceText: string }
  | { type: "assembled"; sourceText: string; cometState: CometState; assembleStatus: AssembleStatus }
  | { type: "stepped"; cometState: CometState }
  | { type: "reset"; cometState: CometState }
  | { type: "coreError"; message: string }
  | { type: "clearOutput" };

type AppStoreProviderProps = {
  children: ReactNode;
  eventBus?: EventBus<AppEvents>;
};

const AppStoreContext = createContext<AppStore | null>(null);
const AppEventBusContext = createContext<EventBus<AppEvents> | null>(null);

export function createInitialAppState(): AppStoreState {
  return {
    sourceText: DEFAULT_CASL_SOURCE,
    lastAssembledSource: DEFAULT_CASL_SOURCE,
    isSourceDirty: false,
    assembleResult: null,
    cometState: createEmptyUiCometState("Idle", ["Editor ready. Assemble to load the current source."]),
    diagnostics: [],
    assembleStatus: "default",
    backendInfo: getCoreBackendInfo()
  };
}

export function appStoreReducer(state: AppStoreState, action: AppStoreAction): AppStoreState {
  if (action.type === "setSourceText") {
    if (action.sourceText === state.sourceText) return state;
    return {
      ...state,
      sourceText: action.sourceText,
      isSourceDirty: true,
      assembleResult: null,
      diagnostics: [],
      cometState: createEmptyUiCometState("Dirty", ["Source modified. Assemble to load the current source."]),
      assembleStatus: "default"
    };
  }

  if (action.type === "assembled") {
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
      backendInfo: getCoreBackendInfo()
    };
  }

  if (action.type === "stepped") {
    return {
      ...state,
      cometState: action.cometState,
      backendInfo: getCoreBackendInfo()
    };
  }

  if (action.type === "reset") {
    return {
      ...state,
      cometState: action.cometState,
      diagnostics: action.cometState.diagnostics,
      assembleStatus: "success",
      backendInfo: getCoreBackendInfo()
    };
  }

  if (action.type === "coreError") {
    const diagnostic: Diagnostic = { line: 0, message: action.message, severity: "error" };
    return {
      ...state,
      assembleResult: null,
      diagnostics: [diagnostic],
      assembleStatus: "error",
      cometState: createEmptyUiCometState("Error", [action.message]),
      backendInfo: getCoreBackendInfo()
    };
  }

  if (action.type === "clearOutput") {
    return {
      ...state,
      cometState: { ...state.cometState, output: [] }
    };
  }

  return state;
}

export function AppStoreProvider({ children, eventBus: providedEventBus }: AppStoreProviderProps) {
  const eventBus = useMemo(() => providedEventBus ?? createAppEventBus(), [providedEventBus]);
  const [state, dispatch] = useReducer(appStoreReducer, undefined, createInitialAppState);

  const actions = useMemo<AppStoreActions>(
    () => ({
      setSourceText: (sourceText) => dispatch({ type: "setSourceText", sourceText }),
      assemble: () => {
        void (async () => {
          try {
            eventBus.emit(AppEvent.CoreAssembleStarted, { sourceLength: state.sourceText.length });
            const result = await coreBridge.assemble(state.sourceText);
            const cometState = createCometStateFromDto(result.state);
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
              sourceText: state.sourceText,
              cometState,
              assembleStatus: cometState.runState === "Error" ? "error" : "success"
            });
          } catch (error) {
            const message = coreErrorMessage(error);
            eventBus.emit(AppEvent.VmError, { message });
            dispatch({ type: "coreError", message });
          }
        })();
      },
      step: () => {
        if (state.isSourceDirty || !state.cometState.assembled) return;
        void (async () => {
          try {
            const result = await coreBridge.step();
            const output = [...state.cometState.output];
            if (result.state.runState === "Finished" && state.cometState.runState !== "Finished") output.push("Execution finished.");
            if (result.state.runState === "Error" && state.cometState.runState !== "Error") output.push("VM error.");
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
            dispatch({ type: "coreError", message });
          }
        })();
      },
      reset: () => {
        if (state.isSourceDirty || !state.assembleResult) return;
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
            dispatch({ type: "coreError", message });
          }
        })();
      },
      clearOutput: () => dispatch({ type: "clearOutput" })
    }),
    [eventBus, state.assembleResult, state.cometState, state.isSourceDirty, state.sourceText]
  );

  const value = useMemo<AppStore>(() => ({ ...state, ...actions }), [state, actions]);
  return (
    <AppEventBusContext.Provider value={eventBus}>
      <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
    </AppEventBusContext.Provider>
  );
}

function coreErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
