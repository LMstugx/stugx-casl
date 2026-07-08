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
  addressResult: { x: 476, y: 48, w: 100, h: 46 },
  sp: { x: 612, y: 38, w: 120, h: 66 },
  mar: { x: 760, y: 38, w: 132, h: 66 },
  gr: { x: 262, y: 160, w: 202, h: 272 },
  alu: { x: 520, y: 142, w: 270, h: 286 },
  mdr: { x: 810, y: 248, w: 116, h: 72 },
  fr: { x: 590, y: 450, w: 158, h: 68 },
  memory: { x: 944, y: 104, w: 138, h: 372 },
  sourceMap: { x: 268, y: 466, w: 280, h: 78 }
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
    inputA: () => ({ x: circuitLayout.alu.x + 18, y: circuitLayout.alu.y + 112 }),
    inputB: () => ({ x: circuitLayout.alu.x + circuitLayout.alu.w - 18, y: circuitLayout.alu.y + 146 }),
    outputY: () => ({ x: circuitLayout.alu.x + 18, y: circuitLayout.alu.y + 214 }),
    flagOut: () => ({ x: circuitLayout.alu.x + circuitLayout.alu.w / 2, y: circuitLayout.alu.y + circuitLayout.alu.h - 30 })
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
  [alu.x, alu.y + 54],
  [alu.x + 78, alu.y + 54],
  [alu.x + 106, alu.y + 104],
  [alu.x + 164, alu.y + 104],
  [alu.x + 192, alu.y + 54],
  [alu.x + alu.w, alu.y + 54],
  [alu.x + alu.w - 44, alu.y + alu.h / 2],
  [alu.x + alu.w, alu.y + alu.h - 54],
  [alu.x + 192, alu.y + alu.h - 54],
  [alu.x + 164, alu.y + alu.h - 104],
  [alu.x + 106, alu.y + alu.h - 104],
  [alu.x + 78, alu.y + alu.h - 54],
  [alu.x, alu.y + alu.h - 54],
  [alu.x + 46, alu.y + alu.h / 2]
]
  .map(([x, y]) => `${x},${y}`)
  .join(" ");
