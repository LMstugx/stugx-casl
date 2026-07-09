import {
  AssembledInstruction,
  CometState,
  Diagnostic,
  FlagsState,
  InstructionKind,
  MemoryRow,
  RegisterState,
  SourceMapEntry,
  TraceEvent,
  VisualPathKind,
  formatWord,
  word
} from "./types";
import { DEFAULT_CASL_SOURCE } from "./defaultSource";

export { DEFAULT_CASL_SOURCE };

const START_ADDRESS = 0x20;
const MAX_TRACE_EVENTS = 1000;
const SUPPORTED_OPS = new Set([
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
  "ST",
  "JUMP",
  "JZE",
  "JNZ",
  "JPL",
  "JMI",
  "JOV",
  "RET"
]);
const REGISTER_ADDRESS_OPS = new Set<InstructionKind>(["LD", "LAD", "ADDA", "SUBA", "ADDL", "SUBL", "AND", "OR", "XOR", "CPA", "CPL", "SLA", "SRA", "SLL", "SRL", "ST"]);
const JUMP_OPS = new Set<InstructionKind>(["JUMP", "JZE", "JNZ", "JPL", "JMI", "JOV"]);
const SHIFT_OPS = new Set<InstructionKind>(["SLA", "SRA", "SLL", "SRL"]);
const STACK_ADDRESS_OPS = new Set<InstructionKind>(["PUSH"]);

type ParsedLine = {
  line: number;
  raw: string;
  source: string;
  label?: string;
  op?: InstructionKind;
  operands: string[];
  address?: number;
};

type AssembleArtifacts = {
  memory: Record<number, number>;
  sourceMap: SourceMapEntry[];
  program: AssembledInstruction[];
  symbols: Record<string, number>;
  diagnostics: Diagnostic[];
};

export interface CaslCore {
  assemble(source: string): CometState;
  step(state: CometState): CometState;
  reset(state: CometState): CometState;
}

function initialFlags(): FlagsState {
  return { z: false, c: false, n: false, o: false };
}

function cloneState(state: CometState): CometState {
  return {
    ...state,
    fr: { ...state.fr },
    gr: [...state.gr],
    memory: { ...state.memory },
    initialMemory: state.initialMemory ? { ...state.initialMemory } : undefined,
    memoryRows: state.memoryRows.map((row) => ({ ...row })),
    registers: state.registers.map((reg) => ({ ...reg })),
    sourceMap: state.sourceMap.map((entry) => ({ ...entry, machineWords: [...entry.machineWords] })),
    symbols: { ...state.symbols },
    diagnostics: state.diagnostics.map((diagnostic) => ({ ...diagnostic })),
    output: [...state.output],
    trace: state.trace.map((event) => ({ ...event })),
    program: state.program?.map((instruction) => ({ ...instruction })),
    changedRegisters: [...state.changedRegisters],
    changedMemoryAddresses: [...state.changedMemoryAddresses],
    lastStep: state.lastStep ? { ...state.lastStep } : undefined
  };
}

function stripComment(line: string): string {
  return line.split(";")[0].trimEnd();
}

function parseLine(raw: string, index: number): ParsedLine {
  const source = stripComment(raw);
  const tokens = source.replace(/,/g, " ").trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return { line: index + 1, raw, source: raw.trim(), operands: [] };
  }

  const first = tokens[0].toUpperCase();
  if (SUPPORTED_OPS.has(first)) {
    return {
      line: index + 1,
      raw,
      source: source.trim(),
      op: first as InstructionKind,
      operands: tokens.slice(1)
    };
  }

  const op = tokens[1]?.toUpperCase();
  return {
    line: index + 1,
    raw,
    source: source.trim(),
    label: tokens[0],
    op: SUPPORTED_OPS.has(op) ? (op as InstructionKind) : undefined,
    operands: tokens.slice(2)
  };
}

function parseNumber(token: string): number {
  const trimmed = token.trim();
  if (!trimmed) throw new Error("Missing numeric value");
  if (!/^#[0-9a-f]+$/i.test(trimmed) && !/^0x[0-9a-f]+$/i.test(trimmed) && !/^[0-9]+$/.test(trimmed)) {
    throw new Error(`Invalid numeric value: ${token}`);
  }

  let value: number;
  if (/^#[0-9a-f]+$/i.test(trimmed)) {
    value = parseInt(trimmed.slice(1), 16);
  } else if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    value = parseInt(trimmed, 16);
  } else {
    value = parseInt(trimmed, 10);
  }

  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff) {
    throw new Error(`Numeric value out of 16-bit range: ${token}`);
  }
  return value;
}

function symbolKey(label: string): string {
  return label.toUpperCase();
}

function instructionSize(line: ParsedLine): number {
  if (line.op && (REGISTER_ADDRESS_OPS.has(line.op) || JUMP_OPS.has(line.op) || STACK_ADDRESS_OPS.has(line.op))) return 2;
  if (line.op === "NOP" || line.op === "RET" || line.op === "POP") return 1;
  if (line.op === "DC") return Math.max(1, line.operands.length);
  if (line.op === "DS") return Math.max(0, parseNumber(line.operands[0] ?? "0"));
  return 0;
}

