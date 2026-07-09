import type { CometStateDto, DiagnosticDto, SourceRowDto } from "./coreDto";
import { MEMORY_VIEW_DEFAULT_ROWS, selectMemoryWindow } from "./selectors";
import { VisualPathKind, formatWord } from "./types";
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

function memoryFromDto(dto: CometStateDto, previous?: CometState): Record<number, number> {
  const memory: Record<number, number> = previous?.memory ? { ...previous.memory } : {};

  for (const row of dto.sourceRows) {
    row.machineWords.forEach((word, offset) => {
      memory[(row.address + offset) & 0xffff] = word;
    });
  }

  for (const row of dto.memoryWindow) {
    memory[row.address] = row.value;
  }

  if (dto.lastMemoryReadAddress !== null) {
    memory[dto.lastMemoryReadAddress] = dto.mdr;
  }

  if (dto.lastMemoryWriteAddress !== null) {
    memory[dto.lastMemoryWriteAddress] = dto.mdr;
  }

  return memory;
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
  const executable = new Set(["NOP", "LD", "LAD", "ADDA", "SUBA", "ADDL", "SUBL", "AND", "OR", "XOR", "CPA", "CPL", "SLA", "SRA", "SLL", "SRL", "ST", "JUMP", "JZE", "JNZ", "JPL", "JMI", "JOV", "RET"]);
  return sourceRows
    .filter((row) => row.instruction !== null && executable.has(row.instruction))
    .map((row) => {
      const op = row.instruction as AssembledInstruction["op"];
      const machineWord = row.machineWords[0] ?? 0;
      const gr = op === "NOP" || op === "RET" || op === "JUMP" || op === "JZE" || op === "JNZ" || op === "JPL" || op === "JMI" || op === "JOV" ? undefined : (machineWord >> 4) & 0x0f;
      return {
        address: row.address,
        line: row.line,
        op,
        source: row.source,
        size: row.machineWords.length || (op === "RET" ? 1 : 2),
        gr,
        operandLabel: operandLabelForAddress(sourceRows, row.operandAddress),
        operandAddress: row.operandAddress ?? undefined,
        indexRegister: row.indexRegister ?? undefined
      };
    });
}

function visualPathFromDto(dto: CometStateDto): VisualPathKind {
  if (dto.lastInstructionKind === "NOP") return VisualPathKind.None;
  if (dto.lastInstructionKind === "LD") return VisualPathKind.LD_MemoryToMdrToGr;
  if (dto.lastInstructionKind === "ADDA") return VisualPathKind.ADDA_GrMdrToAluToGr;
  if (dto.lastInstructionKind === "ADDL" || dto.lastInstructionKind === "AND" || dto.lastInstructionKind === "OR" || dto.lastInstructionKind === "XOR") {
    return VisualPathKind.ADDA_GrMdrToAluToGr;
  }
  if (dto.lastInstructionKind === "LAD") return VisualPathKind.LAD_AddressToGr;
  if (dto.lastInstructionKind === "SUBA") return VisualPathKind.SUBA_GrMdrToAluToGr;
  if (dto.lastInstructionKind === "SUBL") return VisualPathKind.SUBA_GrMdrToAluToGr;
  if (dto.lastInstructionKind === "CPA" || dto.lastInstructionKind === "CPL") return VisualPathKind.CPA_GrMdrToAluToFr;
  if (dto.lastInstructionKind === "SLA" || dto.lastInstructionKind === "SRA" || dto.lastInstructionKind === "SLL" || dto.lastInstructionKind === "SRL") {
    return VisualPathKind.Shift_AddressToAluToGr;
  }
  if (dto.lastInstructionKind === "ST") return VisualPathKind.ST_GrToMdrToMemory;
  if (dto.lastInstructionKind === "JUMP") return VisualPathKind.Jump_AddressToPr;
  if (dto.lastInstructionKind === "JZE" || dto.lastInstructionKind === "JNZ" || dto.lastInstructionKind === "JPL" || dto.lastInstructionKind === "JMI" || dto.lastInstructionKind === "JOV") {
    return dto.currentInstructionAddress === dto.effectiveAddress ? VisualPathKind.ConditionalJump_AddressToPr : VisualPathKind.ConditionalJump_NotTaken;
  }
  if (dto.lastInstructionKind === "RET" || dto.runState === "Finished") return VisualPathKind.Finished_None;
  if (dto.runState === "Ready") return VisualPathKind.Ready_PrToMar;
  return VisualPathKind.None;
}

