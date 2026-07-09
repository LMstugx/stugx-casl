import { VisualPathKind } from "../core/types";
import { circuitAnchors, circuitBusLanes, circuitLayout } from "./circuitLayout";
import type { CircuitPoint } from "./circuitLayout";

export type WireRole = "address" | "control" | "data" | "inactive";
export type WireLane = "addr" | "ctrl" | "data-bypass" | "data-compute" | "flag";
export type AnchorSemanticRole = "input" | "output" | "bidirectional" | "address" | "data" | "control" | "flag";
export type WireSemanticType = "data" | "address" | "control" | "flag";

export type CircuitAnchorRef = CircuitPoint & {
  id: string;
  role: AnchorSemanticRole;
};

export type WirePath = {
  id: string;
  role: WireRole;
  lane: WireLane;
  semanticType: WireSemanticType;
  fromAnchor: CircuitAnchorRef;
  toAnchor: CircuitAnchorRef;
  direction: "forward";
  isPrimary: boolean;
  avoidsAlu?: boolean;
  relatedRegister?: number;
  relatedMemoryAddress?: number;
  relatedStage?: string;
  relatedInstructionKind?: string;
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

function anchor(id: string, point: CircuitPoint, role: AnchorSemanticRole): CircuitAnchorRef {
  return { id, role, x: point.x, y: point.y };
}

function wire(
  id: string,
  role: WireRole,
  lane: WireLane,
  semanticType: WireSemanticType,
  fromAnchor: CircuitAnchorRef,
  toAnchor: CircuitAnchorRef,
  points: CircuitPoint[],
  options: Pick<WirePath, "avoidsAlu" | "relatedRegister" | "relatedMemoryAddress" | "relatedStage" | "relatedInstructionKind"> = {}
): WirePath {
  return {
    id,
    role,
    lane,
    semanticType,
    fromAnchor,
    toAnchor,
    direction: "forward",
    isPrimary: role !== "inactive",
    d: pathThrough(points),
    ...options
  };
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
  const anchors = {
    prLeft: anchor("pr.left", prLeft, "control"),
    prRight: anchor("pr.right", prRight, "control"),
    plus2Left: anchor("plus2.left", { x: circuitLayout.addressResult.x, y: prRight.y }, "control"),
    spBottom: anchor("sp.bottom", { x: circuitLayout.sp.x + circuitLayout.sp.w / 2, y: circuitLayout.sp.y + circuitLayout.sp.h }, "address"),
    marLeft: anchor("mar.left", marLeft, "address"),
    marRight: anchor("mar.right", marRight, "address"),
    memoryLeft: anchor(`memory.${memoryAddress.toString(16).padStart(4, "0")}.left`, memoryLeft, "bidirectional"),
    memoryRight: anchor(`memory.${memoryAddress.toString(16).padStart(4, "0")}.right`, memoryRight, "bidirectional"),
    grLeft: anchor(`gr${gr}.left`, grLeft, "bidirectional"),
    grRight: anchor(`gr${gr}.right`, grRight, "bidirectional"),
    mdrRight: anchor("mdr.right", mdrRight, "bidirectional"),
    mdrBottom: anchor("mdr.bottom", mdrBottom, "bidirectional"),
    mdrToAlu: anchor("mdr.toAlu", mdrToAlu, "output"),
    aluInputA: anchor("alu.inputA", aluInputA, "input"),
    aluInputB: anchor("alu.inputB", aluInputB, "input"),
    aluOutputY: anchor("alu.outputY", aluOutputY, "output"),
    aluFlagOut: anchor("alu.flagOut", aluFlagOut, "flag"),
    frInput: anchor("fr.input", frInput, "flag"),
    irBottom: anchor("ir.bottom", irBottom, "control"),
    decoderTop: anchor("decoder.top", decoderTop, "control"),
    decoderBottom: anchor("decoder.bottom", decoderBottom, "control"),
    controllerTop: anchor("controller.top", controllerTop, "control"),
    controllerRight: anchor("controller.right", controllerRight, "control")
  };

  return Object.freeze([
    wire("pr-to-mar", "address", "addr", "address", anchors.prRight, anchors.marLeft, [prRight, { x: prRight.x + 18, y: prRight.y }, { x: prRight.x + 18, y: addressBusY }, { x: marLeft.x - 18, y: addressBusY }, { x: marLeft.x - 18, y: marLeft.y }, marLeft], { relatedStage: "Fetch" }),
    wire("pr-to-plus2", "control", "ctrl", "control", anchors.prRight, anchors.plus2Left, [prRight, { x: circuitLayout.addressResult.x, y: prRight.y }], { relatedStage: "Next" }),
    wire(
      "sp-reference",
      "inactive",
      "addr",
      "address",
      anchors.spBottom,
      anchor("mar.stackReference", { x: circuitLayout.mar.x + circuitLayout.mar.w / 2, y: circuitLayout.mar.y + circuitLayout.mar.h }, "address"),
      [
        { x: circuitLayout.sp.x + circuitLayout.sp.w / 2, y: circuitLayout.sp.y + circuitLayout.sp.h },
        { x: circuitLayout.sp.x + circuitLayout.sp.w / 2, y: circuitLayout.sp.y + circuitLayout.sp.h + 15 },
        { x: circuitLayout.mar.x + circuitLayout.mar.w / 2, y: circuitLayout.sp.y + circuitLayout.sp.h + 15 },
        { x: circuitLayout.mar.x + circuitLayout.mar.w / 2, y: circuitLayout.mar.y + circuitLayout.mar.h }
      ],
      { relatedStage: "Stack reference" }
    ),
    wire("mar-to-memory", "address", "addr", "address", anchors.marRight, anchors.memoryLeft, [marRight, { x: memoryBusX, y: marRight.y }, { x: memoryBusX, y: memoryLeft.y }, memoryLeft], { relatedMemoryAddress: memoryAddress, relatedStage: "Operand Read" }),
    wire("memory-to-mdr", "data", "data-bypass", "data", anchors.memoryLeft, anchors.mdrRight, [memoryLeft, { x: memoryBusX, y: memoryLeft.y }, { x: memoryBusX, y: mdrRight.y }, mdrRight], { avoidsAlu: true, relatedMemoryAddress: memoryAddress, relatedStage: "Operand Read" }),
    wire("mdr-to-gr", "data", "data-bypass", "data", anchors.mdrBottom, anchors.grRight, [mdrBottom, { x: mdrBottom.x, y: dataBypassY }, { x: grBusX, y: dataBypassY }, { x: grBusX, y: grRight.y }, grRight], { avoidsAlu: true, relatedRegister: gr, relatedStage: "Write Back" }),
    wire("gr-to-mdr", "data", "data-bypass", "data", anchors.grRight, anchors.mdrBottom, [grRight, { x: grBusX, y: grRight.y }, { x: grBusX, y: dataBypassY }, { x: mdrBottom.x, y: dataBypassY }, mdrBottom], { avoidsAlu: true, relatedRegister: gr, relatedStage: "Execute" }),
    wire("mdr-to-memory", "data", "data-bypass", "data", anchors.mdrRight, anchors.memoryRight, [mdrRight, { x: memoryBusX, y: mdrRight.y }, { x: memoryBusX, y: memoryRight.y }, memoryRight], { avoidsAlu: true, relatedMemoryAddress: memoryAddress, relatedStage: "Write Back" }),
    wire("gr-to-alu", "data", "data-compute", "data", anchors.grRight, anchors.aluInputA, [grRight, { x: grBusX, y: grRight.y }, { x: grBusX, y: aluInputA.y }, aluInputA], { relatedRegister: gr, relatedStage: "Execute" }),
    wire("mdr-to-alu", "data", "data-compute", "data", anchors.mdrToAlu, anchors.aluInputB, [mdrToAlu, { x: aluBusRightX, y: mdrToAlu.y }, { x: aluBusRightX, y: aluInputB.y }, aluInputB], { relatedMemoryAddress: memoryAddress, relatedStage: "Execute" }),
    wire("alu-to-gr", "data", "data-compute", "data", anchors.aluOutputY, anchors.grRight, [aluOutputY, { x: aluBusLeftX, y: aluOutputY.y }, { x: aluBusLeftX, y: grRight.y }, grRight], { relatedRegister: gr, relatedStage: "Write Back" }),
    wire("alu-to-fr", "control", "flag", "flag", anchors.aluFlagOut, anchors.frInput, [aluFlagOut, { x: aluFlagOut.x, y: frInput.y - 12 }, frInput], { relatedStage: "Write Back" }),
    wire("address-to-gr", "address", "addr", "address", anchors.marLeft, anchors.grLeft, [marLeft, { x: marLeft.x - 20, y: marLeft.y }, { x: marLeft.x - 20, y: grLeft.y }, grLeft], { relatedRegister: gr, relatedStage: "Write Back" }),
    wire("address-to-pr", "address", "ctrl", "control", anchors.marLeft, anchors.prLeft, [marLeft, { x: marLeft.x - 18, y: marLeft.y }, { x: marLeft.x - 18, y: addressBusY }, { x: prLeft.x - 18, y: addressBusY }, { x: prLeft.x - 18, y: prLeft.y }, prLeft], { relatedStage: "Next" }),
    wire("ir-to-decoder", "control", "ctrl", "control", anchors.irBottom, anchors.decoderTop, [irBottom, decoderTop], { relatedStage: "Decode" }),
    wire("decoder-to-controller", "control", "ctrl", "control", anchors.decoderBottom, anchors.controllerTop, [decoderBottom, controllerTop], { relatedStage: "Decode" }),
    wire("controller-to-pr", "control", "ctrl", "control", anchors.controllerRight, anchors.prLeft, [controllerRight, { x: prLeft.x - 22, y: controllerRight.y }, { x: prLeft.x - 22, y: controlBusY }, { x: prLeft.x - 22, y: prLeft.y }, prLeft], { relatedStage: "Next" })
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
