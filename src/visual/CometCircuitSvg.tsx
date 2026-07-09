import { memo } from "react";
import { selectMemoryWindow, selectProgramStartAddress } from "../core/selectors";
import { CometState, VisualPathKind, formatFlags, formatWord } from "../core/types";
import { CIRCUIT_MEMORY_ROW_COUNT, CIRCUIT_VIEWBOX, circuitAnchors, circuitBusLanes, circuitLayout, aluPolygonPoints, RectLayout } from "./circuitLayout";
import { resolveActiveWireIds, resolveVisualPath } from "./visualPathResolver";
import { buildWirePaths, type WirePath } from "./wirePaths";
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

function compactInstructionText(text?: string): string | undefined {
  return text?.replace(/\s+/g, " ").trim();
}

function signalFlowClass(path: WirePath): string {
  const flowBySemanticType: Record<WirePath["semanticType"], string> = {
    address: "circuit-wire--addr-flow",
    control: "circuit-wire--ctrl-flow",
    data: "circuit-wire--data-flow",
    flag: "circuit-wire--flag-flow"
  };

  return `circuit-wire--active circuit-wire--flow ${flowBySemanticType[path.semanticType]}`;
}

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

function BusGuides() {
  return (
    <g className="bus-guide-layer" aria-hidden="true">
      <path
        className="bus-guide bus-guide-address"
        data-testid="bus-guide-addr"
        d={`M 246 ${circuitBusLanes.addressY} L ${circuitBusLanes.memoryBusX} ${circuitBusLanes.addressY}`}
      />
      <path
        className="bus-guide bus-guide-data"
        data-testid="bus-guide-data"
        d={`M ${circuitBusLanes.grBusX} ${circuitBusLanes.dataBypassY} L ${circuitBusLanes.memoryBusX} ${circuitBusLanes.dataBypassY}`}
      />
      <path
        className="bus-guide bus-guide-control"
        data-testid="bus-guide-ctrl"
        d={`M 108 ${circuitBusLanes.controlY} L 238 ${circuitBusLanes.controlY}`}
      />
      {[{ id: "junction-data-left", x: circuitBusLanes.grBusX, y: circuitBusLanes.dataBypassY }, { id: "junction-data-right", x: circuitBusLanes.memoryBusX, y: circuitBusLanes.dataBypassY }, { id: "junction-addr", x: circuitBusLanes.memoryBusX, y: circuitBusLanes.addressY }].map((node) => (
        <circle key={node.id} className="junction-dot" data-testid={node.id} cx={node.x} cy={node.y} r="2.8" />
      ))}
    </g>
  );
}

