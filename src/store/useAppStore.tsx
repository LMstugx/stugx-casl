import { createContext, useContext, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import { EventBus } from "../app/eventBus";
import { createAppEventBus } from "../app/createAppEventBus";
import { AppEvent, AppEvents } from "../app/events";
import { caslCore } from "../core/coreBridge";
import { DEFAULT_CASL_SOURCE, createEmptyCometState } from "../core/mockCaslCore";
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
    cometState: createEmptyCometState("Idle", ["Editor ready. Assemble to load the current source."]),
    diagnostics: [],
    assembleStatus: "default"
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
      cometState: createEmptyCometState("Dirty", ["Source modified. Assemble to load the current source."]),
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
      assembleStatus: action.assembleStatus
    };
  }

  if (action.type === "stepped") {
    return {
      ...state,
      cometState: action.cometState
    };
  }

  if (action.type === "reset") {
    return {
      ...state,
      cometState: action.cometState,
      diagnostics: action.cometState.diagnostics,
      assembleStatus: "success"
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
        eventBus.emit(AppEvent.CoreAssembleStarted, { sourceLength: state.sourceText.length });
        const cometState = caslCore.assemble(state.sourceText);
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
      },
      step: () => {
        if (state.isSourceDirty || !state.cometState.assembled) return;
        const cometState = caslCore.step(state.cometState);
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
      },
      reset: () => {
        if (state.isSourceDirty || !state.assembleResult) return;
        dispatch({ type: "reset", cometState: caslCore.reset(state.assembleResult) });
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
