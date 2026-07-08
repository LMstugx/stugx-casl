import { CometState, MemoryRow, RegisterState, formatFlags, formatWord } from "./types";

export const MEMORY_VIEW_DEFAULT_ROWS = 64;
export const MEMORY_VIEW_MAX_ROWS = 256;

export function selectMemoryWindow(state: CometState, start = 0x20, end = 0x2a): MemoryRow[] {
  const normalizedStart = clampAddress(start);
  const normalizedEnd = clampAddress(Math.max(normalizedStart, end));
  const labels = labelByAddress(state);
  const changed = new Set(state.changedMemoryAddresses);

  return Array.from({ length: normalizedEnd - normalizedStart + 1 }, (_, index) => {
    const address = normalizedStart + index;
    return {
      address,
      value: state.memory[address] ?? 0,
      label: labels.get(address),
      changed: changed.has(address),
      current: address === state.currentAddress || address === state.pr,
      isPr: address === state.pr,
      isMar: address === state.mar,
      isLastRead: state.lastMemoryReadAddress === address,
      isLastWrite: state.lastMemoryWriteAddress === address
    };
  });
}

export function selectMemoryViewerRows(state: CometState, startAddress = selectProgramStartAddress(state), rowCount = MEMORY_VIEW_DEFAULT_ROWS): MemoryRow[] {
  const start = clampAddress(startAddress);
  const count = clampRowCount(rowCount);
  return selectMemoryWindow(state, start, Math.min(0xffff, start + count - 1));
}

export function selectProgramStartAddress(state: CometState): number {
  const sourceAddresses = state.sourceMap.map((row) => row.address);
  if (sourceAddresses.length === 0) return 0x20;
  return Math.min(...sourceAddresses);
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

function clampAddress(address: number): number {
  if (!Number.isFinite(address)) return 0;
  return Math.max(0, Math.min(0xffff, Math.floor(address)));
}

function clampRowCount(rowCount: number): number {
  if (!Number.isFinite(rowCount)) return MEMORY_VIEW_DEFAULT_ROWS;
  return Math.max(1, Math.min(MEMORY_VIEW_MAX_ROWS, Math.floor(rowCount)));
}

function labelByAddress(state: CometState): Map<number, string> {
  const labels = new Map<number, string>();
  for (const entry of state.sourceMap) {
    if (entry.label) labels.set(entry.address, entry.label);
  }
  for (const row of state.memoryRows) {
    if (row.label) labels.set(row.address, row.label);
  }
  return labels;
}
