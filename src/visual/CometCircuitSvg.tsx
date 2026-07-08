import { memo } from "react";
import { selectMemoryWindow } from "../core/selectors";
import { CometState, formatFlags, formatWord } from "../core/types";
import { CIRCUIT_VIEWBOX, circuitLayout, aluPolygonPoints, RectLayout } from "./circuitLayout";
import { resolveActiveWireIds, resolveVisualPath } from "./visualPathResolver";
import { wirePaths } from "./wirePaths";
import type { ReactNode } from "react";

type ModuleProps = {
  layout: RectLayout;
  title: string;
  value?: string;
  accent?: boolean;
  testId?: string;
  children?: ReactNode;
};

function Module({ layout, title, value, accent, testId, children }: ModuleProps) {
  return (
    <g className={accent ? "circuit-module circuit-module-active" : "circuit-module"} data-testid={testId} data-active={accent ? "true" : "false"}>
      <rect x={layout.x} y={layout.y} width={layout.w} height={layout.h} rx="10" />
      <text className="module-title" x={layout.x + layout.w / 2} y={layout.y + 22} textAnchor="middle">
        {title}
      </text>
      {value ? (
        <text className="module-value" x={layout.x + layout.w / 2} y={layout.y + layout.h / 2 + 18} textAnchor="middle">
          {value}
        </text>
      ) : null}
      {children}
    </g>
  );
}

function DecoderModule({ state }: { state: CometState }) {
  const op = (state.ir >> 12) & 0xf;
  const gr = (state.ir >> 4) & 0xf;
  return (
    <Module layout={circuitLayout.decoder} title="Decoder" testId="module-decoder">
      {[
        ["OP", op.toString(16).toUpperCase()],
        ["GR", gr.toString(16).toUpperCase()],
        ["XR", "0"],
        ["adr", formatWord(state.mar)]
      ].map(([name, value], index) => (
        <g key={name}>
          <rect x={circuitLayout.decoder.x + 18} y={circuitLayout.decoder.y + 34 + index * 18} width="110" height="18" rx="4" />
          <text className="module-small" x={circuitLayout.decoder.x + 34} y={circuitLayout.decoder.y + 48 + index * 18}>
            {name}
          </text>
          <text className="module-small module-green" x={circuitLayout.decoder.x + 100} y={circuitLayout.decoder.y + 48 + index * 18} textAnchor="middle">
            {value}
          </text>
        </g>
      ))}
    </Module>
  );
}

function ControllerModule({ state }: { state: CometState }) {
  return (
    <Module layout={circuitLayout.controller} title="Controller" testId="module-controller">
      <text className="module-small" x={circuitLayout.controller.x + 28} y={circuitLayout.controller.y + 52}>
        Step
      </text>
      <text className="module-small module-green" x={circuitLayout.controller.x + 104} y={circuitLayout.controller.y + 52} textAnchor="middle">
        {state.stepIndex.toString().padStart(2, "0")}
      </text>
      <text className="module-small" x={circuitLayout.controller.x + 28} y={circuitLayout.controller.y + 78}>
        State
      </text>
      <text className="module-small module-green" x={circuitLayout.controller.x + 104} y={circuitLayout.controller.y + 78} textAnchor="middle">
        {state.runState}
      </text>
    </Module>
  );
}

function GeneralRegisters({ state }: { state: CometState }) {
  const activeInstruction = state.lastStep?.executedInstruction ?? state.currentInstruction ?? "";
  const activeRegister = /GR([0-7])/i.exec(activeInstruction)?.[0]?.toUpperCase();

  return (
    <Module layout={circuitLayout.gr} title="General Registers" testId="module-gr">
      {state.gr.map((value, index) => {
        const changed = state.changedRegisters.includes(`GR${index}`);
        const active = changed || activeRegister === `GR${index}`;
        return (
          <g key={index} className={changed ? "register-row changed" : "register-row"} data-testid={`register-gr${index}`} data-active={active ? "true" : "false"}>
            <rect x={circuitLayout.gr.x + 16} y={circuitLayout.gr.y + 38 + index * 27} width="158" height="25" rx="5" />
            <text className="module-small" x={circuitLayout.gr.x + 34} y={circuitLayout.gr.y + 55 + index * 27}>
              GR{index}
            </text>
            <text className="module-small module-green" x={circuitLayout.gr.x + 126} y={circuitLayout.gr.y + 55 + index * 27} textAnchor="middle">
              {formatWord(value)}
            </text>
          </g>
        );
      })}
    </Module>
  );
}

function AluModule({ state }: { state: CometState }) {
  return (
    <g className="circuit-module alu-module" data-testid="module-alu">
      <polygon points={aluPolygonPoints} />
      <text className="module-title" x={circuitLayout.alu.x + circuitLayout.alu.w / 2} y={circuitLayout.alu.y + 64} textAnchor="middle">
        ALU
      </text>
      <text className="module-small" x={circuitLayout.alu.x + 72} y={circuitLayout.alu.y + 92}>
        A
      </text>
      <text className="module-small module-green" x={circuitLayout.alu.x + 126} y={circuitLayout.alu.y + 92} textAnchor="middle">
        {formatWord(state.gr[1] ?? 0)}
      </text>
      <text className="module-small" x={circuitLayout.alu.x + 72} y={circuitLayout.alu.y + 122}>
        B
      </text>
      <text className="module-small module-green" x={circuitLayout.alu.x + 126} y={circuitLayout.alu.y + 122} textAnchor="middle">
        {formatWord(state.mdr)}
      </text>
      <text className="module-small" x={circuitLayout.alu.x + 72} y={circuitLayout.alu.y + 152}>
        F
      </text>
      <text className="module-small module-red" x={circuitLayout.alu.x + 126} y={circuitLayout.alu.y + 152} textAnchor="middle">
        {formatFlags(state.fr)}
      </text>
    </g>
  );
}

