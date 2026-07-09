import { memo } from "react";
import { selectMemoryWindow, selectProgramStartAddress } from "../core/selectors";
import { CometState, VisualPathKind, formatFlags, formatWord } from "../core/types";
import { CIRCUIT_MEMORY_ROW_COUNT, CIRCUIT_VIEWBOX, circuitAnchors, circuitLayout, aluPolygonPoints, RectLayout } from "./circuitLayout";
import { resolveActiveWireIds, resolveVisualPath } from "./visualPathResolver";
import { buildWirePaths } from "./wirePaths";
import type { ReactNode } from "react";

type ModuleProps = {
  layout: RectLayout;
  title: string;
  value?: string;
  accent?: boolean;
  testId?: string;
  layer?: "control" | "execution" | "memory" | "flags" | "status";
  children?: ReactNode;
};

function Module({ layout, title, value, accent, testId, layer, children }: ModuleProps) {
  return (
    <g className={accent ? "circuit-module circuit-module-active" : "circuit-module"} data-testid={testId} data-active={accent ? "true" : "false"} data-layer={layer}>
      <rect x={layout.x} y={layout.y} width={layout.w} height={layout.h} rx="6" />
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

function AnchorPoint({ id, x, y }: { id: string; x: number; y: number }) {
  return <circle className="anchor-point" data-testid={id} cx={x} cy={y} r="2" aria-hidden="true" />;
}

function DecoderModule({ state }: { state: CometState }) {
  const op = (state.ir >> 12) & 0xf;
  const gr = (state.ir >> 4) & 0xf;
  return (
    <Module layout={circuitLayout.decoder} title="Decoder" testId="module-decoder" layer="control">
      {[
        ["OP", op.toString(16).toUpperCase()],
        ["GR", gr.toString(16).toUpperCase()],
        ["XR", "0"],
        ["adr", formatWord(state.mar)]
      ].map(([name, value], index) => (
        <g key={name}>
          <rect x={circuitLayout.decoder.x + 18} y={circuitLayout.decoder.y + 34 + index * 18} width="110" height="18" rx="3" />
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
    <Module layout={circuitLayout.controller} title="Controller" testId="module-controller" layer="control">
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
    <Module layout={circuitLayout.gr} title="General Registers" testId="module-gr" layer="execution">
      {state.gr.map((value, index) => {
        const changed = state.changedRegisters.includes(`GR${index}`);
        const active = changed || activeRegister === `GR${index}`;
        const left = circuitAnchors.gr.rowLeft(index);
        const right = circuitAnchors.gr.rowRight(index);
        return (
          <g key={index} className={changed ? "register-row changed" : "register-row"} data-testid={`register-gr${index}`} data-active={active ? "true" : "false"}>
            <rect x={circuitLayout.gr.x + 16} y={circuitLayout.gr.y + 38 + index * 27} width="158" height="25" rx="3" />
            <text className="module-small" x={circuitLayout.gr.x + 34} y={circuitLayout.gr.y + 55 + index * 27}>
              GR{index}
            </text>
            <text className="module-small module-green" x={circuitLayout.gr.x + 126} y={circuitLayout.gr.y + 55 + index * 27} textAnchor="middle">
              {formatWord(value)}
            </text>
            <AnchorPoint id={`gr-row-anchor-left-${index}`} x={left.x} y={left.y} />
            <AnchorPoint id={`gr-row-anchor-right-${index}`} x={right.x} y={right.y} />
          </g>
        );
      })}
    </Module>
  );
}

function activeRegisterIndex(state: CometState): number {
  const changedRegister = state.changedRegisters.find((name) => /^GR[0-7]$/.test(name));
  if (changedRegister) return Number(changedRegister.slice(2));
  const activeInstruction = state.lastStep?.executedInstruction ?? state.currentInstruction ?? "";
  const match = /GR([0-7])/i.exec(activeInstruction);
  return match ? Number(match[1]) : 1;
}

function activeMemoryAddress(state: CometState): number {
  return state.lastMemoryWriteAddress ?? state.lastMemoryReadAddress ?? state.changedMemoryAddresses[0] ?? state.mar ?? state.currentAddress ?? state.pr ?? 0x20;
}

function circuitMemoryWindowStart(state: CometState, focusAddress: number): number {
  const programStart = selectProgramStartAddress(state);
  if (focusAddress >= programStart && focusAddress < programStart + CIRCUIT_MEMORY_ROW_COUNT) return programStart;
  const halfWindow = Math.floor(CIRCUIT_MEMORY_ROW_COUNT / 2);
  return Math.max(0, Math.min(0xffff - CIRCUIT_MEMORY_ROW_COUNT + 1, focusAddress - halfWindow));
}

function AluModule({ state, registerIndex }: { state: CometState; registerIndex: number }) {
  const active =
    state.visualPath === VisualPathKind.ADDA_GrMdrToAluToGr ||
    state.visualPath === VisualPathKind.SUBA_GrMdrToAluToGr ||
    state.visualPath === VisualPathKind.CPA_GrMdrToAluToFr;
  const inputA = circuitAnchors.alu.inputA();
  const inputB = circuitAnchors.alu.inputB();
  const outputY = circuitAnchors.alu.outputY();
  const flagOut = circuitAnchors.alu.flagOut();
  return (
    <g className={active ? "circuit-module circuit-module-active alu-module" : "circuit-module alu-module"} data-testid="module-alu" data-active={active ? "true" : "false"}>
      <polygon points={aluPolygonPoints} />
      <text className="module-title" x={circuitLayout.alu.x + circuitLayout.alu.w / 2} y={circuitLayout.alu.y + 30} textAnchor="middle">
        ALU
      </text>
      {[
        ["A", formatWord(state.gr[registerIndex] ?? 0), "module-green"],
        ["B", formatWord(state.mdr), "module-green"],
        ["Y", formatWord(state.gr[registerIndex] ?? 0), "module-green"],
        ["F", formatFlags(state.fr), "module-red"]
      ].map(([label, value, className], index) => {
        const rowY = circuitLayout.alu.y + 48 + index * 31;
        return (
          <g key={label}>
            <rect className="alu-row-shell" x={circuitLayout.alu.x + 52} y={rowY} width="122" height="24" rx="3" />
            <text className="module-small" x={circuitLayout.alu.x + 70} y={rowY + 17}>
              {label}
            </text>
            <text className={`module-small ${className}`} x={circuitLayout.alu.x + 132} y={rowY + 17} textAnchor="middle">
              {value}
            </text>
          </g>
        );
      })}
      <AnchorPoint id="alu-anchor-input-a" x={inputA.x} y={inputA.y} />
      <AnchorPoint id="alu-anchor-input-b" x={inputB.x} y={inputB.y} />
      <AnchorPoint id="alu-anchor-output-y" x={outputY.x} y={outputY.y} />
      <AnchorPoint id="alu-anchor-flag-out" x={flagOut.x} y={flagOut.y} />
    </g>
  );
}

function MemoryModule({ state, focusAddress, windowStart }: { state: CometState; focusAddress: number; windowStart: number }) {
  const rows = selectMemoryWindow(state, windowStart, windowStart + CIRCUIT_MEMORY_ROW_COUNT - 1).slice(0, CIRCUIT_MEMORY_ROW_COUNT);
  const activeMemory = state.visualPath === VisualPathKind.LD_MemoryToMdrToGr || state.visualPath === VisualPathKind.ST_GrToMdrToMemory || state.changedMemoryAddresses.length > 0;
  return (
    <Module layout={circuitLayout.memory} title="Memory" accent={activeMemory} testId="module-memory" layer="memory">
      <rect className="memory-target-shell" x={circuitLayout.memory.x + circuitLayout.memory.w - 88} y={circuitLayout.memory.y + 10} width="72" height="20" rx="3" />
      <text className="memory-target-badge" x={circuitLayout.memory.x + circuitLayout.memory.w - 16} y={circuitLayout.memory.y + 24} textAnchor="end">
        Target: {formatWord(focusAddress)}
      </text>
      {rows.map((row, index) => {
        const isPr = row.address === state.pr;
        const isMar = row.address === state.mar;
        const isRead = row.address === state.lastMemoryReadAddress;
        const isWrite = row.address === state.lastMemoryWriteAddress || state.changedMemoryAddresses.includes(row.address);
        const active = row.changed || row.current || isPr || isMar || isRead || isWrite;
        const left = circuitAnchors.memory.rowLeft(row.address, windowStart);
        const right = circuitAnchors.memory.rowRight(row.address, windowStart);
        return (
        <g
          key={row.address}
          className={active ? `memory-svg-row changed ${isRead ? "read" : ""} ${isWrite ? "write" : ""}` : "memory-svg-row"}
          data-testid={`memory-row-${formatWord(row.address)}`}
          data-active={active ? "true" : "false"}
          data-pr={isPr ? "true" : "false"}
          data-mar={isMar ? "true" : "false"}
          data-read={isRead ? "true" : "false"}
          data-write={isWrite ? "true" : "false"}
        >
          <rect x={circuitLayout.memory.x + 12} y={circuitLayout.memory.y + 36 + index * 28} width={circuitLayout.memory.w - 24} height="26" rx="3" />
          <text className="module-small module-blue" x={circuitLayout.memory.x + 42} y={circuitLayout.memory.y + 54 + index * 28} textAnchor="middle">
            {formatWord(row.address)}
          </text>
          <text className="module-small module-green" x={circuitLayout.memory.x + 104} y={circuitLayout.memory.y + 54 + index * 28} textAnchor="middle">
            {formatWord(row.value)}
          </text>
          <text className="memory-label-text" x={circuitLayout.memory.x + circuitLayout.memory.w - 38} y={circuitLayout.memory.y + 54 + index * 28} textAnchor="middle">
            {row.label ?? ""}
          </text>
          <AnchorPoint id={`memory-row-anchor-left-${formatWord(row.address)}`} x={left.x} y={left.y} />
          <AnchorPoint id={`memory-row-anchor-right-${formatWord(row.address)}`} x={right.x} y={right.y} />
        </g>
      );
      })}
    </Module>
  );
}

function CometCircuitSvg({ state }: { state: CometState }) {
  const registerIndex = activeRegisterIndex(state);
  const memoryAddress = activeMemoryAddress(state);
  const memoryWindowStart = circuitMemoryWindowStart(state, memoryAddress);
  const wirePaths = buildWirePaths({ grIndex: registerIndex, memoryAddress, memoryWindowStart });
  const activeWireIds = resolveActiveWireIds(resolveVisualPath(state));
  const mdrLeft = circuitAnchors.mdr.left();
  const mdrRight = circuitAnchors.mdr.right();
  const mdrAlu = circuitAnchors.mdr.outputToAlu();
  const frInput = circuitAnchors.fr.input();

  return (
    <svg className="comet-circuit" viewBox={`0 0 ${CIRCUIT_VIEWBOX.width} ${CIRCUIT_VIEWBOX.height}`} role="img" aria-label="COMET II circuit" data-testid="comet-circuit-svg">
      <defs>
        <marker id="arrow-blue" markerUnits="userSpaceOnUse" markerWidth="6" markerHeight="6" refX="5.5" refY="3" orient="auto" viewBox="0 0 6 6">
          <path d="M 0 0 L 6 3 L 0 6 z" className="marker-blue" />
        </marker>
        <marker id="arrow-red" markerUnits="userSpaceOnUse" markerWidth="6" markerHeight="6" refX="5.5" refY="3" orient="auto" viewBox="0 0 6 6">
          <path d="M 0 0 L 6 3 L 0 6 z" className="marker-red" />
        </marker>
      </defs>

      <g className="wire-layer">
        {wirePaths.map((path) => {
          return (
            <path
              key={path.id}
              d={path.d}
              data-active="false"
              data-path-id={path.id}
              className={`wire wire-${path.role}`}
              markerEnd={path.role === "address" || path.role === "control" ? "url(#arrow-blue)" : undefined}
            />
          );
        })}
      </g>

      <g className="active-wire-layer">
        {wirePaths
          .filter((path) => activeWireIds.has(path.id))
          .map((path) => (
            <path
              key={`active-${path.id}`}
              d={path.d}
              data-testid={`wire-${path.id}`}
              data-active="true"
              data-path-id={path.id}
              className={`wire wire-${path.role} wire-active`}
              markerEnd="url(#arrow-red)"
            />
          ))}
      </g>

      <Module layout={circuitLayout.ir} title="IR" value={formatWord(state.ir)} accent={state.changedRegisters.includes("IR")} testId="module-ir" layer="control" />
      <DecoderModule state={state} />
      <ControllerModule state={state} />
      <Module layout={circuitLayout.display} title="Output" testId="module-display" layer="status">
        <text className="display-text" x={circuitLayout.display.x + circuitLayout.display.w / 2} y={circuitLayout.display.y + 62} textAnchor="middle">
          No output
        </text>
      </Module>
      <Module layout={circuitLayout.pr} title="PR" value={formatWord(state.pr)} accent={state.changedRegisters.includes("PR")} testId="module-pr" layer="control" />
      <Module layout={circuitLayout.addressResult} title="+2" value={formatWord((state.pr + 2) & 0xffff)} testId="module-address-result" layer="control" />
      <Module layout={circuitLayout.sp} title="SP" value={formatWord(state.sp)} testId="module-sp" layer="control" />
      <Module layout={circuitLayout.mar} title="MAR" value={formatWord(state.mar)} accent={state.changedRegisters.includes("MAR")} testId="module-mar" layer="control" />
      <GeneralRegisters state={state} />
      <AluModule state={state} registerIndex={registerIndex} />
      <Module layout={circuitLayout.mdr} title="MDR" value={formatWord(state.mdr)} accent={state.changedRegisters.includes("MDR")} testId="module-mdr" layer="execution">
        <AnchorPoint id="mdr-anchor-left" x={mdrLeft.x} y={mdrLeft.y} />
        <AnchorPoint id="mdr-anchor-right" x={mdrRight.x} y={mdrRight.y} />
        <AnchorPoint id="mdr-anchor-output-to-alu" x={mdrAlu.x} y={mdrAlu.y} />
      </Module>
      <Module layout={circuitLayout.fr} title="FR" value={formatWord((state.fr.z ? 4 : 0) | (state.fr.c ? 2 : 0) | (state.fr.n ? 1 : 0))} accent={state.changedRegisters.includes("FR")} testId="module-fr" layer="flags">
        <AnchorPoint id="fr-anchor-input" x={frInput.x} y={frInput.y} />
      </Module>
      <MemoryModule state={state} focusAddress={memoryAddress} windowStart={memoryWindowStart} />
      <Module layout={circuitLayout.sourceMap} title="SourceMap" testId="module-source-map" layer="status">
        <g data-testid="source-map-highlight" data-current-line={state.currentLine ?? ""}>
          <rect x={circuitLayout.sourceMap.x + 12} y={circuitLayout.sourceMap.y + 36} width={circuitLayout.sourceMap.w - 24} height="28" rx="3" />
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
