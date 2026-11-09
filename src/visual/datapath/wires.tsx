import { memo } from "react";
import {
  BUS_WIDTH_MARKS,
  CONTROL_LINES,
  JUNCTIONS,
  STRUCTURAL_BUSES,
  pathKind,
  pointOnPath,
  resolvePath,
  type ControlLineId,
  type DatapathPathId,
  type DatapathPathKind
} from "./geometry";
import type { ActivePath } from "./model";

const PATH_KINDS: readonly DatapathPathKind[] = ["address", "data", "flag"];

export interface ResolvedPath {
  id: DatapathPathId;
  kind: DatapathPathKind;
  d: string;
  /** Word carried on the path, when the view model gives one. */
  value?: number;
  /** Order inside the step. Defaults to 0. */
  stage: number;
}

function normalizedStage(stage: number | undefined): number {
  return stage !== undefined && Number.isInteger(stage) && stage > 0 ? stage : 0;
}

/** Turns the active paths of a view model into routes. A path whose index is missing is dropped. */
export function resolveActivePaths(paths: readonly ActivePath[]): ResolvedPath[] {
  const resolved: ResolvedPath[] = [];
  const seen = new Set<string>();
  for (const path of paths) {
    const d = resolvePath(path.id, path);
    if (d === null || seen.has(d)) continue;
    seen.add(d);
    resolved.push({ id: path.id, kind: pathKind(path.id), d, value: path.value, stage: normalizedStage(path.stage) });
  }
  return resolved;
}

/** Arrowhead definitions. They are referenced by active paths only. */
export function ArrowMarkers({ idPrefix }: { idPrefix: string }) {
  return (
    <defs>
      {PATH_KINDS.map((kind) => (
        <marker key={kind} id={`${idPrefix}-${kind}`} viewBox="0 0 8 8" refX={7} refY={4} markerWidth={5.5} markerHeight={5.5} orient="auto">
          <path className={`dp-arrow dp-arrow--${kind}`} d="M0 0L8 4L0 8z" />
        </marker>
      ))}
    </defs>
  );
}

/** Buses that belong to the diagram. They never carry a marker and never change. */
export const StructuralBuses = memo(function StructuralBuses() {
  return (
    <g data-layer="structural-buses">
      {STRUCTURAL_BUSES.map((bus) => (
        <path key={bus.id} className="dp-bus" data-bus-id={bus.id} d={bus.d} />
      ))}
      {BUS_WIDTH_MARKS.map((mark) => (
        <g key={mark.id} data-bus-width={mark.id}>
          <path className="dp-bus-width" d={`M${mark.x1} ${mark.y1}L${mark.x2} ${mark.y2}`} />
          <text className="dp-bits" x={mark.textX} y={mark.textY}>
            16
          </text>
        </g>
      ))}
    </g>
  );
});

export const Junctions = memo(function Junctions({ paths }: { paths: readonly ResolvedPath[] }) {
  return (
    <g data-layer="junctions">
      {JUNCTIONS.map((junction) => {
        const through = paths.find((path) => pointOnPath(path.d, junction.x, junction.y));
        return (
          <circle
            key={junction.id}
            className="dp-junction"
            data-junction={junction.id}
            data-kind={through ? through.kind : "none"}
            cx={junction.x}
            cy={junction.y}
            r={2.8}
          />
        );
      })}
    </g>
  );
});

interface ControlLinesProps {
  asserted: readonly ControlLineId[];
  /**
   * When set, each asserted line draws once from the controller to its target (ADR 0024).
   * A new key restarts the drawing. Idle lines never move.
   */
  motionKey?: string | number;
}

export const ControlLines = memo(function ControlLines({ asserted, motionKey }: ControlLinesProps) {
  return (
    <g data-layer="control-lines">
      {(Object.keys(CONTROL_LINES) as ControlLineId[]).map((id) => {
        const isAsserted = asserted.includes(id);
        const signals = isAsserted && motionKey !== undefined;
        return (
          <path
            key={signals ? `${id}:${motionKey}` : id}
            className={signals ? "dp-control dp-control--signal" : "dp-control"}
            data-control-line={id}
            data-asserted={isAsserted ? "true" : "false"}
            d={CONTROL_LINES[id]}
            // Normalised length lets one keyframe draw a line of any length.
            pathLength={signals ? 1 : undefined}
          />
        );
      })}
    </g>
  );
});

/** The routes that are active right now. Each ends with exactly one arrowhead. */
export const ActivePaths = memo(function ActivePaths({ paths, markerPrefix }: { paths: readonly ResolvedPath[]; markerPrefix: string }) {
  return (
    <g data-layer="active-paths">
      {paths.map((path) => (
        <path
          key={`${path.id}:${path.d}`}
          className={`dp-path dp-path--${path.kind}`}
          data-path-id={path.id}
          data-path-kind={path.kind}
          d={path.d}
          markerEnd={`url(#${markerPrefix}-${path.kind})`}
        />
      ))}
    </g>
  );
});
