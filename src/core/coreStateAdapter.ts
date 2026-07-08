import type { CometStateDto, DiagnosticDto, SourceRowDto } from "./coreDto";
import {
  VisualPathKind,
  formatWord
} from "./types";
import type { AssembledInstruction, CometState, Diagnostic, FlagsState, MemoryRow, RegisterState, SourceMapEntry, TraceEvent } from "./types";

const START_ADDRESS = 0x20;
const INITIAL_SP = 0xfffe;
const MAX_TRACE_EVENTS = 1000;

type StateFromDtoOptions = {
  previous?: CometState;
  output?: string[];
};

function diagnosticsFromDto(diagnostics: DiagnosticDto[]): Diagnostic[] {
  return diagnostics.map((diagnostic) => ({ ...diagnostic }));
}

function flagsFromDto(dto: CometStateDto): FlagsState {
  return {
    o: dto.frOF,
    n: dto.frSF,
    z: dto.frZF,
    c: dto.frCF
  };
}

function memoryFromRows(rows: MemoryRow[]): Record<number, number> {
  return rows.reduce<Record<number, number>>((memory, row) => {
    memory[row.address] = row.value;
    return memory;
  }, {});
}

function sourceMapFromDto(rows: SourceRowDto[]): SourceMapEntry[] {
  return rows.map((row) => ({
    line: row.line,
    address: row.address,
    machineWords: [...row.machineWords],
    source: row.source,
    label: row.label ?? undefined,
    instruction: row.instruction ?? undefined
  }));
}

function symbolsFromRows(memoryRows: MemoryRow[], sourceRows: SourceRowDto[]): Record<string, number> {
  const symbols: Record<string, number> = {};
  for (const row of [...memoryRows, ...sourceRows]) {
    if (row.label) symbols[row.label.toUpperCase()] = row.address;
  }
  return symbols;
}

function operandLabelForAddress(sourceRows: SourceRowDto[], operandAddress: number | null): string | undefined {
  if (operandAddress === null) return undefined;
  return sourceRows.find((row) => row.address === operandAddress && row.label)?.label ?? undefined;
}

function programFromDto(sourceRows: SourceRowDto[]): AssembledInstruction[] {
  const executable = new Set(["LD", "LAD", "ADDA", "SUBA", "CPA", "ST", "JUMP", "JZE", "JNZ", "JPL", "JMI", "RET"]);
  return sourceRows
    .filter((row) => row.instruction !== null && executable.has(row.instruction))
    .map((row) => {
      const op = row.instruction as AssembledInstruction["op"];
      const machineWord = row.machineWords[0] ?? 0;
      const gr = op === "RET" || op === "JUMP" || op === "JZE" || op === "JNZ" || op === "JPL" || op === "JMI" ? undefined : (machineWord >> 4) & 0x0f;
      return {
        address: row.address,
        line: row.line,
        op,
        source: row.source,
        size: row.machineWords.length || (op === "RET" ? 1 : 2),
        gr,
        operandLabel: operandLabelForAddress(sourceRows, row.operandAddress),
        operandAddress: row.operandAddress ?? undefined
      };
    });
}

function visualPathFromDto(dto: CometStateDto): VisualPathKind {
  if (dto.lastInstructionKind === "LD") return VisualPathKind.LD_MemoryToMdrToGr;
  if (dto.lastInstructionKind === "ADDA") return VisualPathKind.ADDA_GrMdrToAluToGr;
  if (dto.lastInstructionKind === "LAD") return VisualPathKind.LAD_AddressToGr;
  if (dto.lastInstructionKind === "SUBA") return VisualPathKind.SUBA_GrMdrToAluToGr;
  if (dto.lastInstructionKind === "CPA") return VisualPathKind.CPA_GrMdrToAluToFr;
  if (dto.lastInstructionKind === "ST") return VisualPathKind.ST_GrToMdrToMemory;
  if (dto.lastInstructionKind === "JUMP") return VisualPathKind.Jump_AddressToPr;
  if (dto.lastInstructionKind === "JZE" || dto.lastInstructionKind === "JNZ" || dto.lastInstructionKind === "JPL" || dto.lastInstructionKind === "JMI") {
    return dto.currentInstructionAddress === dto.effectiveAddress ? VisualPathKind.ConditionalJump_AddressToPr : VisualPathKind.ConditionalJump_NotTaken;
  }
  if (dto.lastInstructionKind === "RET" || dto.runState === "Finished") return VisualPathKind.Finished_None;
  if (dto.runState === "Ready") return VisualPathKind.Ready_PrToMar;
  return VisualPathKind.None;
}

