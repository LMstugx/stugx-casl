import { memo } from "react";
import type { CSSProperties } from "react";
import { formatHex16 } from "../../utils/format";
import { GENERAL_REGISTER_COUNT, MEMORY_VISIBLE_ROWS, grRowY } from "./geometry";
import type { DatapathViewModel } from "./model";
import type { ResolvedPath } from "./wires";

/**
 * Motion of one step (ADR 0024). Everything here is laid over a picture that is already
 * correct: removing this layer changes nothing a learner can read. Every element is hidden
 * by default in the stylesheet, so a disabled animation leaves nothing behind.
 */

export interface PulseRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const REGISTER_WINDOWS = {
  pr: { x: 246, y: 38 },
  sp: { x: 246, y: 94 },
  mar: { x: 476, y: 38 },
  mdr: { x: 616, y: 178 }
} as const;

/** The value windows and memory rows that this step rewrote. */
export function rewrittenRects(model: DatapathViewModel): PulseRect[] {
  const rects: PulseRect[] = [];
  for (const id of Object.keys(REGISTER_WINDOWS) as (keyof typeof REGISTER_WINDOWS)[]) {
    if (model[id].state === "changed") rects.push({ id, ...REGISTER_WINDOWS[id], width: 72, height: 22 });
  }
  model.gr.slice(0, GENERAL_REGISTER_COUNT).forEach((cell, index) => {
    if (cell.state === "changed") rects.push({ id: `gr${index}`, x: 276, y: grRowY(index) - 12, width: 86, height: 24 });
  });
  model.memory.rows.slice(0, MEMORY_VISIBLE_ROWS).forEach((row, index) => {
    if (row.access === "write") rects.push({ id: `memory-row-${index}`, x: 713, y: 114 + 26 * index, width: 236, height: 26 });
  });
  return rects;
}

function stageStyle(stage: number, extra: CSSProperties = {}): CSSProperties {
  return { ...extra, ["--dp-stage" as string]: stage };
}

interface MotionLayerProps {
  model: DatapathViewModel;
  paths: readonly ResolvedPath[];
}

export const MotionLayer = memo(function MotionLayer({ model, paths }: MotionLayerProps) {
  const lastStage = paths.reduce((latest, path) => Math.max(latest, path.stage), -1);
  return (
    <g data-layer="motion" aria-hidden="true">
      {paths.map((path) => (
        <path key={`flow:${path.d}`} className="dp-flow" data-flow-for={path.id} d={path.d} />
      ))}
      {paths.map((path) =>
        path.value === undefined ? null : (
          <g
            key={`token:${path.d}`}
            className={`dp-token dp-token--${path.kind}`}
            data-token-for={path.id}
            data-stage={path.stage}
            style={stageStyle(path.stage, { offsetPath: `path("${path.d}")` })}
          >
            <rect x={-17} y={-7.5} width={34} height={15} rx={7.5} />
            <text x={0} y={3.6} textAnchor="middle">
              {formatHex16(path.value)}
            </text>
          </g>
        )
      )}
      {rewrittenRects(model).map((rect) => (
        <rect
          key={`pulse:${rect.id}`}
          className="dp-pulse"
          data-pulse-for={rect.id}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          rx={4}
          // A rewritten value pulses after the last word has arrived.
          style={stageStyle(lastStage + 1)}
        />
      ))}
    </g>
  );
});
