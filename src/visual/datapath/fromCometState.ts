import { selectMemoryWindow, selectProgramStartAddress } from "../../core/selectors";
import { VisualPathKind, type AssembledInstruction, type CometState, type InstructionKind } from "../../core/types";
import { GENERAL_REGISTER_COUNT, MEMORY_VISIBLE_ROWS, type ControlLineId, type DatapathPathId } from "./geometry";
import type { ActivePath, ControlSignalView, DatapathPartId, DatapathViewModel, DecoderView, MemoryRowView, WordCell } from "./model";

/**
 * Builds the datapath view model from the application's runtime state.
 *
 * Which wires are active is decided by the runtime: its visual path kind, the microcycle phase,
 * and the kind of the instruction in progress. This file only translates that decision into the
 * routes of the workbench datapath and picks the rows and words to show. It executes nothing and
 * reads no source text.
 */

/** Wire names used by the runtime-facing rules. They predate the workbench datapath. */
type Wire =
  | "pr-to-mar"
  | "mar-to-memory"
  | "memory-to-mdr"
  | "ir-to-decoder"
  | "decoder-to-controller"
  | "base-to-eau"
  | "index-to-eau"
  | "eau-to-mar"
  | "eau-to-gr"
  | "eau-to-mdr"
  | "eau-to-pr"
  | "gr-to-alu"
  | "gr-to-mdr"
  | "mdr-to-memory"
  | "mdr-to-gr"
  | "mdr-to-alu"
  | "mdr-to-pr"
  | "alu-to-gr"
  | "alu-to-fr"
  | "address-to-gr"
  | "address-to-pr"
  | "shift-count-to-alu"
  | "sp-to-mar-preview"
  | "pr-to-plus2"
  | "return-address-to-mdr";

const WIRES_BY_VISUAL_PATH: Readonly<Record<VisualPathKind, readonly Wire[]>> = {
  [VisualPathKind.None]: [],
  [VisualPathKind.Ready_PrToMar]: ["pr-to-mar"],
  [VisualPathKind.Microcycle_Fetch]: ["pr-to-mar", "mar-to-memory", "memory-to-mdr"],
  [VisualPathKind.Microcycle_Decode]: ["ir-to-decoder", "decoder-to-controller"],
  [VisualPathKind.Microcycle_EffectiveAddress]: ["base-to-eau", "index-to-eau", "eau-to-mar"],
  [VisualPathKind.Microcycle_OperandReadMemory]: ["mar-to-memory", "memory-to-mdr"],
  [VisualPathKind.Microcycle_OperandReadRegister]: ["gr-to-alu"],
  [VisualPathKind.Microcycle_Execute]: [],
  [VisualPathKind.Microcycle_WriteBackRegister]: [],
  [VisualPathKind.Microcycle_WriteBackMemory]: ["gr-to-mdr", "mar-to-memory", "mdr-to-memory"],
  [VisualPathKind.Microcycle_FlagUpdate]: ["alu-to-fr"],
  [VisualPathKind.Microcycle_Complete]: [],
  [VisualPathKind.LD_MemoryToMdrToGr]: ["mar-to-memory", "memory-to-mdr", "mdr-to-gr"],
  [VisualPathKind.ST_GrToMdrToMemory]: ["gr-to-mdr", "mar-to-memory", "mdr-to-memory"],
  [VisualPathKind.ADDA_GrMdrToAluToGr]: ["gr-to-alu", "mar-to-memory", "memory-to-mdr", "mdr-to-alu", "alu-to-gr", "alu-to-fr"],
  [VisualPathKind.LAD_AddressToGr]: ["pr-to-mar", "address-to-gr"],
  [VisualPathKind.SUBA_GrMdrToAluToGr]: ["gr-to-alu", "mar-to-memory", "memory-to-mdr", "mdr-to-alu", "alu-to-gr", "alu-to-fr"],
  [VisualPathKind.CPA_GrMdrToAluToFr]: ["gr-to-alu", "mar-to-memory", "memory-to-mdr", "mdr-to-alu", "alu-to-fr"],
  [VisualPathKind.Shift_AddressToAluToGr]: ["gr-to-alu", "shift-count-to-alu", "alu-to-gr", "alu-to-fr"],
  [VisualPathKind.PUSH_EffectiveAddressToStack]: ["base-to-eau", "eau-to-mdr", "sp-to-mar-preview", "mar-to-memory", "mdr-to-memory"],
  [VisualPathKind.POP_StackToGr]: ["sp-to-mar-preview", "mar-to-memory", "memory-to-mdr", "mdr-to-gr"],
  [VisualPathKind.CALL_ReturnAddressToStackAndPr]: ["pr-to-plus2", "return-address-to-mdr", "sp-to-mar-preview", "mar-to-memory", "mdr-to-memory", "base-to-eau", "eau-to-pr"],
  [VisualPathKind.RET_StackToPr]: ["sp-to-mar-preview", "mar-to-memory", "memory-to-mdr", "mdr-to-pr"],
  [VisualPathKind.Jump_AddressToPr]: ["pr-to-mar", "address-to-pr"],
  [VisualPathKind.ConditionalJump_AddressToPr]: ["pr-to-mar", "address-to-pr"],
  [VisualPathKind.ConditionalJump_NotTaken]: ["pr-to-plus2"],
  [VisualPathKind.Finished_None]: []
};

