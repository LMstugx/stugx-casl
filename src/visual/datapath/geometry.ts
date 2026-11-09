/**
 * Fixed layout of the workbench datapath. Everything here is immutable configuration:
 * part positions, structural buses, junctions, control lines, and the route of each
 * path that can become active. Coordinates are in the 960 x 470 viewBox.
 */

export const DATAPATH_VIEWBOX = { width: 960, height: 470 } as const;
export const MEMORY_VISIBLE_ROWS = 12;
export const GENERAL_REGISTER_COUNT = 8;

export type DatapathPathKind = "address" | "data" | "flag";

export const grRowY = (index: number): number => 191 + 30 * index;
export const memoryRowY = (row: number): number => 127 + 26 * row;

export const ZONES = [
  { id: "control", x: 28, y: 8, width: 176, height: 364, labelX: 36, labelY: 388, labelAnchor: "start" },
  { id: "address", x: 232, y: 12, width: 330, height: 116, labelX: 554, labelY: 120, labelAnchor: "end" },
  { id: "arithmetic", x: 238, y: 142, width: 370, height: 312, labelX: 600, labelY: 448, labelAnchor: "end" }
] as const;

/** Buses that are part of the diagram and are always drawn (ADR 0023, rule 1). */
export const STRUCTURAL_BUSES = [
  { id: "pr-mux", d: "M324 32H446" },
  { id: "sp-mux", d: "M324 99H346V43H446" },
  { id: "ea-mux", d: "M423 98H432V54H446" },
  { id: "mux-mar", d: "M460 43H470" },
  { id: "mar-memory", d: "M554 43H708" },
  { id: "decoder-ea", d: "M184 126H222V136H386V98H393" },
  { id: "gr-stubs", d: "M370 191H380M370 221H380M370 251H380M370 281H380M370 311H380M370 341H380M370 371H380M370 401H380" },
  { id: "gr-bus", d: "M380 140V440" },
  { id: "gr-ea", d: "M380 140H408V113" },
  { id: "gr-alu-a", d: "M380 270H490V250" },
  { id: "gr-mdr", d: "M380 183H610" },
  { id: "mdr-alu-b", d: "M652 206V230H562V250" },
  // The result leaves the ALU on the left of its lower edge and passes beside the flag register, not through it.
  { id: "alu-gr", d: "M510 326V344H448V440H380" },
  { id: "alu-fr", d: "M560 317V356" },
  { id: "mdr-memory", d: "M694 183H702V88H708" },
  { id: "mdr-ir", d: "M652 160V8H115V16" },
  { id: "ir-decoder", d: "M115 66V90" },
  { id: "decoder-controller", d: "M75 200V222M155 200V222" },
  // The effective address can also reach PR (jumps, CALL), MDR (PUSH), and ALU input B (shift count).
  { id: "ea-pr", d: "M408 83V72H282V66" },
  { id: "ea-down", d: "M432 98V240H552V250" },
  // PR shares the top bus with MDR: return address out (CALL) and in (RET).
  { id: "pr-top", d: "M282 20V8" }
] as const;

/** Real splits and merges of the general-register bus (ADR 0023, rule 2). */
export const JUNCTIONS = [
  { id: "gr-bus-ea", x: 380, y: 140 },
  { id: "gr-bus-mdr", x: 380, y: 183 },
  { id: "gr-bus-alu", x: 380, y: 270 },
  { id: "gr-bus-result", x: 380, y: 440 },
  { id: "ea-split", x: 432, y: 98 },
  { id: "ea-mdr", x: 432, y: 183 },
  { id: "pr-top", x: 282, y: 8 }
] as const;

export const BUS_WIDTH_MARKS = [
  { id: "address-bus", x1: 626, y1: 48, x2: 634, y2: 38, textX: 636, textY: 36 },
  { id: "data-bus", x1: 516, y1: 188, x2: 524, y2: 178, textX: 526, textY: 176 }
] as const;

export const CONTROL_LINES = {
  "gr-select": "M99 200V210H232V300H250",
  "alu-op": "M120 362V456H458V290H470",
  "gr-write": "M95 362V446H310V434",
  "fr-write": "M145 362V464H462V384H470",
  "mem-read": "M190 255H218V3H700V60H708",
  "mem-write": "M190 279H212V6H704V74H708"
} as const;

export type ControlLineId = keyof typeof CONTROL_LINES;

interface PathContext {
  grIndex?: number;
  memoryRow?: number;
}

interface PathTemplate {
  kind: DatapathPathKind;
  needs?: "grIndex" | "memoryRow";
  d: (context: Required<PathContext>) => string;
}

/**
 * Every route that can be highlighted. A route is drawn only when the view model lists it,
 * and it ends with exactly one arrowhead at its destination (ADR 0023, rule 3).
 */
