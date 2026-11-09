import type { ControlLineId, DatapathPathId } from "./geometry";

export type DatapathPartId =
  | "ir"
  | "decoder"
  | "controller"
  | "pr"
  | "sp"
  | "ea"
  | "mux"
  | "mar"
  | "gr"
  | "alu"
  | "mdr"
  | "fr"
  | "memory";

/** How a value window is drawn. "changed" means rewritten by the step that produced this model. */
export type WordCellState = "idle" | "selected" | "changed";

export interface WordCell {
  value: number;
  state: WordCellState;
  /** Value before the step. Shown beside the window only when state is "changed". */
  previous?: number;
}

export interface DecoderView {
  op: number;
  r: number;
  x: number;
  adr: number | null;
  opText: string;
  rText: string;
  xText: string;
  adrText: string;
}

export interface ControlSignalView {
  id: string;
  text: string;
  asserted: boolean;
}

export type MemoryAccess = "read" | "write";

export interface MemoryRowView {
  address: number;
  value: number;
  label?: string;
  source?: string;
  access?: MemoryAccess;
  /** Row belongs to the instruction being executed. */
  current?: boolean;
}

export interface ActivePath {
  id: DatapathPathId;
  /** Required by paths that start or end at one general register row. */
  grIndex?: number;
  /** Required by paths that start or end at one visible memory row (index into memory.rows). */
  memoryRow?: number;
  /** The word this path carries in this step. When present, motion shows it travelling along the route. */
  value?: number;
  /**
   * Order inside the step, from 0. A later stage starts after the earlier one has arrived.
   * It orders events by data dependency (address before the data it selects); it is not hardware timing.
   */
  stage?: number;
}

/**
 * Everything the datapath draws. This is presentation data only: it is produced from the
 * runtime snapshot elsewhere, and nothing in src/visual/datapath derives machine state.
 */
export interface DatapathViewModel {
  ir: { word0: number | null; word1: number | null };
  decoder: DecoderView | null;
  controller: { phaseText: string; instructionText: string; signals: readonly ControlSignalView[] };
  pr: WordCell;
  sp: WordCell;
  mar: WordCell;
  mdr: WordCell;
  /** Exactly eight cells, GR0 to GR7. */
  gr: readonly WordCell[];
  ea: { value: number | null };
  mux: { selected: "pr" | "sp" | "ea" | null };
  alu: { operator: string | null };
  fr: { of: boolean; sf: boolean; zf: boolean };
  memory: {
    /** At most MEMORY_VISIBLE_ROWS rows. */
    rows: readonly MemoryRowView[];
    pins: { adr: boolean; rd: boolean; wr: boolean; data: boolean };
  };
  activeParts: readonly DatapathPartId[];
  activePaths: readonly ActivePath[];
  assertedControlLines: readonly ControlLineId[];
}

export interface DatapathLabels {
  ariaLabel: string;
  zoneControl: string;
  zoneAddress: string;
  zoneArithmetic: string;
  decoder: string;
  controller: string;
  memory: string;
  memoryAddress: string;
  memoryValue: string;
  memoryLabel: string;
  memorySource: string;
  /** Text shown beside a rewritten value, for example "was 0037". */
  previousValue: (hex: string) => string;
  /** Accessible names of the R and W row markers. */
  readMarker: string;
  writeMarker: string;
}
