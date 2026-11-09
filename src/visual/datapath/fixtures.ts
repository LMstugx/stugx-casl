import type { DatapathViewModel, MemoryRowView, WordCell } from "./model";

/**
 * Static view models for tests and the development preview. They are hand-written moments of
 * two small programs. Production code never imports this file; the real view model is built
 * from the runtime snapshot.
 */

const idle = (value: number): WordCell => ({ value, state: "idle" });
const selected = (value: number): WordCell => ({ value, state: "selected" });
const changed = (value: number, previous: number): WordCell => ({ value, state: "changed", previous });

function registers(values: readonly number[], overrides: Record<number, WordCell> = {}): WordCell[] {
  return values.map((value, index) => overrides[index] ?? idle(value));
}

/** LD GR1,A / ADDA GR1,B / ST GR1,C / RET, loaded at 0020. */
const ADD_PROGRAM_ROWS: readonly MemoryRowView[] = [
  { address: 0x0020, value: 0x1010, source: "LD GR1,A" },
  { address: 0x0021, value: 0x0027 },
  { address: 0x0022, value: 0x2010, source: "ADDA GR1,B" },
  { address: 0x0023, value: 0x0028 },
  { address: 0x0024, value: 0x1110, source: "ST GR1,C" },
  { address: 0x0025, value: 0x0029 },
  { address: 0x0026, value: 0x8100, source: "RET" },
  { address: 0x0027, value: 0x0005, label: "A", source: "DC 5" },
  { address: 0x0028, value: 0x0006, label: "B", source: "DC 6" },
  { address: 0x0029, value: 0x0000, label: "C", source: "DS 1" },
  { address: 0x002a, value: 0x0000 },
  { address: 0x002b, value: 0x0000 }
];

/** The tail of a table-sum program: ADDONE reads TBL indexed by GR1. */
const TABLE_PROGRAM_ROWS: readonly MemoryRowView[] = [
  { address: 0x0035, value: 0x1031, source: "LD GR3,TBL,GR1", current: true },
  { address: 0x0036, value: 0x003b, current: true },
  { address: 0x0037, value: 0x2423, source: "ADDA GR2,GR3" },
  { address: 0x0038, value: 0x7130, source: "POP GR3" },
  { address: 0x0039, value: 0x8100, source: "RET" },
  { address: 0x003a, value: 0x0003, label: "N", source: "DC 3" },
  { address: 0x003b, value: 0x0005, label: "TBL", source: "DC 5,7,9" },
  { address: 0x003c, value: 0x0007, label: "TBL+1" },
  { address: 0x003d, value: 0x0009, label: "TBL+2" },
  { address: 0x003e, value: 0x0000, label: "ANS", source: "DS 1" },
  { address: 0x003f, value: 0x0001, label: "LEN", source: "DC 1" },
  { address: 0x0040, value: 0x0000 }
];

function withRow(rows: readonly MemoryRowView[], index: number, patch: Partial<MemoryRowView>): MemoryRowView[] {
  return rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row));
}

const NO_PINS = { adr: false, rd: false, wr: false, data: false } as const;

const LD_DECODER = { op: 0x10, r: 3, x: 1, adr: 0x003b, opText: "LD", rText: "GR3", xText: "GR1", adrText: "TBL" } as const;
const ADDA_DECODER = { op: 0x20, r: 1, x: 0, adr: 0x0028, opText: "ADDA", rText: "GR1", xText: "-", adrText: "B" } as const;
const ST_DECODER = { op: 0x11, r: 1, x: 0, adr: 0x0029, opText: "ST", rText: "GR1", xText: "-", adrText: "C" } as const;

