import type { FrameSlot, FrameSlotKind, FrameSlotStorage, FrameSlotCurrentLowering } from "./framePlan";
import { buildFramePlans } from "./framePlan";
import { parseCpp } from "./cppParser";
import { checkCppSemantics } from "./cppSemantic";

export type FrameSlotPreview = {
  name: string;
  kind: FrameSlotKind;
  offset: number;
  storage: FrameSlotStorage;
  currentLowering: FrameSlotCurrentLowering;
  labelForDebug?: string;
  sourceLine?: number;
};

export type StackFrameFunctionPreview = {
  functionName: string;
  frameSizeWords: number;
  returnValueRegister: "GR0";
  argumentRegisters: string[];
  returnAddressSlot: FrameSlotPreview;
  argumentSlots: FrameSlotPreview[];
  localSlots: FrameSlotPreview[];
  temporarySlots: FrameSlotPreview[];
  warnings: string[];
};

export type StackFramePreviewState = {
  available: boolean;
  reason?: string;
  mode: "simple-static-locals" | "frameplan-preview";
  isRuntimeState: false;
  selectedFunctionName?: string;
  functions: StackFrameFunctionPreview[];
  activeFunction?: StackFrameFunctionPreview;
  warnings: string[];
};

export type FramePlanSourceMode = "casl" | "cpp";

function unavailable(reason: string): StackFramePreviewState {
  return {
    available: false,
    reason,
    mode: "simple-static-locals",
    isRuntimeState: false,
    functions: [],
    warnings: []
  };
}

function toSlotPreview(slot: FrameSlot): FrameSlotPreview {
  return {
    name: slot.name,
    kind: slot.kind,
    offset: slot.offset,
    storage: slot.storage,
    currentLowering: slot.currentLowering,
    labelForDebug: slot.labelForDebug,
    sourceLine: slot.sourceLine
  };
}

function firstDiagnosticMessage(messages: Array<{ message: string }>): string {
  return messages[0]?.message ?? "C++ source cannot be parsed for a FramePlan preview.";
}

function selectDefaultFunction(functions: StackFrameFunctionPreview[], selectedFunctionName?: string, preferredFunctionName?: string): StackFrameFunctionPreview | undefined {
  return (
    functions.find((fn) => fn.functionName === selectedFunctionName) ??
    functions.find((fn) => fn.functionName === preferredFunctionName) ??
    functions.find((fn) => fn.functionName === "main") ??
    functions[0]
  );
}

export function selectStackFramePreviewState(
  sourceMode: FramePlanSourceMode,
  sourceText: string,
  selectedFunctionName?: string,
  preferredFunctionName?: string
): StackFramePreviewState {
  if (sourceMode !== "cpp") {
    return unavailable("FramePlan preview is available for C++ source only.");
  }

  try {
    const parsed = parseCpp(sourceText);
    const semantic = checkCppSemantics(parsed.program, parsed.diagnostics);
    if (!parsed.program || !semantic.ok) {
      return unavailable(firstDiagnosticMessage(semantic.diagnostics));
    }

    const collection = buildFramePlans(parsed.program);
    const functions = collection.functions.map((plan): StackFrameFunctionPreview => ({
      functionName: plan.functionName,
      frameSizeWords: plan.frameSizeWords,
      returnValueRegister: plan.returnValueRegister,
      argumentRegisters: plan.argumentRegisters,
      returnAddressSlot: toSlotPreview(plan.returnAddressSlot),
      argumentSlots: plan.argumentSlots.map(toSlotPreview),
      localSlots: plan.localSlots.map(toSlotPreview),
      temporarySlots: plan.temporarySlots.map(toSlotPreview),
      warnings: plan.warnings
    }));
    const activeFunction = selectDefaultFunction(functions, selectedFunctionName, preferredFunctionName);

    return {
      available: functions.length > 0,
      reason: functions.length > 0 ? undefined : "No function declarations are available for preview.",
      mode: functions.length > 0 ? "frameplan-preview" : "simple-static-locals",
      isRuntimeState: false,
      selectedFunctionName: activeFunction?.functionName,
      functions,
      activeFunction,
      warnings: [...collection.globalWarnings, ...(activeFunction?.warnings ?? [])]
    };
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : String(error));
  }
}
