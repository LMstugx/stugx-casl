import type { CometStateDto, DiagnosticDto, SourceRowDto } from "./coreDto";
import { normalizeDiagnostic } from "../diagnostics/catalog";
import { MEMORY_VIEW_DEFAULT_ROWS, selectMemoryWindow } from "./selectors";
import { VisualPathKind, formatWord } from "./types";
import type { AssembledInstruction, CometState, Diagnostic, FlagsState, MemoryRow, RegisterState, SourceMapEntry, TraceEvent } from "./types";
import { decodeCaslOutputRecord } from "./caslIoEncoding";
import { EMPTY_MICROCYCLE_STATE, type MicrocycleHistoryRecord } from "./microcycle";
import {
  EMPTY_MICROCYCLE_HISTORY_SUMMARY,
  EMPTY_REVERSE_AVAILABILITY
} from "./reverseMicrocycle";
import { EMPTY_REVERSE_INSTRUCTION_AVAILABILITY } from "./reverseInstruction";

const START_ADDRESS = 0x20;
const INITIAL_SP = 0xfffe;
const MAX_TRACE_EVENTS = 1000;

type StateFromDtoOptions = {
  previous?: CometState;
  output?: string[];
};

function diagnosticsFromDto(diagnostics: DiagnosticDto[]): Diagnostic[] {
  return diagnostics.map((diagnostic) => normalizeDiagnostic(diagnostic));
}