/** Assembled and ready, before the first fetch. Nothing is active. */
export const idleFixture: DatapathViewModel = {
  ir: { word0: null, word1: null },
  decoder: null,
  controller: { phaseText: "ready", instructionText: "", signals: [] },
  pr: idle(0x0020),
  sp: idle(0xfffe),
  mar: idle(0x0020),
  mdr: idle(0x0000),
  gr: registers([0, 0, 0, 0, 0, 0, 0, 0]),
  ea: { value: null },
  mux: { selected: null },
  alu: { operator: null },
  fr: { of: false, sf: false, zf: false },
  memory: { rows: ADD_PROGRAM_ROWS, pins: NO_PINS },
  activeParts: [],
  activePaths: [],
  assertedControlLines: []
};

/** LD GR3,TBL,GR1, effective-address phase: TBL + GR1 goes through the selector into MAR. */
export const ldEffectiveAddressFixture: DatapathViewModel = {
  ir: { word0: 0x1031, word1: 0x003b },
  decoder: LD_DECODER,
  controller: {
    phaseText: "effective-address 3/8",
    instructionText: "LD GR3,TBL,GR1",
    signals: [
      { id: "mar-load", text: "MAR <- EA", asserted: true },
      { id: "mem-read", text: "MEM.RD", asserted: false },
      { id: "mdr-load", text: "MDR <- MEM", asserted: false },
      { id: "alu", text: "ALU idle", asserted: false }
    ]
  },
  pr: idle(0x0037),
  sp: idle(0xfffc),
  mar: changed(0x003c, 0x0037),
  mdr: idle(0x003b),
  gr: registers([0, 1, 5, 0, 0, 0, 0, 0], { 1: selected(1) }),
  ea: { value: 0x003c },
  mux: { selected: "ea" },
  alu: { operator: null },
  fr: { of: false, sf: true, zf: false },
  memory: { rows: TABLE_PROGRAM_ROWS, pins: NO_PINS },
  activeParts: ["decoder", "controller", "gr", "ea", "mux", "mar"],
  activePaths: [
    { id: "decoder-to-ea", value: 0x003b, stage: 0 },
    { id: "gr-to-ea", grIndex: 1, value: 0x0001, stage: 0 },
    { id: "ea-to-mux", value: 0x003c, stage: 1 },
    { id: "mux-to-mar", stage: 2 }
  ],
  assertedControlLines: ["gr-select"]
};

/** LD GR3,TBL,GR1, operand-read phase: memory word 003C goes into MDR. */
export const ldOperandReadFixture: DatapathViewModel = {
  ...ldEffectiveAddressFixture,
  controller: {
    phaseText: "operand-read 4/8",
    instructionText: "LD GR3,TBL,GR1",
    signals: [
      { id: "mar-load", text: "MAR <- EA", asserted: false },
      { id: "mem-read", text: "MEM.RD", asserted: true },
      { id: "mdr-load", text: "MDR <- MEM", asserted: true },
      { id: "alu", text: "ALU idle", asserted: false }
    ]
  },
  mar: selected(0x003c),
  mdr: changed(0x0007, 0x003b),
  gr: registers([0, 1, 5, 0, 0, 0, 0, 0]),
  mux: { selected: null },
  memory: { rows: withRow(TABLE_PROGRAM_ROWS, 7, { access: "read" }), pins: { adr: true, rd: true, wr: false, data: true } },
  activeParts: ["controller", "mar", "memory", "mdr"],
  activePaths: [
    { id: "mar-to-memory", value: 0x003c, stage: 0 },
    { id: "memory-to-mdr", memoryRow: 7, value: 0x0007, stage: 1 }
  ],
  assertedControlLines: ["mem-read"]
};

const ADD_PROGRAM_AT_ADDA = withRow(withRow(ADD_PROGRAM_ROWS, 2, { current: true }), 3, { current: true });

