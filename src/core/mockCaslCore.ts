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
import {
  EMPTY_MICROCYCLE_STATE,
  phasesForInstruction,
  type MicrocycleHistoryRecord,
  type MicrocyclePhase
} from "./microcycle";
import { DEFAULT_CASL_SOURCE } from "./defaultSource";
import { normalizeAssemblerDiagnostics, normalizeDiagnostics } from "../diagnostics/catalog";
import { decodeCaslOutputRecord } from "./caslIoEncoding";
import type { ReloadInitializationMode } from "./coreAdapter";
import type { DebuggerMutationTarget } from "../debugger/debuggerMutation";
import {
  EMPTY_MICROCYCLE_HISTORY_SUMMARY,
  EMPTY_REVERSE_AVAILABILITY,
  type ReverseMicrostepResultDto
} from "./reverseMicrocycle";
import {
  EMPTY_REVERSE_INSTRUCTION_AVAILABILITY,
  type ReverseInstructionAvailability,
  type ReverseInstructionResultDto
} from "./reverseInstruction";
import { isDebuggerWord, isValidDebuggerMutationTarget } from "../debugger/debuggerMutation";
import { decodeRuntimeInstruction } from "./instructionEncoding";
import type {
  LinkedWordKind,
  LinkedProgramResult,
  ModuleAssemblyResult,
  ModuleSourceMapping,
  ModuleSymbol,
  ProjectLinkModuleInput,
  RelocationKind,
  RelocationRecord
} from "../linker/types";

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
  "CALL",
  "ST",
  "JUMP",
  "JZE",
  "JNZ",
  "JPL",
  "JMI",
  "JOV",
  "RET",
  "SVC",
  "IN",
  "OUT",
  "RPUSH",
  "RPOP"
]);
type MacroInstructionKind = "IN" | "OUT" | "RPUSH" | "RPOP";
type ParsedOperation = InstructionKind | MacroInstructionKind;
const REGISTER_ADDRESS_OPS = new Set<InstructionKind>(["LD", "LAD", "ADDA", "SUBA", "ADDL", "SUBL", "AND", "OR", "XOR", "CPA", "CPL", "SLA", "SRA", "SLL", "SRL", "ST"]);
const REGISTER_FORM_OPS = new Set<InstructionKind>(["LD", "ADDA", "SUBA", "ADDL", "SUBL", "AND", "OR", "XOR", "CPA", "CPL"]);
const JUMP_OPS = new Set<InstructionKind>(["JUMP", "JZE", "JNZ", "JPL", "JMI", "JOV"]);
const SHIFT_OPS = new Set<InstructionKind>(["SLA", "SRA", "SLL", "SRL"]);
const STACK_ADDRESS_OPS = new Set<InstructionKind>(["PUSH"]);
const CALL_OPS = new Set<InstructionKind>(["CALL"]);
const SYSTEM_ADDRESS_OPS = new Set<InstructionKind>(["SVC"]);

type ParsedLine = {
  line: number;
  raw: string;
  source: string;
  label?: string;
  op?: ParsedOperation;
  unknownOpcode?: string;
  operands: string[];
  parserDiagnostics?: Diagnostic[];
  address?: number;
};

type AssembleArtifacts = {
  memory: Record<number, number>;
  sourceMap: SourceMapEntry[];
  program: AssembledInstruction[];
  symbols: Record<string, number>;
  diagnostics: Diagnostic[];
  entryPoint: number;
  parsedLines: ParsedLine[];
  externalSymbols: ReadonlySet<string>;
};

type AssembleOptions = {
  startAddress?: number;
  allowExternalCalls?: boolean;
};

export interface CaslCore {
  assemble(source: string): CometState;
  step(state: CometState): CometState;
  microStep(state: CometState): CometState;
  reset(state: CometState): CometState;
  reload(state: CometState, mode: ReloadInitializationMode): CometState;
  enqueueInput(state: CometState, words: number[], endOfFile?: boolean): CometState;
  mutate(state: CometState, target: DebuggerMutationTarget, nextWord: number): { state: CometState; previousWord: number; applied: boolean };
  fullClear(): CometState;
}

function initialFlags(): FlagsState {
  return { z: false, n: false, o: false };
}

function cloneState(state: CometState, includeMicrocycleHistory = true): CometState {
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
    consoleOutput: [...state.consoleOutput],
    consoleInputQueue: state.consoleInputQueue?.map((record) => ({ words: [...record.words], endOfFile: record.endOfFile })),
    trace: state.trace.map((event) => ({ ...event })),
    microcycle: { ...state.microcycle },
    microcycleHistory: includeMicrocycleHistory
      ? state.microcycleHistory.map((entry) => ({ ...entry }))
      : [],
    reverseAvailability: { ...state.reverseAvailability },
    reverseInstructionAvailability: { ...state.reverseInstructionAvailability },
    microcycleHistorySummary: { ...state.microcycleHistorySummary },
    program: state.program?.map((instruction) => ({ ...instruction })),
    changedRegisters: [...state.changedRegisters],
    changedMemoryAddresses: [...state.changedMemoryAddresses],
    lastStep: state.lastStep ? { ...state.lastStep } : undefined
  };
}

function stripComment(line: string): string {
  let inCharacterConstant = false;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === "'") {
      if (inCharacterConstant && line[index + 1] === "'") {
        index += 1;
      } else {
        inCharacterConstant = !inCharacterConstant;
      }
    } else if (line[index] === ";" && !inCharacterConstant) {
      return line.slice(0, index).trimEnd();
    }
  }
  return line.trimEnd();
}

function tokenizeCaslLine(source: string): string[] {
  const tokens: string[] = [];
  let token = "";
  let inCharacterConstant = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "'") {
      token += character;
      if (inCharacterConstant && source[index + 1] === "'") {
        token += source[index + 1];
        index += 1;
      } else {
        inCharacterConstant = !inCharacterConstant;
      }
      continue;
    }
    if (!inCharacterConstant && (character === "," || /\s/.test(character))) {
      if (token) {
        tokens.push(token);
        token = "";
      }
      continue;
    }
    token += character;
  }
  if (token) tokens.push(token);
  return tokens;
}

function parseLine(raw: string, index: number): ParsedLine {
  const source = stripComment(raw);
  const trimmedSource = source.trim();
  const parserDiagnostics: Diagnostic[] = [];
  if (hasMalformedStructuralComma(trimmedSource)) {
    parserDiagnostics.push({ line: index + 1, message: "Malformed operand list near comma", severity: "error" });
  }
  const tokens = tokenizeCaslLine(source.trim());

  if (tokens.length === 0) {
    return { line: index + 1, raw, source: raw.trim(), operands: [], parserDiagnostics };
  }

  const first = tokens[0].toUpperCase();
  if (SUPPORTED_OPS.has(first)) {
    return {
      line: index + 1,
      raw,
      source: source.trim(),
      op: first as ParsedOperation,
      operands: tokens.slice(1),
      parserDiagnostics
    };
  }

  const op = tokens[1]?.toUpperCase();
  return {
    line: index + 1,
    raw,
    source: source.trim(),
    label: tokens[0],
    op: SUPPORTED_OPS.has(op) ? (op as ParsedOperation) : undefined,
    unknownOpcode: !SUPPORTED_OPS.has(op) ? tokens[1] : undefined,
    operands: tokens.slice(2),
    parserDiagnostics
  };
}

function hasMalformedStructuralComma(source: string): boolean {
  let inCharacterConstant = false;
  let previousStructuralComma = false;
  let lastNonSpaceWasComma = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "'") {
      if (inCharacterConstant && source[index + 1] === "'") index += 1;
      else inCharacterConstant = !inCharacterConstant;
      previousStructuralComma = false;
      lastNonSpaceWasComma = false;
      continue;
    }
    if (inCharacterConstant) continue;
    if (character === ",") {
      if (previousStructuralComma) return true;
      previousStructuralComma = true;
      lastNonSpaceWasComma = true;
      continue;
    }
    if (!/\s/.test(character)) {
      previousStructuralComma = false;
      lastNonSpaceWasComma = false;
    }
  }
  return lastNonSpaceWasComma;
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

function parseCharacterConstant(token: string): number[] | undefined {
  if (token.length < 2 || !token.startsWith("'") || !token.endsWith("'")) return undefined;
  const words: number[] = [];
  for (let index = 1; index < token.length - 1; index += 1) {
    const character = token[index];
    if (character === "'") {
      if (token[index + 1] !== "'" || index + 1 >= token.length - 1) return undefined;
      words.push(0x27);
      index += 1;
      continue;
    }
    const code = character.codePointAt(0) ?? 0;
    if (code >= 0x20 && code <= 0x7e) {
      words.push(code);
    } else if (code >= 0xff61 && code <= 0xff9f) {
      words.push(0xa1 + (code - 0xff61));
    } else {
      return undefined;
    }
  }
  return words.length ? words : undefined;
}

function parseDcOperand(token: string, symbols?: Record<string, number>): number[] {
  const characters = parseCharacterConstant(token);
  if (characters) return characters;
  if (token.startsWith("'")) throw new Error(`Invalid numeric value: ${token}`);
  if (/^[+-]?\d+$/.test(token)) {
    const value = Number(token);
    if (!Number.isSafeInteger(value)) throw new Error(`Numeric value out of supported range: ${token}`);
    return [word(value)];
  }
  try {
    return [word(parseNumber(token))];
  } catch {
    const address = symbols?.[symbolKey(token)];
    if (address === undefined) throw new Error(`Invalid numeric value: ${token}`);
    return [address];
  }
}

function symbolKey(label: string): string {
  return label.toUpperCase();
}

function isSymbolOperand(token: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_$]*$/.test(token.trim());
}

