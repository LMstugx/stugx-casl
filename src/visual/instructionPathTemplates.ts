import type { InstructionKind } from "../core/types";
import { VisualPathKind } from "../core/types";

export type InstructionPathCategory =
  | "load"
  | "store"
  | "arithmetic"
  | "logical"
  | "compare"
  | "shift"
  | "stack"
  | "jump"
  | "no-op";

export type InstructionPathStage = "fetch" | "decode" | "operand" | "execute" | "writeback" | "next";

export type InstructionPathTemplate = {
  instructionKind: InstructionKind;
  category: InstructionPathCategory;
  visualPath: VisualPathKind;
  stages: InstructionPathStage[];
  activeModules: string[];
  activeAnchors: string[];
  routeSegments: string[];
  updatesFR: boolean;
  writesRegister: boolean;
  writesMemory: boolean;
  usesALU: boolean;
  usesMDR: boolean;
  usesMemory: boolean;
  usesControlPath: boolean;
  usesEAU?: boolean;
  usesSP?: boolean;
  usesMAR?: boolean;
  writesSP?: boolean;
  readsMemory?: boolean;
};

export type StackPathKind = "stack-read" | "stack-write" | "call-return-address" | "return-pop-address";
export type FutureStackInstructionKind = "PUSH" | "POP" | "CALL" | "RET_STACK";

export type StackPathTemplate = {
  instructionKind?: "PUSH" | "POP";
  kind: StackPathKind;
  source: "SP" | "PR" | "GR" | "Memory";
  target: "MAR" | "Memory[SP]" | "PR" | "GR";
  routeSegments: string[];
  usesSP: boolean;
  usesMAR: boolean;
  usesMemory: boolean;
  writesSP: boolean;
  writesMemory: boolean;
  readsMemory: boolean;
  updatesPR: boolean;
  futureInstructionKinds: FutureStackInstructionKind[];
};

const loadTemplate: InstructionPathTemplate = {
  instructionKind: "LD",
  category: "load",
  visualPath: VisualPathKind.LD_MemoryToMdrToGr,
  stages: ["fetch", "decode", "operand", "writeback"],
  activeModules: ["MAR", "Memory", "MDR", "GR"],
  activeAnchors: ["mar.right", "memory.rowLeft", "mdr.right", "mdr.bottom", "gr.rowRight"],
  routeSegments: ["mar-to-memory", "memory-to-mdr", "mdr-to-gr"],
  updatesFR: false,
  writesRegister: true,
  writesMemory: false,
  usesALU: false,
  usesMDR: true,
  usesMemory: true,
  usesControlPath: false
};

const storeTemplate: InstructionPathTemplate = {
  instructionKind: "ST",
  category: "store",
  visualPath: VisualPathKind.ST_GrToMdrToMemory,
  stages: ["fetch", "decode", "operand", "writeback"],
  activeModules: ["GR", "MDR", "MAR", "Memory"],
  activeAnchors: ["gr.rowRight", "mdr.bottom", "mdr.right", "memory.rowLeft"],
  routeSegments: ["gr-to-mdr", "mar-to-memory", "mdr-to-memory"],
  updatesFR: false,
  writesRegister: false,
  writesMemory: true,
  usesALU: false,
  usesMDR: true,
  usesMemory: true,
  usesControlPath: false
};

const arithmeticTemplate: InstructionPathTemplate = {
  instructionKind: "ADDA",
  category: "arithmetic",
  visualPath: VisualPathKind.ADDA_GrMdrToAluToGr,
  stages: ["fetch", "decode", "operand", "execute", "writeback"],
  activeModules: ["GR", "Memory", "MDR", "ALU", "FR"],
  activeAnchors: ["gr.rowRight", "memory.rowLeft", "mdr.toAlu", "alu.inputA", "alu.inputB", "alu.outputY", "alu.flagOut", "fr.input"],
  routeSegments: ["gr-to-alu", "mar-to-memory", "memory-to-mdr", "mdr-to-alu", "alu-to-gr", "alu-to-fr"],
  updatesFR: true,
  writesRegister: true,
  writesMemory: false,
  usesALU: true,
  usesMDR: true,
  usesMemory: true,
  usesControlPath: false
};

