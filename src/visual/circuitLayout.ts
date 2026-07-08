export const CIRCUIT_VIEWBOX = { width: 1100, height: 560 };

export type RectLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export const circuitLayout = {
  ir: { x: 38, y: 40, w: 148, h: 68 },
  decoder: { x: 38, y: 132, w: 148, h: 112 },
  controller: { x: 38, y: 270, w: 148, h: 90 },
  display: { x: 38, y: 402, w: 204, h: 84 },
  pr: { x: 322, y: 38, w: 120, h: 66 },
  addressResult: { x: 476, y: 50, w: 100, h: 46 },
  sp: { x: 604, y: 110, w: 118, h: 56 },
  mar: { x: 724, y: 38, w: 132, h: 66 },
  gr: { x: 270, y: 156, w: 196, h: 272 },
  alu: { x: 504, y: 178, w: 244, h: 220 },
  mdr: { x: 770, y: 250, w: 110, h: 70 },
  fr: { x: 552, y: 448, w: 150, h: 66 },
  memory: { x: 906, y: 104, w: 148, h: 372 },
  sourceMap: { x: 272, y: 466, w: 260, h: 78 }
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
    inputA: () => ({ x: circuitLayout.alu.x, y: circuitLayout.alu.y + 92 }),
    inputB: () => ({ x: circuitLayout.alu.x + circuitLayout.alu.w, y: circuitLayout.alu.y + 122 }),
    outputY: () => ({ x: circuitLayout.alu.x, y: circuitLayout.alu.y + 156 }),
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
  [alu.x + 28, alu.y],
  [alu.x + alu.w - 28, alu.y],
  [alu.x + alu.w, alu.y + 28],
  [alu.x + alu.w, alu.y + alu.h - 28],
  [alu.x + alu.w - 28, alu.y + alu.h],
  [alu.x + 28, alu.y + alu.h],
  [alu.x, alu.y + alu.h - 28],
  [alu.x, alu.y + 28]
]
  .map(([x, y]) => `${x},${y}`)
  .join(" ");