const ARITHMETIC_AND_COMPARE: ReadonlySet<InstructionKind> = new Set(["ADDA", "SUBA", "ADDL", "SUBL", "AND", "OR", "XOR", "CPA", "CPL"]);
const ALU_WRITERS: ReadonlySet<InstructionKind> = new Set(["ADDA", "SUBA", "ADDL", "SUBL", "AND", "OR", "XOR", "SLA", "SRA", "SLL", "SRL"]);
const SHIFTS: ReadonlySet<InstructionKind> = new Set(["SLA", "SRA", "SLL", "SRL"]);

const ALU_OPERATOR: Readonly<Partial<Record<InstructionKind, string>>> = {
  ADDA: "+",
  ADDL: "+",
  SUBA: "−",
  SUBL: "−",
  CPA: "−",
  CPL: "−",
  AND: "&",
  OR: "|",
  XOR: "^",
  SLA: "<<",
  SLL: "<<",
  SRA: ">>",
  SRL: ">>",
  LD: "="
};

const MEMORY_WRITERS: ReadonlySet<InstructionKind> = new Set(["ST", "PUSH", "CALL"]);

export function resolveVisualPathKind(state: Pick<CometState, "runState" | "visualPath" | "lastStep" | "executionGranularity" | "microcycle">): VisualPathKind {
  if (state.runState === "Finished") return VisualPathKind.Finished_None;
  // Whether a write-back goes to memory or to a register follows the instruction in progress.
  // The microcycle state names that instruction directly, so use it instead of the last finished one.
  if (state.executionGranularity === "microcycle" && state.microcycle.phase === "write-back" && state.microcycle.instructionKind) {
    return MEMORY_WRITERS.has(state.microcycle.instructionKind) ? VisualPathKind.Microcycle_WriteBackMemory : VisualPathKind.Microcycle_WriteBackRegister;
  }
  return state.lastStep?.visualPath ?? state.visualPath ?? VisualPathKind.None;
}

function isJumpPath(visualPath: VisualPathKind): boolean {
  return (
    visualPath === VisualPathKind.Jump_AddressToPr ||
    visualPath === VisualPathKind.ConditionalJump_AddressToPr ||
    visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr
  );
}

/** Instruction-granularity steps that involve the effective-address adder show its wires too. */
function addEffectiveAddressWires(wires: Set<Wire>, visualPath: VisualPathKind, hasIndex: boolean): void {
  wires.add("base-to-eau");
  if (hasIndex) wires.add("index-to-eau");

  if (visualPath === VisualPathKind.LAD_AddressToGr) {
    wires.delete("pr-to-mar");
    wires.delete("address-to-gr");
    wires.add("eau-to-gr");
    return;
  }
  if (isJumpPath(visualPath)) {
    wires.delete("pr-to-mar");
    wires.delete("address-to-pr");
    wires.add("eau-to-pr");
    return;
  }
  if (visualPath === VisualPathKind.PUSH_EffectiveAddressToStack) {
    wires.add("eau-to-mdr");
    wires.delete("eau-to-mar");
    return;
  }
  if (visualPath === VisualPathKind.ConditionalJump_NotTaken) return;
  wires.add("eau-to-mar");
}

