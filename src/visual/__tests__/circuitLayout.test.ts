import { describe, expect, it } from "vitest";
import { VisualPathKind } from "../../core/types";
import { circuitAnchors, circuitLayout } from "../circuitLayout";
import { activeWireIdsByKind, buildWirePaths } from "../wirePaths";

function wireById(id: string) {
  const wire = buildWirePaths({ grIndex: 2, memoryAddress: 0x27 }).find((path) => path.id === id);
  if (!wire) throw new Error(`Missing wire ${id}`);
  return wire;
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
});