function changedRegistersFromDto(dto: CometStateDto): string[] {
  if (!dto.lastInstructionKind) return [];

  const changed = ["PR", "IR"];
  if (dto.lastInstructionKind === "LD" || dto.lastInstructionKind === "LAD" || dto.lastInstructionKind === "ADDA" || dto.lastInstructionKind === "SUBA") {
    if (dto.lastRegisterWriteIndex !== null) changed.push(`GR${dto.lastRegisterWriteIndex}`);
    changed.push("MAR", "MDR");
    if (dto.lastInstructionKind === "LAD") changed.pop();
    if (dto.lastInstructionKind === "ADDA" || dto.lastInstructionKind === "SUBA") changed.push("FR");
  }
  if (dto.lastInstructionKind === "CPA") {
    changed.push("MAR", "MDR", "FR");
  }
  if (dto.lastInstructionKind === "ST") {
    changed.push("MAR", "MDR");
  }
  if (dto.lastInstructionKind === "JUMP" || dto.lastInstructionKind === "JZE" || dto.lastInstructionKind === "JNZ" || dto.lastInstructionKind === "JPL" || dto.lastInstructionKind === "JMI") {
    changed.push("MAR");
  }
  return changed;
}

function registerRowsFromDto(dto: CometStateDto, changedRegisters: string[]): RegisterState[] {
  const changed = new Set(changedRegisters);
  const grRows = dto.gr.map((value, index) => ({
    name: `GR${index}`,
    value,
    decimal: value,
    changed: changed.has(`GR${index}`)
  }));

  return [
    ...grRows,
    { name: "PR", value: dto.pr, decimal: dto.pr, changed: changed.has("PR") },
    { name: "SP", value: dto.sp, decimal: dto.sp, changed: changed.has("SP") },
    { name: "IR", value: dto.ir0, decimal: dto.ir0, changed: changed.has("IR") },
    { name: "MAR", value: dto.mar, decimal: dto.mar, changed: changed.has("MAR") },
    { name: "MDR", value: dto.mdr, decimal: dto.mdr, changed: changed.has("MDR") },
    {
      name: "FR",
      value: (dto.frZF ? 0b100 : 0) | (dto.frCF ? 0b010 : 0) | (dto.frSF ? 0b001 : 0),
      decimal: 0,
      changed: changed.has("FR")
    }
  ];
}

function memoryRowsFromDto(dto: CometStateDto): MemoryRow[] {
  return dto.memoryWindow.map((row) => ({
    address: row.address,
    value: row.value,
    label: row.label ?? undefined,
    current: row.isCurrent,
    changed: row.isChanged
  }));
}

function findLastInstructionRow(dto: CometStateDto): SourceRowDto | undefined {
  const kind = dto.lastInstructionKind;
  if (!kind) return undefined;

  return dto.sourceRows.find((row) => {
    if (row.instruction !== kind) return false;
    if ((row.machineWords[0] ?? 0) !== dto.ir0) return false;
    if (kind === "RET") return true;
    return row.operandAddress === dto.effectiveAddress;
  });
}

function traceDetail(dto: CometStateDto): string {
  const register = dto.lastRegisterWriteIndex ?? ((dto.ir0 >> 4) & 0x0f);
  const address = dto.effectiveAddress ?? 0;
  if (dto.lastInstructionKind === "LD") return `Memory[${formatWord(address)}] -> MDR -> GR${register}`;
  if (dto.lastInstructionKind === "LAD") return `Address ${formatWord(address)} -> GR${register}`;
  if (dto.lastInstructionKind === "ADDA") return `GR${register} + MDR -> ALU -> GR${register}`;
  if (dto.lastInstructionKind === "SUBA") return `GR${register} - MDR -> ALU -> GR${register}`;
  if (dto.lastInstructionKind === "CPA") return `GR${register} - MDR -> ALU -> FR`;
  if (dto.lastInstructionKind === "ST") return `GR${register} -> MDR -> Memory[${formatWord(address)}]`;
  if (dto.lastInstructionKind === "JUMP") return `PR <- ${formatWord(address)}`;
  if (dto.lastInstructionKind === "JZE" || dto.lastInstructionKind === "JNZ" || dto.lastInstructionKind === "JPL" || dto.lastInstructionKind === "JMI") {
    return dto.currentInstructionAddress === dto.effectiveAddress ? `PR <- ${formatWord(address)}` : "Condition not met; PR advanced";
  }
  if (dto.lastInstructionKind === "RET") return "Program finished without jumping to an invalid address.";
  return "";
}