function registerNumber(token: string): number {
  const match = /^GR([0-7])$/i.exec(token.trim());
  if (!match) throw new Error(`Unsupported register ${token}`);
  return Number(match[1]);
}

function indexRegisterNumber(token: string): number {
  const register = registerNumber(token);
  if (register === 0) throw new Error("GR0 cannot be used as an index register");
  return register;
}

function encodeInstruction(op: AssembledInstruction["op"], gr = 0, indexRegister = 0): number {
  const registerBits = (gr & 0x0f) << 4;
  const indexBits = indexRegister & 0x0f;
  switch (op) {
    case "NOP":
      return 0x0000;
    case "LD":
      return 0x1000 | registerBits | indexBits;
    case "LAD":
      return 0x1200 | registerBits | indexBits;
    case "ADDA":
      return 0x2000 | registerBits | indexBits;
    case "SUBA":
      return 0x2100 | registerBits | indexBits;
    case "ADDL":
      return 0x2200 | registerBits | indexBits;
    case "SUBL":
      return 0x2300 | registerBits | indexBits;
    case "AND":
      return 0x3000 | registerBits | indexBits;
    case "OR":
      return 0x3100 | registerBits | indexBits;
    case "XOR":
      return 0x3200 | registerBits | indexBits;
    case "CPA":
      return 0x4000 | registerBits | indexBits;
    case "CPL":
      return 0x4100 | registerBits | indexBits;
    case "SLA":
      return 0x5000 | registerBits | indexBits;
    case "SRA":
      return 0x5100 | registerBits | indexBits;
    case "SLL":
      return 0x5200 | registerBits | indexBits;
    case "SRL":
      return 0x5300 | registerBits | indexBits;
    case "PUSH":
      return 0x7000 | indexBits;
    case "POP":
      return 0x7100 | registerBits;
    case "ST":
      return 0x1100 | registerBits | indexBits;
    case "JMI":
      return 0x6100 | indexBits;
    case "JNZ":
      return 0x6200 | indexBits;
    case "JZE":
      return 0x6300 | indexBits;
    case "JUMP":
      return 0x6400 | indexBits;
    case "JPL":
      return 0x6500 | indexBits;
    case "JOV":
      return 0x6600 | indexBits;
    case "RET":
      return 0x8100;
  }
}

function resolveAddressOperand(token: string | undefined, symbols: Record<string, number>): number {
  if (!token) throw new Error("Missing address operand");
  try {
    return word(parseNumber(token));
  } catch {
    const address = symbols[symbolKey(token)];
    if (address === undefined) throw new Error(`Undefined symbol: ${token}`);
    return address;
  }
}

function parseOptionalIndexOperand(operand: string | undefined): number | undefined {
  if (operand === undefined) return undefined;
  return indexRegisterNumber(operand);
}

function parseProgram(source: string): ParsedLine[] {
  return source.split(/\r?\n/).map(parseLine).filter((line) => line.op || line.label);
}

