import { describe, expect, it } from "vitest";
import { VisualPathKind } from "../../core/types";
import { circuitAnchors, circuitBusLanes, circuitLayout, circuitProtectedRects, circuitRouting } from "../circuitLayout";
import { pathTemplateForInstruction, stackPathTemplates } from "../instructionPathTemplates";
import {
  activeWireIdsByKind,
  buildWirePaths,
  pointIsOnRoute,
  routeCrossesProtectedRect,
  routeIsContinuous,
  routeOrthogonal,
  routeViaLane,
  type WirePath
} from "../wirePaths";

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

function ids(wires: readonly WirePath[]): string[] {
  return wires.map((wire) => wire.id);
}

describe("circuit focus layout", () => {
  it("route_orthogonal_builds_expected_points", () => {
    expect(routeOrthogonal({ x: 10, y: 20 }, { x: 60, y: 80 })).toEqual([
      { x: 10, y: 20 },
      { x: 60, y: 20 },
      { x: 60, y: 80 }
    ]);
    expect(routeOrthogonal({ x: 10, y: 20 }, { x: 60, y: 80 }, "vertical")).toEqual([
      { x: 10, y: 20 },
      { x: 10, y: 80 },
      { x: 60, y: 80 }
    ]);
  });

  it("route_via_lane_keeps_data_bypass_away_from_alu", () => {
    expect(routeViaLane({ x: 10, y: 20 }, { x: 60, y: 80 }, { y: 100 })).toEqual([
      { x: 10, y: 20 },
      { x: 10, y: 100 },
      { x: 60, y: 100 },
      { x: 60, y: 80 }
    ]);

    for (const wire of [wireById("mdr-to-gr"), wireById("gr-to-mdr")]) {
      expect(wire.lane).toBe("data-bypass");
      expect(wireCrossesRect(wire, circuitLayout.alu)).toBe(false);
    }
  });

  it("places the top control layer without putting SP in the default fetch path", () => {
    expect(circuitLayout.ir.y).toBeLessThan(circuitLayout.gr.y);
    expect(circuitLayout.pr.y).toBeLessThan(circuitLayout.gr.y);
    expect(circuitLayout.mar.y).toBeLessThan(circuitLayout.gr.y);
    expect(circuitLayout.sp.y).toBeLessThan(circuitLayout.alu.y + 20);
    expect(activeWireIdsByKind[VisualPathKind.Ready_PrToMar]).toEqual(["pr-to-mar"]);
    expect(activeWireIdsByKind[VisualPathKind.Ready_PrToMar]).not.toContain("sp-to-mar-preview");
    expect(wireById("pr-to-mar").d).not.toContain(`${circuitLayout.sp.x}`);
  });

  it("sp_has_stack_path_anchors", () => {
    expect(circuitAnchors.sp.outputToMar().y).toBe(circuitLayout.sp.y + circuitLayout.sp.h);
    expect(circuitAnchors.sp.adjust().x).toBe(circuitLayout.sp.x + circuitLayout.sp.w);
    expect(circuitAnchors.mar.stackInput().y).toBe(circuitLayout.mar.y + circuitLayout.mar.h);
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

  it("wire_endpoints_are_snapped_to_anchor_points", () => {
    for (const wire of buildWirePaths({ grIndex: 2, memoryAddress: 0x29 })) {
      expect(wire.points[0]).toEqual({ x: wire.fromAnchor.x, y: wire.fromAnchor.y });
      expect(wire.points[wire.points.length - 1]).toEqual({ x: wire.toAnchor.x, y: wire.toAnchor.y });
      expect(wire.d).toContain(`M ${wire.fromAnchor.x}`);
    }
  });

  it("wire_paths_are_orthogonal_continuous_and_gap_free", () => {
    for (const wire of buildWirePaths({ grIndex: 2, memoryAddress: 0x29 })) {
      expect(routeIsContinuous(wire.points)).toBe(true);
      for (let index = 1; index < wire.points.length; index += 1) {
        expect(wire.points[index]).not.toEqual(wire.points[index - 1]);
      }
    }
  });

  it("terminal_segments_end_at_target_anchor", () => {
    for (const wire of buildWirePaths({ grIndex: 2, memoryAddress: 0x29 })) {
      const end = wire.terminalPoints[wire.terminalPoints.length - 1];

      expect(end).toEqual({ x: wire.toAnchor.x, y: wire.toAnchor.y });
      expect(routeIsContinuous(wire.terminalPoints)).toBe(true);
    }
  });

  it("active_wire_terminal_is_snapped_to_anchor", () => {
    for (const wire of buildWirePaths({ grIndex: 2, indexRegister: 2, memoryAddress: 0x29 })) {
      expect(wire.terminalPoints[wire.terminalPoints.length - 1]).toEqual({
        x: wire.toAnchor.x,
        y: wire.toAnchor.y
      });
      expect(routeIsContinuous(wire.terminalPoints)).toBe(true);
    }
  });

  it("junction_dots_are_normalized_to_route_points", () => {
    for (const wire of buildWirePaths({ grIndex: 2, memoryAddress: 0x29 })) {
      for (const junction of wire.junctions) {
        expect(pointIsOnRoute(junction, wire.points)).toBe(true);
      }
    }
  });

  it("junction_dots_are_on_wire_segments", () => {
    for (const wire of buildWirePaths({ grIndex: 2, indexRegister: 2, memoryAddress: 0x29 })) {
      for (const junction of wire.junctions) {
        expect(pointIsOnRoute(junction, wire.points)).toBe(true);
        expect(junction).not.toEqual(wire.fromAnchor);
        expect(junction).not.toEqual(wire.toAnchor);
      }
    }
  });

  it("eau_wires_avoid_header_and_value_rows", () => {
    const paths = buildWirePaths({ grIndex: 2, indexRegister: 2, memoryAddress: 0x28 });
    const byId = new Map(paths.map((wire) => [wire.id, wire]));
    const eauTextRect = circuitProtectedRects.eauText();

    for (const id of ["base-to-eau", "index-to-eau", "eau-to-mar", "eau-to-pr"]) {
      const wire = byId.get(id);
      expect(wire).toBeDefined();
      expect(routeCrossesProtectedRect(wire!.points, eauTextRect)).toBe(false);
    }
    expect(circuitRouting.eauInputClearance).toBeGreaterThanOrEqual(36);
    expect(circuitRouting.eauOutputClearance).toBeGreaterThanOrEqual(14);
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
    expect(activeWireIdsByKind[VisualPathKind.Shift_AddressToAluToGr]).toEqual(["gr-to-alu", "shift-count-to-alu", "alu-to-gr", "alu-to-fr"]);
    expect(activeWireIdsByKind[VisualPathKind.CALL_ReturnAddressToStackAndPr]).toEqual(["pr-to-plus2", "return-address-to-mdr", "sp-to-mar-preview", "mar-to-memory", "mdr-to-memory", "base-to-eau", "eau-to-pr"]);
    expect(activeWireIdsByKind[VisualPathKind.RET_StackToPr]).toEqual(["sp-to-mar-preview", "mar-to-memory", "memory-to-mdr", "mdr-to-pr"]);
    expect(activeWireIdsByKind[VisualPathKind.Jump_AddressToPr]).toEqual(["pr-to-mar", "address-to-pr"]);
    expect(activeWireIdsByKind[VisualPathKind.LAD_AddressToGr]).not.toContain("memory-to-mdr");
  });

  it("ld_route_uses_memory_mdr_gr_sequence", () => {
    const ldWires = activeWiresFor(VisualPathKind.LD_MemoryToMdrToGr);

    expect(ids(ldWires)).toEqual(["mar-to-memory", "memory-to-mdr", "mdr-to-gr"]);
    expect(wireById("memory-to-mdr")).toMatchObject({
      fromAnchor: expect.objectContaining({ id: "memory.0027.left" }),
      toAnchor: expect.objectContaining({ id: "mdr.right" }),
      lane: "data-bypass",
      avoidsAlu: true
    });
    expect(wireById("mdr-to-gr")).toMatchObject({
      fromAnchor: expect.objectContaining({ id: "mdr.bottom" }),
      toAnchor: expect.objectContaining({ id: "gr2.right" }),
      lane: "data-bypass",
      relatedRegister: 2
    });
  });

  it("st_route_uses_gr_mdr_memory_sequence", () => {
    const paths = buildWirePaths({ grIndex: 2, memoryAddress: 0x29 });
    const byId = new Map(paths.map((wire) => [wire.id, wire]));
    const stIds = activeWireIdsByKind[VisualPathKind.ST_GrToMdrToMemory];

    expect(stIds).toEqual(["gr-to-mdr", "mar-to-memory", "mdr-to-memory"]);
    expect(byId.get("gr-to-mdr")).toMatchObject({
      fromAnchor: expect.objectContaining({ id: "gr2.right" }),
      toAnchor: expect.objectContaining({ id: "mdr.bottom" }),
      lane: "data-bypass",
      avoidsAlu: true
    });
    expect(byId.get("mdr-to-memory")).toMatchObject({
      fromAnchor: expect.objectContaining({ id: "mdr.right" }),
      toAnchor: expect.objectContaining({ id: "memory.0029.left" }),
      lane: "data-bypass",
      relatedMemoryAddress: 0x29
    });
  });

  it("adda_route_uses_gr_mdr_alu_gr_fr_sequence", () => {
    const addaWires = activeWiresFor(VisualPathKind.ADDA_GrMdrToAluToGr);

    expect(ids(addaWires)).toEqual(["mar-to-memory", "memory-to-mdr", "gr-to-alu", "mdr-to-alu", "alu-to-gr", "alu-to-fr"]);
    expect(wireById("gr-to-alu").toAnchor.id).toBe("alu.inputA");
    expect(wireById("mdr-to-alu").toAnchor.id).toBe("alu.inputB");
    expect(wireById("alu-to-gr").fromAnchor.id).toBe("alu.outputY");
    expect(wireById("alu-to-fr").toAnchor.id).toBe("fr.input");
  });

  it("jump_route_uses_control_lane", () => {
    const jumpWires = activeWiresFor(VisualPathKind.Jump_AddressToPr);

    expect(ids(jumpWires)).toEqual(["pr-to-mar", "address-to-pr"]);
    expect(jumpWires.map((wire) => wire.semanticType)).toEqual(["address", "control"]);
    expect(jumpWires.map((wire) => wire.lane)).toEqual(["addr", "ctrl"]);
    expect(jumpWires.some((wire) => wire.role === "data")).toBe(false);
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

  it("ld_st_bypass_routes_do_not_cross_protected_text_rects", () => {
    const paths = buildWirePaths({ grIndex: 2, memoryAddress: 0x29 });
    const protectedRects = [
      circuitProtectedRects.aluBody(),
      circuitProtectedRects.grValueColumn(2),
      circuitProtectedRects.memoryTextColumn(0x29, 0x20),
      circuitProtectedRects.mdrValue()
    ];
    const bypassWireIds = ["memory-to-mdr", "mdr-to-gr", "gr-to-mdr", "mdr-to-memory"];

    for (const wire of paths.filter((path) => bypassWireIds.includes(path.id))) {
      for (const protectedRect of protectedRects) {
        expect(routeCrossesProtectedRect(wire.points, protectedRect)).toBe(false);
      }
    }
  });

  it("uses the ALU compute lane for arithmetic and compare paths", () => {
    const addaWires = activeWiresFor(VisualPathKind.ADDA_GrMdrToAluToGr);
    const cpaWires = activeWiresFor(VisualPathKind.CPA_GrMdrToAluToFr);

    expect(addaWires.filter((wire) => wire.lane === "data-compute").map((wire) => wire.id)).toEqual(["gr-to-alu", "mdr-to-alu", "alu-to-gr"]);
    expect(cpaWires.filter((wire) => wire.lane === "data-compute").map((wire) => wire.id)).toEqual(["gr-to-alu", "mdr-to-alu"]);
    expect(cpaWires.map((wire) => wire.id)).not.toContain("alu-to-gr");
  });

  it("wire_paths_enter_alu_for_adda", () => {
    const addaWires = activeWiresFor(VisualPathKind.ADDA_GrMdrToAluToGr);

    expect(addaWires.some((wire) => wire.toAnchor.id === "alu.inputA")).toBe(true);
    expect(addaWires.some((wire) => wire.toAnchor.id === "alu.inputB")).toBe(true);
    expect(addaWires.some((wire) => wire.fromAnchor.id === "alu.outputY")).toBe(true);
    expect(addaWires.some((wire) => wire.fromAnchor.id === "alu.flagOut")).toBe(true);
  });

  it("shift_path_uses_alu_or_shifter_template", () => {
    const shiftWires = activeWiresFor(VisualPathKind.Shift_AddressToAluToGr);

    expect(ids(shiftWires)).toEqual(["gr-to-alu", "shift-count-to-alu", "alu-to-gr", "alu-to-fr"]);
    expect(wireById("shift-count-to-alu")).toMatchObject({
      fromAnchor: expect.objectContaining({ id: "mar.shiftCount" }),
      toAnchor: expect.objectContaining({ id: "alu.inputB" }),
      lane: "data-compute",
      semanticType: "address"
    });
  });

  it("shift_path_does_not_use_memory_read", () => {
    const shiftWires = activeWiresFor(VisualPathKind.Shift_AddressToAluToGr);

    expect(ids(shiftWires)).not.toContain("memory-to-mdr");
    expect(ids(shiftWires)).not.toContain("mdr-to-alu");
    expect(shiftWires.some((wire) => wire.relatedMemoryAddress !== undefined)).toBe(false);
  });

  it("shift_path_updates_gr_and_fr", () => {
    const shiftWires = activeWiresFor(VisualPathKind.Shift_AddressToAluToGr);

    expect(shiftWires.some((wire) => wire.toAnchor.id === "gr2.right")).toBe(true);
    expect(shiftWires.some((wire) => wire.toAnchor.id === "fr.input")).toBe(true);
  });

  it("shift_route_uses_data_compute_lane", () => {
    const shiftWires = activeWiresFor(VisualPathKind.Shift_AddressToAluToGr);

    expect(shiftWires.filter((wire) => wire.semanticType !== "flag").every((wire) => wire.lane === "data-compute")).toBe(true);
  });

  it("visual_path_template_exists_for_shift_category", () => {
    const template = pathTemplateForInstruction("SLL");

    expect(template).toMatchObject({
      category: "shift",
      visualPath: VisualPathKind.Shift_AddressToAluToGr,
      routeSegments: ["gr-to-alu", "shift-count-to-alu", "alu-to-gr", "alu-to-fr"],
      usesMemory: false,
      usesMDR: false
    });
  });

  it("routes jump instructions through address/control lanes rather than data lanes", () => {
    const jumpWires = activeWiresFor(VisualPathKind.Jump_AddressToPr);

    expect(jumpWires.map((wire) => wire.lane)).toEqual(["addr", "ctrl"]);
    expect(jumpWires.some((wire) => wire.role === "data")).toBe(false);
  });

  it("visual_path_segments_have_anchor_metadata", () => {
    const ldWires = activeWiresFor(VisualPathKind.LD_MemoryToMdrToGr);

    for (const wire of ldWires) {
      expect(wire.fromAnchor.id).toMatch(/\./);
      expect(wire.toAnchor.id).toMatch(/\./);
      expect(wire.fromAnchor.role).toBeTruthy();
      expect(wire.toAnchor.role).toBeTruthy();
      expect(wire.direction).toBe("forward");
      expect(wire.isPrimary).toBe(true);
    }
  });

  it("visual_path_segments_have_lane_metadata", () => {
    const paths = buildWirePaths({ grIndex: 2, memoryAddress: 0x29 });

    expect(paths.find((wire) => wire.id === "mdr-to-memory")).toMatchObject({
      lane: "data-bypass",
      semanticType: "data",
      avoidsAlu: true,
      relatedMemoryAddress: 0x29
    });
    expect(paths.find((wire) => wire.id === "alu-to-fr")).toMatchObject({
      lane: "flag",
      semanticType: "flag",
      relatedStage: "Write Back"
    });
  });

  it("index_route_uses_eau_to_mar", () => {
    const paths = buildWirePaths({ grIndex: 1, indexRegister: 2, memoryAddress: 0x28 });

    expect(paths.find((wire) => wire.id === "base-to-eau")).toMatchObject({
      toAnchor: expect.objectContaining({ id: "eau.base" }),
      lane: "addr",
      semanticType: "address",
      relatedStage: "Effective Address"
    });
    expect(paths.find((wire) => wire.id === "index-to-eau")).toMatchObject({
      fromAnchor: expect.objectContaining({ id: "gr2.indexRight" }),
      toAnchor: expect.objectContaining({ id: "eau.index" }),
      lane: "addr",
      semanticType: "address",
      relatedRegister: 2
    });
    expect(paths.find((wire) => wire.id === "eau-to-mar")).toMatchObject({
      fromAnchor: expect.objectContaining({ id: "eau.sum" }),
      toAnchor: expect.objectContaining({ id: "mar.left" }),
      lane: "addr",
      semanticType: "address"
    });
  });

  it("index_input_line_targets_eau_index_anchor", () => {
    const paths = buildWirePaths({ grIndex: 1, indexRegister: 2, memoryAddress: 0x28 });
    const indexWire = paths.find((wire) => wire.id === "index-to-eau");

    expect(indexWire).toMatchObject({
      fromAnchor: expect.objectContaining({ id: "gr2.indexRight" }),
      toAnchor: expect.objectContaining({ id: "eau.index" }),
      relatedRegister: 2
    });
    expect(indexWire?.points[indexWire.points.length - 1]).toEqual(circuitAnchors.eau.indexInput());
    expect(indexWire?.points.some((point) => point.y === circuitBusLanes.addressIndexY)).toBe(true);
  });

  it("base_input_line_targets_eau_base_anchor", () => {
    const paths = buildWirePaths({ grIndex: 1, indexRegister: 2, memoryAddress: 0x28 });
    const baseWire = paths.find((wire) => wire.id === "base-to-eau");

    expect(baseWire).toMatchObject({
      fromAnchor: expect.objectContaining({ id: "operand.base" }),
      toAnchor: expect.objectContaining({ id: "eau.base" })
    });
    expect(baseWire?.points[baseWire.points.length - 1]).toEqual(circuitAnchors.eau.baseInput());
  });

  it("eau_output_line_targets_mar_or_effective_target", () => {
    const paths = buildWirePaths({ grIndex: 1, indexRegister: 2, memoryAddress: 0x28 });
    const outputWire = paths.find((wire) => wire.id === "eau-to-mar");

    expect(outputWire).toMatchObject({
      fromAnchor: expect.objectContaining({ id: "eau.sum" }),
      toAnchor: expect.objectContaining({ id: "mar.left" })
    });
    expect(outputWire?.points[0]).toEqual(circuitAnchors.eau.sumOutput());
    expect(outputWire?.points[outputWire.points.length - 1]).toEqual(circuitAnchors.mar.left());
  });

  it("eau_routes_do_not_overlap_eau_text", () => {
    const paths = buildWirePaths({ grIndex: 1, indexRegister: 2, memoryAddress: 0x28 });
    const eauText = circuitProtectedRects.eauText();

    for (const wire of paths.filter((path) => ["base-to-eau", "index-to-eau", "eau-to-mar"].includes(path.id))) {
      expect(routeCrossesProtectedRect(wire.points, eauText)).toBe(false);
    }
  });

  it("eau_routes_have_minimum_padding", () => {
    const paths = buildWirePaths({ grIndex: 1, indexRegister: 2, memoryAddress: 0x28 });
    const baseWire = paths.find((wire) => wire.id === "base-to-eau");
    const indexWire = paths.find((wire) => wire.id === "index-to-eau");
    const outputWire = paths.find((wire) => wire.id === "eau-to-mar");

    expect(baseWire?.points[0].x).toBe(circuitLayout.eau.x - circuitRouting.eauInputClearance);
    expect(indexWire?.points.some((point) => point.x === circuitLayout.eau.x - circuitRouting.eauInputClearance)).toBe(true);
    expect(outputWire?.points.some((point) => point.x === circuitLayout.eau.x + circuitLayout.eau.w + circuitRouting.eauOutputClearance)).toBe(true);
  });

  it("stack_path_guide_is_inactive_by_default", () => {
    const paths = buildWirePaths({ grIndex: 2, memoryAddress: 0x27 });
    const spToMar = paths.find((wire) => wire.id === "sp-to-mar-preview");
    const marToStack = paths.find((wire) => wire.id === "mar-to-stack-memory-preview");

    expect(spToMar).toMatchObject({
      role: "address",
      lane: "addr",
      semanticType: "address",
      fromAnchor: expect.objectContaining({ id: "sp.output" }),
      toAnchor: expect.objectContaining({ id: "mar.stackInput" }),
      relatedStage: "Stack preview"
    });
    expect(marToStack).toMatchObject({
      role: "address",
      lane: "addr",
      semanticType: "address",
      fromAnchor: expect.objectContaining({ id: "mar.right" }),
      toAnchor: expect.objectContaining({ id: "memory.spPreview" }),
      relatedStage: "Stack preview"
    });
    for (const [kind, wires] of Object.entries(activeWireIdsByKind)) {
      if (
        kind === VisualPathKind.PUSH_EffectiveAddressToStack ||
        kind === VisualPathKind.POP_StackToGr ||
        kind === VisualPathKind.CALL_ReturnAddressToStackAndPr ||
        kind === VisualPathKind.RET_StackToPr
      ) continue;
      expect(wires).not.toContain("sp-to-mar-preview");
      expect(wires).not.toContain("mar-to-stack-memory-preview");
    }
  });

  it("call_path_writes_return_address_and_updates_pr", () => {
    const paths = buildWirePaths({ grIndex: 1, memoryAddress: 0xfffd, memoryWindowStart: 0xfff8 });
    const byId = new Map(paths.map((wire) => [wire.id, wire]));

    expect(byId.get("return-address-to-mdr")).toMatchObject({
      fromAnchor: expect.objectContaining({ id: "plus2.right" }),
      toAnchor: expect.objectContaining({ id: "mdr.right" }),
      avoidsAlu: true,
      relatedStage: "Return address"
    });
    expect(byId.get("eau-to-pr")).toMatchObject({
      fromAnchor: expect.objectContaining({ id: "eau.sum" }),
      toAnchor: expect.objectContaining({ id: "pr.left" }),
      lane: "ctrl",
      semanticType: "control"
    });
  });

  it("ret_stack_path_reads_memory_to_pr", () => {
    const retWires = activeWiresFor(VisualPathKind.RET_StackToPr);

    expect(ids(retWires)).toEqual(["sp-to-mar-preview", "mar-to-memory", "memory-to-mdr", "mdr-to-pr"]);
    expect(retWires.find((wire) => wire.id === "mdr-to-pr")).toMatchObject({
      fromAnchor: expect.objectContaining({ id: "mdr.left" }),
      toAnchor: expect.objectContaining({ id: "pr.left" }),
      avoidsAlu: true,
      semanticType: "control"
    });
  });

  it("stack_path_template_placeholders_exist", () => {
    expect(stackPathTemplates["stack-read"]).toMatchObject({
      kind: "stack-read",
      source: "SP",
      target: "GR",
      routeSegments: ["sp-to-mar-preview", "mar-to-memory", "memory-to-mdr", "mdr-to-gr"],
      usesSP: true,
      usesMAR: true,
      usesMemory: true,
      readsMemory: true,
      writesMemory: false,
      futureInstructionKinds: ["POP"]
    });
    expect(stackPathTemplates["stack-write"]).toMatchObject({
      kind: "stack-write",
      source: "SP",
      target: "Memory[SP]",
      routeSegments: ["base-to-eau", "eau-to-mdr", "sp-to-mar-preview", "mar-to-memory", "mdr-to-memory"],
      writesMemory: true,
      futureInstructionKinds: ["PUSH"]
    });
    expect(stackPathTemplates["call-return-address"]).toMatchObject({
      instructionKind: "CALL",
      routeSegments: ["pr-to-plus2", "return-address-to-mdr", "sp-to-mar-preview", "mar-to-memory", "mdr-to-memory", "eau-to-pr"],
      futureInstructionKinds: ["CALL"]
    });
    expect(stackPathTemplates["return-pop-address"]).toMatchObject({
      instructionKind: "RET",
      routeSegments: ["sp-to-mar-preview", "mar-to-memory", "memory-to-mdr", "mdr-to-pr"],
      futureInstructionKinds: ["RET_STACK"]
    });
  });

  it("row_anchor_endpoint_is_used_for_memory_read_write", () => {
    const readWire = wireById("memory-to-mdr");
    const writeWire = buildWirePaths({ grIndex: 2, memoryAddress: 0x29 }).find((wire) => wire.id === "mdr-to-memory");

    expect(readWire.fromAnchor.id).toBe("memory.0027.left");
    expect(writeWire?.toAnchor.id).toBe("memory.0029.left");
  });

  it("row_anchor_endpoint_is_used_for_gr_read_write", () => {
    expect(wireById("gr-to-alu").fromAnchor.id).toBe("gr2.right");
    expect(wireById("gr-to-mdr").fromAnchor.id).toBe("gr2.right");
    expect(wireById("mdr-to-gr").toAnchor.id).toBe("gr2.right");
    expect(wireById("alu-to-gr").toAnchor.id).toBe("gr2.right");
  });
});
