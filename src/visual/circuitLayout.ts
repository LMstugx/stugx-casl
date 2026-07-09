export const CIRCUIT_VIEWBOX = { width: 1120, height: 536 };
export const CIRCUIT_MEMORY_ROW_COUNT = 11;

export type RectLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export const circuitLayout = {
  ir: { x: 36, y: 34, w: 144, h: 62 },
  decoder: { x: 36, y: 114, w: 144, h: 106 },
  controller: { x: 36, y: 240, w: 144, h: 84 },
  display: { x: 36, y: 350, w: 186, h: 72 },
  pr: { x: 260, y: 36, w: 116, h: 60 },
  addressResult: { x: 404, y: 43, w: 90, h: 46 },
  sp: { x: 528, y: 36, w: 110, h: 60 },
  mar: { x: 668, y: 36, w: 126, h: 60 },
  gr: { x: 232, y: 144, w: 190, h: 266 },
  alu: { x: 452, y: 154, w: 236, h: 210 },
  mdr: { x: 718, y: 230, w: 110, h: 66 },
  fr: { x: 502, y: 394, w: 154, h: 56 },
  memory: { x: 852, y: 88, w: 230, h: 360 },
  sourceMap: { x: 250, y: 438, w: 278, h: 70 }
} satisfies Record<string, RectLayout>;

const alu = circuitLayout.alu;

export const circuitBusLanes = {
  addressY: 24,
  controlY: 124,
  dataBypassY: circuitLayout.alu.y + circuitLayout.alu.h + 18,
  dataComputeY: circuitLayout.alu.y + 106,
  grBusX: circuitLayout.gr.x + circuitLayout.gr.w + 6,
  aluLeftBusX: circuitLayout.alu.x - 14,
  aluRightBusX: circuitLayout.alu.x + circuitLayout.alu.w + 16,
  memoryBusX: circuitLayout.memory.x - 18
} as const;

export type CircuitPoint = {
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function rectPoint(layout: RectLayout, side: "left" | "right" | "top" | "bottom", offset = 0.5): CircuitPoint {
  const normalizedOffset = clamp(offset, 0, 1);
  if (side === "left") return { x: layout.x, y: layout.y + layout.h * normalizedOffset };
  if (side === "right") return { x: layout.x + layout.w, y: layout.y + layout.h * normalizedOffset };
  if (side === "top") return { x: layout.x + layout.w * normalizedOffset, y: layout.y };
  return { x: layout.x + layout.w * normalizedOffset, y: layout.y + layout.h };
}

export function registerRowY(index: number): number {
  return circuitLayout.gr.y + 50.5 + clamp(index, 0, 7) * 27;
}

export function memoryRowY(address: number, windowStart = 0x20): number {
  const index = clamp(address - windowStart, 0, CIRCUIT_MEMORY_ROW_COUNT - 1);
  return circuitLayout.memory.y + 65 + index * 28;
}

export const circuitAnchors = {
  pr: {
    right: () => rectPoint(circuitLayout.pr, "right"),
    left: () => rectPoint(circuitLayout.pr, "left"),
    top: () => rectPoint(circuitLayout.pr, "top")
  },
  addressResult: {
    left: () => rectPoint(circuitLayout.addressResult, "left"),
    right: () => rectPoint(circuitLayout.addressResult, "right")
  },
  sp: {
    left: () => rectPoint(circuitLayout.sp, "left"),
    right: () => rectPoint(circuitLayout.sp, "right")
  },
  mar: {
    left: () => rectPoint(circuitLayout.mar, "left"),
    right: () => rectPoint(circuitLayout.mar, "right"),
    outputToMemory: () => rectPoint(circuitLayout.mar, "right", 0.5)
  },
  gr: {
    rowLeft: (index: number) => ({ x: circuitLayout.gr.x + 16, y: registerRowY(index) }),
    rowRight: (index: number) => ({ x: circuitLayout.gr.x + 174, y: registerRowY(index) })
  },
  alu: {
    inputA: () => ({ x: circuitLayout.alu.x, y: circuitLayout.alu.y + 82 }),
    inputB: () => ({ x: circuitLayout.alu.x + circuitLayout.alu.w, y: circuitLayout.alu.y + 116 }),
    outputY: () => ({ x: circuitLayout.alu.x, y: circuitLayout.alu.y + 150 }),
    flagOut: () => ({ x: circuitLayout.alu.x + circuitLayout.alu.w / 2, y: circuitLayout.alu.y + circuitLayout.alu.h })
  },
  mdr: {
    left: () => rectPoint(circuitLayout.mdr, "left"),
    right: () => rectPoint(circuitLayout.mdr, "right"),
    top: () => rectPoint(circuitLayout.mdr, "top"),
    bottom: () => rectPoint(circuitLayout.mdr, "bottom"),
    outputToAlu: () => rectPoint(circuitLayout.mdr, "left", 0.58),
    inputFromMemory: () => rectPoint(circuitLayout.mdr, "right", 0.45)
  },
  memory: {
    rowLeft: (address: number, windowStart = 0x20) => ({ x: circuitLayout.memory.x + 12, y: memoryRowY(address, windowStart) }),
    rowRight: (address: number, windowStart = 0x20) => ({ x: circuitLayout.memory.x + circuitLayout.memory.w - 12, y: memoryRowY(address, windowStart) })
  },
  fr: {
    input: () => rectPoint(circuitLayout.fr, "top")
  }
};

export const aluPolygonPoints = [
  [alu.x + 18, alu.y],
  [alu.x + alu.w - 18, alu.y],
  [alu.x + alu.w, alu.y + 38],
  [alu.x + alu.w, alu.y + alu.h - 38],
  [alu.x + alu.w - 18, alu.y + alu.h],
  [alu.x + 18, alu.y + alu.h],
  [alu.x, alu.y + alu.h - 24],
  [alu.x, alu.y + 24]
]
  .map(([x, y]) => `${x},${y}`)
  .join(" ");