function assembleArtifacts(source: string): AssembleArtifacts {
  const lines = parseProgram(source);
  const diagnostics: Diagnostic[] = [];
  const symbols: Record<string, number> = {};
  const memory: Record<number, number> = {};
  const sourceMap: SourceMapEntry[] = [];
  const program: AssembledInstruction[] = [];
  let address = START_ADDRESS;

  for (const line of lines) {
    if (!line.op) {
      diagnostics.push({ line: line.line, message: "Unsupported or missing operation", severity: "error" });
      continue;
    }

    line.address = address;
    if (line.label) {
      const key = symbolKey(line.label);
      if (Object.prototype.hasOwnProperty.call(symbols, key)) {
        diagnostics.push({ line: line.line, message: `Duplicate label: ${line.label}`, severity: "error" });
      } else {
        symbols[key] = address;
      }
    }
    if (line.op === "START") {
      line.address = START_ADDRESS;
      if (line.label && !Object.prototype.hasOwnProperty.call(symbols, symbolKey(line.label))) symbols[symbolKey(line.label)] = START_ADDRESS;
      address = START_ADDRESS;
      continue;
    }
    if (line.op === "END") continue;
    try {
      const size = instructionSize(line);
      if (address + size > 0x10000) {
        diagnostics.push({ line: line.line, message: "Program memory exceeds 0xFFFF", severity: "error" });
      } else {
        address += size;
      }
    } catch (error) {
      diagnostics.push({ line: line.line, message: (error as Error).message, severity: "error" });
    }
  }

  address = START_ADDRESS;
  for (const line of lines) {
    if (!line.op || line.op === "START" || line.op === "END") continue;
    const sourceText = line.source || line.raw.trim();

    if (line.op && REGISTER_ADDRESS_OPS.has(line.op)) {
      try {
        const op = line.op as AssembledInstruction["op"];
        if (line.operands.length < 2) throw new Error(`${line.op} requires register and address operands`);
        if (line.operands.length > 3) throw new Error(`${line.op} has too many operands`);
        const gr = registerNumber(line.operands[0] ?? "");
        const operand = line.operands[1];
        const indexRegister = parseOptionalIndexOperand(line.operands[2]);
        const operandAddress = resolveAddressOperand(operand, symbols);
        const machine = encodeInstruction(op, gr, indexRegister ?? 0);
        memory[address] = machine;
        memory[address + 1] = operandAddress;
        sourceMap.push({
          line: line.line,
          address,
          machineWords: [machine, operandAddress],
          source: sourceText,
          label: line.label,
          instruction: op
        });
        program.push({
          address,
          line: line.line,
          op,
          source: sourceText,
          size: 2,
          gr,
          operandLabel: symbols[symbolKey(operand)] === operandAddress ? operand : undefined,
          operandAddress,
          indexRegister
        });
        address += 2;
      } catch (error) {
        diagnostics.push({ line: line.line, message: (error as Error).message, severity: "error" });
      }
      continue;
    }

    if (line.op && JUMP_OPS.has(line.op)) {
      try {
        const op = line.op as AssembledInstruction["op"];
        if (line.operands.length < 1) throw new Error(`${line.op} requires an address operand`);
        if (line.operands.length > 2) throw new Error(`${line.op} has too many operands`);
        const operand = line.operands[0];
        const indexRegister = parseOptionalIndexOperand(line.operands[1]);
        const operandAddress = resolveAddressOperand(operand, symbols);
        const machine = encodeInstruction(op, 0, indexRegister ?? 0);
        memory[address] = machine;
        memory[address + 1] = operandAddress;
        sourceMap.push({
          line: line.line,
          address,
          machineWords: [machine, operandAddress],
          source: sourceText,
          label: line.label,
          instruction: op
        });
        program.push({
          address,
          line: line.line,
          op,
          source: sourceText,
          size: 2,
          operandLabel: symbols[symbolKey(operand)] === operandAddress ? operand : undefined,
          operandAddress,
          indexRegister
        });
        address += 2;
      } catch (error) {
        diagnostics.push({ line: line.line, message: (error as Error).message, severity: "error" });
      }
      continue;
    }

    if (line.op === "PUSH") {
      try {
        const op = line.op;
        if (line.operands.length < 1) throw new Error("PUSH requires an address operand");
        if (line.operands.length > 2) throw new Error("PUSH has too many operands");
        const operand = line.operands[0];
        const indexRegister = parseOptionalIndexOperand(line.operands[1]);
        const operandAddress = resolveAddressOperand(operand, symbols);
        const machine = encodeInstruction(op, 0, indexRegister ?? 0);
        memory[address] = machine;
        memory[address + 1] = operandAddress;
        sourceMap.push({
          line: line.line,
          address,
          machineWords: [machine, operandAddress],
          source: sourceText,
          label: line.label,
          instruction: op
        });
        program.push({
          address,
          line: line.line,
          op,
          source: sourceText,
          size: 2,
          operandLabel: symbols[symbolKey(operand)] === operandAddress ? operand : undefined,
          operandAddress,
          indexRegister
        });
        address += 2;
      } catch (error) {
        diagnostics.push({ line: line.line, message: (error as Error).message, severity: "error" });
      }
      continue;
    }

    if (line.op === "POP") {
      try {
        const op = line.op;
        if (line.operands.length < 1) throw new Error("POP requires a register operand");
        if (line.operands.length > 1) throw new Error("POP does not support index operands");
        const gr = registerNumber(line.operands[0] ?? "");
        const machine = encodeInstruction(op, gr);
        memory[address] = machine;
        sourceMap.push({
          line: line.line,
          address,
          machineWords: [machine],
          source: sourceText,
          label: line.label,
          instruction: op
        });
        program.push({ address, line: line.line, op, source: sourceText, size: 1, gr });
        address += 1;
      } catch (error) {
        diagnostics.push({ line: line.line, message: (error as Error).message, severity: "error" });
      }
      continue;
    }

    if (line.op === "NOP" || line.op === "RET") {
      const op = line.op;
      const machine = encodeInstruction(op);
      memory[address] = machine;
      sourceMap.push({
        line: line.line,
        address,
        machineWords: [machine],
        source: sourceText,
        label: line.label,
        instruction: op
      });
      program.push({ address, line: line.line, op, source: sourceText, size: 1 });
      address += 1;
      continue;
    }

    if (line.op === "DC") {
      const values = line.operands.length ? line.operands : ["0"];
      try {
        const machineWords = values.map((valueToken) => word(parseNumber(valueToken)));
        machineWords.forEach((value, valueIndex) => {
          memory[address + valueIndex] = value;
        });
        sourceMap.push({
          line: line.line,
          address,
          machineWords,
          source: sourceText,
          label: line.label,
          instruction: "DC"
        });
        address += values.length;
      } catch (error) {
        diagnostics.push({ line: line.line, message: (error as Error).message, severity: "error" });
      }
      continue;
    }

    if (line.op === "DS") {
      try {
        if (line.operands.length > 1) throw new Error("DS does not support index operands");
        const count = parseNumber(line.operands[0] ?? "0");
        if (address + count > 0x10000) {
          diagnostics.push({ line: line.line, message: "DS address out of range", severity: "error" });
          continue;
        }
        for (let offset = 0; offset < count; offset += 1) {
          memory[address + offset] = 0;
        }
        sourceMap.push({
          line: line.line,
          address,
          machineWords: Array.from({ length: count }, () => 0),
          source: sourceText,
          label: line.label,
          instruction: "DS"
        });
        address += count;
      } catch (error) {
        diagnostics.push({ line: line.line, message: (error as Error).message, severity: "error" });
      }
    }
  }

  return { memory, sourceMap, program, symbols, diagnostics };
}

