import type { FrameSlot, FrameSlotKind, FrameSlotStorage, FrameSlotCurrentLowering } from "./framePlan";
import { buildFramePlans } from "./framePlan";
import { parseCpp } from "./cppParser";
import { checkCppSemantics } from "./cppSemantic";

export type FrameSlotMappingKind = Exclude<FrameSlotKind, "saved-fp">;
export type FrameSlotFutureStorage = "future-stack-slot" | "register-argument" | "return-address-current";

export type FrameSlotMapping = {
  mappingId: string;
  functionName: string;
  symbolName: string;
  sourceLine?: number;
  slotKind: FrameSlotMappingKind;
  frameSlotName: string;
  currentLabelForDebug?: string;
  currentLowering: FrameSlotCurrentLowering;
  futureStorage: FrameSlotFutureStorage;
  explanation: string;
  runtimeValueAvailable: false;
};

export type FrameSlotPreview = {
  mappingId: string;
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
  slotMappings: FrameSlotMapping[];
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

export function stackFramePreviewMappings(preview: StackFramePreviewState): FrameSlotMapping[] {
  return preview.functions.flatMap((fn) => fn.slotMappings);
}

export function currentStaticLabelForMapping(mapping: FrameSlotMapping): string | undefined {
  return mapping.currentLowering === "static-label" ? mapping.currentLabelForDebug : undefined;
}

export function findFrameSlotMappingByStaticLabel(mappings: FrameSlotMapping[], staticLabel: string): FrameSlotMapping | undefined {
  const normalized = staticLabel.toUpperCase();
  return mappings.find((mapping) => currentStaticLabelForMapping(mapping)?.toUpperCase() === normalized);
}

export function findFrameSlotMappingInCaslText(mappings: FrameSlotMapping[], caslText: string): FrameSlotMapping | undefined {
  const tokens = caslText.toUpperCase().match(/[A-Z][A-Z0-9_]*/g) ?? [];
  return tokens.map((token) => findFrameSlotMappingByStaticLabel(mappings, token)).find((mapping): mapping is FrameSlotMapping => mapping !== undefined);
}

export function frameSlotMappingsForSourceLine(mappings: FrameSlotMapping[], sourceLine?: number): FrameSlotMapping[] {
  if (sourceLine === undefined) return [];
  return mappings.filter((mapping) => mapping.sourceLine === sourceLine && mapping.slotKind !== "return-address");
}

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

function slotMappingId(functionName: string, slot: FrameSlot): string {
  return `${functionName}:${slot.kind}:${slot.name}:${slot.offset}`;
}

function toSlotPreview(functionName: string, slot: FrameSlot): FrameSlotPreview {
  return {
    mappingId: slotMappingId(functionName, slot),
    name: slot.name,
    kind: slot.kind,
    offset: slot.offset,
    storage: slot.storage,
    currentLowering: slot.currentLowering,
    labelForDebug: slot.labelForDebug,
    sourceLine: slot.sourceLine
  };
}

function futureStorageForSlot(slot: FrameSlot): FrameSlotFutureStorage {
  if (slot.kind === "return-address") return "return-address-current";
  if (slot.kind === "argument") return "register-argument";
  return "future-stack-slot";
}

function slotExplanation(slot: FrameSlot): string {
  if (slot.kind === "return-address") {
    return "CALL currently writes the return address to the stack; future FramePlan treats it as the return-address slot.";
  }
  if (slot.kind === "argument") {
    return `Current lowering receives this argument through register storage and saves it to static label ${slot.labelForDebug ?? slot.name}; future stack-frame mode can map it to an argument slot.`;
  }
  if (slot.kind === "local") {
    return `Current lowering stores this local in static label ${slot.labelForDebug ?? slot.name}; future stack-frame mode can map it to a local slot.`;
  }
  if (slot.kind === "temporary") {
    return "Temporary slots are design-only future storage and are not emitted by the current lowering.";
  }
  return "Saved frame pointer slots are a future design option and are not runtime state.";
}

function toSlotMapping(functionName: string, slot: FrameSlot): FrameSlotMapping | undefined {
  if (slot.kind === "saved-fp") return undefined;

  return {
    mappingId: slotMappingId(functionName, slot),
    functionName,
    symbolName: slot.kind === "return-address" ? "return-address" : slot.name,
    sourceLine: slot.sourceLine,
    slotKind: slot.kind,
    frameSlotName: slot.name,
    currentLabelForDebug: slot.labelForDebug,
    currentLowering: slot.currentLowering,
    futureStorage: futureStorageForSlot(slot),
    explanation: slotExplanation(slot),
    runtimeValueAvailable: false
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
    const functions = collection.functions.map((plan): StackFrameFunctionPreview => {
      const rawSlots = [
        plan.returnAddressSlot,
        ...plan.argumentSlots,
        ...plan.localSlots,
        ...plan.temporarySlots
      ];

      return {
        functionName: plan.functionName,
        frameSizeWords: plan.frameSizeWords,
        returnValueRegister: plan.returnValueRegister,
        argumentRegisters: plan.argumentRegisters,
        returnAddressSlot: toSlotPreview(plan.functionName, plan.returnAddressSlot),
        argumentSlots: plan.argumentSlots.map((slot) => toSlotPreview(plan.functionName, slot)),
        localSlots: plan.localSlots.map((slot) => toSlotPreview(plan.functionName, slot)),
        temporarySlots: plan.temporarySlots.map((slot) => toSlotPreview(plan.functionName, slot)),
        slotMappings: rawSlots.map((slot) => toSlotMapping(plan.functionName, slot)).filter((slot): slot is FrameSlotMapping => slot !== undefined),
        warnings: plan.warnings
      };
    });
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