function microcycleWires(state: CometState, visualPath: VisualPathKind, row: AssembledInstruction | undefined): Set<Wire> {
  const wires = new Set<Wire>(WIRES_BY_VISUAL_PATH[visualPath]);
  const instruction = state.microcycle.instructionKind;
  const registerForm = row?.sourceRegister !== undefined;

  if (visualPath === VisualPathKind.Microcycle_EffectiveAddress) {
    if (row?.indexRegister === undefined) wires.delete("index-to-eau");
    return wires;
  }

  if (visualPath === VisualPathKind.Microcycle_Execute) {
    if (instruction === "ST") return new Set(["gr-to-mdr"]);
    if (instruction === "PUSH") return new Set(["eau-to-mdr", "sp-to-mar-preview"]);
    if (instruction === "CALL") return new Set(["pr-to-plus2", "return-address-to-mdr", "sp-to-mar-preview"]);
    if (instruction === "POP") return new Set(["sp-to-mar-preview"]);
    if (instruction === "RET") return new Set(["mdr-to-pr"]);
    if (instruction && SHIFTS.has(instruction)) return new Set(["gr-to-alu", "shift-count-to-alu"]);
    if (instruction === "JUMP") return new Set(["eau-to-pr"]);
    if (instruction && /^J/.test(instruction)) {
      // A conditional jump moves the address into PR only when it was taken.
      return state.lastEffectiveAddress !== undefined && state.pr === state.lastEffectiveAddress ? new Set(["eau-to-pr"]) : new Set();
    }
    if (instruction && ARITHMETIC_AND_COMPARE.has(instruction)) {
      return registerForm ? new Set(["gr-to-alu"]) : new Set(["gr-to-alu", "mdr-to-alu"]);
    }
    return new Set();
  }

  if (visualPath === VisualPathKind.Microcycle_WriteBackRegister) {
    if (instruction === "LAD") return new Set(["eau-to-gr"]);
    if (instruction === "LD") return registerForm ? new Set(["gr-to-alu", "alu-to-gr"]) : new Set(["mdr-to-gr"]);
    if (instruction === "POP") return new Set(["mdr-to-gr"]);
    if (instruction === "RET") return new Set(["sp-to-mar-preview"]);
    if (instruction && ALU_WRITERS.has(instruction)) return new Set(["alu-to-gr"]);
    return new Set();
  }

  return wires;
}

function activeInstructionRow(state: CometState): AssembledInstruction | undefined {
  const inMicrocycle = state.executionGranularity === "microcycle" && state.microcycle.phase !== "none";
  const address = inMicrocycle ? state.microcycle.instructionAddress : state.lastStep?.executedAddress ?? state.currentAddress;
  if (address === undefined) return undefined;
  return state.program?.find((candidate) => candidate.address === address);
}

/** The runtime's decision about which wires are active in this state. */
export function resolveActiveWires(state: CometState): Set<Wire> {
  const visualPath = resolveVisualPathKind(state);
  if (state.executionGranularity === "microcycle") return microcycleWires(state, visualPath, activeInstructionRow(state));

  const wires = new Set<Wire>(WIRES_BY_VISUAL_PATH[visualPath]);
  const hasIndex = state.lastIndexRegister !== undefined && state.lastEffectiveAddress !== undefined;
  const usesEffectiveAddress =
    hasIndex || visualPath === VisualPathKind.PUSH_EffectiveAddressToStack || visualPath === VisualPathKind.CALL_ReturnAddressToStackAndPr;
  if (usesEffectiveAddress) addEffectiveAddressWires(wires, visualPath, hasIndex);
  return wires;
}

