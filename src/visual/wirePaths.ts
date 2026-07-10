import { VisualPathKind } from "../core/types";
import { circuitAnchors, circuitBusLanes, circuitLayout, circuitRouting } from "./circuitLayout";
import type { CircuitPoint, RectLayout } from "./circuitLayout";

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
  points: readonly CircuitPoint[];
  terminalPoints: readonly CircuitPoint[];
  junctions: readonly CircuitPoint[];
  d: string;
  terminalD: string;
};

export type WirePathOptions = {
  grIndex?: number;
  indexRegister?: number;
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

function samePoint(a: CircuitPoint, b: CircuitPoint): boolean {
  return a.x === b.x && a.y === b.y;
}

function roundedPointEquals(a: CircuitPoint, b: CircuitPoint): boolean {
  return point(a) === point(b);
}

function compactPoints(points: readonly CircuitPoint[]): CircuitPoint[] {
  const compacted: CircuitPoint[] = [];
  for (const pathPoint of points) {
    if (!compacted.length || !samePoint(compacted[compacted.length - 1], pathPoint)) {
      compacted.push(pathPoint);
    }
  }
  return compacted;
}

export function routeSegments(points: readonly CircuitPoint[]): Array<[CircuitPoint, CircuitPoint]> {
  const compacted = compactPoints(points);
  const segments: Array<[CircuitPoint, CircuitPoint]> = [];
  for (let index = 1; index < compacted.length; index += 1) {
    segments.push([compacted[index - 1], compacted[index]]);
  }
  return segments;
}

export function snapRouteToAnchors(points: readonly CircuitPoint[], from: CircuitPoint, to: CircuitPoint): CircuitPoint[] {
  const compacted = compactPoints(points.length ? points : [from, to]);
  const snapped = [...compacted];
  snapped[0] = { x: from.x, y: from.y };
  snapped[snapped.length - 1] = { x: to.x, y: to.y };
  return compactPoints(snapped);
}

export function routeIsContinuous(points: readonly CircuitPoint[]): boolean {
  return routeSegments(points).every(([from, to]) => from.x === to.x || from.y === to.y);
}

export function pointIsOnRoute(routePoint: CircuitPoint, points: readonly CircuitPoint[]): boolean {
  return routeSegments(points).some(([from, to]) => {
    const horizontal = from.y === to.y && roundedPointEquals(routePoint, { x: Math.max(Math.min(routePoint.x, Math.max(from.x, to.x)), Math.min(from.x, to.x)), y: from.y });
    const vertical = from.x === to.x && roundedPointEquals(routePoint, { x: from.x, y: Math.max(Math.min(routePoint.y, Math.max(from.y, to.y)), Math.min(from.y, to.y)) });
    return horizontal || vertical;
  });
}

export function terminalSegment(points: readonly CircuitPoint[], length = 14): CircuitPoint[] {
  const compacted = compactPoints(points);
  if (compacted.length < 2) return compacted;
  const end = compacted[compacted.length - 1];
  const previous = compacted[compacted.length - 2];
  const dx = end.x - previous.x;
  const dy = end.y - previous.y;
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  if (distance === 0) return [previous, end];
  const visibleLength = Math.min(length, distance);
  const start = dx !== 0
    ? { x: end.x - Math.sign(dx) * visibleLength, y: end.y }
    : { x: end.x, y: end.y - Math.sign(dy) * visibleLength };
  return compactPoints([start, end]);
}

export function buildPathWithCorners(points: readonly CircuitPoint[]): string {
  const compacted = compactPoints(points);
  const [start, ...rest] = compacted;
  return `${moveTo(start)} ${rest.map(lineTo).join(" ")}`;
}

export function routeOrthogonal(from: CircuitPoint, to: CircuitPoint, first: "horizontal" | "vertical" = "horizontal"): CircuitPoint[] {
  if (from.x === to.x || from.y === to.y) return compactPoints([from, to]);
  const corner = first === "horizontal" ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
  return compactPoints([from, corner, to]);
}

export function routeViaLane(from: CircuitPoint, to: CircuitPoint, lane: { x: number } | { y: number }): CircuitPoint[] {
  if ("x" in lane) {
    return compactPoints([from, { x: lane.x, y: from.y }, { x: lane.x, y: to.y }, to]);
  }
  return compactPoints([from, { x: from.x, y: lane.y }, { x: to.x, y: lane.y }, to]);
}

function segmentCrossesRect(a: CircuitPoint, b: CircuitPoint, rect: RectLayout): boolean {
  const xMin = Math.min(a.x, b.x);
  const xMax = Math.max(a.x, b.x);
  const yMin = Math.min(a.y, b.y);
  const yMax = Math.max(a.y, b.y);
  const horizontal = a.y === b.y && a.y > rect.y && a.y < rect.y + rect.h && xMax > rect.x && xMin < rect.x + rect.w;
  const vertical = a.x === b.x && a.x > rect.x && a.x < rect.x + rect.w && yMax > rect.y && yMin < rect.y + rect.h;
  return horizontal || vertical;
}

export function routeCrossesProtectedRect(points: readonly CircuitPoint[], rect: RectLayout): boolean {
  return routeCrossesRect(points, rect);
}

function routeCrossesRect(points: readonly CircuitPoint[], rect: RectLayout): boolean {
  for (let index = 1; index < points.length; index += 1) {
    if (segmentCrossesRect(points[index - 1], points[index], rect)) return true;
  }
  return false;
}

export function routeAvoidRect(from: CircuitPoint, to: CircuitPoint, avoidRects: readonly RectLayout[], fallbackLane: { x: number } | { y: number }): CircuitPoint[] {
  const direct = routeOrthogonal(from, to);
  return avoidRects.some((rect) => routeCrossesRect(direct, rect)) ? routeViaLane(from, to, fallbackLane) : direct;
}

export function addJunction(points: readonly CircuitPoint[], index: number): CircuitPoint[] {
  const compacted = compactPoints(points);
  const junction = compacted[index];
  return junction ? [junction] : [];
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
  points: readonly CircuitPoint[],
  options: Pick<WirePath, "avoidsAlu" | "relatedRegister" | "relatedMemoryAddress" | "relatedStage" | "relatedInstructionKind"> & { junctions?: readonly CircuitPoint[] } = {}
): WirePath {
  const compacted = snapRouteToAnchors(points, fromAnchor, toAnchor);
  const terminalPoints = terminalSegment(compacted);
  const { junctions = [], ...metadata } = options;
  return {
    id,
    role,
    lane,
    semanticType,
    fromAnchor,
    toAnchor,
    direction: "forward",
    isPrimary: role !== "inactive",
    points: compacted,
    terminalPoints,
    junctions,
    d: buildPathWithCorners(compacted),
    terminalD: buildPathWithCorners(terminalPoints),
    ...metadata
  };
}

export function buildWirePaths({ grIndex = 1, indexRegister, memoryAddress = 0x27, memoryWindowStart = 0x20 }: WirePathOptions = {}): readonly WirePath[] {
  const gr = clampRegisterIndex(grIndex);
  const indexGr = indexRegister === undefined ? gr : clampRegisterIndex(indexRegister);
  const grLeft = circuitAnchors.gr.rowLeft(gr);
  const grRight = circuitAnchors.gr.rowRight(gr);
  const indexGrRight = circuitAnchors.gr.rowRight(indexGr);
  const memoryLeft = circuitAnchors.memory.rowLeft(memoryAddress, memoryWindowStart);
  const memoryRight = circuitAnchors.memory.rowRight(memoryAddress, memoryWindowStart);
  const mdrRight = circuitAnchors.mdr.right();
  const mdrLeft = circuitAnchors.mdr.left();
  const mdrBottom = circuitAnchors.mdr.bottom();
  const mdrToAlu = circuitAnchors.mdr.outputToAlu();
  const aluInputA = circuitAnchors.alu.inputA();
  const aluInputB = circuitAnchors.alu.inputB();
  const aluOutputY = circuitAnchors.alu.outputY();
  const aluFlagOut = circuitAnchors.alu.flagOut();
  const frInput = circuitAnchors.fr.input();
  const prRight = circuitAnchors.pr.right();
  const prLeft = circuitAnchors.pr.left();
  const plus2Right = circuitAnchors.addressResult.right();
  const marLeft = circuitAnchors.mar.left();
  const marRight = circuitAnchors.mar.right();
  const marStackInput = circuitAnchors.mar.stackInput();
  const spToMar = circuitAnchors.sp.outputToMar();
  const spAdjust = circuitAnchors.sp.adjust();
  const eauBaseInput = circuitAnchors.eau.baseInput();
  const eauIndexInput = circuitAnchors.eau.indexInput();
  const eauSumOutput = circuitAnchors.eau.sumOutput();
  const addressBusY = circuitBusLanes.addressY;
  const addressIndexBusY = circuitBusLanes.addressIndexY;
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
  const eauInputX = circuitLayout.eau.x - circuitRouting.eauInputClearance;
  const eauOutputX = circuitLayout.eau.x + circuitLayout.eau.w + circuitRouting.eauOutputClearance;
  const operandBaseSource = { x: eauInputX, y: eauBaseInput.y };
  const stackMemoryPreview = { x: circuitLayout.memory.x + 12, y: circuitLayout.memory.y + 35 };
  const portClearance = circuitRouting.portClearance;
  const controlClearance = circuitRouting.controlClearance;
  const stackReferenceDrop = circuitRouting.stackReferenceDrop;
  const anchors = {
    prLeft: anchor("pr.left", prLeft, "control"),
    prRight: anchor("pr.right", prRight, "control"),
    plus2Left: anchor("plus2.left", { x: circuitLayout.addressResult.x, y: prRight.y }, "control"),
    plus2Right: anchor("plus2.right", plus2Right, "control"),
    spOutput: anchor("sp.output", spToMar, "output"),
    spAdjust: anchor("sp.adjust", spAdjust, "address"),
    marLeft: anchor("mar.left", marLeft, "address"),
    marShiftCount: anchor("mar.shiftCount", marLeft, "address"),
    marRight: anchor("mar.right", marRight, "address"),
    marStackInput: anchor("mar.stackInput", marStackInput, "input"),
    stackMemoryPreview: anchor("memory.spPreview", stackMemoryPreview, "address"),
    operandBase: anchor("operand.base", operandBaseSource, "address"),
    eauBaseInput: anchor("eau.base", eauBaseInput, "input"),
    eauIndexInput: anchor("eau.index", eauIndexInput, "input"),
    eauSumOutput: anchor("eau.sum", eauSumOutput, "output"),
    memoryLeft: anchor(`memory.${memoryAddress.toString(16).padStart(4, "0")}.left`, memoryLeft, "bidirectional"),
    memoryRight: anchor(`memory.${memoryAddress.toString(16).padStart(4, "0")}.right`, memoryRight, "bidirectional"),
    grLeft: anchor(`gr${gr}.left`, grLeft, "bidirectional"),
    grRight: anchor(`gr${gr}.right`, grRight, "bidirectional"),
    indexGrRight: anchor(`gr${indexGr}.indexRight`, indexGrRight, "address"),
    mdrRight: anchor("mdr.right", mdrRight, "bidirectional"),
    mdrLeft: anchor("mdr.left", mdrLeft, "bidirectional"),
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
    wire("pr-to-mar", "address", "addr", "address", anchors.prRight, anchors.marLeft, [prRight, { x: prRight.x + portClearance, y: prRight.y }, { x: prRight.x + portClearance, y: addressBusY }, { x: marLeft.x - portClearance, y: addressBusY }, { x: marLeft.x - portClearance, y: marLeft.y }, marLeft], { relatedStage: "Fetch", junctions: [{ x: prRight.x + portClearance, y: addressBusY }] }),
    wire("base-to-eau", "address", "addr", "address", anchors.operandBase, anchors.eauBaseInput, [operandBaseSource, eauBaseInput], { relatedStage: "Effective Address" }),
    wire("index-to-eau", "address", "addr", "address", anchors.indexGrRight, anchors.eauIndexInput, [indexGrRight, { x: indexGrRight.x + portClearance, y: indexGrRight.y }, { x: indexGrRight.x + portClearance, y: addressIndexBusY }, { x: eauInputX, y: addressIndexBusY }, { x: eauInputX, y: eauIndexInput.y }, eauIndexInput], { relatedRegister: indexGr, relatedStage: "Effective Address", junctions: [{ x: indexGrRight.x + portClearance, y: addressIndexBusY }, { x: eauInputX, y: addressIndexBusY }] }),
    wire("eau-to-mar", "address", "addr", "address", anchors.eauSumOutput, anchors.marLeft, [eauSumOutput, { x: eauOutputX, y: eauSumOutput.y }, { x: eauOutputX, y: marLeft.y }, marLeft], { relatedStage: "Effective Address", junctions: [{ x: eauOutputX, y: eauSumOutput.y }] }),
    wire("eau-to-gr", "address", "addr", "address", anchors.eauSumOutput, anchors.grLeft, routeViaLane(eauSumOutput, grLeft, { y: addressBusY }), { relatedRegister: gr, relatedStage: "Write Back", junctions: [{ x: grLeft.x, y: addressBusY }] }),
    wire("eau-to-mdr", "address", "addr", "address", anchors.eauSumOutput, anchors.mdrRight, routeViaLane(eauSumOutput, mdrRight, { x: memoryBusX }), { avoidsAlu: true, relatedStage: "Stack write value", junctions: [{ x: memoryBusX, y: eauSumOutput.y }] }),
    wire("eau-to-pr", "address", "ctrl", "control", anchors.eauSumOutput, anchors.prLeft, [eauSumOutput, { x: eauOutputX, y: eauSumOutput.y }, { x: eauOutputX, y: addressBusY }, { x: prLeft.x - portClearance, y: addressBusY }, { x: prLeft.x - portClearance, y: prLeft.y }, prLeft], { relatedStage: "Next", junctions: [{ x: eauOutputX, y: addressBusY }] }),
    wire("return-address-to-mdr", "address", "addr", "address", anchors.plus2Right, anchors.mdrRight, routeViaLane(plus2Right, mdrRight, { x: memoryBusX }), { avoidsAlu: true, relatedStage: "Return address", junctions: [{ x: memoryBusX, y: plus2Right.y }] }),
    wire("index-to-effective", "address", "addr", "address", anchors.indexGrRight, anchors.marLeft, [indexGrRight, { x: indexGrRight.x + portClearance, y: indexGrRight.y }, { x: indexGrRight.x + portClearance, y: addressBusY }, { x: marLeft.x - portClearance, y: addressBusY }, { x: marLeft.x - portClearance, y: marLeft.y }, marLeft], { relatedRegister: indexGr, relatedStage: "Effective Address", junctions: [{ x: indexGrRight.x + portClearance, y: addressBusY }] }),
    wire("pr-to-plus2", "control", "ctrl", "control", anchors.prRight, anchors.plus2Left, [prRight, { x: circuitLayout.addressResult.x, y: prRight.y }], { relatedStage: "Next" }),
    wire(
      "sp-to-mar-preview",
      "address",
      "addr",
      "address",
      anchors.spOutput,
      anchors.marStackInput,
      [
        spToMar,
        { x: spToMar.x, y: spToMar.y + stackReferenceDrop },
        { x: marStackInput.x, y: spToMar.y + stackReferenceDrop },
        marStackInput
      ],
      { relatedStage: "Stack preview" }
    ),
    wire("mar-to-stack-memory-preview", "address", "addr", "address", anchors.marRight, anchors.stackMemoryPreview, routeViaLane(marRight, stackMemoryPreview, { x: memoryBusX }), { relatedStage: "Stack preview", junctions: [{ x: memoryBusX, y: stackMemoryPreview.y }] }),
    wire("mar-to-memory", "address", "addr", "address", anchors.marRight, anchors.memoryLeft, routeViaLane(marRight, memoryLeft, { x: memoryBusX }), { relatedMemoryAddress: memoryAddress, relatedStage: "Operand Read", junctions: [{ x: memoryBusX, y: memoryLeft.y }] }),
    wire("memory-to-mdr", "data", "data-bypass", "data", anchors.memoryLeft, anchors.mdrRight, routeViaLane(memoryLeft, mdrRight, { x: memoryBusX }), { avoidsAlu: true, relatedMemoryAddress: memoryAddress, relatedStage: "Operand Read", junctions: [{ x: memoryBusX, y: memoryLeft.y }] }),
    wire("mdr-to-gr", "data", "data-bypass", "data", anchors.mdrBottom, anchors.grRight, routeAvoidRect(mdrBottom, grRight, [circuitLayout.alu], { y: dataBypassY }), { avoidsAlu: true, relatedRegister: gr, relatedStage: "Write Back", junctions: [{ x: mdrBottom.x, y: dataBypassY }] }),
    wire("gr-to-mdr", "data", "data-bypass", "data", anchors.grRight, anchors.mdrBottom, routeAvoidRect(grRight, mdrBottom, [circuitLayout.alu], { y: dataBypassY }), { avoidsAlu: true, relatedRegister: gr, relatedStage: "Execute", junctions: [{ x: grRight.x, y: dataBypassY }] }),
    wire("mdr-to-memory", "data", "data-bypass", "data", anchors.mdrRight, anchors.memoryLeft, routeViaLane(mdrRight, memoryLeft, { x: memoryBusX }), { avoidsAlu: true, relatedMemoryAddress: memoryAddress, relatedStage: "Write Back", junctions: [{ x: memoryBusX, y: memoryLeft.y }] }),
    wire("mdr-to-pr", "address", "ctrl", "control", anchors.mdrLeft, anchors.prLeft, [mdrLeft, { x: mdrLeft.x - portClearance, y: mdrLeft.y }, { x: mdrLeft.x - portClearance, y: controlBusY }, { x: prLeft.x - portClearance, y: controlBusY }, { x: prLeft.x - portClearance, y: prLeft.y }, prLeft], { avoidsAlu: true, relatedStage: "Return", junctions: [{ x: mdrLeft.x - portClearance, y: controlBusY }] }),
    wire("gr-to-alu", "data", "data-compute", "data", anchors.grRight, anchors.aluInputA, routeViaLane(grRight, aluInputA, { x: grBusX }), { relatedRegister: gr, relatedStage: "Execute", junctions: [{ x: grBusX, y: aluInputA.y }] }),
    wire("shift-count-to-alu", "address", "data-compute", "address", anchors.marShiftCount, anchors.aluInputB, routeViaLane(marLeft, aluInputB, { x: aluBusRightX }), { relatedStage: "Operand Read", relatedInstructionKind: "shift", junctions: [{ x: aluBusRightX, y: aluInputB.y }] }),
    wire("mdr-to-alu", "data", "data-compute", "data", anchors.mdrToAlu, anchors.aluInputB, routeViaLane(mdrToAlu, aluInputB, { x: aluBusRightX }), { relatedMemoryAddress: memoryAddress, relatedStage: "Execute", junctions: [{ x: aluBusRightX, y: aluInputB.y }] }),
    wire("alu-to-gr", "data", "data-compute", "data", anchors.aluOutputY, anchors.grRight, routeViaLane(aluOutputY, grRight, { x: aluBusLeftX }), { relatedRegister: gr, relatedStage: "Write Back", junctions: [{ x: aluBusLeftX, y: grRight.y }] }),
    wire("alu-to-fr", "control", "flag", "flag", anchors.aluFlagOut, anchors.frInput, routeViaLane(aluFlagOut, frInput, { y: frInput.y - 12 }), { relatedStage: "Write Back", junctions: [{ x: aluFlagOut.x, y: frInput.y - 12 }] }),
    wire("address-to-gr", "address", "addr", "address", anchors.marLeft, anchors.grLeft, routeViaLane(marLeft, grLeft, { y: addressBusY }), { relatedRegister: gr, relatedStage: "Write Back", junctions: [{ x: grLeft.x, y: addressBusY }] }),
    wire("address-to-pr", "address", "ctrl", "control", anchors.marLeft, anchors.prLeft, [marLeft, { x: marLeft.x - portClearance, y: marLeft.y }, { x: marLeft.x - portClearance, y: addressBusY }, { x: prLeft.x - portClearance, y: addressBusY }, { x: prLeft.x - portClearance, y: prLeft.y }, prLeft], { relatedStage: "Next", junctions: [{ x: marLeft.x - portClearance, y: addressBusY }] }),
    wire("ir-to-decoder", "control", "ctrl", "control", anchors.irBottom, anchors.decoderTop, [irBottom, decoderTop], { relatedStage: "Decode" }),
    wire("decoder-to-controller", "control", "ctrl", "control", anchors.decoderBottom, anchors.controllerTop, [decoderBottom, controllerTop], { relatedStage: "Decode" }),
    wire("controller-to-pr", "control", "ctrl", "control", anchors.controllerRight, anchors.prLeft, [controllerRight, { x: prLeft.x - controlClearance, y: controllerRight.y }, { x: prLeft.x - controlClearance, y: controlBusY }, { x: prLeft.x - controlClearance, y: prLeft.y }, prLeft], { relatedStage: "Next", junctions: [{ x: prLeft.x - controlClearance, y: controlBusY }] })
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
  [VisualPathKind.Shift_AddressToAluToGr]: ["gr-to-alu", "shift-count-to-alu", "alu-to-gr", "alu-to-fr"],
  [VisualPathKind.PUSH_EffectiveAddressToStack]: ["base-to-eau", "eau-to-mdr", "sp-to-mar-preview", "mar-to-memory", "mdr-to-memory"],
  [VisualPathKind.POP_StackToGr]: ["sp-to-mar-preview", "mar-to-memory", "memory-to-mdr", "mdr-to-gr"],
  [VisualPathKind.CALL_ReturnAddressToStackAndPr]: ["pr-to-plus2", "return-address-to-mdr", "sp-to-mar-preview", "mar-to-memory", "mdr-to-memory", "base-to-eau", "eau-to-pr"],
  [VisualPathKind.RET_StackToPr]: ["sp-to-mar-preview", "mar-to-memory", "memory-to-mdr", "mdr-to-pr"],
  [VisualPathKind.Jump_AddressToPr]: ["pr-to-mar", "address-to-pr"],
  [VisualPathKind.ConditionalJump_AddressToPr]: ["pr-to-mar", "address-to-pr"],
  [VisualPathKind.ConditionalJump_NotTaken]: ["pr-to-plus2"],
  [VisualPathKind.Finished_None]: []
};
