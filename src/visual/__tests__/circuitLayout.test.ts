import { describe, expect, it } from "vitest";
import { VisualPathKind } from "../../core/types";
import { circuitAnchors, circuitLayout } from "../circuitLayout";
import { activeWireIdsByKind, buildWirePaths, type WirePath } from "../wirePaths";

function wireById(id: string) {
  const wire = buildWirePaths({ grIndex: 2, memoryAddress: 0x27 }).find((path) => path.id === id);
  if (!wire) throw new Error(`Missing wire ${id}`);
  return wire;
}

function pointsForWire(wire: WirePath) {
  const numbers = Array.from(wire.d.matchAll(/-?\d+(?:\.\d+)?/g)).map((match) => Number(match[0]));
  const points = [];
  for (let index = 0; index < numbers.length; index += 2) {
    points.push({ x: numbers[index], y: numbers[index + 1] });
  }
  return points;
}

function wireCrossesRect(wire: WirePath, rect: typeof circuitLayout.alu): boolean {
  const points = pointsForWire(wire);
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    const xMin = Math.min(a.x, b.x);
    const xMax = Math.max(a.x, b.x);
    const yMin = Math.min(a.y, b.y);
    const yMax = Math.max(a.y, b.y);
    const insideHorizontal = a.y === b.y && a.y > rect.y && a.y < rect.y + rect.h && xMax > rect.x && xMin < rect.x + rect.w;
    const insideVertical = a.x === b.x && a.x > rect.x && a.x < rect.x + rect.w && yMax > rect.y && yMin < rect.y + rect.h;
    if (insideHorizontal || insideVertical) return true;
  }
  return false;
}

function activeWiresFor(kind: VisualPathKind) {
  const ids = activeWireIdsByKind[kind];
  return buildWirePaths({ grIndex: 2, memoryAddress: 0x27 }).filter((wire) => ids.includes(wire.id));
}

describe("circuit focus layout", () => {
  it("places the top control layer without putting SP in the default fetch path", () => {
    expect(circuitLayout.ir.y).toBeLessThan(circuitLayout.gr.y);
    expect(circuitLayout.pr.y).toBeLessThan(circuitLayout.gr.y);
    expect(circuitLayout.mar.y).toBeLessThan(circuitLayout.gr.y);
    expect(circuitLayout.sp.y).toBeLessThan(circuitLayout.alu.y + 20);
    expect(activeWireIdsByKind[VisualPathKind.Ready_PrToMar]).toEqual(["pr-to-mar"]);
    expect(activeWireIdsByKind[VisualPathKind.Ready_PrToMar]).not.toContain("sp-reference");
    expect(wireById("pr-to-mar").d).not.toContain(`${circuitLayout.sp.x}`);
  });

  it("has stable row-level anchors for memory and general registers", () => {
    const grLeft = circuitAnchors.gr.rowLeft(2);
    const grRight = circuitAnchors.gr.rowRight(2);
    const memLeft = circuitAnchors.memory.rowLeft(0x27, 0x20);
    const memRight = circuitAnchors.memory.rowRight(0x27, 0x20);

    expect(grLeft.x).toBeLessThan(grRight.x);
    expect(grLeft.y).toBe(grRight.y);
    expect(memLeft.x).toBeLessThan(memRight.x);
    expect(memLeft.y).toBe(memRight.y);
  });

  it("defines ALU, MDR, and FR input/output anchors", () => {
    expect(circuitAnchors.alu.inputA().x).toBe(circuitLayout.alu.x);
    expect(circuitAnchors.alu.inputB().x).toBe(circuitLayout.alu.x + circuitLayout.alu.w);
    expect(circuitAnchors.alu.outputY().x).toBe(circuitLayout.alu.x);
    expect(circuitAnchors.alu.flagOut().y).toBe(circuitLayout.alu.y + circuitLayout.alu.h);
    expect(circuitAnchors.mdr.left().x).toBe(circuitLayout.mdr.x);
    expect(circuitAnchors.mdr.right().x).toBe(circuitLayout.mdr.x + circuitLayout.mdr.w);
    expect(circuitAnchors.mdr.bottom().y).toBe(circuitLayout.mdr.y + circuitLayout.mdr.h);
    expect(circuitAnchors.fr.input().y).toBe(circuitLayout.fr.y);
  });

  it("maps instruction paths to hardware-level anchors", () => {
    expect(activeWireIdsByKind[VisualPathKind.LD_MemoryToMdrToGr]).toEqual(["mar-to-memory", "memory-to-mdr", "mdr-to-gr"]);
    expect(activeWireIdsByKind[VisualPathKind.ST_GrToMdrToMemory]).toEqual(["gr-to-mdr", "mar-to-memory", "mdr-to-memory"]);
    expect(activeWireIdsByKind[VisualPathKind.ADDA_GrMdrToAluToGr]).toEqual(["gr-to-alu", "mar-to-memory", "memory-to-mdr", "mdr-to-alu", "alu-to-gr", "alu-to-fr"]);
    expect(activeWireIdsByKind[VisualPathKind.CPA_GrMdrToAluToFr]).not.toContain("alu-to-gr");
    expect(activeWireIdsByKind[VisualPathKind.Jump_AddressToPr]).toEqual(["pr-to-mar", "address-to-pr"]);
    expect(activeWireIdsByKind[VisualPathKind.LAD_AddressToGr]).not.toContain("memory-to-mdr");
  });

  it("keeps LD and ST data bypass lanes outside the ALU body", () => {
    const ldWires = activeWiresFor(VisualPathKind.LD_MemoryToMdrToGr);
    const stWires = activeWiresFor(VisualPathKind.ST_GrToMdrToMemory);

    for (const wire of [...ldWires, ...stWires].filter((path) => path.role === "data")) {
      expect(wire.avoidsAlu).toBe(true);
      expect(wire.lane).toBe("data-bypass");
      expect(wireCrossesRect(wire, circuitLayout.alu)).toBe(false);
    }
  });

  it("uses the ALU compute lane for arithmetic and compare paths", () => {
    const addaWires = activeWiresFor(VisualPathKind.ADDA_GrMdrToAluToGr);
    const cpaWires = activeWiresFor(VisualPathKind.CPA_GrMdrToAluToFr);

    expect(addaWires.filter((wire) => wire.lane === "data-compute").map((wire) => wire.id)).toEqual(["gr-to-alu", "mdr-to-alu", "alu-to-gr"]);
    expect(cpaWires.filter((wire) => wire.lane === "data-compute").map((wire) => wire.id)).toEqual(["gr-to-alu", "mdr-to-alu"]);
    expect(cpaWires.map((wire) => wire.id)).not.toContain("alu-to-gr");
  });

  it("routes jump instructions through address/control lanes rather than data lanes", () => {
    const jumpWires = activeWiresFor(VisualPathKind.Jump_AddressToPr);

    expect(jumpWires.map((wire) => wire.lane)).toEqual(["addr", "ctrl"]);
    expect(jumpWires.some((wire) => wire.role === "data")).toBe(false);
  });
});
