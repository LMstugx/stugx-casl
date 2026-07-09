import { VisualPathKind } from "../core/types";
import { circuitAnchors, circuitBusLanes, circuitLayout } from "./circuitLayout";
import type { CircuitPoint } from "./circuitLayout";

export type WireRole = "address" | "control" | "data" | "inactive";
export type WireLane = "addr" | "ctrl" | "data-bypass" | "data-compute" | "flag";

export type WirePath = {
  id: string;
  role: WireRole;
  lane: WireLane;
  avoidsAlu?: boolean;
  d: string;
};

export type WirePathOptions = {
  grIndex?: number;
  memoryAddress?: number;
  memoryWindowStart?: number;
};

function point({ x, y }: CircuitPoint): string {
  return `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
}

function moveTo(start: CircuitPoint): string {
  return `M ${point(start)}`;
}

function lineTo(end: CircuitPoint): string {
  return `L ${point(end)}`;
}

function pathThrough(points: CircuitPoint[]): string {
  const [start, ...rest] = points;
  return `${moveTo(start)} ${rest.map(lineTo).join(" ")}`;
}

function clampRegisterIndex(index = 1): number {
  return Math.max(0, Math.min(7, index));
}

export function buildWirePaths({ grIndex = 1, memoryAddress = 0x27, memoryWindowStart = 0x20 }: WirePathOptions = {}): readonly WirePath[] {
  const gr = clampRegisterIndex(grIndex);
  const grLeft = circuitAnchors.gr.rowLeft(gr);
  const grRight = circuitAnchors.gr.rowRight(gr);
  const memoryLeft = circuitAnchors.memory.rowLeft(memoryAddress, memoryWindowStart);
  const memoryRight = circuitAnchors.memory.rowRight(memoryAddress, memoryWindowStart);
  const mdrRight = circuitAnchors.mdr.right();
  const mdrBottom = circuitAnchors.mdr.bottom();
  const mdrToAlu = circuitAnchors.mdr.outputToAlu();
  const aluInputA = circuitAnchors.alu.inputA();
  const aluInputB = circuitAnchors.alu.inputB();
  const aluOutputY = circuitAnchors.alu.outputY();
  const aluFlagOut = circuitAnchors.alu.flagOut();
  const frInput = circuitAnchors.fr.input();
  const prRight = circuitAnchors.pr.right();
  const prLeft = circuitAnchors.pr.left();
  const marLeft = circuitAnchors.mar.left();
  const marRight = circuitAnchors.mar.right();
  const addressBusY = circuitBusLanes.addressY;
  const controlBusY = circuitBusLanes.controlY;
  const dataBypassY = circuitBusLanes.dataBypassY;
  const grBusX = circuitBusLanes.grBusX;
  const aluBusLeftX = circuitBusLanes.aluLeftBusX;
  const aluBusRightX = circuitBusLanes.aluRightBusX;
  const memoryBusX = circuitBusLanes.memoryBusX;
  const irBottom = { x: circuitLayout.ir.x + circuitLayout.ir.w / 2, y: circuitLayout.ir.y + circuitLayout.ir.h };
  const decoderTop = { x: circuitLayout.decoder.x + circuitLayout.decoder.w / 2, y: circuitLayout.decoder.y };
  const decoderBottom = { x: circuitLayout.decoder.x + circuitLayout.decoder.w / 2, y: circuitLayout.decoder.y + circuitLayout.decoder.h };
  const controllerTop = { x: circuitLayout.controller.x + circuitLayout.controller.w / 2, y: circuitLayout.controller.y };
  const controllerRight = { x: circuitLayout.controller.x + circuitLayout.controller.w, y: circuitLayout.controller.y + circuitLayout.controller.h / 2 };

  return Object.freeze([
    { id: "pr-to-mar", role: "address", lane: "addr", d: pathThrough([prRight, { x: prRight.x + 18, y: prRight.y }, { x: prRight.x + 18, y: addressBusY }, { x: marLeft.x - 18, y: addressBusY }, { x: marLeft.x - 18, y: marLeft.y }, marLeft]) },
    { id: "pr-to-plus2", role: "control", lane: "ctrl", d: pathThrough([prRight, { x: circuitLayout.addressResult.x, y: prRight.y }]) },
    {
      id: "sp-reference",
      role: "inactive",
      lane: "addr",
      d: pathThrough([
        { x: circuitLayout.sp.x + circuitLayout.sp.w / 2, y: circuitLayout.sp.y + circuitLayout.sp.h },
        { x: circuitLayout.sp.x + circuitLayout.sp.w / 2, y: circuitLayout.sp.y + circuitLayout.sp.h + 15 },
        { x: circuitLayout.mar.x + circuitLayout.mar.w / 2, y: circuitLayout.sp.y + circuitLayout.sp.h + 15 },
        { x: circuitLayout.mar.x + circuitLayout.mar.w / 2, y: circuitLayout.mar.y + circuitLayout.mar.h }
      ])
    },
    { id: "mar-to-memory", role: "address", lane: "addr", d: pathThrough([marRight, { x: memoryBusX, y: marRight.y }, { x: memoryBusX, y: memoryLeft.y }, memoryLeft]) },
    { id: "memory-to-mdr", role: "data", lane: "data-bypass", avoidsAlu: true, d: pathThrough([memoryLeft, { x: memoryBusX, y: memoryLeft.y }, { x: memoryBusX, y: mdrRight.y }, mdrRight]) },
    { id: "mdr-to-gr", role: "data", lane: "data-bypass", avoidsAlu: true, d: pathThrough([mdrBottom, { x: mdrBottom.x, y: dataBypassY }, { x: grBusX, y: dataBypassY }, { x: grBusX, y: grRight.y }, grRight]) },
    { id: "gr-to-mdr", role: "data", lane: "data-bypass", avoidsAlu: true, d: pathThrough([grRight, { x: grBusX, y: grRight.y }, { x: grBusX, y: dataBypassY }, { x: mdrBottom.x, y: dataBypassY }, mdrBottom]) },
    { id: "mdr-to-memory", role: "data", lane: "data-bypass", avoidsAlu: true, d: pathThrough([mdrRight, { x: memoryBusX, y: mdrRight.y }, { x: memoryBusX, y: memoryRight.y }, memoryRight]) },
    { id: "gr-to-alu", role: "data", lane: "data-compute", d: pathThrough([grRight, { x: grBusX, y: grRight.y }, { x: grBusX, y: aluInputA.y }, aluInputA]) },
    { id: "mdr-to-alu", role: "data", lane: "data-compute", d: pathThrough([mdrToAlu, { x: aluBusRightX, y: mdrToAlu.y }, { x: aluBusRightX, y: aluInputB.y }, aluInputB]) },
    { id: "alu-to-gr", role: "data", lane: "data-compute", d: pathThrough([aluOutputY, { x: aluBusLeftX, y: aluOutputY.y }, { x: aluBusLeftX, y: grRight.y }, grRight]) },
    { id: "alu-to-fr", role: "control", lane: "flag", d: pathThrough([aluFlagOut, { x: aluFlagOut.x, y: frInput.y - 12 }, frInput]) },
    { id: "address-to-gr", role: "address", lane: "addr", d: pathThrough([marLeft, { x: marLeft.x - 20, y: marLeft.y }, { x: marLeft.x - 20, y: grLeft.y }, grLeft]) },
    { id: "address-to-pr", role: "address", lane: "ctrl", d: pathThrough([marLeft, { x: marLeft.x - 18, y: marLeft.y }, { x: marLeft.x - 18, y: addressBusY }, { x: prLeft.x - 18, y: addressBusY }, { x: prLeft.x - 18, y: prLeft.y }, prLeft]) },
    { id: "ir-to-decoder", role: "control", lane: "ctrl", d: pathThrough([irBottom, decoderTop]) },
    { id: "decoder-to-controller", role: "control", lane: "ctrl", d: pathThrough([decoderBottom, controllerTop]) },
    { id: "controller-to-pr", role: "control", lane: "ctrl", d: pathThrough([controllerRight, { x: prLeft.x - 22, y: controllerRight.y }, { x: prLeft.x - 22, y: controlBusY }, { x: prLeft.x - 22, y: prLeft.y }, prLeft]) }
  ]);
}

export const wirePaths: readonly WirePath[] = buildWirePaths();

export const activeWireIdsByKind: Record<VisualPathKind, string[]> = {
  [VisualPathKind.None]: [],
  [VisualPathKind.Ready_PrToMar]: ["pr-to-mar"],
  [VisualPathKind.LD_MemoryToMdrToGr]: ["mar-to-memory", "memory-to-mdr", "mdr-to-gr"],
  [VisualPathKind.ST_GrToMdrToMemory]: ["gr-to-mdr", "mar-to-memory", "mdr-to-memory"],
  [VisualPathKind.ADDA_GrMdrToAluToGr]: ["gr-to-alu", "mar-to-memory", "memory-to-mdr", "mdr-to-alu", "alu-to-gr", "alu-to-fr"],
  [VisualPathKind.LAD_AddressToGr]: ["pr-to-mar", "address-to-gr"],
  [VisualPathKind.SUBA_GrMdrToAluToGr]: ["gr-to-alu", "mar-to-memory", "memory-to-mdr", "mdr-to-alu", "alu-to-gr", "alu-to-fr"],
  [VisualPathKind.CPA_GrMdrToAluToFr]: ["gr-to-alu", "mar-to-memory", "memory-to-mdr", "mdr-to-alu", "alu-to-fr"],
  [VisualPathKind.Jump_AddressToPr]: ["pr-to-mar", "address-to-pr"],
  [VisualPathKind.ConditionalJump_AddressToPr]: ["pr-to-mar", "address-to-pr"],
  [VisualPathKind.ConditionalJump_NotTaken]: ["pr-to-plus2"],
  [VisualPathKind.Finished_None]: []
};
