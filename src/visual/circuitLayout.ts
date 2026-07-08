export const CIRCUIT_VIEWBOX = { width: 1100, height: 536 };

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
  pr: { x: 316, y: 36, w: 116, h: 60 },
  addressResult: { x: 456, y: 43, w: 90, h: 46 },
  sp: { x: 572, y: 106, w: 110, h: 54 },
  mar: { x: 690, y: 36, w: 126, h: 60 },
  gr: { x: 266, y: 142, w: 190, h: 266 },
  alu: { x: 488, y: 158, w: 226, h: 206 },
  mdr: { x: 742, y: 230, w: 106, h: 66 },
  fr: { x: 548, y: 394, w: 138, h: 56 },
  memory: { x: 880, y: 88, w: 160, h: 360 },
  sourceMap: { x: 266, y: 438, w: 262, h: 70 }
} satisfies Record<string, RectLayout>;

const alu = circuitLayout.alu;

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

function registerRowY(index: number): number {
  return circuitLayout.gr.y + 50.5 + clamp(index, 0, 7) * 27;
}

function memoryRowY(address: number): number {
  const index = clamp(address - 0x20, 0, 10);
  return circuitLayout.memory.y + 49 + index * 28;
}

export const circuitAnchors = {
  pr: {
    right: () => rectPoint(circuitLayout.pr, "right"),
    left: () => rectPoint(circuitLayout.pr, "left"),
    top: () => rectPoint(circuitLayout.pr, "top")
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
    outputToAlu: () => rectPoint(circuitLayout.mdr, "left", 0.58),
    inputFromMemory: () => rectPoint(circuitLayout.mdr, "right", 0.45)
  },
  memory: {
    rowLeft: (address: number) => ({ x: circuitLayout.memory.x + 12, y: memoryRowY(address) }),
    rowRight: (address: number) => ({ x: circuitLayout.memory.x + circuitLayout.memory.w - 12, y: memoryRowY(address) })
  },
  fr: {
    input: () => rectPoint(circuitLayout.fr, "top")
  }
};

export const aluPolygonPoints = [
  [alu.x + 10, alu.y],
  [alu.x + alu.w - 16, alu.y],
  [alu.x + alu.w, alu.y + 16],
  [alu.x + alu.w, alu.y + alu.h - 16],
  [alu.x + alu.w - 16, alu.y + alu.h],
  [alu.x + 10, alu.y + alu.h],
  [alu.x, alu.y + alu.h - 10],
  [alu.x, alu.y + 10]
]
  .map(([x, y]) => `${x},${y}`)
  .join(" ");