function getMemory(memory: Record<number, number>, address: number): number {
  return word(memory[address] ?? 0);
}

function toSigned16(value: number): number {
  const result = word(value);
  return (result & 0x8000) !== 0 ? result - 0x10000 : result;
}

function setFlagsForArithmeticResult(value: number, overflow = false): FlagsState {
  const result = word(value);
  return {
    z: result === 0,
    c: value > 0xffff || value < 0,
    n: (result & 0x8000) !== 0,
    o: overflow
  };
}

function setFlagsForLogicalResult(value: number): FlagsState {
  const result = word(value);
  return {
    z: result === 0,
    c: false,
    n: (result & 0x8000) !== 0,
    o: false
  };
}

function setFlagsForLogicalAdd(lhs: number, rhs: number): FlagsState {
  const result = lhs + rhs;
  const carry = result > 0xffff;
  return {
    z: word(result) === 0,
    c: carry,
    n: (word(result) & 0x8000) !== 0,
    o: carry
  };
}

function setFlagsForLogicalSub(lhs: number, rhs: number): FlagsState {
  const borrow = lhs < rhs;
  const result = word(lhs - rhs);
  return {
    z: result === 0,
    c: borrow,
    n: (result & 0x8000) !== 0,
    o: borrow
  };
}

function signedAddOverflow(lhs: number, rhs: number, result: number): boolean {
  const left = toSigned16(lhs);
  const right = toSigned16(rhs);
  const signedResult = toSigned16(result);
  return (left >= 0 && right >= 0 && signedResult < 0) || (left < 0 && right < 0 && signedResult >= 0);
}

function signedSubOverflow(lhs: number, rhs: number, result: number): boolean {
  const left = toSigned16(lhs);
  const right = toSigned16(rhs);
  const signedResult = toSigned16(result);
  return (left >= 0 && right < 0 && signedResult < 0) || (left < 0 && right >= 0 && signedResult >= 0);
}

function flagsForCompare(lhs: number, rhs: number): FlagsState {
  const diff = toSigned16(lhs) - toSigned16(rhs);
  return {
    z: diff === 0,
    c: false,
    n: diff < 0,
    o: false
  };
}

function flagsForLogicalCompare(lhs: number, rhs: number): FlagsState {
  return {
    z: word(lhs) === word(rhs),
    c: false,
    n: word(lhs) < word(rhs),
    o: false
  };
}

type ShiftResult = {
  value: number;
  shiftedOut: boolean;
};

function flagsForShiftResult(value: number, shiftedOut: boolean): FlagsState {
  const result = word(value);
  return {
    z: result === 0,
    c: false,
    n: (result & 0x8000) !== 0,
    o: shiftedOut
  };
}

function bitAt(value: number, index: number): boolean {
  return ((word(value) >>> index) & 1) === 1;
}

function shiftValue(op: InstructionKind, value: number, count: number): ShiftResult {
  const normalizedValue = word(value);
  const normalizedCount = word(count);
  if (normalizedCount === 0) return { value: normalizedValue, shiftedOut: false };

  if (op === "SLA") {
    const sign = normalizedValue & 0x8000;
    const magnitude = normalizedValue & 0x7fff;
    const shiftedOut = normalizedCount <= 15 ? bitAt(magnitude, 15 - normalizedCount) : false;
    const shifted = normalizedCount >= 15 ? 0 : (magnitude << normalizedCount) & 0x7fff;
    return { value: word(sign | shifted), shiftedOut };
  }

  if (op === "SRA") {
    const sign = normalizedValue & 0x8000;
    const shiftedOut = normalizedCount <= 16 ? bitAt(normalizedValue, normalizedCount - 1) : false;
    if (normalizedCount >= 16) return { value: sign ? 0xffff : 0x0000, shiftedOut };
    const shifted = (normalizedValue >> normalizedCount) | (sign ? (0xffff << (16 - normalizedCount)) : 0);
    return { value: word(shifted), shiftedOut };
  }

  if (op === "SLL") {
    const shiftedOut = normalizedCount <= 16 ? bitAt(normalizedValue, 16 - normalizedCount) : false;
    return { value: normalizedCount >= 16 ? 0 : word(normalizedValue << normalizedCount), shiftedOut };
  }

  if (op === "SRL") {
    const shiftedOut = normalizedCount <= 16 ? bitAt(normalizedValue, normalizedCount - 1) : false;
    return { value: normalizedCount >= 16 ? 0 : word(normalizedValue >>> normalizedCount), shiftedOut };
  }

  return { value: normalizedValue, shiftedOut: false };
}

function instructionAt(state: CometState, address: number): AssembledInstruction | undefined {
  return state.program?.find((instruction) => instruction.address === address);
}

function labelByAddress(symbols: Record<string, number>): Record<number, string> {
  return Object.entries(symbols).reduce<Record<number, string>>((labels, [label, address]) => {
    labels[address] = label;
    return labels;
  }, {});
}

