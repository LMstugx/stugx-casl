import { memo, useId, useMemo } from "react";
import { DATAPATH_VIEWBOX, ZONES } from "./geometry";
import type { DatapathLabels, DatapathPartId, DatapathViewModel } from "./model";
import { MotionLayer } from "./motion";
import {
  AluPart,
  ControllerPart,
  DecoderPart,
  EaAdderPart,
  FlagRegisterPart,
  InstructionRegisterPart,
  MemoryChipPart,
  MuxPart,
  RegisterFilePart,
  RegisterPart
} from "./parts";
import { ActivePaths, ArrowMarkers, ControlLines, Junctions, StructuralBuses, resolveActivePaths } from "./wires";

interface DatapathCanvasProps {
  model: DatapathViewModel;
  labels: DatapathLabels;
  /** Compact presentation for the data-focus layout. Same component, same model. */
  compact?: boolean;
  /**
   * "play" lays the motion of this step over the picture (ADR 0024). The caller asks for it
   * after a forward step only; a reverse step, a reset, or an assemble passes "none".
   */
  motion?: "none" | "play";
  /** Identifies the step. Motion restarts when it changes, and replaces motion still running. */
  stepKey?: string | number;
  /** The wire names the runtime reported as active, published for tests and debugging. */
  activeWires?: readonly string[];
}

/**
 * The workbench datapath (ADR 0023). It draws the view model it is given and nothing else:
 * no machine state is derived here.
 */
export const DatapathCanvas = memo(function DatapathCanvas({ model, labels, compact = false, motion = "none", stepKey = 0, activeWires }: DatapathCanvasProps) {
  const markerPrefix = `dp-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const activeParts = useMemo(() => new Set<DatapathPartId>(model.activeParts), [model.activeParts]);
  const paths = useMemo(() => resolveActivePaths(model.activePaths), [model.activePaths]);
  const zoneLabels = { control: labels.zoneControl, address: labels.zoneAddress, arithmetic: labels.zoneArithmetic };

  return (
    <svg
      className="dp"
      data-testid="comet-circuit-svg"
      data-compact={compact ? "true" : "false"}
      data-motion={motion}
      data-active-wires={activeWires?.join(" ")}
      viewBox={`0 0 ${DATAPATH_VIEWBOX.width} ${DATAPATH_VIEWBOX.height}`}
      role="img"
      aria-label={labels.ariaLabel}
    >
      <ArrowMarkers idPrefix={markerPrefix} />
      <g data-layer="zones">
        {ZONES.map((zone) => (
          <g key={zone.id} data-zone={zone.id}>
            <rect className="dp-zone" x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx={12} />
            <text className="dp-zone-label" x={zone.labelX} y={zone.labelY} textAnchor={zone.labelAnchor}>
              {zoneLabels[zone.id]}
            </text>
          </g>
        ))}
      </g>
      <StructuralBuses />
      <Junctions paths={paths} />
      <ControlLines asserted={model.assertedControlLines} motionKey={motion === "play" ? stepKey : undefined} />
      <InstructionRegisterPart word0={model.ir.word0} word1={model.ir.word1} active={activeParts.has("ir")} />
      <DecoderPart decoder={model.decoder} active={activeParts.has("decoder")} labels={labels} />
      <ControllerPart
        phaseText={model.controller.phaseText}
        instructionText={model.controller.instructionText}
        signals={model.controller.signals}
        active={activeParts.has("controller")}
        labels={labels}
      />
      <RegisterPart id="pr" x={240} y={20} tag="PR" cell={model.pr} active={activeParts.has("pr")} pins={[{ x: 324, y: 28, orientation: "side" }]} labels={labels} />
      <RegisterPart id="sp" x={240} y={76} tag="SP" cell={model.sp} active={activeParts.has("sp")} pins={[{ x: 324, y: 95, orientation: "side" }]} labels={labels} />
      <EaAdderPart value={model.ea.value} active={activeParts.has("ea")} />
      <MuxPart selected={model.mux.selected} active={activeParts.has("mux")} />
      <RegisterPart
        id="mar"
        x={470}
        y={20}
        tag="MAR"
        cell={model.mar}
        active={activeParts.has("mar")}
        pins={[
          { x: 466, y: 39, orientation: "side" },
          { x: 554, y: 39, orientation: "side" }
        ]}
        labels={labels}
      />
      <RegisterFilePart cells={model.gr} active={activeParts.has("gr")} labels={labels} />
      <AluPart operator={model.alu.operator} />
      <RegisterPart
        id="mdr"
        x={610}
        y={160}
        tag="MDR"
        cell={model.mdr}
        active={activeParts.has("mdr")}
        pins={[
          { x: 606, y: 179, orientation: "side" },
          { x: 694, y: 179, orientation: "side" },
          { x: 648, y: 156, orientation: "end" },
          { x: 648, y: 206, orientation: "end" }
        ]}
        labels={labels}
      />
      <FlagRegisterPart flags={model.fr} active={activeParts.has("fr")} />
      <MemoryChipPart rows={model.memory.rows} pins={model.memory.pins} active={activeParts.has("memory")} labels={labels} />
      {/* Drawn last so the part of a route that runs inside the memory chip stays visible. */}
      <ActivePaths paths={paths} markerPrefix={markerPrefix} />
      {motion === "play" ? <MotionLayer key={stepKey} model={model} paths={paths} /> : null}
    </svg>
  );
});
