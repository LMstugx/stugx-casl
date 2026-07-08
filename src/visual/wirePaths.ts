import { VisualPathKind } from "../core/types";
import { circuitAnchors, circuitLayout } from "./circuitLayout";
import type { CircuitPoint } from "./circuitLayout";

export type WireRole = "address" | "control" | "data" | "inactive";

export type WirePath = {
  id: string;
  role: WireRole;
  d: string;
};

export type WirePathOptions = {
  grIndex?: number;
  memoryAddress?: number;
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

function cubicTo(c1: CircuitPoint, c2: CircuitPoint, end: CircuitPoint): string {
  return `C ${point(c1)} ${point(c2)} ${point(end)}`;
}

function clampRegisterIndex(index = 1): number {
  return Math.max(0, Math.min(7, index));
}

export function buildWirePaths({ grIndex = 1, memoryAddress = 0x27 }: WirePathOptions = {}): readonly WirePath[] {
  const gr = clampRegisterIndex(grIndex);
  const grLeft = circuitAnchors.gr.rowLeft(gr);
  const grRight = circuitAnchors.gr.rowRight(gr);
  const memoryLeft = circuitAnchors.memory.rowLeft(memoryAddress);
  const mdrLeft = circuitAnchors.mdr.left();
  const mdrRight = circuitAnchors.mdr.right();
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

  return Object.freeze([
    { id: "pr-to-mar", role: "address", d: `${moveTo(prRight)} ${cubicTo({ x: 514, y: 22 }, { x: 650, y: 22 }, marLeft)}` },
    { id: "pr-to-plus2", role: "control", d: `${moveTo(prRight)} ${lineTo({ x: circuitLayout.addressResult.x, y: prRight.y })}` },
    {
      id: "sp-reference",
      role: "inactive",
      d: `M ${circuitLayout.sp.x + circuitLayout.sp.w} ${circuitLayout.sp.y + 18} C ${circuitLayout.sp.x + circuitLayout.sp.w + 24} ${circuitLayout.sp.y + 18} ${circuitLayout.mar.x + 32} ${circuitLayout.mar.y + circuitLayout.mar.h + 18} ${circuitLayout.mar.x + 32} ${circuitLayout.mar.y + circuitLayout.mar.h}`
    },
    { id: "mar-to-memory", role: "address", d: `${moveTo(marRight)} ${cubicTo({ x: 888, y: marRight.y }, { x: 888, y: memoryLeft.y }, memoryLeft)}` },
    { id: "memory-to-mdr", role: "data", d: `${moveTo(memoryLeft)} ${cubicTo({ x: memoryLeft.x - 16, y: memoryLeft.y }, { x: mdrRight.x + 12, y: mdrRight.y }, mdrRight)}` },
    { id: "mdr-to-gr", role: "data", d: `${moveTo(mdrLeft)} ${cubicTo({ x: 724, y: 210 }, { x: 560, y: 204 }, { x: grRight.x + 32, y: grRight.y })} ${lineTo(grRight)}` },
    { id: "gr-to-mdr", role: "data", d: `${moveTo(grRight)} ${cubicTo({ x: grRight.x + 34, y: grRight.y }, { x: 610, y: 206 }, { x: 724, y: 210 })} ${cubicTo({ x: 750, y: 216 }, { x: mdrLeft.x - 16, y: mdrLeft.y }, mdrLeft)}` },
    { id: "mdr-to-memory", role: "data", d: `${moveTo(mdrRight)} ${cubicTo({ x: mdrRight.x + 16, y: mdrRight.y }, { x: memoryLeft.x - 16, y: memoryLeft.y }, memoryLeft)}` },
    { id: "gr-to-alu", role: "data", d: `${moveTo(grRight)} ${cubicTo({ x: grRight.x + 28, y: grRight.y }, { x: aluInputA.x - 28, y: aluInputA.y }, aluInputA)}` },
    { id: "mdr-to-alu", role: "data", d: `${moveTo(mdrToAlu)} ${cubicTo({ x: mdrToAlu.x - 18, y: mdrToAlu.y }, { x: aluInputB.x + 18, y: aluInputB.y }, aluInputB)}` },
    { id: "alu-to-gr", role: "data", d: `${moveTo(aluOutputY)} ${cubicTo({ x: aluOutputY.x - 28, y: aluOutputY.y }, { x: grRight.x + 34, y: grRight.y }, grRight)}` },
    { id: "alu-to-fr", role: "control", d: `${moveTo(aluFlagOut)} ${cubicTo({ x: aluFlagOut.x, y: aluFlagOut.y + 14 }, { x: frInput.x, y: frInput.y - 14 }, frInput)}` },
    { id: "address-to-gr", role: "address", d: `${moveTo(marLeft)} ${cubicTo({ x: 666, y: 118 }, { x: grRight.x + 48, y: grLeft.y }, grLeft)}` },
    { id: "address-to-pr", role: "address", d: `${moveTo(marLeft)} ${cubicTo({ x: 670, y: 16 }, { x: 520, y: 18 }, prLeft)}` },
    { id: "ir-to-decoder", role: "control", d: "M 112 108 L 112 132" },
    { id: "decoder-to-controller", role: "control", d: "M 112 244 L 112 270" },
    { id: "controller-to-pr", role: "control", d: "M 186 316 C 236 318 246 71 322 71" },
    { id: "source-to-display", role: "inactive", d: "M 548 492 C 578 492 578 484 590 484" }
  ]);
}

export const wirePaths: readonly WirePath[] = buildWirePaths();

export const activeWireIdsByKind: Record<VisualPathKind, string[]> = {
  [VisualPathKind.None]: [],
  [VisualPathKind.Ready_PrToMar]: ["pr-to-mar"],
  [VisualPathKind.LD_MemoryToMdrToGr]: ["memory-to-mdr", "mdr-to-gr"],
  [VisualPathKind.ST_GrToMdrToMemory]: ["gr-to-mdr", "mdr-to-memory"],
  [VisualPathKind.ADDA_GrMdrToAluToGr]: ["gr-to-alu", "mdr-to-alu", "alu-to-gr", "alu-to-fr"],
  [VisualPathKind.LAD_AddressToGr]: ["pr-to-mar", "address-to-gr"],
  [VisualPathKind.SUBA_GrMdrToAluToGr]: ["gr-to-alu", "mdr-to-alu", "alu-to-gr", "alu-to-fr"],
  [VisualPathKind.CPA_GrMdrToAluToFr]: ["gr-to-alu", "mdr-to-alu", "alu-to-fr"],
  [VisualPathKind.Jump_AddressToPr]: ["pr-to-mar", "address-to-pr"],
  [VisualPathKind.ConditionalJump_AddressToPr]: ["pr-to-mar", "address-to-pr"],
  [VisualPathKind.ConditionalJump_NotTaken]: ["pr-to-plus2"],
  [VisualPathKind.Finished_None]: []
};
