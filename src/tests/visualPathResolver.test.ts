import { describe, expect, it } from "vitest";
import { DEFAULT_CASL_SOURCE, mockCaslCore } from "../core/mockCaslCore";
import { VisualPathKind } from "../core/types";
import { resolveActiveWireIds, resolveVisualPath } from "../visual/visualPathResolver";

describe("visual path resolver", () => {
  it("resolves ready active wires", () => {
    const state = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    const kind = resolveVisualPath(state);
    const active = resolveActiveWireIds(kind);

    expect(kind).toBe(VisualPathKind.Ready_PrToMar);
    expect(active.has("pr-to-mar")).toBe(true);
    expect(active.size).toBe(1);
  });

  it("resolves LD active wires", () => {
    const state = mockCaslCore.step(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const kind = resolveVisualPath(state);
    const active = resolveActiveWireIds(kind);

    expect(kind).toBe(VisualPathKind.LD_MemoryToMdrToGr);
    expect(active.has("memory-to-mdr")).toBe(true);
    expect(active.has("mdr-to-gr")).toBe(true);
  });

  it("resolves ST active wires", () => {
    let state = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    const active = resolveActiveWireIds(resolveVisualPath(state));

    expect(active.has("gr-to-mdr")).toBe(true);
    expect(active.has("mdr-to-memory")).toBe(true);
  });

  it("resolves ADDA active wires", () => {
    let state = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    state = mockCaslCore.step(state);
    state = mockCaslCore.step(state);
    const active = resolveActiveWireIds(resolveVisualPath(state));

    expect(active.has("gr-to-alu")).toBe(true);
    expect(active.has("mdr-to-alu")).toBe(true);
    expect(active.has("alu-to-gr")).toBe(true);
  });
});