function changedRegistersFromDto(dto: CometStateDto): string[] {
  if (!dto.lastInstructionKind) return [];

  const changed = ["PR", "IR"];
  if (dto.lastInstructionKind === "LD" || dto.lastInstructionKind === "LAD" || dto.lastInstructionKind === "ADDA" || dto.lastInstructionKind === "SUBA" ||
    dto.lastInstructionKind === "ADDL" || dto.lastInstructionKind === "SUBL" || dto.lastInstructionKind === "AND" ||
    dto.lastInstructionKind === "OR" || dto.lastInstructionKind === "XOR") {
    if (dto.lastRegisterWriteIndex !== null) changed.push(`GR${dto.lastRegisterWriteIndex}`);
    changed.push("MAR", "MDR");
    if (dto.lastInstructionKind === "LAD") changed.pop();
    if (dto.lastInstructionKind === "ADDA" || dto.lastInstructionKind === "SUBA" || dto.lastInstructionKind === "ADDL" ||
      dto.lastInstructionKind === "SUBL" || dto.lastInstructionKind === "AND" || dto.lastInstructionKind === "OR" ||
      dto.lastInstructionKind === "XOR") changed.push("FR");
  }
  if (dto.lastInstructionKind === "SLA" || dto.lastInstructionKind === "SRA" || dto.lastInstructionKind === "SLL" || dto.lastInstructionKind === "SRL") {
    if (dto.lastRegisterWriteIndex !== null) changed.push(`GR${dto.lastRegisterWriteIndex}`);
    changed.push("MAR", "FR");
  }
  if (dto.lastInstructionKind === "CPA" || dto.lastInstructionKind === "CPL") {
    changed.push("MAR", "MDR", "FR");
  }
  if (dto.lastInstructionKind === "ST") {
    changed.push("MAR", "MDR");
  }
  if (dto.lastInstructionKind === "JUMP" || dto.lastInstructionKind === "JZE" || dto.lastInstructionKind === "JNZ" || dto.lastInstructionKind === "JPL" || dto.lastInstructionKind === "JMI" || dto.lastInstructionKind === "JOV") {
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

function memoryRowsForDefaultWindow(state: Pick<CometState, "memory" | "memoryRows" | "sourceMap" | "changedMemoryAddresses" | "currentAddress" | "pr" | "mar" | "lastMemoryReadAddress" | "lastMemoryWriteAddress">): MemoryRow[] {
  const start = state.sourceMap.length > 0 ? Math.min(...state.sourceMap.map((row) => row.address)) : START_ADDRESS;
  return selectMemoryWindow(state as CometState, start, Math.min(0xffff, start + MEMORY_VIEW_DEFAULT_ROWS - 1));
}

function findLastInstructionRow(dto: CometStateDto): SourceRowDto | undefined {
  const kind = dto.lastInstructionKind;
  if (!kind) return undefined;

  return dto.sourceRows.find((row) => {
    if (row.instruction !== kind) return false;
    if ((row.machineWords[0] ?? 0) !== dto.ir0) return false;
    if (kind === "RET") return true;
    return row.operandAddress === (dto.baseAddress ?? dto.effectiveAddress);
  });
}

function traceDetail(dto: CometStateDto): string {
  const register = dto.lastRegisterWriteIndex ?? ((dto.ir0 >> 4) & 0x0f);
  const address = dto.effectiveAddress ?? 0;
  const indexDetail = dto.baseAddress !== null && dto.indexRegister !== null && dto.indexValue !== null && dto.effectiveAddress !== null
    ? `base: ${formatWord(dto.baseAddress)} index: GR${dto.indexRegister}=${formatWord(dto.indexValue)} effective: ${formatWord(dto.effectiveAddress)}; `
    : "";
  if (dto.lastInstructionKind === "LD") return `${indexDetail}Memory[${formatWord(address)}] -> MDR -> GR${register}`;
  if (dto.lastInstructionKind === "LAD") return `${indexDetail}Effective address ${formatWord(address)} -> GR${register}`;
  if (dto.lastInstructionKind === "ADDA") return `${indexDetail}GR${register} + MDR -> ALU -> GR${register}`;
  if (dto.lastInstructionKind === "SUBA") return `${indexDetail}GR${register} - MDR -> ALU -> GR${register}`;
  if (dto.lastInstructionKind === "ADDL") return `${indexDetail}GR${register} + MDR (unsigned) -> ALU -> GR${register}`;
  if (dto.lastInstructionKind === "SUBL") return `${indexDetail}GR${register} - MDR (unsigned) -> ALU -> GR${register}`;
  if (dto.lastInstructionKind === "AND" || dto.lastInstructionKind === "OR" || dto.lastInstructionKind === "XOR") {
    return `${indexDetail}GR${register} ${dto.lastInstructionKind} MDR -> ALU -> GR${register}`;
  }
  if (dto.lastInstructionKind === "CPA") return `${indexDetail}GR${register} - MDR -> ALU -> FR`;
  if (dto.lastInstructionKind === "CPL") return `${indexDetail}GR${register} compared with MDR (unsigned) -> FR`;
  if (dto.lastInstructionKind === "SLA" || dto.lastInstructionKind === "SRA" || dto.lastInstructionKind === "SLL" || dto.lastInstructionKind === "SRL") {
    return `${indexDetail}GR${register} shifted by ${formatWord(address)} -> Shifter -> GR${register} / FR`;
  }
  if (dto.lastInstructionKind === "ST") return `${indexDetail}GR${register} -> MDR -> Memory[${formatWord(address)}]`;
  if (dto.lastInstructionKind === "JUMP") return `${indexDetail}PR <- ${formatWord(address)}`;
  if (dto.lastInstructionKind === "JZE" || dto.lastInstructionKind === "JNZ" || dto.lastInstructionKind === "JPL" || dto.lastInstructionKind === "JMI" || dto.lastInstructionKind === "JOV") {
    return dto.currentInstructionAddress === dto.effectiveAddress ? `${indexDetail}PR <- ${formatWord(address)}` : `${indexDetail}Condition not met; PR advanced`;
  }
  if (dto.lastInstructionKind === "NOP") return "No operation; PR advanced to the next word.";
  if (dto.lastInstructionKind === "RET") return "Program finished without jumping to an invalid address.";
  return "";
}

function traceFromDto(dto: CometStateDto, previous?: CometState): TraceEvent[] {
  const previousTrace = previous?.trace ?? [];
  if (!dto.lastInstructionKind || dto.stepCount <= (previous?.stepIndex ?? 0)) {
    return previousTrace.map((event) => ({ ...event }));
  }

  const row = findLastInstructionRow(dto);
  const changedRegisterIndex = dto.lastRegisterWriteIndex;
  const changedMemoryAddress = dto.lastMemoryWriteAddress ?? undefined;
  const event: TraceEvent = {
    index: dto.stepCount,
    address: row?.address ?? dto.currentInstructionAddress ?? dto.pr,
    instruction: dto.lastInstructionKind,
    detail: traceDetail(dto),
    source: row?.source ?? undefined,
    pr: dto.pr,
    visualPath: visualPathFromDto(dto),
    changedRegister: changedRegisterIndex !== null ? `GR${changedRegisterIndex}` : undefined,
    changedRegisterValueBefore: changedRegisterIndex !== null ? previous?.gr[changedRegisterIndex] : undefined,
    changedRegisterValueAfter: changedRegisterIndex !== null ? dto.gr[changedRegisterIndex] : undefined,
    changedMemoryAddress,
    changedMemoryValueBefore: changedMemoryAddress !== undefined ? previous?.memory[changedMemoryAddress] ?? 0 : undefined,
    changedMemoryValueAfter: changedMemoryAddress !== undefined ? dto.mdr : undefined,
    baseAddress: dto.baseAddress ?? undefined,
    indexRegister: dto.indexRegister ?? undefined,
    indexValue: dto.indexValue ?? undefined,
    effectiveAddress: dto.effectiveAddress ?? undefined,
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
  const memory = memoryFromDto(dto, options.previous);
  const changedRegisters = changedRegistersFromDto(dto);
  const changedMemoryAddresses = [
    ...dto.memoryWindow.filter((row) => row.isChanged).map((row) => row.address),
    ...(dto.lastMemoryWriteAddress !== null ? [dto.lastMemoryWriteAddress] : [])
  ].filter((address, index, addresses) => addresses.indexOf(address) === index);
  const assembled = dto.runState !== "Idle" && dto.runState !== "Dirty" && dto.runState !== "Error" && dto.sourceRows.length > 0;
  const output = options.output ?? (options.previous ? [...options.previous.output] : defaultOutput(dto));
  const sourceMap = sourceMapFromDto(dto.sourceRows);
  const partialStateForMemoryRows = {
    memory,
    memoryRows: [] as MemoryRow[],
    sourceMap,
    changedMemoryAddresses,
    currentAddress: dto.currentInstructionAddress ?? undefined,
    pr: dto.pr,
    mar: dto.mar,
    lastMemoryReadAddress: dto.lastMemoryReadAddress ?? undefined,
    lastMemoryWriteAddress: dto.lastMemoryWriteAddress ?? undefined
  };
  const memoryRows = memoryRowsForDefaultWindow(partialStateForMemoryRows);

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
    sourceMap,
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
    lastMemoryReadAddress: dto.lastMemoryReadAddress ?? undefined,
    lastMemoryWriteAddress: dto.lastMemoryWriteAddress ?? undefined,
    lastBaseAddress: dto.baseAddress ?? undefined,
    lastIndexRegister: dto.indexRegister ?? undefined,
    lastIndexValue: dto.indexValue ?? undefined,
    lastEffectiveAddress: dto.effectiveAddress ?? undefined,
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
    baseAddress: null,
    indexRegister: null,
    indexValue: null,
    effectiveAddress: null,
    memoryWindow: [],
    sourceRows: [],
    diagnostics: []
  }, { output });
}
