import { CometState, MemoryRow, RegisterState, formatFlags, formatWord } from "./types";

export function selectMemoryWindow(state: CometState, start = 0x20, end = 0x2a): MemoryRow[] {
  return state.memoryRows.filter((row) => row.address >= start && row.address <= end);
}

export function selectHighlightedSourceLine(state: CometState): number | undefined {
  return state.currentLine;
}

export function formatRegisterDisplay(register: RegisterState, state?: CometState): string {
  if (register.name === "FR" && state) {
    return `${formatWord(register.value, 3)} (${formatFlags(state.fr)})`;
  }
  return formatWord(register.value);
}