function buildMemoryRows(
  memory: Record<number, number>,
  symbols: Record<string, number>,
  currentAddress: number,
  changedMemoryAddresses: number[]
): MemoryRow[] {
  const addresses = Object.keys(memory).map(Number);
  const min = Math.min(START_ADDRESS, ...addresses);
  const max = Math.max(START_ADDRESS + 10, ...addresses);
  const labels = labelByAddress(symbols);
  const changed = new Set(changedMemoryAddresses);

  return Array.from({ length: max - min + 1 }, (_, index) => {
    const address = min + index;
    return {
      address,
      value: getMemory(memory, address),
      label: labels[address],
      changed: changed.has(address),
      current: address === currentAddress
    };
  });
}

function buildRegisterRows(state: Pick<CometState, "gr" | "pr" | "sp" | "ir" | "mar" | "mdr" | "fr" | "changedRegisters">): RegisterState[] {
  const changed = new Set(state.changedRegisters);
  const rows: RegisterState[] = state.gr.map((value, index) => ({
    name: `GR${index}`,
    value,
    decimal: value,
    changed: changed.has(`GR${index}`)
  }));

  rows.push(
    { name: "PR", value: state.pr, decimal: state.pr, changed: changed.has("PR") },
    { name: "SP", value: state.sp, decimal: state.sp, changed: changed.has("SP") },
    { name: "IR", value: state.ir, decimal: state.ir, changed: changed.has("IR") },
    { name: "MAR", value: state.mar, decimal: state.mar, changed: changed.has("MAR") },
    { name: "MDR", value: state.mdr, decimal: state.mdr, changed: changed.has("MDR") },
    {
      name: "FR",
      value: (state.fr.z ? 0b100 : 0) | (state.fr.c ? 0b010 : 0) | (state.fr.n ? 0b001 : 0),
      decimal: 0,
      changed: changed.has("FR")
    }
  );

  return rows;
}

function currentInstructionText(instruction?: AssembledInstruction): string | undefined {
  if (!instruction) return undefined;
  return instruction.source.replace(/\s+/g, " ");
}

type EffectiveAddressInfo = {
  baseAddress: number;
  indexRegister?: number;
  indexValue?: number;
  effectiveAddress: number;
};

function effectiveAddressFor(state: CometState, instruction: AssembledInstruction): EffectiveAddressInfo {
  const baseAddress = instruction.operandAddress ?? instruction.address;
  const indexRegister = instruction.indexRegister;
  const indexValue = indexRegister === undefined ? undefined : state.gr[indexRegister];
  return {
    baseAddress,
    indexRegister,
    indexValue,
    effectiveAddress: word(baseAddress + (indexValue ?? 0))
  };
}

function formatIndexDetail(info: EffectiveAddressInfo): string {
  if (info.indexRegister === undefined || info.indexValue === undefined) return "";
  return `base: ${formatWord(info.baseAddress)} index: GR${info.indexRegister}=${formatWord(info.indexValue)} effective: ${formatWord(info.effectiveAddress)}; `;
}

function refreshDerivedState(state: CometState): CometState {
  const current = instructionAt(state, state.pr);
  const next: CometState = {
    ...state,
    currentAddress: current?.address,
    currentLine: current?.line,
    currentInstruction: currentInstructionText(current)
  };
  next.memoryRows = buildMemoryRows(next.memory, next.symbols, next.pr, next.changedMemoryAddresses);
  next.registers = buildRegisterRows(next);
  return next;
}

function createState(artifacts: AssembleArtifacts): CometState {
  const diagnostics = artifacts.diagnostics;
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const state: CometState = {
    assembled: !hasErrors,
    runState: hasErrors ? "Error" : "Ready",
    pr: START_ADDRESS,
    sp: 0xfffe,
    ir: 0,
    mar: START_ADDRESS,
    mdr: 0,
    fr: initialFlags(),
    gr: Array.from({ length: 8 }, () => 0),
    memory: artifacts.memory,
    initialMemory: { ...artifacts.memory },
    memoryRows: [],
    registers: [],
    sourceMap: artifacts.sourceMap,
    symbols: artifacts.symbols,
    diagnostics,
    output: hasErrors
      ? ["Assemble failed.", ...diagnostics.map((diagnostic) => `Line ${diagnostic.line}: ${diagnostic.message}`)]
      : ["Assemble succeeded. (0 errors, 0 warnings)", "Program loaded. Entry point: START (0020)"],
    trace: [],
    visualPath: hasErrors ? VisualPathKind.None : VisualPathKind.Ready_PrToMar,
    stepIndex: 0,
    program: artifacts.program,
    changedRegisters: [],
    changedMemoryAddresses: []
  };
  return refreshDerivedState(state);
}

export function createEmptyCometState(runState: CometState["runState"] = "Idle", output: string[] = []): CometState {
  return refreshDerivedState({
    assembled: false,
    runState,
    pr: START_ADDRESS,
    sp: 0xfffe,
    ir: 0,
    mar: START_ADDRESS,
    mdr: 0,
    fr: initialFlags(),
    gr: Array.from({ length: 8 }, () => 0),
    memory: {},
    initialMemory: {},
    memoryRows: [],
    registers: [],
    sourceMap: [],
    symbols: {},
    diagnostics: [],
    output,
    trace: [],
    visualPath: VisualPathKind.None,
    stepIndex: 0,
    program: [],
    changedRegisters: [],
    changedMemoryAddresses: []
  });
}