/** ADDA GR1,B, execute phase: GR1 and MDR meet in the ALU. */
export const addaExecuteFixture: DatapathViewModel = {
  ir: { word0: 0x2010, word1: 0x0028 },
  decoder: ADDA_DECODER,
  controller: {
    phaseText: "execute 5/8",
    instructionText: "ADDA GR1,B",
    signals: [
      { id: "alu-op", text: "ALU = ADD", asserted: true },
      { id: "gr-write", text: "GR1 <- Y", asserted: false },
      { id: "fr-write", text: "FR <- F", asserted: false },
      { id: "mem-read", text: "MEM.RD", asserted: false }
    ]
  },
  pr: idle(0x0024),
  sp: idle(0xfffe),
  mar: idle(0x0028),
  mdr: selected(0x0006),
  gr: registers([0, 5, 0, 0, 0, 0, 0, 0], { 1: selected(5) }),
  ea: { value: null },
  mux: { selected: null },
  alu: { operator: "+" },
  fr: { of: false, sf: false, zf: false },
  memory: { rows: ADD_PROGRAM_AT_ADDA, pins: NO_PINS },
  activeParts: ["controller", "gr", "mdr", "alu"],
  activePaths: [
    { id: "gr-to-alu-a", grIndex: 1, value: 0x0005 },
    { id: "mdr-to-alu-b", value: 0x0006 }
  ],
  assertedControlLines: ["alu-op"]
};

/** ADDA GR1,B, write-back phase: the ALU result rewrites GR1. */
export const addaWriteBackFixture: DatapathViewModel = {
  ...addaExecuteFixture,
  controller: {
    phaseText: "write-back 6/8",
    instructionText: "ADDA GR1,B",
    signals: [
      { id: "alu-op", text: "ALU = ADD", asserted: false },
      { id: "gr-write", text: "GR1 <- Y", asserted: true },
      { id: "fr-write", text: "FR <- F", asserted: false },
      { id: "mem-read", text: "MEM.RD", asserted: false }
    ]
  },
  mdr: idle(0x0006),
  gr: registers([0, 0x000b, 0, 0, 0, 0, 0, 0], { 1: changed(0x000b, 0x0005) }),
  activeParts: ["controller", "alu", "gr"],
  activePaths: [{ id: "alu-to-gr", grIndex: 1, value: 0x000b }],
  assertedControlLines: ["gr-write"]
};

const ADD_PROGRAM_AT_ST = withRow(withRow(withRow(ADD_PROGRAM_ROWS, 4, { current: true }), 5, { current: true }), 9, { value: 0x000b, access: "write" });

/** ST GR1,C, write-back phase: MDR rewrites memory word 0029. */
export const stWriteFixture: DatapathViewModel = {
  ir: { word0: 0x1110, word1: 0x0029 },
  decoder: ST_DECODER,
  controller: {
    phaseText: "write-back 5/6",
    instructionText: "ST GR1,C",
    signals: [
      { id: "mem-write", text: "MEM.WR", asserted: true },
      { id: "mdr-load", text: "MDR <- GR1", asserted: false },
      { id: "mar-load", text: "MAR <- EA", asserted: false }
    ]
  },
  pr: idle(0x0026),
  sp: idle(0xfffe),
  mar: selected(0x0029),
  mdr: selected(0x000b),
  gr: registers([0, 0x000b, 0, 0, 0, 0, 0, 0]),
  ea: { value: null },
  mux: { selected: null },
  alu: { operator: null },
  fr: { of: false, sf: false, zf: false },
  memory: { rows: ADD_PROGRAM_AT_ST, pins: { adr: true, rd: false, wr: true, data: true } },
  activeParts: ["controller", "mar", "mdr", "memory"],
  activePaths: [
    { id: "mar-to-memory", value: 0x0029, stage: 0 },
    { id: "mdr-to-memory", memoryRow: 9, value: 0x000b, stage: 1 }
  ],
  assertedControlLines: ["mem-write"]
};

export const DATAPATH_FIXTURES = {
  idle: idleFixture,
  "ld-effective-address": ldEffectiveAddressFixture,
  "ld-operand-read": ldOperandReadFixture,
  "adda-execute": addaExecuteFixture,
  "adda-write-back": addaWriteBackFixture,
  "st-write": stWriteFixture
} as const;

export type DatapathFixtureId = keyof typeof DATAPATH_FIXTURES;