function traceFromDto(dto: CometStateDto, previous?: CometState): TraceEvent[] {
  const previousTrace = previous?.trace ?? [];
  if (!dto.lastInstructionKind || dto.stepCount <= (previous?.stepIndex ?? 0)) {
    return previousTrace.map((event) => ({ ...event }));
  }

  const row = findLastInstructionRow(dto);
  const event: TraceEvent = {
    index: dto.stepCount,
    address: row?.address ?? dto.currentInstructionAddress ?? dto.pr,
    instruction: dto.lastInstructionKind,
    detail: traceDetail(dto),
    source: row?.source ?? undefined,
    pr: dto.pr,
    visualPath: visualPathFromDto(dto),
    changedRegister: dto.lastRegisterWriteIndex !== null ? `GR${dto.lastRegisterWriteIndex}` : undefined,
    changedMemoryAddress: dto.lastMemoryWriteAddress ?? undefined,
    runState: dto.runState
  };
  return [event, ...previousTrace].slice(0, MAX_TRACE_EVENTS).map((traceEvent) => ({ ...traceEvent }));
}

function defaultOutput(dto: CometStateDto): string[] {
  if (dto.runState === "Error") {
    return ["Assemble failed.", ...dto.diagnostics.map((diagnostic) => `Line ${diagnostic.line}: ${diagnostic.message}`)];
  }
  if (dto.runState === "Ready" && dto.stepCount === 0) {
    return ["Assemble succeeded. (0 errors, 0 warnings)", "Program loaded. Entry point: START (0020)"];
  }
  return [];
}

function lastStepFromDto(dto: CometStateDto) {
  const row = findLastInstructionRow(dto);
  if (!row) return undefined;
  return {
    executedAddress: row.address,
    executedLine: row.line,
    executedInstruction: row.source,
    visualPath: visualPathFromDto(dto)
  };
}

export function createCometStateFromDto(dto: CometStateDto, options: StateFromDtoOptions = {}): CometState {
  const memoryRows = memoryRowsFromDto(dto);
  const memory = memoryFromRows(memoryRows);
  const changedRegisters = changedRegistersFromDto(dto);
  const changedMemoryAddresses = dto.memoryWindow.filter((row) => row.isChanged).map((row) => row.address);
  const assembled = dto.runState !== "Idle" && dto.runState !== "Dirty" && dto.runState !== "Error" && dto.sourceRows.length > 0;
  const output = options.output ?? (options.previous ? [...options.previous.output] : defaultOutput(dto));

  return {
    assembled,
    runState: dto.runState,
    pr: dto.pr,
    sp: dto.sp,
    ir: dto.ir0,
    mar: dto.mar,
    mdr: dto.mdr,
    fr: flagsFromDto(dto),
    gr: [...dto.gr],
    memory,
    initialMemory: options.previous?.initialMemory ? { ...options.previous.initialMemory } : { ...memory },
    memoryRows,
    registers: registerRowsFromDto(dto, changedRegisters),
    sourceMap: sourceMapFromDto(dto.sourceRows),
    symbols: symbolsFromRows(memoryRows, dto.sourceRows),
    diagnostics: diagnosticsFromDto(dto.diagnostics),
    output,
    trace: traceFromDto(dto, options.previous),
    visualPath: visualPathFromDto(dto),
    stepIndex: dto.stepCount,
    currentLine: dto.currentSourceLineIndex ?? undefined,
    currentAddress: dto.currentInstructionAddress ?? undefined,
    currentInstruction: dto.currentInstructionText ?? undefined,
    lastStep: lastStepFromDto(dto),
    program: programFromDto(dto.sourceRows),
    changedRegisters,
    changedMemoryAddresses
  };
}

export function createEmptyUiCometState(runState: CometState["runState"] = "Idle", output: string[] = []): CometState {
  return createCometStateFromDto({
    runState,
    stepCount: 0,
    pr: START_ADDRESS,
    sp: INITIAL_SP,
    ir0: 0,
    ir1: null,
    mar: START_ADDRESS,
    mdr: 0,
    gr: Array.from({ length: 8 }, () => 0),
    frOF: false,
    frSF: false,
    frZF: false,
    frCF: false,
    currentInstructionAddress: null,
    currentSourceLineIndex: null,
    currentInstructionText: null,
    lastInstructionKind: null,
    lastMemoryReadAddress: null,
    lastMemoryWriteAddress: null,
    lastRegisterWriteIndex: null,
    effectiveAddress: null,
    memoryWindow: [],
    sourceRows: [],
    diagnostics: []
  }, { output });
}