function flagsFromDto(dto: CometStateDto): FlagsState {
  return {
    o: dto.frOF,
    n: dto.frSF,
    z: dto.frZF
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
  const executable = new Set(["NOP", "LD", "LAD", "ADDA", "SUBA", "ADDL", "SUBL", "AND", "OR", "XOR", "CPA", "CPL", "SLA", "SRA", "SLL", "SRL", "PUSH", "POP", "CALL", "ST", "JUMP", "JZE", "JNZ", "JPL", "JMI", "JOV", "RET", "SVC"]);
  return sourceRows
    .filter((row) => row.instruction !== null && executable.has(row.instruction))
    .map((row) => {
      const op = row.instruction as AssembledInstruction["op"];
      const machineWord = row.machineWords[0] ?? 0;
      const gr = op === "NOP" || op === "RET" || op === "PUSH" || op === "CALL" || op === "JUMP" || op === "JZE" || op === "JNZ" || op === "JPL" || op === "JMI" || op === "JOV" ? undefined : (machineWord >> 4) & 0x0f;
      return {
        address: row.address,
        line: row.line,
        op,
        source: row.source,
        size: row.machineWords.length || (op === "RET" ? 1 : 2),
        gr,
        sourceRegister: row.sourceRegister ?? undefined,
        operandLabel: operandLabelForAddress(sourceRows, row.operandAddress),
        operandAddress: row.operandAddress ?? undefined,
        indexRegister: row.indexRegister ?? undefined
      };
    });
}

function visualPathFromDto(dto: CometStateDto): VisualPathKind {
  if (dto.executionGranularity === "microcycle") {
    if (dto.microcyclePhase === "fetch") return VisualPathKind.Microcycle_Fetch;
    if (dto.microcyclePhase === "decode") return VisualPathKind.Microcycle_Decode;
    if (dto.microcyclePhase === "effective-address") return VisualPathKind.Microcycle_EffectiveAddress;
    if (dto.microcyclePhase === "operand-read") {
      const row = dto.sourceRows.find((candidate) => candidate.address === dto.microcycleInstructionAddress);
      return row?.sourceRegister === undefined
        ? VisualPathKind.Microcycle_OperandReadMemory
        : VisualPathKind.Microcycle_OperandReadRegister;
    }
    if (dto.microcyclePhase === "execute") return VisualPathKind.Microcycle_Execute;
    if (dto.microcyclePhase === "write-back") {
      return dto.lastInstructionKind === "ST" || dto.lastInstructionKind === "PUSH" || dto.lastInstructionKind === "CALL"
        ? VisualPathKind.Microcycle_WriteBackMemory
        : VisualPathKind.Microcycle_WriteBackRegister;
    }
    if (dto.microcyclePhase === "flag-update") return VisualPathKind.Microcycle_FlagUpdate;
    if (dto.microcyclePhase === "complete") return VisualPathKind.Microcycle_Complete;
  }
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
  if (dto.lastInstructionKind === "PUSH") return VisualPathKind.PUSH_EffectiveAddressToStack;
  if (dto.lastInstructionKind === "POP") return VisualPathKind.POP_StackToGr;
  if (dto.lastInstructionKind === "CALL") return VisualPathKind.CALL_ReturnAddressToStackAndPr;
  if (dto.lastInstructionKind === "RET" && dto.lastMemoryReadAddress !== null) return VisualPathKind.RET_StackToPr;
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
  if (dto.executionGranularity === "microcycle") {
    if (dto.microcyclePhase === "fetch") return ["IR", "MAR", "MDR"];
    if (dto.microcyclePhase === "decode") return dto.ir1 === null ? [] : ["MAR", "MDR"];
    if (dto.microcyclePhase === "effective-address") return ["MAR"];
    if (dto.microcyclePhase === "operand-read") {
      return dto.lastMemoryReadAddress === null ? [] : ["MAR", "MDR"];
    }
    if (dto.microcyclePhase === "execute") {
      if (dto.lastInstructionKind === "ST") return ["MDR"];
      if (dto.lastInstructionKind === "PUSH" || dto.lastInstructionKind === "CALL") return ["SP", "MAR", "MDR"];
      if (dto.lastInstructionKind === "POP") return ["SP"];
      if (dto.lastInstructionKind === "RET" || /^J/.test(dto.lastInstructionKind)) return ["PR"];
      return [];
    }
    if (dto.microcyclePhase === "write-back") {
      if (dto.lastInstructionKind === "CALL") return ["PR", "SP", "MAR", "MDR"];
      if (dto.lastInstructionKind === "RET") return ["PR", "SP"];
      if (dto.lastInstructionKind === "ST" || dto.lastInstructionKind === "PUSH") return ["MAR", "MDR"];
      return dto.lastRegisterWriteIndex === null ? [] : [`GR${dto.lastRegisterWriteIndex}`];
    }
    if (dto.microcyclePhase === "flag-update") return ["FR"];
    if (dto.microcyclePhase === "complete") return ["PR"];
    return [];
  }

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
  if (dto.lastInstructionKind === "PUSH") {
    changed.push("SP", "MAR", "MDR");
  }
  if (dto.lastInstructionKind === "POP") {
    changed.push("SP", "MAR", "MDR");
    if (dto.lastRegisterWriteIndex !== null) changed.push(`GR${dto.lastRegisterWriteIndex}`);
  }
  if (dto.lastInstructionKind === "CALL") {
    changed.push("PR", "SP", "MAR", "MDR");
  }
  if (dto.lastInstructionKind === "RET" && dto.lastMemoryReadAddress !== null) {
    changed.push("PR", "SP", "MAR", "MDR");
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
      value: (dto.frOF ? 0b100 : 0) | (dto.frSF ? 0b010 : 0) | (dto.frZF ? 0b001 : 0),
      decimal: 0,
      changed: changed.has("FR")
    }
  ];
}

function memoryRowsForDefaultWindow(state: Pick<CometState, "memory" | "memoryRows" | "sourceMap" | "changedMemoryAddresses" | "currentAddress" | "pr" | "mar" | "lastMemoryReadAddress" | "lastMemoryWriteAddress">): MemoryRow[] {
  const start = state.sourceMap.length > 0 ? Math.min(...state.sourceMap.map((row) => row.address)) : START_ADDRESS;
  return selectMemoryWindow(state as CometState, start, Math.min(0xffff, start + MEMORY_VIEW_DEFAULT_ROWS - 1));
}

