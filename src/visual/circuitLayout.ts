export const CIRCUIT_VIEWBOX = { width: 1160, height: 640 };

export type RectLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export const circuitLayout = {
  ir: { x: 44, y: 48, w: 146, h: 70 },
  decoder: { x: 44, y: 150, w: 146, h: 116 },
  controller: { x: 44, y: 300, w: 146, h: 92 },
  display: { x: 44, y: 442, w: 210, h: 94 },
  pr: { x: 350, y: 48, w: 116, h: 68 },
  addressResult: { x: 502, y: 58, w: 98, h: 48 },
  sp: { x: 640, y: 48, w: 116, h: 68 },
  mar: { x: 808, y: 48, w: 126, h: 68 },
  gr: { x: 290, y: 182, w: 190, h: 274 },
  alu: { x: 610, y: 214, w: 190, h: 188 },
  mdr: { x: 852, y: 262, w: 110, h: 72 },
  fr: { x: 610, y: 478, w: 140, h: 70 },
  memory: { x: 996, y: 120, w: 126, h: 390 },
  sourceMap: { x: 300, y: 520, w: 236, h: 86 }
} satisfies Record<string, RectLayout>;

export const aluPolygonPoints = [
  [610, 214],
  [668, 214],
  [684, 250],
  [736, 250],
  [800, 214],
  [760, 308],
  [800, 402],
  [610, 402],
  [650, 308]
]
  .map(([x, y]) => `${x},${y}`)
  .join(" ");