function instructionSize(line: ParsedLine): number {
  if (line.op && REGISTER_FORM_OPS.has(line.op as InstructionKind) && line.operands.length === 2 && /^GR[0-7]$/i.test(line.operands[1])) return 1;
  if (line.op && (REGISTER_ADDRESS_OPS.has(line.op as InstructionKind) || JUMP_OPS.has(line.op as InstructionKind) || STACK_ADDRESS_OPS.has(line.op as InstructionKind) || CALL_OPS.has(line.op as InstructionKind) || SYSTEM_ADDRESS_OPS.has(line.op as InstructionKind))) return 2;
  if (line.op === "NOP" || line.op === "RET" || line.op === "POP") return 1;
  if (line.op === "DC") {
    if (!line.operands.length) throw new Error("Missing numeric value");
    return line.operands.reduce((count, operand) => count + (parseCharacterConstant(operand)?.length ?? 1), 0);
  }
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

function encodeInstruction(op: AssembledInstruction["op"], gr = 0, indexRegister = 0, registerForm = false): number {
  const registerBits = (gr & 0x0f) << 4;
  const indexBits = indexRegister & 0x0f;
  const registerFormBits = registerForm ? 0x0400 : 0;
  switch (op) {
    case "NOP":
      return 0x0000;
    case "LD":
      return 0x1000 | registerFormBits | registerBits | indexBits;
    case "LAD":
      return 0x1200 | registerBits | indexBits;
    case "ADDA":
      return 0x2000 | registerFormBits | registerBits | indexBits;
    case "SUBA":
      return 0x2100 | registerFormBits | registerBits | indexBits;
    case "ADDL":
      return 0x2200 | registerFormBits | registerBits | indexBits;
    case "SUBL":
      return 0x2300 | registerFormBits | registerBits | indexBits;
    case "AND":
      return 0x3000 | registerFormBits | registerBits | indexBits;
    case "OR":
      return 0x3100 | registerFormBits | registerBits | indexBits;
    case "XOR":
      return 0x3200 | registerFormBits | registerBits | indexBits;
    case "CPA":
      return 0x4000 | registerFormBits | registerBits | indexBits;
    case "CPL":
      return 0x4100 | registerFormBits | registerBits | indexBits;
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
    case "CALL":
      return 0x8000 | indexBits;
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
    case "SVC":
      return 0xf000 | indexBits;
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
  const parsed = source.split(/\r?\n/).map(parseLine).filter((line) => line.op || line.label);
  const expanded: ParsedLine[] = [];
  const literals: ParsedLine[] = [];
  let literalIndex = 0;
  const usedLabels = new Set(parsed.flatMap((line) => line.label ? [symbolKey(line.label)] : []));

  const expandedInstruction = (
    line: ParsedLine,
    op: InstructionKind,
    operands: string[],
    label?: string
  ): ParsedLine => ({
    ...line,
    label,
    op,
    operands,
    unknownOpcode: undefined,
    parserDiagnostics: label === line.label ? line.parserDiagnostics : []
  });

  for (const line of parsed) {
    if (line.op === "RPUSH") {
      if (line.operands.length !== 0) {
        expanded.push(line);
        continue;
      }
      for (let register = 1; register <= 7; register += 1) {
        expanded.push(expandedInstruction(line, "PUSH", ["0", `GR${register}`], register === 1 ? line.label : undefined));
      }
      continue;
    }
    if (line.op === "RPOP") {
      if (line.operands.length !== 0) {
        expanded.push(line);
        continue;
      }
      for (let register = 7; register >= 1; register -= 1) {
        expanded.push(expandedInstruction(line, "POP", [`GR${register}`], register === 7 ? line.label : undefined));
      }
      continue;
    }
    if (line.op === "IN" || line.op === "OUT") {
      if (line.operands.length !== 2) {
        expanded.push(line);
        continue;
      }
      const service = line.op === "IN" ? "1" : "2";
      const macroLines: Array<[InstructionKind, string[]]> = [
        ["PUSH", ["0", "GR1"]],
        ["PUSH", ["0", "GR2"]],
        ["LAD", ["GR1", line.operands[0]]],
        ["LAD", ["GR2", line.operands[1]]],
        ["SVC", [service]],
        ["POP", ["GR2"]],
        ["POP", ["GR1"]]
      ];
      macroLines.forEach(([op, operands], index) => {
        expanded.push(expandedInstruction(line, op, operands, index === 0 ? line.label : undefined));
      });
      continue;
    }

    const next = { ...line, operands: [...line.operands] };
    next.operands = next.operands.map((operand) => {
      if (!operand.startsWith("=")) return operand;
      if (operand.length === 1) return operand;
      let literalLabel: string;
      do {
        literalIndex += 1;
        literalLabel = `STL${literalIndex.toString().padStart(5, "0")}`;
      } while (usedLabels.has(symbolKey(literalLabel)));
      usedLabels.add(symbolKey(literalLabel));
      literals.push({
        line: line.line,
        raw: line.raw,
        source: line.source,
        label: literalLabel,
        op: "DC",
        operands: [operand.slice(1)]
      });
      return literalLabel;
    });
    expanded.push(next);
  }

  const endIndex = expanded.findIndex((line) => line.op === "END");
  if (endIndex >= 0) expanded.splice(endIndex, 0, ...literals);
  else expanded.push(...literals);
  return expanded;
}

function assembleArtifacts(source: string, options: AssembleOptions = {}): AssembleArtifacts {
  const lines = parseProgram(source);
  const diagnostics: Diagnostic[] = [];
  const symbols: Record<string, number> = {};
  const memory: Record<number, number> = {};
  const sourceMap: SourceMapEntry[] = [];
  const program: AssembledInstruction[] = [];
  const startAddress = options.startAddress ?? START_ADDRESS;
  let address = startAddress;
  let entryPoint = startAddress;

  const directiveLine = lines[0]?.line ?? 0;
  for (const line of lines) {
    diagnostics.push(...(line.parserDiagnostics ?? []));
  }
  const startLines = lines.filter((line) => line.op === "START");
  const endLines = lines.filter((line) => line.op === "END");
  if (startLines.length === 0) {
    diagnostics.push({ line: directiveLine, message: "CASL source must contain START directive", severity: "error" });
  } else {
    if (startLines.length > 1) {
      startLines.slice(1).forEach((line) => diagnostics.push({ line: line.line, message: "CASL source must contain exactly one START directive", severity: "error" }));
    }
    if (lines[0]?.op !== "START") {
      diagnostics.push({ line: startLines[0].line, message: "START must be the first program directive", severity: "error" });
    }
    if (startLines[0].operands.length > 1) {
      diagnostics.push({ line: startLines[0].line, message: "START accepts at most one entry label", severity: "error" });
    }
  }
  if (endLines.length === 0) {
    diagnostics.push({ line: directiveLine, message: "CASL source must contain END directive", severity: "error" });
  } else {
    if (endLines.length > 1) {
      endLines.slice(1).forEach((line) => diagnostics.push({ line: line.line, message: "CASL source must contain exactly one END directive", severity: "error" }));
    }
    if (lines[lines.length - 1]?.op !== "END") {
      diagnostics.push({ line: endLines[0].line, message: "END must be the final non-comment directive", severity: "error" });
    }
    if (endLines[0].operands.length > 0) {
      diagnostics.push({ line: endLines[0].line, message: "END does not accept operands", severity: "error" });
    }
  }

  for (const line of lines) {
    if (!line.op) {
      diagnostics.push({
        line: line.line,
        message: line.unknownOpcode ? `Unknown opcode: ${line.unknownOpcode}` : "Unsupported or missing operation",
        severity: "error"
      });
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
      line.address = startAddress;
      if (line.label && !Object.prototype.hasOwnProperty.call(symbols, symbolKey(line.label))) symbols[symbolKey(line.label)] = startAddress;
      address = startAddress;
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

  const externalSymbols = new Set<string>();
  if (options.allowExternalCalls) {
    for (const line of lines) {
      if (line.op !== "CALL") continue;
      const operand = line.operands[0];
      if (!operand || !isSymbolOperand(operand)) continue;
      const normalized = symbolKey(operand);
      if (!Object.prototype.hasOwnProperty.call(symbols, normalized)) {
        externalSymbols.add(normalized);
        symbols[normalized] = 0;
      }
    }
  }

  address = startAddress;
  for (const line of lines) {
    if (!line.op || line.op === "START" || line.op === "END") continue;
    const sourceText = line.source || line.raw.trim();

    if (line.op === "IN" || line.op === "OUT" || line.op === "RPUSH" || line.op === "RPOP") {
      diagnostics.push({ line: line.line, message: `Invalid operands for macro instruction ${line.op}`, severity: "error" });
      continue;
    }

    if (line.op && REGISTER_ADDRESS_OPS.has(line.op as InstructionKind)) {
      try {
        const op = line.op as AssembledInstruction["op"];
        if (line.operands.length < 2) throw new Error(`${line.op} requires register and address operands`);
        if (line.operands.length > 3) throw new Error(`${line.op} has too many operands`);
        const gr = registerNumber(line.operands[0] ?? "");
        const operand = line.operands[1];
        if (REGISTER_FORM_OPS.has(op) && /^GR[0-7]$/i.test(operand)) {
          if (line.operands.length !== 2) throw new Error(`${line.op} register form requires exactly two registers`);
          const sourceRegister = registerNumber(operand);
          const machine = encodeInstruction(op, gr, sourceRegister, true);
          memory[address] = machine;
          sourceMap.push({
            line: line.line,
            address,
            machineWords: [machine],
            source: sourceText,
            label: line.label,
            instruction: op
          });
          program.push({ address, line: line.line, op, source: sourceText, size: 1, gr, sourceRegister });
          address += 1;
          continue;
        }
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

    if (line.op && JUMP_OPS.has(line.op as InstructionKind)) {
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

    if (line.op === "CALL") {
      try {
        const op = line.op;
        if (line.operands.length < 1) throw new Error("CALL requires an address operand");
        if (line.operands.length > 2) throw new Error("CALL has too many operands");
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

    if (line.op === "SVC") {
      try {
        if (line.operands.length < 1) throw new Error("SVC requires an address operand");
        if (line.operands.length > 2) throw new Error("SVC has too many operands");
        const operand = line.operands[0];
        const indexRegister = parseOptionalIndexOperand(line.operands[1]);
        const operandAddress = resolveAddressOperand(operand, symbols);
        const machine = encodeInstruction("SVC", 0, indexRegister ?? 0);
        memory[address] = machine;
        memory[address + 1] = operandAddress;
        sourceMap.push({
          line: line.line,
          address,
          machineWords: [machine, operandAddress],
          source: sourceText,
          label: line.label,
          instruction: "SVC"
        });
        program.push({
          address,
          line: line.line,
          op: "SVC",
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
      try {
        if (!line.operands.length) throw new Error("DC requires at least one operand");
        const machineWords = line.operands.flatMap((valueToken) => parseDcOperand(valueToken, symbols));
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
        address += machineWords.length;
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

  const startLine = lines.find((line) => line.op === "START");
  if (startLine?.operands[0]) {
    try {
      entryPoint = resolveAddressOperand(startLine.operands[0], symbols);
    } catch (error) {
      diagnostics.push({ line: startLine.line, message: (error as Error).message, severity: "error" });
    }
  }

  for (const external of externalSymbols) delete symbols[external];
  return {
    memory,
    sourceMap,
    program,
    symbols,
    entryPoint,
    diagnostics: normalizeAssemblerDiagnostics(diagnostics, source),
    parsedLines: lines,
    externalSymbols
  };
}

function tokenSourceRange(line: ParsedLine, token: string) {
  const columnIndex = Math.max(0, line.raw.toUpperCase().indexOf(token.toUpperCase()));
  return {
    start: { line: line.line, column: columnIndex + 1 },
    end: { line: line.line, column: columnIndex + token.length + 1 }
  };
}

function relocationKindKey(kind: RelocationKind): string {
  if (kind === "call-target") return "call";
  if (kind === "data-address-constant") return "data";
  return "address";
}

function wordKindsForModule(
  artifacts: AssembleArtifacts,
  originalLabels: ReadonlySet<string>
): LinkedWordKind[] {
  const kinds = Array.from({ length: Math.max(0, ...artifacts.sourceMap.map(
    (mapping) => mapping.address + mapping.machineWords.length
  )) }, () => "storage" as LinkedWordKind);
  for (const mapping of artifacts.sourceMap) {
    let kind: LinkedWordKind = "instruction";
    if (mapping.instruction === "DC") {
      kind = mapping.label && !originalLabels.has(symbolKey(mapping.label)) ? "literal" : "data";
    } else if (mapping.instruction === "DS") {
      kind = "storage";
    }
    mapping.machineWords.forEach((_word, offset) => {
      kinds[mapping.address + offset] = offset > 0 && kind === "instruction" ? "operand" : kind;
    });
  }
  return kinds;
}

export function assembleMockModule(input: ProjectLinkModuleInput): ModuleAssemblyResult {
  const originalLines = input.source.split(/\r?\n/).map(parseLine);
  const originalLabels = new Set(
    originalLines.flatMap((line) => line.label ? [symbolKey(line.label)] : [])
  );
  const artifacts = assembleArtifacts(input.source, { startAddress: 0, allowExternalCalls: true });
  const startLine = artifacts.parsedLines.find((line) => line.op === "START");
  const programName = startLine?.label ?? "";
  const symbols: ModuleSymbol[] = [];
  const seenSymbols = new Set<string>();

  for (const line of artifacts.parsedLines) {
    if (!line.label) continue;
    const normalizedName = symbolKey(line.label);
    if (seenSymbols.has(normalizedName)) continue;
    const relativeAddress = artifacts.symbols[normalizedName];
    if (relativeAddress === undefined) continue;
    seenSymbols.add(normalizedName);
    const generated = !originalLabels.has(normalizedName);
    symbols.push({
      symbolId: `symbol:${normalizedName}`,
      moduleId: input.moduleId,
      name: line.label,
      normalizedName,
      scope: line.op === "START"
        ? "module-exported"
        : generated ? "generated-private" : "module-local",
      relativeAddress,
      definitionRange: tokenSourceRange(line, line.label),
      kind: line.op === "START"
        ? "program"
        : generated ? "literal"
          : line.op === "DC" ? "data" : line.op === "DS" ? "data" : "label"
    });
  }

  const localSymbols = new Set(Object.keys(artifacts.symbols));
  const relocations: RelocationRecord[] = [];
  const appendRelocation = (
    line: ParsedLine,
    wordOffset: number,
    kind: RelocationKind,
    token: string
  ) => {
    const normalizedName = symbolKey(token);
    const external = artifacts.externalSymbols.has(normalizedName);
    if (!localSymbols.has(normalizedName) && !external) return;
    relocations.push({
      relocationId: `reloc:${wordOffset}:${relocationKindKey(kind)}:${normalizedName}`,
      moduleId: input.moduleId,
      moduleAssemblyId: input.moduleAssemblyId,
      wordOffset,
      kind,
      symbolName: token,
      normalizedSymbolName: normalizedName,
      addend: 0,
      sourceRange: tokenSourceRange(line, token),
      instructionIdentity: line.op ? `${line.op}:${line.line}:${line.address ?? 0}` : undefined,
      external
    });
  };

  for (const line of artifacts.parsedLines) {
    if (!line.op) continue;
    if (REGISTER_ADDRESS_OPS.has(line.op as InstructionKind)) {
      if (line.operands.length < 2) continue;
      if (REGISTER_FORM_OPS.has(line.op as InstructionKind) && /^GR[0-7]$/i.test(line.operands[1])) continue;
      if (isSymbolOperand(line.operands[1])) {
        appendRelocation(line, (line.address ?? 0) + 1, "absolute-address-word", line.operands[1]);
      }
      continue;
    }
    if (
      JUMP_OPS.has(line.op as InstructionKind)
      || STACK_ADDRESS_OPS.has(line.op as InstructionKind)
      || CALL_OPS.has(line.op as InstructionKind)
      || SYSTEM_ADDRESS_OPS.has(line.op as InstructionKind)
    ) {
      const operand = line.operands[0];
      if (operand && isSymbolOperand(operand)) {
        appendRelocation(
          line,
          (line.address ?? 0) + 1,
          line.op === "CALL" ? "call-target" : "absolute-address-word",
          operand
        );
      }
      continue;
    }
    if (line.op !== "DC") continue;
    let wordOffset = line.address ?? 0;
    for (const operand of line.operands) {
      const characters = parseCharacterConstant(operand);
      if (characters) {
        wordOffset += characters.length;
        continue;
      }
      if (isSymbolOperand(operand)) {
        appendRelocation(line, wordOffset, "data-address-constant", operand);
      }
      wordOffset += 1;
    }
  }

  const moduleSize = Math.max(
    0,
    ...artifacts.sourceMap.map((mapping) => mapping.address + mapping.machineWords.length)
  );
  const sourceMappings: ModuleSourceMapping[] = artifacts.sourceMap.map((mapping) => ({
    ...mapping,
    machineWords: [...mapping.machineWords],
    mappingId: `${input.moduleId}:line:${mapping.line}:offset:${mapping.address}`,
    moduleId: input.moduleId,
    sourceUnitId: input.sourceUnitId
  }));
  const instructions = artifacts.program.map((instruction) => ({
    ...instruction,
    moduleId: input.moduleId,
    sourceUnitId: input.sourceUnitId,
    sourceMappingId: `${input.moduleId}:line:${instruction.line}:offset:${instruction.address}`
  }));

  return {
    ok: artifacts.diagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    moduleId: input.moduleId,
    sourceUnitId: input.sourceUnitId,
    moduleAssemblyId: input.moduleAssemblyId,
    programName,
    requestedEntrySymbol: startLine?.operands[0],
    localSymbols: symbols,
    exportedSymbols: symbols.filter((symbol): symbol is ModuleSymbol & { scope: "module-exported" } =>
      symbol.scope === "module-exported"
    ),
    unresolvedReferences: relocations.filter((relocation) => relocation.external),
    relocations,
    words: Array.from({ length: moduleSize }, (_unused, offset) => artifacts.memory[offset] ?? 0),
    wordKinds: wordKindsForModule(artifacts, originalLabels),
    instructions,
    sourceMappings,
    moduleSize,
    entryOffset: artifacts.entryPoint,
    diagnostics: artifacts.diagnostics
  };
}

export function createMockStateFromLinkedProgram(link: LinkedProgramResult): CometState {
  const memory: Record<number, number> = {};
  link.words.forEach((value, offset) => {
    memory[START_ADDRESS + offset] = word(value);
  });
  const symbols: Record<string, number> = {};
  for (const symbol of link.exportedSymbols) {
    symbols[`${symbol.moduleId}.${symbol.normalizedName}`.toUpperCase()] = symbol.address;
    if (symbol.scope === "module-exported") symbols[symbol.normalizedName] = symbol.address;
  }
  const state = createState({
    memory,
    sourceMap: link.sourceMappings.map((mapping) => ({
      line: mapping.line,
      address: mapping.address,
      machineWords: [...mapping.machineWords],
      source: mapping.source,
      label: mapping.label,
      instruction: mapping.instruction,
      moduleId: mapping.moduleId,
      sourceUnitId: mapping.sourceUnitId,
      sourceMappingId: mapping.mappingId
    })),
    program: link.instructions.map((instruction) => ({ ...instruction })),
    symbols,
    diagnostics: [...link.diagnostics],
    entryPoint: link.entryPoint,
    parsedLines: [],
    externalSymbols: new Set<string>()
  });
  return {
    ...state,
    projectId: link.projectId,
    linkId: link.linkId,
    linkRevision: link.linkRevision
  };
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
    n: (result & 0x8000) !== 0,
    o: overflow
  };
}

function setFlagsForLogicalResult(value: number): FlagsState {
  const result = word(value);
  return {
    z: result === 0,
    n: (result & 0x8000) !== 0,
    o: false
  };
}

function setFlagsForLogicalAdd(lhs: number, rhs: number): FlagsState {
  const result = lhs + rhs;
  const carry = result > 0xffff;
  return {
    z: word(result) === 0,
    n: (word(result) & 0x8000) !== 0,
    o: carry
  };
}

function setFlagsForLogicalSub(lhs: number, rhs: number): FlagsState {
  const borrow = lhs < rhs;
  const result = word(lhs - rhs);
  return {
    z: result === 0,
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
    n: diff < 0,
    o: false
  };
}

function flagsForLogicalCompare(lhs: number, rhs: number): FlagsState {
  return {
    z: word(lhs) === word(rhs),
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
  const normalized = word(address);
  const original = state.program?.find((instruction) => instruction.address === normalized);
  if (!original) return undefined;
  return decodeRuntimeInstruction(
    normalized,
    getMemory(state.memory, normalized),
    getMemory(state.memory, word(normalized + 1)),
    original
  );
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
      value: (state.fr.o ? 0b100 : 0) | (state.fr.n ? 0b010 : 0) | (state.fr.z ? 0b001 : 0),
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
  const diagnostics = normalizeDiagnostics(artifacts.diagnostics);
  const hasErrors = diagnostics.some((diagnostic) => diagnostic.severity === "error");
  const state: CometState = {
    assembled: !hasErrors,
    runState: hasErrors ? "Error" : "Ready",
    entryPoint: artifacts.entryPoint,
    pr: artifacts.entryPoint,
    sp: 0xfffe,
    callDepth: 0,
    ir: 0,
    mar: artifacts.entryPoint,
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
      : ["Assemble succeeded. (0 errors, 0 warnings)", `Program loaded. Entry point: ${formatWord(artifacts.entryPoint)}`],
    consoleOutput: [],
    consoleInputQueue: [],
    trace: [],
    visualPath: hasErrors ? VisualPathKind.None : VisualPathKind.Ready_PrToMar,
    executionGranularity: "instruction",
    microcycle: { ...EMPTY_MICROCYCLE_STATE },
    microcycleHistory: [],
    historyEpoch: 1,
    timelineRevision: 1,
    reverseAvailability: { available: false, reason: "assembly-boundary" },
    reverseInstructionAvailability: {
      ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY,
      reason: "assembly-boundary"
    },
    microcycleHistorySummary: { ...EMPTY_MICROCYCLE_HISTORY_SUMMARY },
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
    entryPoint: START_ADDRESS,
    pr: START_ADDRESS,
    sp: 0xfffe,
    callDepth: 0,
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
    consoleOutput: [],
    consoleInputQueue: [],
    trace: [],
    visualPath: VisualPathKind.None,
    executionGranularity: "instruction",
    microcycle: { ...EMPTY_MICROCYCLE_STATE },
    microcycleHistory: [],
    historyEpoch: 0,
    timelineRevision: 0,
    reverseAvailability: { ...EMPTY_REVERSE_AVAILABILITY },
    reverseInstructionAvailability: { ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY },
    microcycleHistorySummary: { ...EMPTY_MICROCYCLE_HISTORY_SUMMARY },
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
  stackPointerChange?: { before: number; after: number },
  callChange?: { before: number; after: number; returnAddress?: number }
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
    callDepthBefore: callChange?.before,
    callDepthAfter: callChange?.after,
    returnAddress: callChange?.returnAddress,
    stackAddress: state.lastMemoryWriteAddress ?? (instruction === "RET" || instruction === "POP" ? state.lastMemoryReadAddress : undefined),
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

const mockCaslCoreReference: Omit<CaslCore, "microStep"> = {
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
    next.mar = instruction.address;
    const effective = effectiveAddressFor(next, instruction);
    const indexDetail = formatIndexDetail(effective);
    if (instruction.operandAddress !== undefined) {
      next.mar = effective.effectiveAddress;
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
      const registerForm = instruction.sourceRegister !== undefined;
      const value = registerForm ? next.gr[instruction.sourceRegister!] : getMemory(next.memory, effective.effectiveAddress);
      if (!registerForm) {
        next.lastMemoryReadAddress = effective.effectiveAddress;
        next.mdr = value;
      }
      next.gr[instruction.gr!] = value;
      next.fr = setFlagsForLogicalResult(value);
      next.pr = word(next.pr + instruction.size);
      next.visualPath = registerForm ? VisualPathKind.None : VisualPathKind.LD_MemoryToMdrToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "FR", ...(registerForm ? [] : ["MAR", "MDR"]));
      prependTrace(next, traceEvent(
        next,
        instruction.address,
        "LD",
        registerForm
          ? `GR${instruction.sourceRegister} -> GR${instruction.gr}; FR updated`
          : `${indexDetail}Memory[${formatWord(effective.effectiveAddress)}] -> MDR -> GR${instruction.gr}; FR updated`
      ));
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
      const registerForm = instruction.sourceRegister !== undefined;
      const value = registerForm ? next.gr[instruction.sourceRegister!] : getMemory(next.memory, effective.effectiveAddress);
      const lhs = next.gr[instruction.gr!];
      const result = lhs + value;
      if (!registerForm) {
        next.lastMemoryReadAddress = effective.effectiveAddress;
        next.mdr = value;
      }
      next.gr[instruction.gr!] = word(result);
      next.fr = setFlagsForArithmeticResult(result, signedAddOverflow(lhs, value, result));
      next.pr = word(next.pr + instruction.size);
      next.visualPath = registerForm ? VisualPathKind.None : VisualPathKind.ADDA_GrMdrToAluToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "FR", ...(registerForm ? [] : ["MAR", "MDR"]));
      prependTrace(next, traceEvent(next, instruction.address, "ADDA", registerForm
        ? `GR${instruction.gr} + GR${instruction.sourceRegister} -> GR${instruction.gr} / FR`
        : `${indexDetail}GR${instruction.gr} + MDR -> ALU -> GR${instruction.gr}`));
    }

    if (instruction.op === "SUBA") {
      const registerForm = instruction.sourceRegister !== undefined;
      const value = registerForm ? next.gr[instruction.sourceRegister!] : getMemory(next.memory, effective.effectiveAddress);
      const lhs = next.gr[instruction.gr!];
      const result = lhs - value;
      if (!registerForm) {
        next.lastMemoryReadAddress = effective.effectiveAddress;
        next.mdr = value;
      }
      next.gr[instruction.gr!] = word(result);
      next.fr = setFlagsForArithmeticResult(result, signedSubOverflow(lhs, value, result));
      next.pr = word(next.pr + instruction.size);
      next.visualPath = registerForm ? VisualPathKind.None : VisualPathKind.SUBA_GrMdrToAluToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "FR", ...(registerForm ? [] : ["MAR", "MDR"]));
      prependTrace(next, traceEvent(next, instruction.address, "SUBA", registerForm
        ? `GR${instruction.gr} - GR${instruction.sourceRegister} -> GR${instruction.gr} / FR`
        : `${indexDetail}GR${instruction.gr} - MDR -> ALU -> GR${instruction.gr}`));
    }

    if (instruction.op === "ADDL") {
      const registerForm = instruction.sourceRegister !== undefined;
      const value = registerForm ? next.gr[instruction.sourceRegister!] : getMemory(next.memory, effective.effectiveAddress);
      const lhs = next.gr[instruction.gr!];
      const result = lhs + value;
      if (!registerForm) {
        next.lastMemoryReadAddress = effective.effectiveAddress;
        next.mdr = value;
      }
      next.gr[instruction.gr!] = word(result);
      next.fr = setFlagsForLogicalAdd(lhs, value);
      next.pr = word(next.pr + instruction.size);
      next.visualPath = registerForm ? VisualPathKind.None : VisualPathKind.ADDA_GrMdrToAluToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "FR", ...(registerForm ? [] : ["MAR", "MDR"]));
      prependTrace(next, traceEvent(next, instruction.address, "ADDL", registerForm
        ? `GR${instruction.gr} + GR${instruction.sourceRegister} (unsigned) -> GR${instruction.gr} / FR`
        : `${indexDetail}GR${instruction.gr} + MDR (unsigned) -> ALU -> GR${instruction.gr}`));
    }

    if (instruction.op === "SUBL") {
      const registerForm = instruction.sourceRegister !== undefined;
      const value = registerForm ? next.gr[instruction.sourceRegister!] : getMemory(next.memory, effective.effectiveAddress);
      const lhs = next.gr[instruction.gr!];
      if (!registerForm) {
        next.lastMemoryReadAddress = effective.effectiveAddress;
        next.mdr = value;
      }
      next.gr[instruction.gr!] = word(lhs - value);
      next.fr = setFlagsForLogicalSub(lhs, value);
      next.pr = word(next.pr + instruction.size);
      next.visualPath = registerForm ? VisualPathKind.None : VisualPathKind.SUBA_GrMdrToAluToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "FR", ...(registerForm ? [] : ["MAR", "MDR"]));
      prependTrace(next, traceEvent(next, instruction.address, "SUBL", registerForm
        ? `GR${instruction.gr} - GR${instruction.sourceRegister} (unsigned) -> GR${instruction.gr} / FR`
        : `${indexDetail}GR${instruction.gr} - MDR (unsigned) -> ALU -> GR${instruction.gr}`));
    }

    if (instruction.op === "AND" || instruction.op === "OR" || instruction.op === "XOR") {
      const registerForm = instruction.sourceRegister !== undefined;
      const value = registerForm ? next.gr[instruction.sourceRegister!] : getMemory(next.memory, effective.effectiveAddress);
      const lhs = next.gr[instruction.gr!];
      const result = instruction.op === "AND" ? lhs & value : instruction.op === "OR" ? lhs | value : lhs ^ value;
      if (!registerForm) {
        next.lastMemoryReadAddress = effective.effectiveAddress;
        next.mdr = value;
      }
      next.gr[instruction.gr!] = word(result);
      next.fr = setFlagsForLogicalResult(result);
      next.pr = word(next.pr + instruction.size);
      next.visualPath = registerForm ? VisualPathKind.None : VisualPathKind.ADDA_GrMdrToAluToGr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push(`GR${instruction.gr}`, "FR", ...(registerForm ? [] : ["MAR", "MDR"]));
      prependTrace(next, traceEvent(next, instruction.address, instruction.op, registerForm
        ? `GR${instruction.gr} ${instruction.op} GR${instruction.sourceRegister} -> GR${instruction.gr} / FR`
        : `${indexDetail}GR${instruction.gr} ${instruction.op} MDR -> ALU -> GR${instruction.gr}`));
    }

    if (instruction.op === "CPA") {
      const registerForm = instruction.sourceRegister !== undefined;
      const value = registerForm ? next.gr[instruction.sourceRegister!] : getMemory(next.memory, effective.effectiveAddress);
      if (!registerForm) {
        next.lastMemoryReadAddress = effective.effectiveAddress;
        next.mdr = value;
      }
      next.fr = flagsForCompare(next.gr[instruction.gr!], value);
      next.pr = word(next.pr + instruction.size);
      next.visualPath = registerForm ? VisualPathKind.None : VisualPathKind.CPA_GrMdrToAluToFr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push("FR", ...(registerForm ? [] : ["MAR", "MDR"]));
      prependTrace(next, traceEvent(next, instruction.address, "CPA", registerForm
        ? `GR${instruction.gr} - GR${instruction.sourceRegister} -> FR`
        : `${indexDetail}GR${instruction.gr} - MDR -> ALU -> FR`));
    }

    if (instruction.op === "CPL") {
      const registerForm = instruction.sourceRegister !== undefined;
      const value = registerForm ? next.gr[instruction.sourceRegister!] : getMemory(next.memory, effective.effectiveAddress);
      if (!registerForm) {
        next.lastMemoryReadAddress = effective.effectiveAddress;
        next.mdr = value;
      }
      next.fr = flagsForLogicalCompare(next.gr[instruction.gr!], value);
      next.pr = word(next.pr + instruction.size);
      next.visualPath = registerForm ? VisualPathKind.None : VisualPathKind.CPA_GrMdrToAluToFr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push("FR", ...(registerForm ? [] : ["MAR", "MDR"]));
      prependTrace(next, traceEvent(next, instruction.address, "CPL", registerForm
        ? `GR${instruction.gr} compared with GR${instruction.sourceRegister} (unsigned) -> FR`
        : `${indexDetail}GR${instruction.gr} compared with MDR (unsigned) -> FR`));
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
      next.changedRegisters.push("PR", "SP", "MAR", "MDR");
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

    if (instruction.op === "CALL") {
      const spBefore = next.sp;
      const spAfter = word(next.sp - 1);
      const stackValueBefore = getMemory(next.memory, spAfter);
      const returnAddress = word(instruction.address + 2);
      const callDepthBefore = next.callDepth;
      next.sp = spAfter;
      next.mar = spAfter;
      next.mdr = returnAddress;
      next.memory[spAfter] = returnAddress;
      next.lastMemoryWriteAddress = spAfter;
      next.pr = effective.effectiveAddress;
      next.callDepth = callDepthBefore + 1;
      next.visualPath = VisualPathKind.CALL_ReturnAddressToStackAndPr;
      next.lastStep.visualPath = next.visualPath;
      next.changedRegisters.push("SP", "MAR", "MDR");
      next.changedMemoryAddresses = [spAfter];
      const event = traceEvent(
        next,
        instruction.address,
        "CALL",
        `${indexDetail}return: ${formatWord(returnAddress)}; target: ${formatWord(effective.effectiveAddress)}; SP: ${formatWord(spBefore)} -> ${formatWord(spAfter)}; MEM[${formatWord(spAfter)}]: ${formatWord(stackValueBefore)} -> ${formatWord(returnAddress)}; callDepth: ${callDepthBefore} -> ${next.callDepth}`,
        { before: spBefore, after: spAfter },
        { before: callDepthBefore, after: next.callDepth, returnAddress }
      );
      event.changedMemoryValueBefore = stackValueBefore;
      event.changedMemoryValueAfter = returnAddress;
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

    if (instruction.op === "SVC") {
      const service = effective.effectiveAddress;
      if (service === 1) {
        const record = next.consoleInputQueue?.shift();
        if (!record) {
          next.runState = "WaitingInput";
          next.visualPath = VisualPathKind.None;
          next.lastStep.visualPath = next.visualPath;
          prependTrace(next, traceEvent(next, instruction.address, "SVC", "Input service waiting for one record."));
          return refreshDerivedState(next);
        }
        const area = next.gr[1];
        const lengthArea = next.gr[2];
        next.changedMemoryAddresses = [];
        if (record.endOfFile) {
          next.memory[lengthArea] = 0xffff;
          next.changedMemoryAddresses.push(lengthArea);
          next.mdr = 0xffff;
        } else {
          const words = record.words.slice(0, 256);
          words.forEach((value, index) => {
            const target = word(area + index);
            next.memory[target] = value & 0xff;
            next.changedMemoryAddresses.push(target);
          });
          next.memory[lengthArea] = words.length;
          next.changedMemoryAddresses.push(lengthArea);
          next.mdr = words.length;
        }
        next.lastMemoryWriteAddress = lengthArea;
        next.fr = initialFlags();
        next.runState = "Ready";
        next.changedRegisters.push("MAR", "MDR", "FR");
        prependTrace(next, traceEvent(next, instruction.address, "SVC", record.endOfFile
          ? `Input EOF; Memory[${formatWord(lengthArea)}] <- FFFF`
          : `Input ${record.words.slice(0, 256).length} character(s) at ${formatWord(area)}; length stored at ${formatWord(lengthArea)}`));
      } else if (service === 2) {
        const area = next.gr[1];
        const lengthArea = next.gr[2];
        const count = Math.min(256, getMemory(next.memory, lengthArea));
        const words = Array.from({ length: count }, (_, index) => getMemory(next.memory, word(area + index)) & 0xff);
        next.consoleOutput.push(decodeCaslOutputRecord(words));
        if (next.consoleOutput.length > 256) next.consoleOutput.shift();
        next.lastMemoryReadAddress = lengthArea;
        next.mdr = getMemory(next.memory, lengthArea);
        next.fr = initialFlags();
        next.changedRegisters.push("MAR", "MDR", "FR");
        prependTrace(next, traceEvent(next, instruction.address, "SVC", `Output ${count} character(s) from ${formatWord(area)}.`));
      } else {
        next.runState = "Error";
        next.output.push(`Unsupported SVC service ${formatWord(service)}.`);
        return refreshDerivedState(next);
      }
      next.pr = word(next.pr + 2);
      next.visualPath = VisualPathKind.None;
      next.lastStep.visualPath = next.visualPath;
    }

    if (instruction.op === "RET") {
      if (next.callDepth > 0) {
        const spBefore = next.sp;
        const returnAddress = getMemory(next.memory, spBefore);
        const spAfter = word(next.sp + 1);
        const callDepthBefore = next.callDepth;
        next.mar = spBefore;
        next.lastMemoryReadAddress = spBefore;
        next.mdr = returnAddress;
        next.sp = spAfter;
        next.pr = returnAddress;
        next.callDepth = Math.max(0, callDepthBefore - 1);
        next.visualPath = VisualPathKind.RET_StackToPr;
        next.lastStep.visualPath = next.visualPath;
        next.changedRegisters.push("PR", "SP", "MAR", "MDR");
        const event = traceEvent(
          next,
          instruction.address,
          "RET",
          `RET stack return; PR <- MEM[${formatWord(spBefore)}] = ${formatWord(returnAddress)}; SP: ${formatWord(spBefore)} -> ${formatWord(spAfter)}; callDepth: ${callDepthBefore} -> ${next.callDepth}`,
          { before: spBefore, after: spAfter },
          { before: callDepthBefore, after: next.callDepth, returnAddress }
        );
        event.changedMemoryAddress = spBefore;
        event.changedMemoryValueBefore = returnAddress;
        event.changedMemoryValueAfter = returnAddress;
        event.stackAddress = spBefore;
        prependTrace(next, event);
      } else {
        next.runState = "Finished";
        next.visualPath = VisualPathKind.Finished_None;
        next.lastStep.visualPath = next.visualPath;
        prependTrace(next, traceEvent(next, instruction.address, "RET", "RET program finish; no active call frame."));
        next.output.push("Execution finished.");
      }
    }

    next.stepIndex += 1;
    return refreshDerivedState(next);
  },

  reset(state: CometState): CometState {
    const resetState: CometState = {
      ...cloneState(state),
      runState: state.assembled ? "Ready" : "Idle",
      pr: state.entryPoint ?? START_ADDRESS,
      sp: 0xfffe,
      callDepth: 0,
      ir: 0,
      mar: state.entryPoint ?? START_ADDRESS,
      mdr: 0,
      fr: initialFlags(),
      gr: Array.from({ length: 8 }, () => 0),
      trace: [],
      output: state.assembled ? [`Program reset. Entry point: ${formatWord(state.entryPoint ?? START_ADDRESS)}`] : [],
      consoleOutput: [],
      consoleInputQueue: [],
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
  },

  reload(state: CometState, mode: ReloadInitializationMode): CometState {
    const reloaded = this.reset(state);
    if (mode === "assembled") return reloaded;
    const fill = mode === "zero" ? 0x0000 : 0xffff;
    for (const entry of reloaded.sourceMap) {
      if (entry.instruction !== "DS") continue;
      entry.machineWords.forEach((_unused, offset) => {
        reloaded.memory[word(entry.address + offset)] = fill;
      });
    }
    reloaded.output = [`Program reloaded. DS initialization: ${mode === "zero" ? "0000" : "FFFF"}.`];
    return refreshDerivedState(reloaded);
  },

  enqueueInput(state: CometState, words: number[], endOfFile = false): CometState {
    const next = cloneState(state);
    next.consoleInputQueue ??= [];
    next.consoleInputQueue.push({ words: words.slice(0, 256).map((value) => value & 0xff), endOfFile });
    if (next.runState === "WaitingInput") next.runState = "Ready";
    return refreshDerivedState(next);
  },

  mutate(state: CometState, target: DebuggerMutationTarget, nextWord: number) {
    if (!state.assembled || !isDebuggerWord(nextWord) || !isValidDebuggerMutationTarget(target)) {
      return { state, previousWord: 0, applied: false };
    }
    const next = cloneState(state);
    const normalized = word(nextWord);
    let previousWord = 0;
    next.changedRegisters = [];
    next.changedMemoryAddresses = [];
    next.lastStep = undefined;
    next.lastMemoryReadAddress = undefined;
    next.lastMemoryWriteAddress = undefined;
    next.lastBaseAddress = undefined;
    next.lastIndexRegister = undefined;
    next.lastIndexValue = undefined;
    next.lastEffectiveAddress = undefined;
    next.visualPath = VisualPathKind.None;
    next.runState = next.assembled ? "Ready" : "Idle";

    if (target.kind === "general-register") {
      const index = Number(target.register.slice(2));
      previousWord = next.gr[index];
      next.gr[index] = normalized;
      next.changedRegisters = [target.register];
    } else if (target.kind === "program-register") {
      previousWord = next.pr;
      next.pr = normalized;
      next.changedRegisters = ["PR"];
    } else if (target.kind === "stack-pointer") {
      previousWord = next.sp;
      next.sp = normalized;
      next.changedRegisters = ["SP"];
    } else if (target.kind === "flag-register") {
      if ((normalized & 0xfff8) !== 0) return { state, previousWord: 0, applied: false };
      previousWord = (next.fr.o ? 0b0100 : 0)
        | (next.fr.n ? 0b0010 : 0)
        | (next.fr.z ? 0b0001 : 0);
      next.fr = {
        o: Boolean(normalized & 0b0100),
        n: Boolean(normalized & 0b0010),
        z: Boolean(normalized & 0b0001)
      };
      next.changedRegisters = ["FR"];
    } else {
      const address = word(target.address);
      previousWord = getMemory(next.memory, address);
      next.memory[address] = normalized;
      next.changedMemoryAddresses = [address];
    }

    return { state: refreshDerivedState(next), previousWord, applied: true };
  },

  fullClear(): CometState {
    return createEmptyCometState("Idle", []);
  }
};

type ActiveMockMicrocycle = {
  instruction: AssembledInstruction;
  instructionId: number;
  phases: readonly Exclude<MicrocyclePhase, "none">[];
  nextPhaseIndex: number;
  finalState: CometState;
  instructionTrace: TraceEvent[];
};

const activeMockMicrocycles = new WeakMap<CometState, ActiveMockMicrocycle>();

type MockReversibleSnapshot = Omit<
  CometState,
  | "memory"
  | "initialMemory"
  | "microcycleHistory"
  | "historyEpoch"
  | "timelineRevision"
  | "reverseAvailability"
  | "reverseInstructionAvailability"
  | "microcycleHistorySummary"
>;

type MockReversibleEntry = {
  entryId: number;
  instructionId: number;
  instructionAddress: number;
  instructionKind: InstructionKind;
  startsAtFetch: boolean;
  endsAtInstructionComplete: boolean;
  historyEpoch: number;
  projectId?: string;
  linkId?: string;
  linkRevision?: number;
  before: MockReversibleSnapshot;
  after: MockReversibleSnapshot;
  availabilityBefore: CometState["reverseAvailability"];
  contextBefore?: ActiveMockMicrocycle;
  contextAfter?: ActiveMockMicrocycle;
  memoryChanges: MicrocycleHistoryRecord["memoryChanges"];
};

const mockReversibleHistory = new WeakMap<CometState, readonly MockReversibleEntry[]>();
const mockMicrocycleSequence = new WeakMap<CometState, number>();

function captureMockReversibleSnapshot(state: CometState): MockReversibleSnapshot {
  const cloned = cloneState(state, false);
  const {
    memory: _memory,
    initialMemory: _initialMemory,
    microcycleHistory: _microcycleHistory,
    historyEpoch: _historyEpoch,
    timelineRevision: _timelineRevision,
    reverseAvailability: _reverseAvailability,
    reverseInstructionAvailability: _reverseInstructionAvailability,
    microcycleHistorySummary: _microcycleHistorySummary,
    ...snapshot
  } = cloned;
  return snapshot;
}

function mockSnapshotMatches(state: CometState, snapshot: MockReversibleSnapshot): boolean {
  return JSON.stringify(captureMockReversibleSnapshot(state)) === JSON.stringify(snapshot);
}

function restoreMockSnapshot(
  current: CometState,
  snapshot: MockReversibleSnapshot,
  memory: Record<number, number>,
  microcycleHistory: MicrocycleHistoryRecord[]
): CometState {
  return {
    ...snapshot,
    memory,
    initialMemory: current.initialMemory ? { ...current.initialMemory } : undefined,
    microcycleHistory,
    historyEpoch: current.historyEpoch,
    timelineRevision: current.timelineRevision,
    reverseAvailability: { ...current.reverseAvailability },
    reverseInstructionAvailability: { ...current.reverseInstructionAvailability },
    microcycleHistorySummary: { ...current.microcycleHistorySummary }
  };
}

function beginMockMicrocycle(state: CometState): ActiveMockMicrocycle | undefined {
  if (!state.assembled || state.runState === "Finished" || state.runState === "WaitingInput" || state.runState === "Error") {
    return undefined;
  }
  const instruction = instructionAt(state, state.pr);
  if (!instruction) return undefined;
  const finalState = mockCaslCoreReference.step({
    ...state,
    microcycleHistory: []
  });
  return {
    instruction,
    instructionId: (mockMicrocycleSequence.get(state) ?? state.microcycle.historySequence) + 1,
    phases: phasesForInstruction(instruction),
    nextPhaseIndex: 0,
    finalState,
    instructionTrace: finalState.trace.filter((event) => event.index === state.stepIndex + 1)
  };
}

function microcycleVisualPath(
  phase: Exclude<MicrocyclePhase, "none">,
  instruction: AssembledInstruction
): VisualPathKind {
  if (phase === "fetch") return VisualPathKind.Microcycle_Fetch;
  if (phase === "decode") return VisualPathKind.Microcycle_Decode;
  if (phase === "effective-address") return VisualPathKind.Microcycle_EffectiveAddress;
  if (phase === "operand-read") {
    return instruction.sourceRegister === undefined
      ? VisualPathKind.Microcycle_OperandReadMemory
      : VisualPathKind.Microcycle_OperandReadRegister;
  }
  if (phase === "execute") return VisualPathKind.Microcycle_Execute;
  if (phase === "write-back") {
    return instruction.op === "ST" || instruction.op === "PUSH" || instruction.op === "CALL"
      ? VisualPathKind.Microcycle_WriteBackMemory
      : VisualPathKind.Microcycle_WriteBackRegister;
  }
  if (phase === "flag-update") return VisualPathKind.Microcycle_FlagUpdate;
  return VisualPathKind.Microcycle_Complete;
}

function microcycleDetail(
  phase: Exclude<MicrocyclePhase, "none">,
  instruction: AssembledInstruction
): string {
  if (phase === "fetch") return "PR -> MAR; Memory[MAR] -> MDR -> IR";
  if (phase === "decode") return `${instruction.op} decoded from IR`;
  if (phase === "effective-address") return "Effective address resolved into MAR";
  if (phase === "operand-read") {
    if (instruction.sourceRegister !== undefined) return `GR${instruction.sourceRegister} operand read`;
    if (instruction.op === "POP" || instruction.op === "RET") return "Memory[SP] -> MDR";
    return "Memory[EA] -> MDR";
  }
  if (phase === "execute") {
    if (instruction.op.startsWith("J")) return "FR condition evaluated; next PR selected";
    if (instruction.op === "CALL") return "SP decremented; return address -> MDR";
    if (instruction.op === "RET") return "Return address prepared for PR";
    if (instruction.op === "PUSH") return "SP decremented; EA -> MDR";
    if (instruction.op === "POP") return "Stack word prepared; SP incremented";
    if (instruction.op === "ST") return `GR${instruction.gr} -> MDR`;
    if (instruction.op === "SVC") return "Teaching operating-system service executed";
    return "Instruction operation evaluated";
  }
  if (phase === "write-back") {
    if (instruction.op === "ST") return "MDR -> Memory[EA]";
    if (instruction.op === "PUSH" || instruction.op === "CALL") return "MDR -> Memory[SP]";
    if (instruction.op === "RET") return "SP incremented; call depth updated";
    return "Result -> destination register";
  }
  if (phase === "flag-update") return "OF/SF/ZF updated";
  return "Instruction complete";
}

function copyMemoryChanges(target: CometState, finalState: CometState): void {
  for (const address of finalState.changedMemoryAddresses) {
    target.memory[address] = finalState.memory[address] ?? 0;
  }
  target.changedMemoryAddresses = [...finalState.changedMemoryAddresses];
  target.lastMemoryWriteAddress = finalState.lastMemoryWriteAddress;
}

function copyFinalArchitecture(target: CometState, finalState: CometState): void {
  target.runState = finalState.runState;
  target.pr = finalState.pr;
  target.sp = finalState.sp;
  target.callDepth = finalState.callDepth;
  target.ir = finalState.ir;
  target.mar = finalState.mar;
  target.mdr = finalState.mdr;
  target.fr = { ...finalState.fr };
  target.gr = [...finalState.gr];
  copyMemoryChanges(target, finalState);
  target.consoleOutput = [...finalState.consoleOutput];
  target.consoleInputQueue = finalState.consoleInputQueue?.map((record) => ({
    words: [...record.words],
    endOfFile: record.endOfFile
  }));
  target.stepIndex = finalState.stepIndex;
  target.currentLine = finalState.currentLine;
  target.currentAddress = finalState.currentAddress;
  target.currentInstruction = finalState.currentInstruction;
  target.lastStep = finalState.lastStep ? { ...finalState.lastStep } : undefined;
  target.lastMemoryReadAddress = finalState.lastMemoryReadAddress;
  target.lastMemoryWriteAddress = finalState.lastMemoryWriteAddress;
  target.lastBaseAddress = finalState.lastBaseAddress;
  target.lastIndexRegister = finalState.lastIndexRegister;
  target.lastIndexValue = finalState.lastIndexValue;
  target.lastEffectiveAddress = finalState.lastEffectiveAddress;
  target.changedRegisters = [...finalState.changedRegisters];
  target.changedMemoryAddresses = [...finalState.changedMemoryAddresses];
}

function applyMockMicrocyclePhase(
  next: CometState,
  current: CometState,
  context: ActiveMockMicrocycle,
  phase: Exclude<MicrocyclePhase, "none">
): void {
  const instruction = context.instruction;
  const finalState = context.finalState;
  const effective = effectiveAddressFor(current, instruction);
  next.changedRegisters = [];
  next.changedMemoryAddresses = [];

  if (phase === "fetch") {
    next.mar = instruction.address;
    next.mdr = getMemory(next.memory, instruction.address);
    next.ir = next.mdr;
    next.changedRegisters = ["MAR", "MDR", "IR"];
  } else if (phase === "decode") {
    if (instruction.size > 1) {
      next.mar = word(instruction.address + 1);
      next.mdr = getMemory(next.memory, next.mar);
      next.changedRegisters = ["MAR", "MDR"];
    }
  } else if (phase === "effective-address") {
    next.mar = effective.effectiveAddress;
    next.lastBaseAddress = effective.baseAddress;
    next.lastIndexRegister = effective.indexRegister;
    next.lastIndexValue = effective.indexValue;
    next.lastEffectiveAddress = effective.effectiveAddress;
    next.changedRegisters = ["MAR"];
  } else if (phase === "operand-read") {
    if (instruction.sourceRegister !== undefined) {
      next.changedRegisters = [];
    } else if (finalState.lastMemoryReadAddress !== undefined) {
      next.mar = finalState.lastMemoryReadAddress;
      next.mdr = finalState.mdr;
      next.lastMemoryReadAddress = finalState.lastMemoryReadAddress;
      next.changedRegisters = ["MAR", "MDR"];
    }
  } else if (phase === "execute") {
    if (instruction.op === "ST") {
      next.mdr = finalState.mdr;
      next.changedRegisters = ["MDR"];
    } else if (instruction.op === "PUSH" || instruction.op === "CALL") {
      next.sp = finalState.sp;
      next.mar = finalState.lastMemoryWriteAddress ?? finalState.mar;
      next.mdr = finalState.mdr;
      next.changedRegisters = ["SP", "MAR", "MDR"];
    } else if (instruction.op === "POP") {
      next.sp = finalState.sp;
      next.changedRegisters = ["SP"];
    } else if (instruction.op === "RET") {
      if (current.callDepth > 0) {
        next.pr = finalState.pr;
        next.changedRegisters = ["PR"];
      }
    } else if (instruction.op === "JUMP" || instruction.op === "JZE" || instruction.op === "JNZ" ||
      instruction.op === "JPL" || instruction.op === "JMI" || instruction.op === "JOV") {
      next.pr = finalState.pr;
      next.changedRegisters = ["PR"];
    } else if (instruction.op === "SVC") {
      copyFinalArchitecture(next, finalState);
    }
  } else if (phase === "write-back") {
    if (instruction.op === "ST" || instruction.op === "PUSH") {
      copyMemoryChanges(next, finalState);
    } else if (instruction.op === "CALL") {
      copyMemoryChanges(next, finalState);
      next.pr = finalState.pr;
      next.callDepth = finalState.callDepth;
      next.changedRegisters = ["PR", "SP"];
    } else if (instruction.op === "RET") {
      next.sp = finalState.sp;
      next.callDepth = finalState.callDepth;
      next.changedRegisters = ["SP", "PR"];
    } else if (instruction.gr !== undefined) {
      next.gr[instruction.gr] = finalState.gr[instruction.gr];
      next.changedRegisters = [`GR${instruction.gr}`];
    }
  } else if (phase === "flag-update") {
    next.fr = { ...finalState.fr };
    next.changedRegisters = ["FR"];
  } else if (phase === "complete") {
    const existingTrace = next.trace;
    copyFinalArchitecture(next, finalState);
    next.trace = [...context.instructionTrace.map((event) => ({ ...event })), ...existingTrace];
  }
}

function mockMicroStep(state: CometState): CometState {
  let context = activeMockMicrocycles.get(state);
  if (!context) context = beginMockMicrocycle(state);
  if (!context) {
    const next = state.assembled
      && state.runState !== "Finished"
      && state.runState !== "WaitingInput"
      && state.runState !== "Error"
      ? mockCaslCoreReference.step({ ...state, microcycleHistory: [] })
      : cloneState(state);
    return refreshDerivedState({ ...next, executionGranularity: "microcycle" });
  }
  const contextBefore = context;
  const reversibleBefore = captureMockReversibleSnapshot(state);

  const phase = context.phases[context.nextPhaseIndex];
  const next = cloneState(state, false);
  const before = {
    pr: state.pr,
    sp: state.sp,
    mar: state.mar,
    mdr: state.mdr,
    ir: state.ir,
    callDepth: state.callDepth,
    flags: { ...state.fr },
    runState: state.runState
  };
  applyMockMicrocyclePhase(next, state, context, phase);
  const sequence = (mockMicrocycleSequence.get(state) ?? state.microcycle.historySequence) + 1;
  const instructionComplete = phase === "complete";
  next.executionGranularity = "microcycle";
  next.visualPath = microcycleVisualPath(phase, context.instruction);
  next.microcycle = {
    phase,
    instructionKind: context.instruction.op,
    instructionAddress: context.instruction.address,
    sourceLine: context.instruction.line,
    microIndex: context.nextPhaseIndex + 1,
    totalMicrosteps: context.phases.length,
    instructionComplete,
    historySequence: sequence,
    detail: microcycleDetail(phase, context.instruction)
  };
  const history: MicrocycleHistoryRecord = {
    sequence,
    instructionId: context.instructionId,
    phase,
    instructionAddress: context.instruction.address,
    instructionKind: context.instruction.op,
    projectId: state.projectId,
    linkId: state.linkId,
    linkRevision: state.linkRevision,
    moduleId: context.instruction.moduleId,
    sourceMappingId: context.instruction.sourceMappingId,
    startsAtFetch: phase === "fetch",
    endsAtInstructionComplete: instructionComplete,
    prBefore: before.pr,
    prAfter: next.pr,
    spBefore: before.sp,
    spAfter: next.sp,
    marBefore: before.mar,
    marAfter: next.mar,
    mdrBefore: before.mdr,
    mdrAfter: next.mdr,
    irBefore: before.ir,
    irAfter: next.ir,
    callDepthBefore: before.callDepth,
    callDepthAfter: next.callDepth,
    flagsBefore: before.flags,
    flagsAfter: { ...next.fr },
    runStateBefore: before.runState,
    runStateAfter: next.runState,
    generalRegisterChanges: next.gr.flatMap((after, index) => {
      const previous = state.gr[index];
      return previous === after ? [] : [{ index, before: previous, after }];
    }),
    memoryChanges: [...new Set([
      ...Object.keys(state.memory).map(Number),
      ...Object.keys(next.memory).map(Number)
    ])].flatMap((address) => {
      const previous = state.memory[address] ?? 0;
      const after = next.memory[address] ?? 0;
      return previous === after ? [] : [{ address, before: previous, after }];
    })
  };
  next.microcycleHistory = [history, ...state.microcycleHistory].slice(0, MAX_TRACE_EVENTS);
  const microTrace: TraceEvent = {
    kind: "microcycle",
    eventId: `microcycle:${sequence}`,
    index: Math.max(1, next.stepIndex + (instructionComplete ? 0 : 1)),
    address: context.instruction.address,
    instruction: context.instruction.op,
    detail: next.microcycle.detail,
    source: context.instruction.source,
    pr: next.pr,
    visualPath: next.visualPath,
    runState: next.runState,
    microcyclePhase: phase,
    microIndex: next.microcycle.microIndex,
    totalMicrosteps: next.microcycle.totalMicrosteps,
    instructionComplete
  };
  next.trace = [microTrace, ...next.trace].slice(0, MAX_TRACE_EVENTS);
  context = { ...context, nextPhaseIndex: context.nextPhaseIndex + 1 };
  next.timelineRevision = state.timelineRevision + 1;

  const refreshed = refreshDerivedState(next);
  if (!instructionComplete && refreshed.runState !== "WaitingInput") {
    refreshed.currentAddress = context.instruction.address;
    refreshed.currentLine = context.instruction.line;
    refreshed.currentInstruction = currentInstructionText(context.instruction);
    activeMockMicrocycles.set(refreshed, context);
  }

  if (contextBefore.instruction.op === "SVC" && phase === "execute") {
    refreshed.historyEpoch = state.historyEpoch + 1;
    refreshed.microcycleHistory = [];
    refreshed.reverseAvailability = {
      available: false,
      reason: refreshed.runState === "WaitingInput" ? "io-boundary" : "svc-boundary"
    };
    refreshed.reverseInstructionAvailability = {
      ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY,
      reason: refreshed.runState === "WaitingInput" ? "io-boundary" : "svc-boundary"
    };
    refreshed.microcycleHistorySummary = { ...EMPTY_MICROCYCLE_HISTORY_SUMMARY };
    mockReversibleHistory.set(refreshed, []);
    mockMicrocycleSequence.set(refreshed, 0);
    return refreshed;
  }

  const priorHistory = [...(mockReversibleHistory.get(state) ?? [])];
  const droppedEntryCount = state.microcycleHistorySummary.droppedEntryCount
    + (priorHistory.length >= MAX_TRACE_EVENTS ? 1 : 0);
  if (priorHistory.length >= MAX_TRACE_EVENTS) priorHistory.shift();
  const reversibleEntry: MockReversibleEntry = {
    entryId: sequence,
    instructionId: context.instructionId,
    instructionAddress: context.instruction.address,
    instructionKind: context.instruction.op,
    startsAtFetch: phase === "fetch",
    endsAtInstructionComplete: instructionComplete,
    historyEpoch: refreshed.historyEpoch,
    projectId: refreshed.projectId,
    linkId: refreshed.linkId,
    linkRevision: refreshed.linkRevision,
    before: reversibleBefore,
    after: captureMockReversibleSnapshot(refreshed),
    availabilityBefore: { ...state.reverseAvailability },
    contextBefore,
    contextAfter: instructionComplete || refreshed.runState === "WaitingInput" ? undefined : context,
    memoryChanges: history.memoryChanges
  };
  const reversibleHistory = [...priorHistory, reversibleEntry];
  refreshed.reverseAvailability = {
    available: true,
    reason: "available",
    targetPhase: reversibleBefore.microcycle.phase
  };
  refreshed.reverseInstructionAvailability = reverseMockInstructionAvailability(
    refreshed,
    reversibleHistory
  );
  refreshed.microcycleHistorySummary = {
    retainedEntries: reversibleHistory.length,
    capacity: MAX_TRACE_EVENTS,
    floorEntryId: droppedEntryCount > 0
      ? state.microcycleHistorySummary.floorEntryId ?? priorHistory[0]?.entryId
      : undefined,
    droppedEntryCount
  };
  reversibleEntry.after = captureMockReversibleSnapshot(refreshed);
  mockReversibleHistory.set(refreshed, reversibleHistory);
  mockMicrocycleSequence.set(refreshed, sequence);
  return refreshed;
}

function reverseMockInstructionAvailability(
  state: CometState,
  history: readonly MockReversibleEntry[] = mockReversibleHistory.get(state) ?? []
): ReverseInstructionAvailability {
  if (!state.assembled) return { ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY };
  if (state.runState === "Running") {
    return { ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY, reason: "running" };
  }
  if (state.runState === "WaitingInput") {
    return { ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY, reason: "waiting-input" };
  }
  const latest = history.at(-1);
  if (!latest) {
    return {
      ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY,
      reason: state.reverseAvailability.reason
    };
  }
  if (latest.historyEpoch !== state.historyEpoch) {
    return {
      ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY,
      reason: "history-epoch-mismatch"
    };
  }

  let firstIndex = history.length - 1;
  while (firstIndex > 0 && history[firstIndex - 1].instructionId === latest.instructionId) {
    firstIndex -= 1;
  }
  const first = history[firstIndex];
  const reversibleMicrosteps = history.length - firstIndex;
  if (!first.startsAtFetch) {
    const barrierReason = state.reverseAvailability.reason !== "available"
      ? state.reverseAvailability.reason
      : state.microcycleHistorySummary.droppedEntryCount > 0
        ? "history-capacity-boundary"
        : "partial-instruction-history";
    return {
      available: false,
      reason: barrierReason,
      instructionId: latest.instructionId,
      machineAddress: latest.instructionAddress,
      instructionKind: latest.instructionKind,
      reversibleMicrosteps,
      complete: latest.endsAtInstructionComplete
    };
  }
  return {
    available: true,
    reason: "available",
    instructionId: latest.instructionId,
    machineAddress: latest.instructionAddress,
    instructionKind: latest.instructionKind,
    reversibleMicrosteps,
    complete: latest.endsAtInstructionComplete
  };
}

function mockInstructionStep(state: CometState): CometState {
  const initialStepIndex = state.stepIndex;
  let next = state;
  let instructionTrace: TraceEvent[] | undefined;
  do {
    const advanced = mockMicroStep(next);
    if (advanced === next) break;
    next = advanced;
    instructionTrace ??= activeMockMicrocycles.get(next)?.instructionTrace;
    if (
      next.stepIndex > initialStepIndex
      || next.runState === "WaitingInput"
      || next.runState === "Error"
      || next.runState === "Finished"
    ) break;
  } while (true);

  const normalized = refreshDerivedState({
    ...cloneState(next, false),
    microcycleHistory: [...next.microcycleHistory],
    executionGranularity: "instruction",
    microcycle: { ...EMPTY_MICROCYCLE_STATE },
    trace: instructionTrace
      ? [...instructionTrace.map((event) => ({ ...event })), ...state.trace].slice(0, MAX_TRACE_EVENTS)
      : next.trace.filter((event) => event.kind !== "microcycle"),
    visualPath: next.lastStep?.visualPath ?? next.visualPath
  });
  const history = [...(mockReversibleHistory.get(next) ?? [])];
  const latest = history.at(-1);
  if (latest && next.timelineRevision !== state.timelineRevision) {
    latest.after = captureMockReversibleSnapshot(normalized);
  }
  normalized.reverseInstructionAvailability = reverseMockInstructionAvailability(normalized, history);
  mockReversibleHistory.set(normalized, history);
  mockMicrocycleSequence.set(
    normalized,
    mockMicrocycleSequence.get(next) ?? normalized.microcycleHistory[0]?.sequence ?? 0
  );
  return normalized;
}

export function reverseMockMicrocycle(
  state: CometState,
  expectedHistoryEpoch: number,
  expectedTimelineRevision: number
): { state: CometState; result: Omit<ReverseMicrostepResultDto, "state"> } {
  if (expectedHistoryEpoch !== state.historyEpoch || expectedTimelineRevision !== state.timelineRevision) {
    return {
      state,
      result: {
        status: "stale",
        historyEpoch: state.historyEpoch,
        timelineRevision: state.timelineRevision,
        availability: {
          available: false,
          reason: expectedHistoryEpoch !== state.historyEpoch
            ? "history-epoch-mismatch"
            : "execution-epoch-mismatch"
        }
      }
    };
  }
  if (!state.reverseAvailability.available) {
    return {
      state,
      result: {
        status: state.reverseAvailability.reason === "no-history" ? "unavailable" : "blocked",
        historyEpoch: state.historyEpoch,
        timelineRevision: state.timelineRevision,
        availability: { ...state.reverseAvailability }
      }
    };
  }
  const history = [...(mockReversibleHistory.get(state) ?? [])];
  const entry = history.at(-1);
  if (
    !entry
    || entry.historyEpoch !== state.historyEpoch
    || entry.projectId !== state.projectId
    || entry.linkId !== state.linkId
    || entry.linkRevision !== state.linkRevision
    || !mockSnapshotMatches(state, entry.after)
  ) {
    return {
      state,
      result: {
        status: "corrupt-history",
        historyEpoch: state.historyEpoch,
        timelineRevision: state.timelineRevision,
        availability: { available: false, reason: "history-corrupt" }
      }
    };
  }
  for (const change of entry.memoryChanges) {
    if ((state.memory[change.address] ?? 0) !== change.after) {
      return {
        state,
        result: {
          status: "corrupt-history",
          historyEpoch: state.historyEpoch,
          timelineRevision: state.timelineRevision,
          availability: { available: false, reason: "history-corrupt" }
        }
      };
    }
  }

  const memory = { ...state.memory };
  for (const change of entry.memoryChanges) memory[change.address] = change.before;
  history.pop();
  const previousHistory = state.microcycleHistory.filter((record) => record.sequence !== entry.entryId);
  const restored = restoreMockSnapshot(state, entry.before, memory, previousHistory);
  restored.timelineRevision = state.timelineRevision + 1;
  restored.historyEpoch = state.historyEpoch;
  restored.microcycleHistorySummary = {
    ...state.microcycleHistorySummary,
    retainedEntries: history.length
  };
  restored.reverseAvailability = history.length > 0
    ? { available: true, reason: "available", targetPhase: history.at(-1)?.before.microcycle.phase }
    : state.microcycleHistorySummary.droppedEntryCount > 0
      ? { available: false, reason: "history-capacity-boundary" }
      : { available: false, reason: entry.availabilityBefore.reason };
  restored.reverseInstructionAvailability = reverseMockInstructionAvailability(restored, history);
  if (entry.contextBefore) activeMockMicrocycles.set(restored, entry.contextBefore);
  mockReversibleHistory.set(restored, history);
  mockMicrocycleSequence.set(restored, mockMicrocycleSequence.get(state) ?? entry.entryId);
  return {
    state: restored,
    result: {
      status: "reversed",
      reversedEntryId: entry.entryId,
      previousPhase: entry.after.microcycle.phase,
      restoredPhase: entry.before.microcycle.phase,
      historyEpoch: restored.historyEpoch,
      timelineRevision: restored.timelineRevision,
      availability: { ...restored.reverseAvailability }
    }
  };
}

export function reverseMockInstruction(
  state: CometState,
  expectedHistoryEpoch: number,
  expectedTimelineRevision: number
): { state: CometState; result: Omit<ReverseInstructionResultDto, "state"> } {
  const availability = reverseMockInstructionAvailability(state);
  if (expectedHistoryEpoch !== state.historyEpoch || expectedTimelineRevision !== state.timelineRevision) {
    return {
      state,
      result: {
        status: "stale",
        reversedMicrostepCount: 0,
        historyEpoch: state.historyEpoch,
        timelineRevision: state.timelineRevision,
        availability: {
          ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY,
          reason: expectedHistoryEpoch !== state.historyEpoch
            ? "history-epoch-mismatch"
            : "timeline-revision-mismatch"
        }
      }
    };
  }
  if (!availability.available || availability.instructionId === undefined) {
    return {
      state,
      result: {
        status: availability.reason === "no-history" ? "unavailable" : "blocked",
        reversedMicrostepCount: 0,
        historyEpoch: state.historyEpoch,
        timelineRevision: state.timelineRevision,
        availability
      }
    };
  }

  let candidate = state;
  for (let index = 0; index < availability.reversibleMicrosteps; index += 1) {
    const history = mockReversibleHistory.get(candidate) ?? [];
    if (history.at(-1)?.instructionId !== availability.instructionId) {
      return {
        state,
        result: {
          status: "corrupt-history",
          reversedMicrostepCount: 0,
          historyEpoch: state.historyEpoch,
          timelineRevision: state.timelineRevision,
          availability: {
            ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY,
            reason: "history-corrupt"
          }
        }
      };
    }
    const reversed = reverseMockMicrocycle(
      candidate,
      candidate.historyEpoch,
      candidate.timelineRevision
    );
    if (reversed.result.status !== "reversed") {
      return {
        state,
        result: {
          status: "corrupt-history",
          reversedMicrostepCount: 0,
          historyEpoch: state.historyEpoch,
          timelineRevision: state.timelineRevision,
          availability: {
            ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY,
            reason: "history-corrupt"
          }
        }
      };
    }
    candidate = reversed.state;
  }

  candidate.timelineRevision = state.timelineRevision + 1;
  candidate.reverseInstructionAvailability = reverseMockInstructionAvailability(candidate);
  return {
    state: candidate,
    result: {
      status: "reversed",
      reversedInstructionId: availability.instructionId,
      reversedMicrostepCount: availability.reversibleMicrosteps,
      machineAddress: availability.machineAddress,
      mnemonic: availability.instructionKind,
      restoredPhase: candidate.microcycle.phase,
      historyEpoch: candidate.historyEpoch,
      timelineRevision: candidate.timelineRevision,
      availability: candidate.reverseInstructionAvailability
    }
  };
}

export const mockCaslCore: CaslCore = {
  ...mockCaslCoreReference,
  step(state: CometState): CometState {
    return mockInstructionStep(state);
  },
  microStep: mockMicroStep,
  reset(state: CometState): CometState {
    const reset = mockCaslCoreReference.reset(state);
    return {
      ...reset,
      executionGranularity: "instruction",
      microcycle: { ...EMPTY_MICROCYCLE_STATE },
      microcycleHistory: [],
      historyEpoch: state.historyEpoch + 1,
      timelineRevision: state.timelineRevision + 1,
      reverseAvailability: { available: false, reason: "reset-boundary" },
      reverseInstructionAvailability: {
        ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY,
        reason: "reset-boundary"
      },
      microcycleHistorySummary: { ...EMPTY_MICROCYCLE_HISTORY_SUMMARY }
    };
  },
  reload(state: CometState, mode: ReloadInitializationMode): CometState {
    const reloaded = mockCaslCoreReference.reload(state, mode);
    return {
      ...reloaded,
      executionGranularity: "instruction",
      microcycle: { ...EMPTY_MICROCYCLE_STATE },
      microcycleHistory: [],
      historyEpoch: state.historyEpoch + 1,
      timelineRevision: state.timelineRevision + 1,
      reverseAvailability: { available: false, reason: "reload-boundary" },
      reverseInstructionAvailability: {
        ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY,
        reason: "reload-boundary"
      },
      microcycleHistorySummary: { ...EMPTY_MICROCYCLE_HISTORY_SUMMARY }
    };
  },
  enqueueInput(state: CometState, words: number[], endOfFile = false): CometState {
    const next = mockCaslCoreReference.enqueueInput(state, words, endOfFile);
    return {
      ...next,
      executionGranularity: "instruction",
      microcycle: { ...EMPTY_MICROCYCLE_STATE },
      microcycleHistory: [],
      historyEpoch: state.historyEpoch + 1,
      timelineRevision: state.timelineRevision + 1,
      reverseAvailability: { available: false, reason: "io-boundary" },
      reverseInstructionAvailability: {
        ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY,
        reason: "io-boundary"
      },
      microcycleHistorySummary: { ...EMPTY_MICROCYCLE_HISTORY_SUMMARY }
    };
  },
  mutate(state: CometState, target: DebuggerMutationTarget, nextWord: number) {
    const result = mockCaslCoreReference.mutate(state, target, nextWord);
    if (!result.applied) return result;
    return {
      ...result,
      state: {
        ...result.state,
        executionGranularity: "instruction" as const,
        microcycle: { ...EMPTY_MICROCYCLE_STATE },
        microcycleHistory: [],
        historyEpoch: state.historyEpoch + 1,
        timelineRevision: state.timelineRevision + 1,
        reverseAvailability: { available: false, reason: "mutation-boundary" },
        reverseInstructionAvailability: {
          ...EMPTY_REVERSE_INSTRUCTION_AVAILABILITY,
          reason: "mutation-boundary"
        },
        microcycleHistorySummary: { ...EMPTY_MICROCYCLE_HISTORY_SUMMARY }
      }
    };
  },
  fullClear(): CometState {
    return createEmptyCometState("Idle", []);
  }
};