function findLastInstructionRow(dto: CometStateDto, previous?: CometState): SourceRowDto | undefined {
  const kind = dto.lastInstructionKind;
  if (!kind) return undefined;

  if (dto.stepCount === (previous?.stepIndex ?? -1) + 1 && previous?.currentAddress !== undefined) {
    const executedRow = dto.sourceRows.find(
      (row) => row.address === previous.currentAddress && row.instruction === kind
    );
    if (executedRow) return executedRow;
  }

  return dto.sourceRows.find((row) => {
    if (row.instruction !== kind) return false;
    if ((row.machineWords[0] ?? 0) !== dto.ir0) return false;
    if (kind === "RET") return true;
    return row.operandAddress === (dto.baseAddress ?? dto.effectiveAddress);
  });
}

function traceDetail(dto: CometStateDto, row?: CometStateDto["sourceRows"][number]): string {
  const register = dto.lastRegisterWriteIndex ?? ((dto.ir0 >> 4) & 0x0f);
  const sourceRegister = row?.sourceRegister ?? undefined;
  const address = dto.effectiveAddress ?? 0;
  const indexDetail = dto.baseAddress !== null && dto.indexRegister !== null && dto.indexValue !== null && dto.effectiveAddress !== null
    ? `base: ${formatWord(dto.baseAddress)} index: GR${dto.indexRegister}=${formatWord(dto.indexValue)} effective: ${formatWord(dto.effectiveAddress)}; `
    : "";
  if (dto.lastInstructionKind === "LD") return sourceRegister !== undefined
    ? `GR${sourceRegister} -> GR${register}; no data-memory operand read`
    : `${indexDetail}Memory[${formatWord(address)}] -> MDR -> GR${register}`;
  if (dto.lastInstructionKind === "LAD") return `${indexDetail}Effective address ${formatWord(address)} -> GR${register}`;
  if (dto.lastInstructionKind === "ADDA") return sourceRegister !== undefined ? `GR${register} + GR${sourceRegister} -> ALU -> GR${register}` : `${indexDetail}GR${register} + MDR -> ALU -> GR${register}`;
  if (dto.lastInstructionKind === "SUBA") return sourceRegister !== undefined ? `GR${register} - GR${sourceRegister} -> ALU -> GR${register}` : `${indexDetail}GR${register} - MDR -> ALU -> GR${register}`;
  if (dto.lastInstructionKind === "ADDL") return sourceRegister !== undefined ? `GR${register} + GR${sourceRegister} (unsigned) -> ALU -> GR${register}` : `${indexDetail}GR${register} + MDR (unsigned) -> ALU -> GR${register}`;
  if (dto.lastInstructionKind === "SUBL") return sourceRegister !== undefined ? `GR${register} - GR${sourceRegister} (unsigned) -> ALU -> GR${register}` : `${indexDetail}GR${register} - MDR (unsigned) -> ALU -> GR${register}`;
  if (dto.lastInstructionKind === "AND" || dto.lastInstructionKind === "OR" || dto.lastInstructionKind === "XOR") {
    return sourceRegister !== undefined
      ? `GR${register} ${dto.lastInstructionKind} GR${sourceRegister} -> ALU -> GR${register}`
      : `${indexDetail}GR${register} ${dto.lastInstructionKind} MDR -> ALU -> GR${register}`;
  }
  if (dto.lastInstructionKind === "CPA") return sourceRegister !== undefined ? `GR${register} - GR${sourceRegister} -> ALU -> FR` : `${indexDetail}GR${register} - MDR -> ALU -> FR`;
  if (dto.lastInstructionKind === "CPL") return sourceRegister !== undefined ? `GR${register} compared with GR${sourceRegister} (unsigned) -> FR` : `${indexDetail}GR${register} compared with MDR (unsigned) -> FR`;
  if (dto.lastInstructionKind === "SLA" || dto.lastInstructionKind === "SRA" || dto.lastInstructionKind === "SLL" || dto.lastInstructionKind === "SRL") {
    return `${indexDetail}GR${register} shifted by ${formatWord(address)} -> Shifter -> GR${register} / FR`;
  }
  if (dto.lastInstructionKind === "PUSH") return `${indexDetail}EA ${formatWord(address)} -> stack; SP ${formatWord(dto.sp)}; MEM[${dto.lastMemoryWriteAddress !== null ? formatWord(dto.lastMemoryWriteAddress) : "----"}] <- ${formatWord(address)}`;
  if (dto.lastInstructionKind === "POP") return `MEM[${dto.lastMemoryReadAddress !== null ? formatWord(dto.lastMemoryReadAddress) : "----"}] -> MDR -> GR${register}; SP ${formatWord(dto.sp)}`;
  if (dto.lastInstructionKind === "CALL") return `${indexDetail}return address -> stack; target ${formatWord(address)}; SP ${formatWord(dto.sp)}; callDepth ${dto.callDepth}`;
  if (dto.lastInstructionKind === "ST") return `${indexDetail}GR${register} -> MDR -> Memory[${formatWord(address)}]`;
  if (dto.lastInstructionKind === "JUMP") return `${indexDetail}PR <- ${formatWord(address)}`;
  if (dto.lastInstructionKind === "JZE" || dto.lastInstructionKind === "JNZ" || dto.lastInstructionKind === "JPL" || dto.lastInstructionKind === "JMI" || dto.lastInstructionKind === "JOV") {
    return dto.currentInstructionAddress === dto.effectiveAddress ? `${indexDetail}PR <- ${formatWord(address)}` : `${indexDetail}Condition not met; PR advanced`;
  }
  if (dto.lastInstructionKind === "NOP") return "No operation; PR advanced to the next word.";
  if (dto.lastInstructionKind === "RET") {
    return dto.lastMemoryReadAddress !== null ? `RET stack return; PR <- MEM[${formatWord(dto.lastMemoryReadAddress)}] = ${formatWord(dto.pr)}; SP ${formatWord(dto.sp)}; callDepth ${dto.callDepth}` : "RET program finish; no active call frame.";
  }
  if (dto.lastInstructionKind === "SVC") return dto.runState === "WaitingInput" ? "SVC input service is waiting for one record." : "SVC teaching operating-system service completed.";
  return "";
}