const compareTemplate: InstructionPathTemplate = {
  ...arithmeticTemplate,
  instructionKind: "CPA",
  category: "compare",
  visualPath: VisualPathKind.CPA_GrMdrToAluToFr,
  routeSegments: ["gr-to-alu", "mar-to-memory", "memory-to-mdr", "mdr-to-alu", "alu-to-fr"],
  writesRegister: false
};

const shiftTemplate: InstructionPathTemplate = {
  instructionKind: "SLL",
  category: "shift",
  visualPath: VisualPathKind.Shift_AddressToAluToGr,
  stages: ["fetch", "decode", "operand", "execute", "writeback"],
  activeModules: ["GR", "MAR", "ALU", "FR"],
  activeAnchors: ["gr.rowRight", "mar.shiftCount", "alu.inputA", "alu.inputB", "alu.outputY", "alu.flagOut", "fr.input"],
  routeSegments: ["gr-to-alu", "shift-count-to-alu", "alu-to-gr", "alu-to-fr"],
  updatesFR: true,
  writesRegister: true,
  writesMemory: false,
  usesALU: true,
  usesMDR: false,
  usesMemory: false,
  usesControlPath: false
};

const jumpTemplate: InstructionPathTemplate = {
  instructionKind: "JUMP",
  category: "jump",
  visualPath: VisualPathKind.Jump_AddressToPr,
  stages: ["fetch", "decode", "next"],
  activeModules: ["MAR", "PR", "Controller"],
  activeAnchors: ["mar.left", "pr.left"],
  routeSegments: ["pr-to-mar", "address-to-pr"],
  updatesFR: false,
  writesRegister: false,
  writesMemory: false,
  usesALU: false,
  usesMDR: false,
  usesMemory: false,
  usesControlPath: true
};

const pushTemplate: InstructionPathTemplate = {
  instructionKind: "PUSH",
  category: "stack",
  visualPath: VisualPathKind.PUSH_EffectiveAddressToStack,
  stages: ["fetch", "decode", "operand", "writeback"],
  activeModules: ["EAU", "SP", "MAR", "MDR", "Memory"],
  activeAnchors: ["eau.sum", "sp.output", "mar.stackInput", "memory.rowLeft", "mdr.right"],
  routeSegments: ["base-to-eau", "eau-to-mdr", "sp-to-mar-preview", "mar-to-memory", "mdr-to-memory"],
  updatesFR: false,
  writesRegister: false,
  writesMemory: true,
  usesALU: false,
  usesMDR: true,
  usesMemory: true,
  usesControlPath: false,
  usesEAU: true,
  usesSP: true,
  usesMAR: true,
  writesSP: true,
  readsMemory: false
};

const popTemplate: InstructionPathTemplate = {
  instructionKind: "POP",
  category: "stack",
  visualPath: VisualPathKind.POP_StackToGr,
  stages: ["fetch", "decode", "operand", "writeback"],
  activeModules: ["SP", "MAR", "Memory", "MDR", "GR"],
  activeAnchors: ["sp.output", "mar.stackInput", "memory.rowLeft", "mdr.right", "mdr.bottom", "gr.rowRight"],
  routeSegments: ["sp-to-mar-preview", "mar-to-memory", "memory-to-mdr", "mdr-to-gr"],
  updatesFR: false,
  writesRegister: true,
  writesMemory: false,
  usesALU: false,
  usesMDR: true,
  usesMemory: true,
  usesControlPath: false,
  usesSP: true,
  usesMAR: true,
  writesSP: true,
  readsMemory: true
};

const noOpTemplate: InstructionPathTemplate = {
  instructionKind: "NOP",
  category: "no-op",
  visualPath: VisualPathKind.None,
  stages: ["fetch", "decode", "next"],
  activeModules: ["PR"],
  activeAnchors: ["pr.right"],
  routeSegments: [],
  updatesFR: false,
  writesRegister: false,
  writesMemory: false,
  usesALU: false,
  usesMDR: false,
  usesMemory: false,
  usesControlPath: false
};

