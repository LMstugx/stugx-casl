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
  alu: { x: 546, y: 172, w: 230, h: 226 },
  mdr: { x: 810, y: 248, w: 116, h: 72 },
  fr: { x: 590, y: 450, w: 158, h: 68 },
  memory: { x: 944, y: 104, w: 138, h: 372 },
  sourceMap: { x: 268, y: 466, w: 280, h: 78 }
} satisfies Record<string, RectLayout>;

export const aluPolygonPoints = [
  [546, 172],
  [616, 172],
  [636, 218],
  [710, 218],
  [776, 172],
  [734, 285],
  [776, 398],
  [546, 398],
  [590, 285]
]
  .map(([x, y]) => `${x},${y}`)
  .join(" ");