function macroGroupForRow(dto: CometStateDto, row: CometStateDto["sourceRows"][number] | undefined) {
  if (!row) return undefined;
  const match = /(?:^|\s)(IN|OUT|RPUSH|RPOP)(?:\s|$)/i.exec(row.source);
  if (!match) return undefined;
  const macroGroup = match[1].toUpperCase() as "IN" | "OUT" | "RPUSH" | "RPOP";
  const relatedRows = dto.sourceRows
    .filter((candidate) => candidate.line === row.line && candidate.source === row.source && candidate.instruction !== "DC" && candidate.instruction !== "DS")
    .sort((left, right) => left.address - right.address);
  const macroStepIndex = relatedRows.findIndex((candidate) => candidate.address === row.address) + 1;
  return {
    macroGroup,
    macroStepIndex: Math.max(1, macroStepIndex),
    macroStepCount: relatedRows.length
  };
}

function traceFromDto(dto: CometStateDto, previous?: CometState): TraceEvent[] {
  const previousTrace = previous?.trace ?? [];
  if (
    previous
    && (dto.microcycleHistorySequence ?? 0) < previous.microcycle.historySequence
  ) {
    const maximumSequence = dto.microcycleHistorySequence ?? 0;
    return previousTrace
      .filter((event) => {
        if (event.kind === "microcycle") {
          const sequence = Number(event.eventId?.split(":").at(-1) ?? Number.NaN);
          return Number.isFinite(sequence) && sequence <= maximumSequence;
        }
        return event.index <= dto.stepCount;
      })
      .map((event) => ({ ...event }));
  }
  if (
    dto.executionGranularity === "microcycle"
    && dto.microcyclePhase !== "none"
    && (dto.microcycleHistorySequence ?? 0) > (previous?.microcycle.historySequence ?? 0)
  ) {
    const row = dto.sourceRows.find((candidate) => candidate.address === dto.microcycleInstructionAddress);
    const event: TraceEvent = {
      kind: "microcycle",
      eventId: `microcycle:${dto.microcycleHistorySequence ?? 0}`,
      index: Math.max(1, dto.stepCount + (dto.microcycleInstructionComplete ? 0 : 1)),
      address: dto.microcycleInstructionAddress ?? dto.pr,
      instruction: dto.microcycleInstructionKind ?? dto.lastInstructionKind ?? "NOP",
      detail: dto.microcycleDetail ?? "",
      source: row?.source ?? undefined,
      pr: dto.pr,
      visualPath: visualPathFromDto(dto),
      runState: dto.runState,
      microcyclePhase: dto.microcyclePhase,
      microIndex: dto.microcycleIndex ?? 0,
      totalMicrosteps: dto.microcycleTotal ?? 0,
      instructionComplete: dto.microcycleInstructionComplete ?? false
    };
    return [event, ...previousTrace].slice(0, MAX_TRACE_EVENTS).map((traceEvent) => ({ ...traceEvent }));
  }
  if (!dto.lastInstructionKind || dto.stepCount <= (previous?.stepIndex ?? 0)) {
    return previousTrace.map((event) => ({ ...event }));
  }

  const row = findLastInstructionRow(dto, previous);
  const macro = macroGroupForRow(dto, row);
  const changedRegisterIndex = dto.lastRegisterWriteIndex;
  const changedMemoryAddress = dto.lastMemoryWriteAddress ?? (dto.lastInstructionKind === "RET" || dto.lastInstructionKind === "POP" ? dto.lastMemoryReadAddress ?? undefined : undefined);
  const event: TraceEvent = {
    index: dto.stepCount,
    address: row?.address ?? dto.currentInstructionAddress ?? dto.pr,
    instruction: dto.lastInstructionKind,
    detail: `${macro ? `[${macro.macroGroup} ${macro.macroStepIndex}/${macro.macroStepCount}] ` : ""}${traceDetail(dto, row)}`,
    source: row?.source ?? undefined,
    pr: dto.pr,
    visualPath: visualPathFromDto(dto),
    changedRegister: changedRegisterIndex !== null ? `GR${changedRegisterIndex}` : undefined,
    changedRegisterValueBefore: changedRegisterIndex !== null ? previous?.gr[changedRegisterIndex] : undefined,
    changedRegisterValueAfter: changedRegisterIndex !== null ? dto.gr[changedRegisterIndex] : undefined,
    changedMemoryAddress,
    changedMemoryValueBefore: changedMemoryAddress !== undefined ? previous?.memory[changedMemoryAddress] ?? 0 : undefined,
    changedMemoryValueAfter: changedMemoryAddress !== undefined ? dto.mdr : undefined,
    stackPointerValueBefore: dto.lastInstructionKind === "PUSH" || dto.lastInstructionKind === "POP" || dto.lastInstructionKind === "CALL" || (dto.lastInstructionKind === "RET" && dto.lastMemoryReadAddress !== null) ? previous?.sp : undefined,
    stackPointerValueAfter: dto.lastInstructionKind === "PUSH" || dto.lastInstructionKind === "POP" || dto.lastInstructionKind === "CALL" || (dto.lastInstructionKind === "RET" && dto.lastMemoryReadAddress !== null) ? dto.sp : undefined,
    callDepthBefore: dto.lastInstructionKind === "CALL" || dto.lastInstructionKind === "RET" ? previous?.callDepth : undefined,
    callDepthAfter: dto.lastInstructionKind === "CALL" || dto.lastInstructionKind === "RET" ? dto.callDepth : undefined,
    returnAddress: dto.lastInstructionKind === "CALL" ? ((row?.address ?? dto.pr) + 2) & 0xffff : dto.lastInstructionKind === "RET" && dto.lastMemoryReadAddress !== null ? dto.pr : undefined,
    stackAddress: dto.lastMemoryWriteAddress ?? (dto.lastInstructionKind === "RET" || dto.lastInstructionKind === "POP" ? dto.lastMemoryReadAddress ?? undefined : undefined),
    baseAddress: dto.baseAddress ?? undefined,
    indexRegister: dto.indexRegister ?? undefined,
    indexValue: dto.indexValue ?? undefined,
    effectiveAddress: dto.effectiveAddress ?? undefined,
    runState: dto.runState,
    ...macro
  };
  return [event, ...previousTrace].slice(0, MAX_TRACE_EVENTS).map((traceEvent) => ({ ...traceEvent }));
}