function StatusIndicators({ activeWireIds, state }: { activeWireIds: Set<string>; state: CometState }) {
  const indicators = [
    { label: "FETCH", active: activeWireIds.has("pr-to-mar") || activeWireIds.has("pr-to-plus2") },
    { label: "READ", active: state.lastMemoryReadAddress !== undefined || activeWireIds.has("memory-to-mdr") },
    { label: "WRITE", active: state.lastMemoryWriteAddress !== undefined || activeWireIds.has("mdr-to-memory") },
    { label: "EXEC", active: activeWireIds.has("gr-to-alu") || activeWireIds.has("mdr-to-alu") },
    { label: "FLAG", active: activeWireIds.has("alu-to-fr") }
  ];

  return (
    <g className="status-indicators" data-testid="circuit-status-indicators">
      <text className="status-indicator-title" x="36" y="452">
        SIGNALS
      </text>
      {indicators.map((indicator, index) => {
        const x = 38 + (index % 2) * 82;
        const y = 464 + Math.floor(index / 2) * 22;
        return (
          <g key={indicator.label} className={indicator.active ? "status-light active" : "status-light"} data-testid={`status-indicator-${indicator.label.toLowerCase()}`} data-active={indicator.active ? "true" : "false"}>
            <circle cx={x} cy={y} r="4" />
            <text x={x + 10} y={y + 4}>
              {indicator.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function isJumpVisualPath(visualPath: VisualPathKind): boolean {
  return visualPath === VisualPathKind.Jump_AddressToPr || visualPath === VisualPathKind.ConditionalJump_AddressToPr;
}

function addEffectiveAddressUnitWires(activeWireIds: Set<string>, visualPath: VisualPathKind): void {
  activeWireIds.add("base-to-eau");
  activeWireIds.add("index-to-eau");

  if (visualPath === VisualPathKind.LAD_AddressToGr) {
    activeWireIds.delete("pr-to-mar");
    activeWireIds.delete("address-to-gr");
    activeWireIds.add("eau-to-gr");
    return;
  }

  if (isJumpVisualPath(visualPath)) {
    activeWireIds.delete("pr-to-mar");
    activeWireIds.delete("address-to-pr");
    activeWireIds.add("eau-to-pr");
    return;
  }

  if (visualPath === VisualPathKind.ConditionalJump_NotTaken) {
    return;
  }

  activeWireIds.add("eau-to-mar");
}

function DecoderModule({ state }: { state: CometState }) {
  const op = (state.ir >> 12) & 0xf;
  const gr = (state.ir >> 4) & 0xf;
  const xr = state.ir & 0xf;
  return (
    <Module layout={circuitLayout.decoder} title="Decoder" testId="module-decoder" layer="control">
      {[
        ["OP", op.toString(16).toUpperCase()],
        ["GR", gr.toString(16).toUpperCase()],
        ["XR", xr.toString(16).toUpperCase()],
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
        Machine
      </text>
      <text className="module-small module-green" x={circuitLayout.controller.x + 104} y={circuitLayout.controller.y + 78} textAnchor="middle">
        {state.runState}
      </text>
    </Module>
  );
}

function EffectiveAddressUnitModule({ state, active }: { state: CometState; active: boolean }) {
  const base = formatWord(state.lastBaseAddress ?? 0);
  const indexRegister = state.lastIndexRegister ?? 0;
  const indexValue = formatWord(state.lastIndexValue ?? 0);
  const effective = formatWord(state.lastEffectiveAddress ?? state.mar);
  const baseInput = circuitAnchors.eau.baseInput();
  const indexInput = circuitAnchors.eau.indexInput();
  const sumOutput = circuitAnchors.eau.sumOutput();

  return (
    <g
      className={active ? "circuit-module circuit-module-active eau-module" : "circuit-module eau-module"}
      data-testid="effective-address-unit"
      data-active={active ? "true" : "false"}
      data-base-address={active ? base : undefined}
      data-index-register={active ? `GR${indexRegister}` : undefined}
      data-effective-address={active ? effective : undefined}
      data-layer="control"
    >
      <rect x={circuitLayout.eau.x} y={circuitLayout.eau.y} width={circuitLayout.eau.w} height={circuitLayout.eau.h} rx="5" />
      <text className="module-title" x={circuitLayout.eau.x + 20} y={circuitLayout.eau.y + 15}>
        EAU
      </text>
      <text className="module-small module-muted" x={circuitLayout.eau.x + 52} y={circuitLayout.eau.y + 15}>
        Effective Address Unit
      </text>
      {active ? (
        <g data-testid="effective-address-chip">
          <text className="module-small" x={circuitLayout.eau.x + 12} y={circuitLayout.eau.y + 30}>
            BASE {base} + GR{indexRegister}({indexValue})
          </text>
          <text className="module-small module-green" x={circuitLayout.eau.x + 12} y={circuitLayout.eau.y + 43}>
            EA {effective}
          </text>
        </g>
      ) : (
        <text className="module-small module-muted" x={circuitLayout.eau.x + 12} y={circuitLayout.eau.y + 36}>
          bypass
        </text>
      )}
      <AnchorPoint id="eau-anchor-base-input" x={baseInput.x} y={baseInput.y} />
      <AnchorPoint id="eau-anchor-index-input" x={indexInput.x} y={indexInput.y} />
      <AnchorPoint id="eau-anchor-sum-output" x={sumOutput.x} y={sumOutput.y} />
    </g>
  );
}

function GeneralRegisters({ state }: { state: CometState }) {
  const activeInstruction = state.lastStep?.executedInstruction ?? state.currentInstruction ?? "";
  const activeRegister = /GR([0-7])/i.exec(activeInstruction)?.[0]?.toUpperCase();
  const indexRegister = state.lastIndexRegister;

  return (
    <Module layout={circuitLayout.gr} title="General Registers" testId="module-gr" layer="execution">
      {state.gr.map((value, index) => {
        const changed = state.changedRegisters.includes(`GR${index}`);
        const isIndex = indexRegister === index;
        const active = changed || activeRegister === `GR${index}` || isIndex;
        const left = circuitAnchors.gr.rowLeft(index);
        const right = circuitAnchors.gr.rowRight(index);
        return (
          <g key={index} className={changed ? "register-row changed write" : active ? "register-row read" : "register-row"} data-testid={`register-gr${index}`} data-active={active ? "true" : "false"} data-read={!changed && active ? "true" : "false"} data-write={changed ? "true" : "false"} data-index={isIndex ? "true" : "false"}>
            <rect x={circuitLayout.gr.x + 16} y={circuitLayout.gr.y + 38 + index * 27} width="158" height="25" rx="3" />
            <text className="module-small" x={circuitLayout.gr.x + 34} y={circuitLayout.gr.y + 55 + index * 27}>
              GR{index}
            </text>
            <text className="module-small module-green" x={circuitLayout.gr.x + 126} y={circuitLayout.gr.y + 55 + index * 27} textAnchor="middle">
              {formatWord(value)}
            </text>
            {isIndex ? (
              <text className="module-small module-blue index-register-badge" x={circuitLayout.gr.x + 160} y={circuitLayout.gr.y + 55 + index * 27} textAnchor="middle">
                IDX
              </text>
            ) : null}
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
  const visualPath = state.lastStep?.visualPath ?? state.visualPath;
  if (visualPath === VisualPathKind.Shift_AddressToAluToGr) {
    return state.currentAddress ?? state.pr ?? 0x20;
  }
  return state.lastMemoryWriteAddress ?? state.lastMemoryReadAddress ?? state.changedMemoryAddresses[0] ?? state.mar ?? state.currentAddress ?? state.pr ?? 0x20;
}

function circuitMemoryWindowStart(state: CometState, focusAddress: number): number {
  const programStart = selectProgramStartAddress(state);
  if (focusAddress >= programStart && focusAddress < programStart + CIRCUIT_MEMORY_ROW_COUNT) return programStart;
  const halfWindow = Math.floor(CIRCUIT_MEMORY_ROW_COUNT / 2);
  return Math.max(0, Math.min(0xffff - CIRCUIT_MEMORY_ROW_COUNT + 1, focusAddress - halfWindow));
}

function AluModule({ state, registerIndex, visualPath }: { state: CometState; registerIndex: number; visualPath: VisualPathKind }) {
  const active =
    visualPath === VisualPathKind.ADDA_GrMdrToAluToGr ||
    visualPath === VisualPathKind.SUBA_GrMdrToAluToGr ||
    visualPath === VisualPathKind.CPA_GrMdrToAluToFr ||
    visualPath === VisualPathKind.Shift_AddressToAluToGr;
  const isShift = visualPath === VisualPathKind.Shift_AddressToAluToGr;
  const shiftMnemonic = isShift ? /\b(SLA|SRA|SLL|SRL)\b/i.exec(state.lastStep?.executedInstruction ?? "")?.[1]?.toUpperCase() ?? "SHIFT" : undefined;
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
      {isShift ? (
        <g data-testid="alu-shift-badge">
          <rect className="alu-operation-badge" x={circuitLayout.alu.x + circuitLayout.alu.w - 84} y={circuitLayout.alu.y + 17} width="54" height="18" rx="3" />
          <text className="module-small module-blue" x={circuitLayout.alu.x + circuitLayout.alu.w - 57} y={circuitLayout.alu.y + 30} textAnchor="middle">
            {shiftMnemonic}
          </text>
        </g>
      ) : null}
      {[
        ["A", formatWord(state.gr[registerIndex] ?? 0), "module-green"],
        ["B", isShift ? formatWord(state.mar) : formatWord(state.mdr), "module-green"],
        ["Y", formatWord(state.gr[registerIndex] ?? 0), "module-green"],
        ["F", formatFlags(state.fr), active ? "module-red" : "module-muted"]
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

function MemoryModule({ state, focusAddress, windowStart, visualPath }: { state: CometState; focusAddress: number; windowStart: number; visualPath: VisualPathKind }) {
  const rows = selectMemoryWindow(state, windowStart, windowStart + CIRCUIT_MEMORY_ROW_COUNT - 1).slice(0, CIRCUIT_MEMORY_ROW_COUNT);
  const activeMemory = visualPath === VisualPathKind.LD_MemoryToMdrToGr || visualPath === VisualPathKind.ST_GrToMdrToMemory || state.changedMemoryAddresses.length > 0;
  return (
    <Module layout={circuitLayout.memory} title="Memory" accent={activeMemory} testId="module-memory" layer="memory">
      <rect className="memory-target-shell" data-testid="memory-target-badge" x={circuitLayout.memory.x + 18} y={circuitLayout.memory.y + 28} width={circuitLayout.memory.w - 36} height="18" rx="3" />
      <text className="memory-target-badge" x={circuitLayout.memory.x + circuitLayout.memory.w / 2} y={circuitLayout.memory.y + 41} textAnchor="middle">
        Target @{formatWord(focusAddress)}
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
          <rect x={circuitLayout.memory.x + 12} y={circuitLayout.memory.y + 52 + index * 28} width={circuitLayout.memory.w - 24} height="26" rx="3" />
          <text className="module-small module-blue" x={circuitLayout.memory.x + 42} y={circuitLayout.memory.y + 70 + index * 28} textAnchor="middle">
            {formatWord(row.address)}
          </text>
          <text className="module-small module-green" x={circuitLayout.memory.x + 104} y={circuitLayout.memory.y + 70 + index * 28} textAnchor="middle">
            {formatWord(row.value)}
          </text>
          <text className="memory-label-text" x={circuitLayout.memory.x + circuitLayout.memory.w - 38} y={circuitLayout.memory.y + 70 + index * 28} textAnchor="middle">
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

type SourceMapFocus = {
  line?: number;
  address?: number;
  instruction?: string;
};

function CometCircuitSvg({ state, sourceMapFocus }: { state: CometState; sourceMapFocus?: SourceMapFocus }) {
  const registerIndex = activeRegisterIndex(state);
  const memoryAddress = activeMemoryAddress(state);
  const memoryWindowStart = circuitMemoryWindowStart(state, memoryAddress);
  const hasIndexAddressing = state.lastIndexRegister !== undefined && state.lastEffectiveAddress !== undefined;
  const wirePaths = buildWirePaths({ grIndex: registerIndex, indexRegister: state.lastIndexRegister, memoryAddress, memoryWindowStart });
  const visualPath = resolveVisualPath(state);
  const activeWireIds = resolveActiveWireIds(visualPath);
  const effectiveActiveWireIds = new Set(activeWireIds);
  if (hasIndexAddressing) addEffectiveAddressUnitWires(effectiveActiveWireIds, visualPath);
  const mdrLeft = circuitAnchors.mdr.left();
  const mdrRight = circuitAnchors.mdr.right();
  const mdrBottom = circuitAnchors.mdr.bottom();
  const mdrAlu = circuitAnchors.mdr.outputToAlu();
  const frInput = circuitAnchors.fr.input();
  const sourceMapLine = sourceMapFocus?.line ?? state.currentLine;
  const sourceMapAddress = sourceMapFocus?.address ?? state.currentAddress;
  const sourceMapInstruction = compactInstructionText(sourceMapFocus?.instruction ?? state.currentInstruction);

  return (
    <svg className="comet-circuit" viewBox={`0 0 ${CIRCUIT_VIEWBOX.width} ${CIRCUIT_VIEWBOX.height}`} role="img" aria-label="COMET II circuit" data-testid="comet-circuit-svg">
      <defs>
        <marker id="arrow-blue" markerUnits="userSpaceOnUse" markerWidth="5.4" markerHeight="5.4" refX="5" refY="2.7" orient="auto" viewBox="0 0 5.4 5.4">
          <path d="M 0 0 L 5.4 2.7 L 0 5.4 z" className="marker-blue" />
        </marker>
        <marker id="arrow-blue-mid" markerUnits="userSpaceOnUse" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto" viewBox="0 0 5 5">
          <path d="M 0 0 L 5 2.5 L 0 5 z" className="marker-blue" />
        </marker>
        <marker id="arrow-red" markerUnits="userSpaceOnUse" markerWidth="5.4" markerHeight="5.4" refX="5" refY="2.7" orient="auto" viewBox="0 0 5.4 5.4">
          <path d="M 0 0 L 5.4 2.7 L 0 5.4 z" className="marker-red" />
        </marker>
        <marker id="arrow-red-mid" markerUnits="userSpaceOnUse" markerWidth="5" markerHeight="5" refX="2.5" refY="2.5" orient="auto" viewBox="0 0 5 5">
          <path d="M 0 0 L 5 2.5 L 0 5 z" className="marker-red" />
        </marker>
      </defs>

      <BusGuides />

      <g className="wire-layer">
        {wirePaths.map((path) => {
          return (
            <path
              key={path.id}
              d={path.d}
              data-testid={`wire-guide-${path.id}`}
              data-active="false"
              data-path-id={path.id}
              data-lane={path.lane}
              data-semantic-type={path.semanticType}
              data-from-anchor={path.fromAnchor.id}
              data-to-anchor={path.toAnchor.id}
              data-primary={path.isPrimary ? "true" : "false"}
              data-related-register={path.relatedRegister !== undefined ? `GR${path.relatedRegister}` : undefined}
              data-related-memory-address={path.relatedMemoryAddress !== undefined ? formatWord(path.relatedMemoryAddress) : undefined}
              data-related-stage={path.relatedStage}
              data-avoids-alu={path.avoidsAlu ? "true" : "false"}
              className={`wire wire-${path.role}`}
            />
          );
        })}
      </g>

      <g className="bus-labels" aria-hidden="true">
        <text x="430" y="112">DATA BUS</text>
        <text x="615" y="22">ADDR BUS</text>
        <text x="96" y="236">CTRL</text>
      </g>

      <g className="active-wire-layer">
        {wirePaths
          .filter((path) => effectiveActiveWireIds.has(path.id))
          .map((path) => {
            const marker = path.role === "data" ? "url(#arrow-red)" : "url(#arrow-blue)";
            return (
            <path
              key={`active-${path.id}`}
              d={path.d}
              data-testid={`wire-${path.id}`}
              data-active="true"
              data-path-id={path.id}
              data-lane={path.lane}
              data-semantic-type={path.semanticType}
              data-from-anchor={path.fromAnchor.id}
              data-to-anchor={path.toAnchor.id}
              data-primary={path.isPrimary ? "true" : "false"}
              data-related-register={path.relatedRegister !== undefined ? `GR${path.relatedRegister}` : undefined}
              data-related-memory-address={path.relatedMemoryAddress !== undefined ? formatWord(path.relatedMemoryAddress) : undefined}
              data-related-stage={path.relatedStage}
              data-avoids-alu={path.avoidsAlu ? "true" : "false"}
              className={`wire wire-${path.role} wire-active ${signalFlowClass(path)}`}
              markerEnd={marker}
            />
            );
          })}
      </g>

      <g className="active-junction-layer" aria-hidden="true">
        {wirePaths
          .filter((path) => effectiveActiveWireIds.has(path.id))
          .flatMap((path) =>
            path.junctions.map((junction, index) => (
              <circle
                key={`junction-${path.id}-${index}`}
                className={`active-junction active-junction-${path.semanticType}`}
                data-testid={`wire-junction-${path.id}-${index}`}
                data-path-id={path.id}
                data-semantic-type={path.semanticType}
                cx={junction.x}
                cy={junction.y}
                r="3"
              />
            ))
          )}
      </g>

      <Module layout={circuitLayout.ir} title="IR" value={formatWord(state.ir)} accent={state.changedRegisters.includes("IR")} testId="module-ir" layer="control" />
      <DecoderModule state={state} />
      <ControllerModule state={state} />
      <Module layout={circuitLayout.display} title="Display Device" testId="module-display" layer="status">
        <text className="display-text" x={circuitLayout.display.x + circuitLayout.display.w / 2} y={circuitLayout.display.y + 62} textAnchor="middle">
          No output
        </text>
      </Module>
      <Module layout={circuitLayout.pr} title="PR" value={formatWord(state.pr)} accent={state.changedRegisters.includes("PR")} testId="module-pr" layer="control" />
      <Module layout={circuitLayout.addressResult} title="+2" value={formatWord((state.pr + 2) & 0xffff)} testId="module-address-result" layer="control" />
      <Module layout={circuitLayout.sp} title="SP" value={formatWord(state.sp)} testId="module-sp" layer="control">
        <AnchorPoint id="sp-anchor-output" x={circuitAnchors.sp.outputToMar().x} y={circuitAnchors.sp.outputToMar().y} />
        <AnchorPoint id="sp-anchor-adjust" x={circuitAnchors.sp.adjust().x} y={circuitAnchors.sp.adjust().y} />
      </Module>
      <Module layout={circuitLayout.mar} title="MAR" value={formatWord(state.mar)} accent={state.changedRegisters.includes("MAR")} testId="module-mar" layer="control" />
      <EffectiveAddressUnitModule state={state} active={hasIndexAddressing} />
      <GeneralRegisters state={state} />
      <AluModule state={state} registerIndex={registerIndex} visualPath={visualPath} />
      <Module layout={circuitLayout.mdr} title="MDR" value={formatWord(state.mdr)} accent={state.changedRegisters.includes("MDR")} testId="module-mdr" layer="execution">
        <AnchorPoint id="mdr-anchor-left" x={mdrLeft.x} y={mdrLeft.y} />
        <AnchorPoint id="mdr-anchor-right" x={mdrRight.x} y={mdrRight.y} />
        <AnchorPoint id="mdr-anchor-bottom" x={mdrBottom.x} y={mdrBottom.y} />
        <AnchorPoint id="mdr-anchor-output-to-alu" x={mdrAlu.x} y={mdrAlu.y} />
      </Module>
      <Module layout={circuitLayout.fr} title="FR" value={formatWord((state.fr.z ? 4 : 0) | (state.fr.c ? 2 : 0) | (state.fr.n ? 1 : 0))} accent={activeWireIds.has("alu-to-fr")} testId="module-fr" layer="flags">
        <AnchorPoint id="fr-anchor-input" x={frInput.x} y={frInput.y} />
      </Module>
      <MemoryModule state={state} focusAddress={memoryAddress} windowStart={memoryWindowStart} visualPath={visualPath} />
      <StatusIndicators activeWireIds={activeWireIds} state={state} />
      <Module layout={circuitLayout.sourceMap} title="Current Source Mapping" testId="module-source-map" layer="status">
        <g data-testid="source-map-highlight" data-current-line={sourceMapLine ?? ""}>
          <rect x={circuitLayout.sourceMap.x + 12} y={circuitLayout.sourceMap.y + 32} width={circuitLayout.sourceMap.w - 24} height="34" rx="3" />
        </g>
        <text className="module-small module-blue" x={circuitLayout.sourceMap.x + 18} y={circuitLayout.sourceMap.y + 47}>
          Addr {sourceMapAddress !== undefined ? formatWord(sourceMapAddress) : "----"}
        </text>
        <text className="module-small" x={circuitLayout.sourceMap.x + 18} y={circuitLayout.sourceMap.y + 61}>
          CASL {sourceMapInstruction ?? "No active line"}
        </text>
      </Module>

    </svg>
  );
}

export default memo(CometCircuitSvg);