export const PATH_TEMPLATES = {
  "pr-to-mux": { kind: "address", d: () => "M324 32H444" },
  "sp-to-mux": { kind: "address", d: () => "M324 99H346V43H444" },
  "decoder-to-ea": { kind: "address", d: () => "M184 126H222V136H386V98H391" },
  "gr-to-ea": { kind: "address", needs: "grIndex", d: ({ grIndex }) => `M370 ${grRowY(grIndex)}H380V140H408V115` },
  "ea-to-mux": { kind: "address", d: () => "M423 98H432V54H444" },
  "mux-to-mar": { kind: "address", d: () => "M460 43H468" },
  "mar-to-memory": { kind: "address", d: () => "M554 43H706" },
  // Inside the chip the route runs from the row up the left margin to the DATA pin.
  "memory-to-mdr": { kind: "data", needs: "memoryRow", d: ({ memoryRow }) => `M718 ${memoryRowY(memoryRow)}H715V88H702V183H700` },
  "mdr-to-memory": { kind: "data", needs: "memoryRow", d: ({ memoryRow }) => `M698 183H702V88H715V${memoryRowY(memoryRow)}H718` },
  "mdr-to-ir": { kind: "data", d: () => "M652 158V8H115V15" },
  "ir-to-decoder": { kind: "data", d: () => "M115 66V88" },
  "mdr-to-gr": { kind: "data", needs: "grIndex", d: ({ grIndex }) => `M606 183H386V${grRowY(grIndex)}H373` },
  "gr-to-mdr": { kind: "data", needs: "grIndex", d: ({ grIndex }) => `M370 ${grRowY(grIndex)}H380V183H604` },
  "gr-to-alu-a": { kind: "data", needs: "grIndex", d: ({ grIndex }) => `M370 ${grRowY(grIndex)}H380V270H490V247` },
  "mdr-to-alu-b": { kind: "data", d: () => "M652 210V230H562V247" },
  "alu-to-gr": { kind: "data", needs: "grIndex", d: ({ grIndex }) => `M510 326V344H448V440H386V${grRowY(grIndex)}H373` },
  "alu-to-fr": { kind: "flag", d: () => "M560 317V353" },
  "decoder-to-controller": { kind: "data", d: () => "M75 200V220" },
  "ea-to-gr": { kind: "data", needs: "grIndex", d: ({ grIndex }) => `M408 115V140H386V${grRowY(grIndex)}H373` },
  "ea-to-alu-b": { kind: "data", d: () => "M423 98H432V240H552V247" },
  "ea-to-mdr": { kind: "data", d: () => "M423 98H432V183H604" },
  "ea-to-pr": { kind: "address", d: () => "M408 83V72H282V68" },
  "pr-to-mdr": { kind: "data", d: () => "M282 20V8H652V154" },
  "mdr-to-pr": { kind: "address", d: () => "M652 158V8H282V18" }
} as const satisfies Record<string, PathTemplate>;

export type DatapathPathId = keyof typeof PATH_TEMPLATES;

export function pathKind(id: DatapathPathId): DatapathPathKind {
  return PATH_TEMPLATES[id].kind;
}

/**
 * Returns the route of an active path, or null when the view model omitted an index the
 * route needs. A path with a missing index is not drawn: showing less is correct, guessing is not.
 */
export function resolvePath(id: DatapathPathId, context: PathContext): string | null {
  const template: PathTemplate = PATH_TEMPLATES[id];
  if (template.needs === "grIndex") {
    const index = context.grIndex;
    if (index === undefined || !Number.isInteger(index) || index < 0 || index >= GENERAL_REGISTER_COUNT) return null;
  }
  if (template.needs === "memoryRow") {
    const row = context.memoryRow;
    if (row === undefined || !Number.isInteger(row) || row < 0 || row >= MEMORY_VISIBLE_ROWS) return null;
  }
  return template.d({ grIndex: context.grIndex ?? 0, memoryRow: context.memoryRow ?? 0 });
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Splits an orthogonal path made of M, H, and V commands into straight segments. */
export function pathSegments(d: string): Segment[] {
  const segments: Segment[] = [];
  let x = 0;
  let y = 0;
  for (const match of d.matchAll(/([MHV])\s*(-?\d+(?:\.\d+)?)(?:[\s,]+(-?\d+(?:\.\d+)?))?/g)) {
    const command = match[1];
    const first = Number(match[2]);
    if (command === "M") {
      x = first;
      y = Number(match[3]);
    } else if (command === "H") {
      segments.push({ x1: x, y1: y, x2: first, y2: y });
      x = first;
    } else {
      segments.push({ x1: x, y1: y, x2: x, y2: first });
      y = first;
    }
  }
  return segments;
}

export function pointOnPath(d: string, px: number, py: number): boolean {
  return pathSegments(d).some(({ x1, y1, x2, y2 }) => {
    const withinX = px >= Math.min(x1, x2) && px <= Math.max(x1, x2);
    const withinY = py >= Math.min(y1, y2) && py <= Math.max(y1, y2);
    return withinX && withinY && (x1 === x2 ? px === x1 : py === y1);
  });
}