function defaultOutput(dto: CometStateDto): string[] {
  if (dto.runState === "Error") {
    return ["Assemble failed.", ...dto.diagnostics.map((diagnostic) => `Line ${diagnostic.line}: ${diagnostic.message}`)];
  }
  if (dto.runState === "Ready" && dto.stepCount === 0) {
    return ["Assemble succeeded. (0 errors, 0 warnings)", `Program loaded. Entry point: ${formatWord(dto.pr)}`];
  }
  return [];
}

function lastStepFromDto(dto: CometStateDto, previous?: CometState) {
  const row = findLastInstructionRow(dto, previous);
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
  const previousMicrocycle = options.previous?.microcycle ?? EMPTY_MICROCYCLE_STATE;
  const microcyclePhase = dto.microcyclePhase ?? "none";
  const microcycleHistorySequence = dto.microcycleHistorySequence ?? 0;
  const microcycle = {
    phase: microcyclePhase,
    instructionKind: dto.microcycleInstructionKind ?? undefined,
    instructionAddress: dto.microcycleInstructionAddress ?? undefined,
    sourceLine: dto.microcycleSourceLineIndex ?? undefined,
    microIndex: dto.microcycleIndex ?? 0,
    totalMicrosteps: dto.microcycleTotal ?? 0,
    instructionComplete: dto.microcycleInstructionComplete ?? false,
    historySequence: microcycleHistorySequence,
    detail: dto.microcycleDetail ?? ""
  };
  const newHistoryEntry: MicrocycleHistoryRecord | undefined =
    microcyclePhase !== "none" && microcycleHistorySequence > previousMicrocycle.historySequence
      ? {
          sequence: microcycleHistorySequence,
          instructionId: microcyclePhase === "fetch"
            ? microcycleHistorySequence
            : options.previous?.microcycleHistory[0]?.instructionId ?? microcycleHistorySequence,
          phase: microcyclePhase,
          instructionAddress: dto.microcycleInstructionAddress ?? dto.pr,
          instructionKind: dto.microcycleInstructionKind ?? undefined,
          startsAtFetch: microcyclePhase === "fetch",
          endsAtInstructionComplete: microcyclePhase === "complete",
          prBefore: options.previous?.pr ?? dto.pr,
          prAfter: dto.pr,
          spBefore: options.previous?.sp ?? dto.sp,
          spAfter: dto.sp,
          marBefore: options.previous?.mar ?? dto.mar,
          marAfter: dto.mar,
          mdrBefore: options.previous?.mdr ?? dto.mdr,
          mdrAfter: dto.mdr,
          irBefore: options.previous?.ir ?? dto.ir0,
          irAfter: dto.ir0,
          callDepthBefore: options.previous?.callDepth ?? dto.callDepth,
          callDepthAfter: dto.callDepth,
          flagsBefore: options.previous ? { ...options.previous.fr } : flagsFromDto(dto),
          flagsAfter: flagsFromDto(dto),
          runStateBefore: options.previous?.runState ?? dto.runState,
          runStateAfter: dto.runState,
          generalRegisterChanges: dto.gr.flatMap((after, index) => {
            const before = options.previous?.gr[index] ?? after;
            return before === after ? [] : [{ index, before, after }];
          }),
          memoryChanges: changedMemoryAddresses.flatMap((address) => {
            const before = options.previous?.memory[address] ?? memory[address] ?? 0;
            const after = memory[address] ?? 0;
            return before === after ? [] : [{ address, before, after }];
          })
        }
      : undefined;
  const microcycleHistory = newHistoryEntry
    ? [newHistoryEntry, ...(options.previous?.microcycleHistory ?? [])].slice(0, MAX_TRACE_EVENTS)
    : (options.previous?.microcycleHistory ?? [])
        .filter((entry) => entry.sequence <= microcycleHistorySequence)
        .slice(0, dto.microcycleHistorySummary?.retainedEntries ?? MAX_TRACE_EVENTS)
        .map((entry) => ({ ...entry }));

  return {
    assembled,
    runState: dto.runState,
    pr: dto.pr,
    sp: dto.sp,
    callDepth: dto.callDepth,
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
    consoleOutput: (dto.consoleOutput ?? []).map(decodeCaslOutputRecord),
    trace: traceFromDto(dto, options.previous),
    visualPath: visualPathFromDto(dto),
    executionGranularity: dto.executionGranularity ?? "instruction",
    microcycle,
    microcycleHistory,
    historyEpoch: dto.historyEpoch ?? options.previous?.historyEpoch ?? 0,
    timelineRevision: dto.timelineRevision ?? options.previous?.timelineRevision ?? 0,
    reverseAvailability: dto.reverseAvailability
      ? {
          available: dto.reverseAvailability.available,
          reason: dto.reverseAvailability.reason,
          targetPhase: dto.reverseAvailability.targetPhase ?? undefined
        }
      : { ...(options.previous?.reverseAvailability ?? EMPTY_REVERSE_AVAILABILITY) },
    reverseInstructionAvailability: dto.reverseInstructionAvailability
      ? {
          available: dto.reverseInstructionAvailability.available,
          reason: dto.reverseInstructionAvailability.reason,
          instructionId: dto.reverseInstructionAvailability.instructionId ?? undefined,
          machineAddress: dto.reverseInstructionAvailability.machineAddress ?? undefined,
          instructionKind: dto.reverseInstructionAvailability.instructionKind ?? undefined,
          reversibleMicrosteps: dto.reverseInstructionAvailability.reversibleMicrosteps,
          complete: dto.reverseInstructionAvailability.complete
        }
      : {
          ...(options.previous?.reverseInstructionAvailability
            ?? EMPTY_REVERSE_INSTRUCTION_AVAILABILITY)
        },
    microcycleHistorySummary: dto.microcycleHistorySummary
      ? {
          retainedEntries: dto.microcycleHistorySummary.retainedEntries,
          capacity: dto.microcycleHistorySummary.capacity,
          floorEntryId: dto.microcycleHistorySummary.floorEntryId ?? undefined,
          droppedEntryCount: dto.microcycleHistorySummary.droppedEntryCount
        }
      : { ...(options.previous?.microcycleHistorySummary ?? EMPTY_MICROCYCLE_HISTORY_SUMMARY) },
    stepIndex: dto.stepCount,
    currentLine: dto.currentSourceLineIndex ?? undefined,
    currentAddress: dto.currentInstructionAddress ?? undefined,
    currentInstruction: dto.currentInstructionText ?? undefined,
    lastStep: lastStepFromDto(dto, options.previous),
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
    callDepth: 0,
    ir0: 0,
    ir1: null,
    mar: START_ADDRESS,
    mdr: 0,
    gr: Array.from({ length: 8 }, () => 0),
    frOF: false,
    frSF: false,
    frZF: false,
    executionGranularity: "instruction",
    microcyclePhase: "none",
    microcycleInstructionAddress: null,
    microcycleInstructionKind: null,
    microcycleSourceLineIndex: null,
    microcycleIndex: 0,
    microcycleTotal: 0,
    microcycleInstructionComplete: false,
    microcycleHistorySequence: 0,
    microcycleDetail: "",
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
    consoleOutput: [],
    memoryWindow: [],
    sourceRows: [],
    diagnostics: []
  }, { output });
}