function targetRegisterIndex(state: CometState, row: AssembledInstruction | undefined): number {
  const changed = state.changedRegisters.find((name) => /^GR[0-7]$/.test(name));
  if (changed) return Number(changed.slice(2));
  if (row?.gr !== undefined) return row.gr;
  const text = state.lastStep?.executedInstruction ?? state.currentInstruction ?? "";
  const match = /GR([0-7])/i.exec(text);
  return match ? Number(match[1]) : 1;
}

function memoryWindowStart(state: CometState, focusAddress: number): number {
  const programStart = selectProgramStartAddress(state);
  if (focusAddress >= programStart && focusAddress < programStart + MEMORY_VISIBLE_ROWS) return programStart;
  const half = Math.floor(MEMORY_VISIBLE_ROWS / 2);
  return Math.max(0, Math.min(0xffff - MEMORY_VISIBLE_ROWS + 1, focusAddress - half));
}

function sourceTextByAddress(state: CometState): Map<number, string> {
  const texts = new Map<number, string>();
  for (const entry of state.sourceMap) {
    let text = entry.source.replace(/;.*$/, "").replace(/\s+/g, " ").trim();
    if (entry.label && text.toUpperCase().startsWith(`${entry.label.toUpperCase()} `)) text = text.slice(entry.label.length + 1);
    if (text && !texts.has(entry.address)) texts.set(entry.address, text);
  }
  return texts;
}

/** Order of a route inside one step, by data dependency. Compressed to consecutive stages below. */
const STAGE_RANK: Readonly<Record<DatapathPathId, number>> = {
  "ir-to-decoder": 0,
  "decoder-to-ea": 0,
  "gr-to-ea": 0,
  "decoder-to-controller": 1,
  "pr-to-mux": 1,
  "sp-to-mux": 1,
  "ea-to-mux": 1,
  "ea-to-gr": 1,
  "ea-to-pr": 1,
  "ea-to-mdr": 1,
  "pr-to-mdr": 1,
  "gr-to-mdr": 1,
  "mux-to-mar": 2,
  "mar-to-memory": 3,
  "memory-to-mdr": 4,
  "mdr-to-memory": 4,
  "mdr-to-ir": 5,
  "mdr-to-gr": 5,
  "mdr-to-pr": 5,
  "gr-to-alu-a": 5,
  "mdr-to-alu-b": 5,
  "ea-to-alu-b": 5,
  "alu-to-gr": 6,
  "alu-to-fr": 6
};

const PATH_PARTS: Readonly<Record<DatapathPathId, readonly DatapathPartId[]>> = {
  "pr-to-mux": ["pr", "mux"],
  "sp-to-mux": ["sp", "mux"],
  "decoder-to-ea": ["decoder", "ea"],
  "gr-to-ea": ["gr", "ea"],
  "ea-to-mux": ["ea", "mux"],
  "mux-to-mar": ["mux", "mar"],
  "mar-to-memory": ["mar", "memory"],
  "memory-to-mdr": ["memory", "mdr"],
  "mdr-to-memory": ["mdr", "memory"],
  "mdr-to-ir": ["mdr", "ir"],
  "ir-to-decoder": ["ir", "decoder"],
  "mdr-to-gr": ["mdr", "gr"],
  "gr-to-mdr": ["gr", "mdr"],
  "gr-to-alu-a": ["gr", "alu"],
  "mdr-to-alu-b": ["mdr", "alu"],
  "alu-to-gr": ["alu", "gr"],
  "alu-to-fr": ["alu", "fr"],
  "decoder-to-controller": ["decoder", "controller"],
  "ea-to-gr": ["ea", "gr"],
  "ea-to-alu-b": ["ea", "alu"],
  "ea-to-mdr": ["ea", "mdr"],
  "ea-to-pr": ["ea", "pr"],
  "pr-to-mdr": ["pr", "mdr"],
  "mdr-to-pr": ["mdr", "pr"]
};

export interface DatapathViewModelOptions {
  /**
   * The state before this step. Pass it only for a forward step: it supplies the "was" value of
   * a rewritten register. After a reverse step, a reset, or an assemble there is no such value.
   */
  previous?: CometState;
  /** Localised name of the current phase or step, shown in the controller. */
  phaseText?: string;
}

