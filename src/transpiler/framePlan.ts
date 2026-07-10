import type { CppFunction, CppProgram, CppStatement, CppVarDecl } from "./cppAst";
import { functionLabel } from "./cppSemantic";

export type FrameSlotKind = "return-address" | "saved-fp" | "argument" | "local" | "temporary";
export type FrameSlotStorage = "register-argument" | "future-stack-slot" | "static-label-current" | "return-address-current";
export type FrameSlotCurrentLowering = "static-label" | "register" | "call-stack-return-address" | "not-emitted";

export type FrameSlot = {
  name: string;
  kind: FrameSlotKind;
  offset: number;
  sizeWords: number;
  sourceLine?: number;
  storage: FrameSlotStorage;
  currentLowering: FrameSlotCurrentLowering;
  labelForDebug?: string;
};

export type StackFramePlan = {
  functionName: string;
  mode: "design-only";
  stackGrowth: "down";
  usesFramePointer: false | "virtual-planned" | "real-register-planned";
  returnValueRegister: "GR0";
  argumentRegisters: string[];
  returnAddressSlot: FrameSlot;
  savedFramePointerSlot?: FrameSlot;
  argumentSlots: FrameSlot[];
  localSlots: FrameSlot[];
  temporarySlots: FrameSlot[];
  frameSizeWords: number;
  sourceLine?: number;
  warnings: string[];
};

export type FramePlanCollection = {
  functions: StackFramePlan[];
  globalWarnings: string[];
};

const ARGUMENT_REGISTERS = ["GR1", "GR2", "GR3"] as const;

const RESERVED_LABELS = new Set([
  "MAIN",
  "START",
  "END",
  "DC",
  "DS",
  "NOP",
  "LD",
  "LAD",
  "ADDA",
  "SUBA",
  "ADDL",
  "SUBL",
  "AND",
  "OR",
  "XOR",
  "CPA",
  "CPL",
  "SLA",
  "SRA",
  "SLL",
  "SRL",
  "PUSH",
  "POP",
  "CALL",
  "ST",
  "JUMP",
  "JZE",
  "JNZ",
  "JPL",
  "JMI",
  "JOV",
  "RET"
]);

function makeSafeLabel(name: string, usedLabels: Set<string>): string {
  let base = name.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  if (!/^[A-Z]/.test(base)) base = `VAR_${base}`;
  if (RESERVED_LABELS.has(base)) base = `VAR_${base}`;
  let label = base;
  let suffix = 2;
  while (usedLabels.has(label)) {
    label = `${base}_${suffix}`;
    suffix += 1;
  }
  usedLabels.add(label);
  return label;
}

function collectLocalDeclarations(statements: CppStatement[]): CppVarDecl[] {
  const declarations: CppVarDecl[] = [];

  for (const statement of statements) {
    if (statement.kind === "VarDecl") {
      declarations.push(statement);
      continue;
    }

    if (statement.kind === "IfStatement") {
      declarations.push(...collectLocalDeclarations(statement.thenBody));
      if (statement.elseBody) declarations.push(...collectLocalDeclarations(statement.elseBody));
      continue;
    }

    if (statement.kind === "WhileStatement") {
      declarations.push(...collectLocalDeclarations(statement.body));
      continue;
    }

    if (statement.kind === "ForStatement") {
      if (statement.initializer?.kind === "VarDecl") declarations.push(statement.initializer);
      declarations.push(...collectLocalDeclarations(statement.body));
    }
  }

  return declarations;
}

function buildInitialUsedLabels(program: CppProgram): Set<string> {
  return new Set(program.functions.map((fn) => functionLabel(fn.name)));
}

function currentLocalLabel(functionName: string, variableName: string, usedLabels: Set<string>, useScopedLabels: boolean): string {
  return makeSafeLabel(useScopedLabels ? `${functionName}_${variableName}` : variableName, usedLabels);
}

function currentParameterLabel(functionName: string, parameterName: string, usedLabels: Set<string>): string {
  return makeSafeLabel(`${functionLabel(functionName)}_${parameterName}`, usedLabels);
}

function buildFunctionFramePlan(fn: CppFunction, usedLabels: Set<string>, useScopedLabels: boolean): StackFramePlan {
  let nextOffset = 0;
  const returnAddressSlot: FrameSlot = {
    name: "return-address",
    kind: "return-address",
    offset: nextOffset,
    sizeWords: 1,
    sourceLine: fn.line,
    storage: "return-address-current",
    currentLowering: "call-stack-return-address",
    labelForDebug: `${functionLabel(fn.name)}_RETURN_ADDRESS`
  };
  nextOffset += returnAddressSlot.sizeWords;

  const argumentSlots = fn.parameters.map((parameter, index): FrameSlot => {
    const slot: FrameSlot = {
      name: parameter.name,
      kind: "argument",
      offset: nextOffset,
      sizeWords: 1,
      sourceLine: parameter.line,
      storage: "register-argument",
      currentLowering: "static-label",
      labelForDebug: currentParameterLabel(fn.name, parameter.name, usedLabels)
    };
    nextOffset += slot.sizeWords;
    return slot;
  });

  const localSlots = collectLocalDeclarations(fn.body).map((declaration): FrameSlot => {
    const slot: FrameSlot = {
      name: declaration.name,
      kind: "local",
      offset: nextOffset,
      sizeWords: 1,
      sourceLine: declaration.line,
      storage: "static-label-current",
      currentLowering: "static-label",
      labelForDebug: currentLocalLabel(fn.name, declaration.name, usedLabels, useScopedLabels)
    };
    nextOffset += slot.sizeWords;
    return slot;
  });

  const warnings = [
    "Design-only FramePlan metadata is not emitted as CASL.",
    "Frame pointer strategy is undecided; current plan does not use a real FP.",
    "Temporary frame slots are future work and are not generated yet."
  ];
  if (fn.name === "main") {
    warnings.push("main final RET currently preserves top-level finish compatibility.");
  }

  return {
    functionName: fn.name,
    mode: "design-only",
    stackGrowth: "down",
    usesFramePointer: false,
    returnValueRegister: "GR0",
    argumentRegisters: ARGUMENT_REGISTERS.slice(0, fn.parameters.length),
    returnAddressSlot,
    argumentSlots,
    localSlots,
    temporarySlots: [],
    frameSizeWords: nextOffset,
    sourceLine: fn.line,
    warnings
  };
}

export function buildFramePlans(program: CppProgram): FramePlanCollection {
  const usedLabels = buildInitialUsedLabels(program);
  const useScopedLabels = program.functions.length > 1;

  return {
    functions: program.functions.map((fn) => buildFunctionFramePlan(fn, usedLabels, useScopedLabels)),
    globalWarnings: [
      "FramePlan generation is design-only and does not change current transpiler output.",
      "Current C++ locals and parameters still lower to static namespaced labels."
    ]
  };
}