function traceEvent(
  state: CometState,
  address: number,
  instruction: string,
  detail: string,
  stackPointerChange?: { before: number; after: number }
): TraceEvent {
  return {
    index: state.stepIndex + 1,
    address,
    instruction,
    detail,
    source: instructionAt(state, address)?.source,
    pr: state.pr,
    visualPath: state.visualPath,
    changedRegister: state.changedRegisters.find((register) => register.startsWith("GR")),
    changedMemoryAddress: state.changedMemoryAddresses[0],
    stackPointerValueBefore: stackPointerChange?.before,
    stackPointerValueAfter: stackPointerChange?.after,
    baseAddress: state.lastBaseAddress,
    indexRegister: state.lastIndexRegister,
    indexValue: state.lastIndexValue,
    effectiveAddress: state.lastEffectiveAddress,
    runState: state.runState
  };
}

function prependTrace(state: CometState, event: TraceEvent): void {
  state.trace.unshift(event);
  if (state.trace.length > MAX_TRACE_EVENTS) {
    state.trace.length = MAX_TRACE_EVENTS;
  }
}

function isJumpTaken(op: AssembledInstruction["op"], flags: FlagsState): boolean {
  if (op === "JUMP") return true;
  if (op === "JZE") return flags.z;
  if (op === "JNZ") return !flags.z;
  if (op === "JPL") return !flags.n && !flags.z;
  if (op === "JMI") return flags.n;
  if (op === "JOV") return flags.o;
  return false;
}