export const instructionPathTemplates: Partial<Record<InstructionKind, InstructionPathTemplate>> = {
  NOP: noOpTemplate,
  LD: loadTemplate,
  LAD: { ...loadTemplate, instructionKind: "LAD", category: "load", visualPath: VisualPathKind.LAD_AddressToGr, activeModules: ["MAR", "GR"], routeSegments: ["pr-to-mar", "address-to-gr"], usesMDR: false, usesMemory: false },
  ST: storeTemplate,
  ADDA: arithmeticTemplate,
  SUBA: { ...arithmeticTemplate, instructionKind: "SUBA", visualPath: VisualPathKind.SUBA_GrMdrToAluToGr },
  ADDL: { ...arithmeticTemplate, instructionKind: "ADDL", category: "logical" },
  SUBL: { ...arithmeticTemplate, instructionKind: "SUBL", category: "logical", visualPath: VisualPathKind.SUBA_GrMdrToAluToGr },
  AND: { ...arithmeticTemplate, instructionKind: "AND", category: "logical" },
  OR: { ...arithmeticTemplate, instructionKind: "OR", category: "logical" },
  XOR: { ...arithmeticTemplate, instructionKind: "XOR", category: "logical" },
  CPA: compareTemplate,
  CPL: { ...compareTemplate, instructionKind: "CPL" },
  SLA: { ...shiftTemplate, instructionKind: "SLA" },
  SRA: { ...shiftTemplate, instructionKind: "SRA" },
  SLL: shiftTemplate,
  SRL: { ...shiftTemplate, instructionKind: "SRL" },
  PUSH: pushTemplate,
  POP: popTemplate,
  JUMP: jumpTemplate,
  JZE: { ...jumpTemplate, instructionKind: "JZE", visualPath: VisualPathKind.ConditionalJump_AddressToPr },
  JNZ: { ...jumpTemplate, instructionKind: "JNZ", visualPath: VisualPathKind.ConditionalJump_AddressToPr },
  JPL: { ...jumpTemplate, instructionKind: "JPL", visualPath: VisualPathKind.ConditionalJump_AddressToPr },
  JMI: { ...jumpTemplate, instructionKind: "JMI", visualPath: VisualPathKind.ConditionalJump_AddressToPr },
  JOV: { ...jumpTemplate, instructionKind: "JOV", visualPath: VisualPathKind.ConditionalJump_AddressToPr },
  RET: { ...noOpTemplate, instructionKind: "RET", visualPath: VisualPathKind.Finished_None }
};

export const stackPathTemplates: Record<StackPathKind, StackPathTemplate> = {
  "stack-read": {
    instructionKind: "POP",
    kind: "stack-read",
    source: "SP",
    target: "GR",
    routeSegments: ["sp-to-mar-preview", "mar-to-memory", "memory-to-mdr", "mdr-to-gr"],
    usesSP: true,
    usesMAR: true,
    usesMemory: true,
    writesSP: true,
    writesMemory: false,
    readsMemory: true,
    updatesPR: false,
    futureInstructionKinds: ["POP"]
  },
  "stack-write": {
    instructionKind: "PUSH",
    kind: "stack-write",
    source: "SP",
    target: "Memory[SP]",
    routeSegments: ["base-to-eau", "eau-to-mdr", "sp-to-mar-preview", "mar-to-memory", "mdr-to-memory"],
    usesSP: true,
    usesMAR: true,
    usesMemory: true,
    writesSP: true,
    writesMemory: true,
    readsMemory: false,
    updatesPR: false,
    futureInstructionKinds: ["PUSH"]
  },
  "call-return-address": {
    kind: "call-return-address",
    source: "PR",
    target: "Memory[SP]",
    routeSegments: ["sp-to-mar-preview", "mar-to-stack-memory-preview"],
    usesSP: true,
    usesMAR: true,
    usesMemory: true,
    writesSP: true,
    writesMemory: true,
    readsMemory: false,
    updatesPR: true,
    futureInstructionKinds: ["CALL"]
  },
  "return-pop-address": {
    kind: "return-pop-address",
    source: "Memory",
    target: "PR",
    routeSegments: ["sp-to-mar-preview", "mar-to-stack-memory-preview"],
    usesSP: true,
    usesMAR: true,
    usesMemory: true,
    writesSP: true,
    writesMemory: false,
    readsMemory: true,
    updatesPR: true,
    futureInstructionKinds: ["RET_STACK"]
  }
};

export function pathTemplateForInstruction(instructionKind: InstructionKind | undefined): InstructionPathTemplate | undefined {
  return instructionKind ? instructionPathTemplates[instructionKind] : undefined;
}