export function toDatapathViewModel(state: CometState, options: DatapathViewModelOptions = {}): DatapathViewModel {
  const { previous } = options;
  const visualPath = resolveVisualPathKind(state);
  const wires = resolveActiveWires(state);
  const row = activeInstructionRow(state);
  const instructionKind: InstructionKind | undefined =
    state.executionGranularity === "microcycle" && state.microcycle.phase !== "none" ? state.microcycle.instructionKind : row?.op;
  const targetRegister = targetRegisterIndex(state, row);
  const sourceRegister = row?.sourceRegister;
  const indexRegister = state.lastIndexRegister ?? row?.indexRegister;

  // Memory rows: the chip follows the word being read or written, like the old circuit did.
  // Inside a microcycle the word is the one MAR addresses in this phase. After a whole
  // instruction the runtime reports the operand address it used.
  const microcycle = state.executionGranularity === "microcycle";
  const readAddress = wires.has("memory-to-mdr") ? (microcycle ? state.mar : state.lastMemoryReadAddress ?? state.mar) : undefined;
  const writeAddress = wires.has("mdr-to-memory") ? (microcycle ? state.mar : state.lastMemoryWriteAddress ?? state.mar) : undefined;
  const focusAddress =
    writeAddress ??
    readAddress ??
    (visualPath === VisualPathKind.Shift_AddressToAluToGr
      ? state.currentAddress ?? state.pr
      : state.lastMemoryWriteAddress ?? state.lastMemoryReadAddress ?? state.changedMemoryAddresses[0] ?? state.currentAddress ?? state.pr);
  const windowStart = memoryWindowStart(state, focusAddress ?? 0x20);
  const rowIndex = (address: number | undefined): number | undefined => {
    if (address === undefined) return undefined;
    const index = address - windowStart;
    return index >= 0 && index < MEMORY_VISIBLE_ROWS ? index : undefined;
  };

  const paths: ActivePath[] = [];
  const add = (path: ActivePath) => {
    if (!paths.some((existing) => existing.id === path.id && existing.grIndex === path.grIndex && existing.memoryRow === path.memoryRow)) paths.push(path);
  };
  const operandA = (index: number): number | undefined => {
    if (!state.changedRegisters.includes(`GR${index}`)) return state.gr[index];
    return previous?.gr[index];
  };

  for (const wire of wires) {
    switch (wire) {
      case "pr-to-mar":
        add({ id: "pr-to-mux", value: visualPath === VisualPathKind.Microcycle_Fetch ? state.microcycle.instructionAddress : undefined });
        add({ id: "mux-to-mar" });
        break;
      case "sp-to-mar-preview":
        add({ id: "sp-to-mux" });
        add({ id: "mux-to-mar" });
        break;
      case "base-to-eau":
        add({ id: "decoder-to-ea", value: state.lastBaseAddress });
        break;
      case "index-to-eau":
        if (indexRegister !== undefined) add({ id: "gr-to-ea", grIndex: indexRegister, value: state.lastIndexValue });
        break;
      case "eau-to-mar":
        add({ id: "ea-to-mux", value: state.lastEffectiveAddress });
        add({ id: "mux-to-mar" });
        break;
      case "eau-to-gr":
        add({ id: "ea-to-gr", grIndex: targetRegister, value: state.lastEffectiveAddress });
        break;
      case "address-to-gr":
        add({ id: "decoder-to-ea", value: state.lastBaseAddress });
        add({ id: "ea-to-gr", grIndex: targetRegister, value: state.lastEffectiveAddress });
        break;
      case "eau-to-mdr":
        add({ id: "ea-to-mdr", value: state.lastEffectiveAddress });
        break;
      case "eau-to-pr":
        add({ id: "ea-to-pr", value: state.lastEffectiveAddress });
        break;
      case "address-to-pr":
        add({ id: "decoder-to-ea", value: state.lastBaseAddress });
        add({ id: "ea-to-pr", value: state.lastEffectiveAddress });
        break;
      case "shift-count-to-alu":
        add({ id: "ea-to-alu-b", value: state.lastEffectiveAddress });
        break;
      case "mar-to-memory":
        add({ id: "mar-to-memory", value: state.mar });
        break;
      case "memory-to-mdr":
        add({ id: "memory-to-mdr", memoryRow: rowIndex(readAddress), value: state.mdr });
        break;
      case "mdr-to-memory":
        add({ id: "mdr-to-memory", memoryRow: rowIndex(writeAddress), value: state.mdr });
        break;
      case "ir-to-decoder":
        add({ id: "ir-to-decoder", value: state.ir });
        break;
      case "decoder-to-controller":
        add({ id: "decoder-to-controller" });
        break;
      case "gr-to-alu": {
        // A register-form operand is read from the source register; otherwise input A is the target register.
        const fromSource =
          sourceRegister !== undefined &&
          (visualPath === VisualPathKind.Microcycle_OperandReadRegister || (visualPath === VisualPathKind.Microcycle_WriteBackRegister && instructionKind === "LD"));
        const index = fromSource ? sourceRegister : targetRegister;
        add({ id: "gr-to-alu-a", grIndex: index, value: operandA(index) });
        break;
      }
      case "gr-to-mdr":
        add({ id: "gr-to-mdr", grIndex: targetRegister, value: state.gr[targetRegister] });
        break;
      case "mdr-to-gr":
        add({ id: "mdr-to-gr", grIndex: targetRegister, value: state.mdr });
        break;
      case "mdr-to-alu":
        add({ id: "mdr-to-alu-b", value: state.mdr });
        break;
      case "mdr-to-pr":
        add({ id: "mdr-to-pr", value: state.mdr });
        break;
      case "return-address-to-mdr":
        add({ id: "pr-to-mdr", value: state.mdr });
        break;
      case "alu-to-gr":
        add({ id: "alu-to-gr", grIndex: targetRegister, value: state.gr[targetRegister] });
        break;
      case "alu-to-fr":
        add({ id: "alu-to-fr" });
        break;
      case "pr-to-plus2":
        // PR advances inside PR. The workbench datapath draws no incrementer, so there is no route.
        break;
    }
  }

  const ranks = [...new Set(paths.map((path) => STAGE_RANK[path.id]))].sort((a, b) => a - b);
  const activePaths = paths.map((path) => ({ ...path, stage: ranks.indexOf(STAGE_RANK[path.id]) }));
  const has = (id: DatapathPathId) => activePaths.some((path) => path.id === id);

  const activeParts = new Set<DatapathPartId>();
  for (const path of activePaths) for (const part of PATH_PARTS[path.id]) activeParts.add(part);

  const asserted: ControlLineId[] = [];
  if (has("gr-to-ea") || has("gr-to-alu-a") || has("gr-to-mdr")) asserted.push("gr-select");
  if (has("gr-to-alu-a") || has("mdr-to-alu-b") || has("ea-to-alu-b") || has("alu-to-gr") || has("alu-to-fr")) asserted.push("alu-op");
  if (has("mdr-to-gr") || has("alu-to-gr") || has("ea-to-gr")) asserted.push("gr-write");
  if (has("alu-to-fr")) asserted.push("fr-write");
  if (has("memory-to-mdr")) asserted.push("mem-read");
  if (has("mdr-to-memory")) asserted.push("mem-write");
  if (asserted.length > 0 || has("decoder-to-controller")) activeParts.add("controller");

  const aluActive = activeParts.has("alu");
  const operator = aluActive ? (instructionKind ? ALU_OPERATOR[instructionKind] : undefined) ?? "·" : null;
  const grWriteSource = has("alu-to-gr") ? "Y" : has("mdr-to-gr") ? "MDR" : "EA";
  const signals: ControlSignalView[] = [
    { id: "mem-read", text: "MEM.RD", asserted: asserted.includes("mem-read") },
    { id: "mem-write", text: "MEM.WR", asserted: asserted.includes("mem-write") },
    { id: "alu-op", text: aluActive && instructionKind ? `ALU ${instructionKind}` : "ALU", asserted: asserted.includes("alu-op") },
    { id: "gr-write", text: asserted.includes("gr-write") ? `GR${targetRegister} <- ${grWriteSource}` : "GR write", asserted: asserted.includes("gr-write") },
    { id: "fr-write", text: "FR <- F", asserted: asserted.includes("fr-write") }
  ];

  // A value counts as rewritten when the runtime says so, or when it differs from the state before
  // this step. The second test is a plain comparison of two real states.
  const changed = new Set(state.changedRegisters);
  const cell = (name: string, value: number, before: number | undefined, part: DatapathPartId): WordCell => {
    const differs = before !== undefined && before !== value;
    if (differs) return { value, state: "changed", previous: before };
    if (changed.has(name)) return { value, state: "changed" };
    return { value, state: activeParts.has(part) ? "selected" : "idle" };
  };
  const selectedRegisters = new Set<number>();
  for (const path of activePaths) {
    if (path.grIndex !== undefined && (path.id === "gr-to-ea" || path.id === "gr-to-alu-a" || path.id === "gr-to-mdr")) selectedRegisters.add(path.grIndex);
  }
  const gr: WordCell[] = Array.from({ length: GENERAL_REGISTER_COUNT }, (_, index) => {
    const value = state.gr[index] ?? 0;
    const before = previous?.gr[index];
    if (before !== undefined && before !== value) return { value, state: "changed", previous: before };
    if (changed.has(`GR${index}`)) return { value, state: "changed" };
    return { value, state: selectedRegisters.has(index) ? "selected" : "idle" };
  });

  const hasInstruction = row !== undefined && (state.ir !== 0 || state.stepIndex > 0);
  const word1 = row && row.size > 1 ? state.memory[(row.address + 1) & 0xffff] ?? 0 : null;
  const xField = state.ir & 0xf;
  const decoder: DecoderView | null = hasInstruction
    ? {
        op: (state.ir >> 8) & 0xff,
        r: (state.ir >> 4) & 0xf,
        x: xField,
        adr: word1,
        opText: row.op,
        rText: `GR${(state.ir >> 4) & 0xf}`,
        xText: row.sourceRegister !== undefined || xField !== 0 ? `GR${xField}` : "-",
        adrText: word1 === null ? "-" : row.operandLabel ?? ""
      }
    : null;

  const sources = sourceTextByAddress(state);
  const instructionEnd = row ? row.address + row.size - 1 : -1;
  const rows: MemoryRowView[] = selectMemoryWindow(state, windowStart, Math.min(0xffff, windowStart + MEMORY_VISIBLE_ROWS - 1)).map((memoryRow) => {
    const address = memoryRow.address;
    // A row is marked only while its read or write route is active in this step.
    const access = address === writeAddress ? "write" : address === readAddress ? "read" : undefined;
    return {
      address,
      value: memoryRow.value,
      label: memoryRow.label,
      source: sources.get(address),
      access,
      current: row !== undefined && address >= row.address && address <= instructionEnd
    };
  });

  return {
    ir: { word0: hasInstruction ? state.ir : null, word1: hasInstruction ? word1 : null },
    decoder,
    controller: {
      phaseText: options.phaseText ?? "",
      instructionText: (state.lastStep?.executedInstruction ?? state.currentInstruction ?? "").replace(/\s+/g, " ").trim(),
      signals
    },
    pr: cell("PR", state.pr, previous?.pr, "pr"),
    sp: cell("SP", state.sp, previous?.sp, "sp"),
    mar: cell("MAR", state.mar, previous?.mar, "mar"),
    mdr: cell("MDR", state.mdr, previous?.mdr, "mdr"),
    gr,
    ea: { value: activeParts.has("ea") ? state.lastEffectiveAddress ?? null : null },
    mux: { selected: has("pr-to-mux") ? "pr" : has("sp-to-mux") ? "sp" : has("ea-to-mux") ? "ea" : null },
    alu: { operator },
    fr: { of: state.fr.o, sf: state.fr.n, zf: state.fr.z },
    memory: {
      rows,
      pins: { adr: has("mar-to-memory"), rd: has("memory-to-mdr"), wr: has("mdr-to-memory"), data: has("memory-to-mdr") || has("mdr-to-memory") }
    },
    activeParts: [...activeParts],
    activePaths,
    assertedControlLines: asserted
  };
}