export const mockCaslCore: CaslCore = {
  assemble(source: string): CometState {
    return createState(assembleArtifacts(source));
  },

  step(state: CometState): CometState {
    const next = cloneState(state);
    if (!next.assembled || next.runState === "Finished" || next.runState === "Error") return refreshDerivedState(next);

    const instruction = instructionAt(next, next.pr);
    if (!instruction) {
      next.runState = "Error";
      next.output.push(`No instruction at ${formatWord(next.pr)}.`);
      return refreshDerivedState(next);
    }

    next.changedRegisters = ["PR", "IR"];
    next.changedMemoryAddresses = [];
    next.lastMemoryReadAddress = undefined;
    next.lastMemoryWriteAddress = undefined;
    next.lastBaseAddress = undefined;
    next.lastIndexRegister = undefined;
    next.lastIndexValue = undefined;
    next.lastEffectiveAddress = undefined;
    next.ir = getMemory(next.memory, instruction.address);
    const effective = effectiveAddressFor(next, instruction);
    const indexDetail = formatIndexDetail(effective);
    next.mar = effective.effectiveAddress;
    if (instruction.operandAddress !== undefined) {
      next.lastBaseAddress = effective.baseAddress;
      next.lastIndexRegister = effective.indexRegister;
      next.lastIndexValue = effective.indexValue;
      next.lastEffectiveAddress = effective.effectiveAddress;
    }
    next.lastStep = {
      executedAddress: instruction.address,
      executedLine: instruction.line,
      executedInstruction: instruction.source,
      visualPath: VisualPathKind.None
    };

    if (instruction.op === "NOP") {
      next.pr = word(next.pr + 1);
      next.visualPath = VisualPathKind.None;
      next.lastStep.visualPath = next.visualPath;
      prependTrace(next, traceEvent(next, instruction.address, "NOP", "No operation; PR advanced to the next word."));
    }

    if (instruction.op === "LD") {
      const value = getMemory(next.memory, effective.effectiveAddress);
      next.lastMemoryReadAddress = effective.effectiveAddress;
      next.mdr = value;
      next.gr[instruction.gr!] = value;
      next.pr = word(next.pr + 2);
      next.visualPath = VisualPathKind.LD_MemoryToMdrToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "MAR", "MDR");
      prependTrace(next, traceEvent(next, instruction.address, "LD", `${indexDetail}Memory[${formatWord(effective.effectiveAddress)}] -> MDR -> GR${instruction.gr}`));
    }

    if (instruction.op === "LAD") {
      const value = effective.effectiveAddress;
      next.gr[instruction.gr!] = value;
      next.pr = word(next.pr + 2);
      next.visualPath = VisualPathKind.LAD_AddressToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "MAR");
      prependTrace(next, traceEvent(next, instruction.address, "LAD", `${indexDetail}Effective address ${formatWord(value)} -> GR${instruction.gr}`));
    }

    if (instruction.op === "ADDA") {
      const value = getMemory(next.memory, effective.effectiveAddress);
      const lhs = next.gr[instruction.gr!];
      const result = lhs + value;
      next.lastMemoryReadAddress = effective.effectiveAddress;
      next.mdr = value;
      next.gr[instruction.gr!] = word(result);
      next.fr = setFlagsForArithmeticResult(result, signedAddOverflow(lhs, value, result));
      next.pr = word(next.pr + 2);
      next.visualPath = VisualPathKind.ADDA_GrMdrToAluToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "MAR", "MDR", "FR");
      prependTrace(next, traceEvent(next, instruction.address, "ADDA", `${indexDetail}GR${instruction.gr} + MDR -> ALU -> GR${instruction.gr}`));
    }

    if (instruction.op === "SUBA") {
      const value = getMemory(next.memory, effective.effectiveAddress);
      const lhs = next.gr[instruction.gr!];
      const result = lhs - value;
      next.lastMemoryReadAddress = effective.effectiveAddress;
      next.mdr = value;
      next.gr[instruction.gr!] = word(result);
      next.fr = setFlagsForArithmeticResult(result, signedSubOverflow(lhs, value, result));
      next.pr = word(next.pr + 2);
      next.visualPath = VisualPathKind.SUBA_GrMdrToAluToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "MAR", "MDR", "FR");
      prependTrace(next, traceEvent(next, instruction.address, "SUBA", `${indexDetail}GR${instruction.gr} - MDR -> ALU -> GR${instruction.gr}`));
    }

    if (instruction.op === "ADDL") {
      const value = getMemory(next.memory, effective.effectiveAddress);
      const lhs = next.gr[instruction.gr!];
      const result = lhs + value;
      next.lastMemoryReadAddress = effective.effectiveAddress;
      next.mdr = value;
      next.gr[instruction.gr!] = word(result);
      next.fr = setFlagsForLogicalAdd(lhs, value);
      next.pr = word(next.pr + 2);
      next.visualPath = VisualPathKind.ADDA_GrMdrToAluToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "MAR", "MDR", "FR");
      prependTrace(next, traceEvent(next, instruction.address, "ADDL", `${indexDetail}GR${instruction.gr} + MDR (unsigned) -> ALU -> GR${instruction.gr}`));
    }

    if (instruction.op === "SUBL") {
      const value = getMemory(next.memory, effective.effectiveAddress);
      const lhs = next.gr[instruction.gr!];
      next.lastMemoryReadAddress = effective.effectiveAddress;
      next.mdr = value;
      next.gr[instruction.gr!] = word(lhs - value);
      next.fr = setFlagsForLogicalSub(lhs, value);
      next.pr = word(next.pr + 2);
      next.visualPath = VisualPathKind.SUBA_GrMdrToAluToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "MAR", "MDR", "FR");
      prependTrace(next, traceEvent(next, instruction.address, "SUBL", `${indexDetail}GR${instruction.gr} - MDR (unsigned) -> ALU -> GR${instruction.gr}`));
    }

    if (instruction.op === "AND" || instruction.op === "OR" || instruction.op === "XOR") {
      const value = getMemory(next.memory, effective.effectiveAddress);
      const lhs = next.gr[instruction.gr!];
      const result = instruction.op === "AND" ? lhs & value : instruction.op === "OR" ? lhs | value : lhs ^ value;
      next.lastMemoryReadAddress = effective.effectiveAddress;
      next.mdr = value;
      next.gr[instruction.gr!] = word(result);
      next.fr = setFlagsForLogicalResult(result);
      next.pr = word(next.pr + 2);
      next.visualPath = VisualPathKind.ADDA_GrMdrToAluToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "MAR", "MDR", "FR");
      prependTrace(next, traceEvent(next, instruction.address, instruction.op, `${indexDetail}GR${instruction.gr} ${instruction.op} MDR -> ALU -> GR${instruction.gr}`));
    }

    if (instruction.op === "CPA") {
      const value = getMemory(next.memory, effective.effectiveAddress);
      next.lastMemoryReadAddress = effective.effectiveAddress;
      next.mdr = value;
      next.fr = flagsForCompare(next.gr[instruction.gr!], value);
      next.pr = word(next.pr + 2);
      next.visualPath = VisualPathKind.CPA_GrMdrToAluToFr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push("MAR", "MDR", "FR");
      prependTrace(next, traceEvent(next, instruction.address, "CPA", `${indexDetail}GR${instruction.gr} - MDR -> ALU -> FR`));
    }

    if (instruction.op === "CPL") {
      const value = getMemory(next.memory, effective.effectiveAddress);
      next.lastMemoryReadAddress = effective.effectiveAddress;
      next.mdr = value;
      next.fr = flagsForLogicalCompare(next.gr[instruction.gr!], value);
      next.pr = word(next.pr + 2);
      next.visualPath = VisualPathKind.CPA_GrMdrToAluToFr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push("MAR", "MDR", "FR");
      prependTrace(next, traceEvent(next, instruction.address, "CPL", `${indexDetail}GR${instruction.gr} compared with MDR (unsigned) -> FR`));
    }

    if (SHIFT_OPS.has(instruction.op)) {
      const lhs = next.gr[instruction.gr!];
      const count = effective.effectiveAddress;
      const shifted = shiftValue(instruction.op, lhs, count);
      next.gr[instruction.gr!] = shifted.value;
      next.fr = flagsForShiftResult(shifted.value, shifted.shiftedOut);
      next.pr = word(next.pr + 2);
      next.visualPath = VisualPathKind.Shift_AddressToAluToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "MAR", "FR");
      prependTrace(next, traceEvent(next, instruction.address, instruction.op, `${indexDetail}GR${instruction.gr} shifted by ${formatWord(count)} -> Shifter -> GR${instruction.gr} / FR`));
    }

    if (instruction.op === "PUSH") {
      const spBefore = next.sp;
      const spAfter = word(next.sp - 1);
      const stackValueBefore = getMemory(next.memory, spAfter);
      next.sp = spAfter;
      next.mar = spAfter;
      next.mdr = effective.effectiveAddress;
      next.memory[spAfter] = next.mdr;
      next.lastMemoryWriteAddress = spAfter;
      next.pr = word(next.pr + 2);
      next.visualPath = VisualPathKind.PUSH_EffectiveAddressToStack;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push("SP", "MAR", "MDR");
      next.changedMemoryAddresses = [spAfter];
      const event = traceEvent(
        next,
        instruction.address,
        "PUSH",
        `${indexDetail}EA ${formatWord(effective.effectiveAddress)}; SP: ${formatWord(spBefore)} -> ${formatWord(spAfter)}; MEM[${formatWord(spAfter)}]: ${formatWord(stackValueBefore)} -> ${formatWord(effective.effectiveAddress)}`,
        { before: spBefore, after: spAfter }
      );
      event.changedMemoryValueBefore = stackValueBefore;
      event.changedMemoryValueAfter = effective.effectiveAddress;
      prependTrace(next, event);
    }

    if (instruction.op === "POP") {
      const spBefore = next.sp;
      const value = getMemory(next.memory, spBefore);
      const spAfter = word(next.sp + 1);
      const grBefore = next.gr[instruction.gr!];
      next.mar = spBefore;
      next.lastMemoryReadAddress = spBefore;
      next.mdr = value;
      next.gr[instruction.gr!] = value;
      next.sp = spAfter;
      next.pr = word(next.pr + 1);
      next.visualPath = VisualPathKind.POP_StackToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push("SP", "MAR", "MDR", `GR${instruction.gr}`);
      const event = traceEvent(
        next,
        instruction.address,
        "POP",
        `GR${instruction.gr}: ${formatWord(grBefore)} -> ${formatWord(value)}; SP: ${formatWord(spBefore)} -> ${formatWord(spAfter)}; Read MEM[${formatWord(spBefore)}]`,
        { before: spBefore, after: spAfter }
      );
      event.changedRegisterValueBefore = grBefore;
      event.changedRegisterValueAfter = value;
      event.changedMemoryAddress = spBefore;
      event.changedMemoryValueBefore = value;
      event.changedMemoryValueAfter = value;
      prependTrace(next, event);
    }

    if (instruction.op === "ST") {
      const value = next.gr[instruction.gr!];
      next.mdr = value;
      next.memory[effective.effectiveAddress] = value;
      next.lastMemoryWriteAddress = effective.effectiveAddress;
      next.pr = word(next.pr + 2);
      next.visualPath = VisualPathKind.ST_GrToMdrToMemory;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push("MAR", "MDR");
      next.changedMemoryAddresses = [effective.effectiveAddress];
      prependTrace(next, traceEvent(next, instruction.address, "ST", `${indexDetail}GR${instruction.gr} -> MDR -> Memory[${formatWord(effective.effectiveAddress)}]`));
    }

    if (JUMP_OPS.has(instruction.op)) {
      const taken = isJumpTaken(instruction.op, next.fr);
      next.pr = taken ? effective.effectiveAddress : word(next.pr + 2);
      next.visualPath = instruction.op === "JUMP"
        ? VisualPathKind.Jump_AddressToPr
        : taken
          ? VisualPathKind.ConditionalJump_AddressToPr
          : VisualPathKind.ConditionalJump_NotTaken;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push("MAR");
      prependTrace(next, traceEvent(next, instruction.address, instruction.op, taken ? `${indexDetail}PR <- ${formatWord(effective.effectiveAddress)}` : `${indexDetail}Condition not met; PR advanced`));
    }

    if (instruction.op === "RET") {
      next.runState = "Finished";
      next.visualPath = VisualPathKind.Finished_None;
      next.lastStep.visualPath = next.visualPath;
      prependTrace(next, traceEvent(next, instruction.address, "RET", "Program finished without jumping to an invalid address."));
      next.output.push("Execution finished.");
    }

    next.stepIndex += 1;
    return refreshDerivedState(next);
  },

  reset(state: CometState): CometState {
    const resetState: CometState = {
      ...cloneState(state),
      runState: state.assembled ? "Ready" : "Idle",
      pr: START_ADDRESS,
      sp: 0xfffe,
      ir: 0,
      mar: START_ADDRESS,
      mdr: 0,
      fr: initialFlags(),
      gr: Array.from({ length: 8 }, () => 0),
      trace: [],
      output: state.assembled ? ["Program reset. Entry point: START (0020)"] : [],
      visualPath: state.assembled ? VisualPathKind.Ready_PrToMar : VisualPathKind.None,
      stepIndex: 0,
      lastStep: undefined,
      changedRegisters: [],
      changedMemoryAddresses: [],
      lastMemoryReadAddress: undefined,
      lastMemoryWriteAddress: undefined,
      lastBaseAddress: undefined,
      lastIndexRegister: undefined,
      lastIndexValue: undefined,
      lastEffectiveAddress: undefined
    };

    resetState.memory = state.initialMemory ? { ...state.initialMemory } : { ...state.memory };

    return refreshDerivedState(resetState);
  }
};