function MemoryModule({ state }: { state: CometState }) {
  const rows = selectMemoryWindow(state, 0x20, 0x2a).slice(0, 11);
  return (
    <Module layout={circuitLayout.memory} title="Memory" testId="module-memory">
      {rows.map((row, index) => {
        const active = row.changed || row.current || row.address === state.mar;
        return (
        <g key={row.address} className={active ? "memory-svg-row changed" : "memory-svg-row"} data-testid={`memory-row-${formatWord(row.address)}`} data-active={active ? "true" : "false"}>
          <rect x={circuitLayout.memory.x + 12} y={circuitLayout.memory.y + 36 + index * 28} width="102" height="26" rx="4" />
          <text className="module-small module-blue" x={circuitLayout.memory.x + 34} y={circuitLayout.memory.y + 54 + index * 28} textAnchor="middle">
            {formatWord(row.address)}
          </text>
          <text className="module-small module-green" x={circuitLayout.memory.x + 82} y={circuitLayout.memory.y + 54 + index * 28} textAnchor="middle">
            {formatWord(row.value)}
          </text>
        </g>
      );
      })}
    </Module>
  );
}

function CometCircuitSvg({ state }: { state: CometState }) {
  const activeWireIds = resolveActiveWireIds(resolveVisualPath(state));

  return (
    <svg className="comet-circuit" viewBox={`0 0 ${CIRCUIT_VIEWBOX.width} ${CIRCUIT_VIEWBOX.height}`} role="img" aria-label="COMET II circuit" data-testid="comet-circuit-svg">
      <defs>
        <marker id="arrow-blue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" className="marker-blue" />
        </marker>
        <marker id="arrow-red" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M 0 0 L 8 4 L 0 8 z" className="marker-red" />
        </marker>
      </defs>

      <g className="wire-layer">
        {wirePaths.map((path) => {
          const active = activeWireIds.has(path.id);
          return (
            <path
              key={path.id}
              d={path.d}
              data-testid={`wire-${path.id}`}
              data-active={active ? "true" : "false"}
              data-path-id={path.id}
              className={`wire wire-${path.role} ${active ? "wire-active" : ""}`}
              markerEnd={active ? "url(#arrow-red)" : path.role === "control" ? "url(#arrow-blue)" : undefined}
            />
          );
        })}
      </g>

      <Module layout={circuitLayout.ir} title="IR" value={formatWord(state.ir)} accent={state.changedRegisters.includes("IR")} testId="module-ir" />
      <DecoderModule state={state} />
      <ControllerModule state={state} />
      <Module layout={circuitLayout.display} title="Display" testId="module-display">
        <text className="display-text" x={circuitLayout.display.x + circuitLayout.display.w / 2} y={circuitLayout.display.y + 62} textAnchor="middle">
          {state.runState === "Finished" ? "DONE" : formatWord(state.pr)}
        </text>
      </Module>
      <Module layout={circuitLayout.pr} title="PR" value={formatWord(state.pr)} accent={state.changedRegisters.includes("PR")} testId="module-pr" />
      <Module layout={circuitLayout.addressResult} title="+2" value={formatWord(state.pr + 2)} testId="module-address-result" />
      <Module layout={circuitLayout.sp} title="SP" value={formatWord(state.sp)} testId="module-sp" />
      <Module layout={circuitLayout.mar} title="MAR" value={formatWord(state.mar)} accent={state.changedRegisters.includes("MAR")} testId="module-mar" />
      <GeneralRegisters state={state} />
      <AluModule state={state} />
      <Module layout={circuitLayout.mdr} title="MDR" value={formatWord(state.mdr)} accent={state.changedRegisters.includes("MDR")} testId="module-mdr" />
      <Module layout={circuitLayout.fr} title="FR" value={formatWord((state.fr.z ? 4 : 0) | (state.fr.c ? 2 : 0) | (state.fr.n ? 1 : 0))} testId="module-fr" />
      <MemoryModule state={state} />
      <Module layout={circuitLayout.sourceMap} title="SourceMap" testId="module-source-map">
        <g data-testid="source-map-highlight" data-current-line={state.currentLine ?? ""}>
          <rect x={circuitLayout.sourceMap.x + 12} y={circuitLayout.sourceMap.y + 36} width={circuitLayout.sourceMap.w - 24} height="34" rx="5" />
        </g>
        <text className="module-small module-blue" x={circuitLayout.sourceMap.x + 18} y={circuitLayout.sourceMap.y + 54}>
          {state.currentAddress !== undefined ? formatWord(state.currentAddress) : "----"}
        </text>
        <text className="module-small" x={circuitLayout.sourceMap.x + 82} y={circuitLayout.sourceMap.y + 54}>
          {state.currentInstruction ?? "No active line"}
        </text>
      </Module>
    </svg>
  );
}

export default memo(CometCircuitSvg);
