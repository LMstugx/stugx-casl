import { describe, expect, it } from "vitest";
import { DEFAULT_CASL_SOURCE, mockCaslCore } from "../../core/mockCaslCore";
import { VisualPathKind } from "../../core/types";
import { resolveActiveWireIds, resolveVisualPath } from "../visualPathResolver";

describe("visualPathResolver visual benchmark states", () => {
  it("keeps Ready limited to PR_TO_MAR", () => {
    const state = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);

    expect(resolveVisualPath(state)).toBe(VisualPathKind.Ready_PrToMar);
    expect([...resolveActiveWireIds(VisualPathKind.Ready_PrToMar)]).toEqual(["pr-to-mar"]);
  });

  it("resolves LD, ADDA, ST, and Finished path kinds", () => {
    const ready = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    const afterLd = mockCaslCore.step(ready);
    const afterAdda = mockCaslCore.step(afterLd);
    const afterSt = mockCaslCore.step(afterAdda);
    const finished = mockCaslCore.step(afterSt);

    expect(resolveVisualPath(afterLd)).toBe(VisualPathKind.LD_MemoryToMdrToGr);
    expect(resolveVisualPath(afterAdda)).toBe(VisualPathKind.ADDA_GrMdrToAluToGr);
    expect(resolveVisualPath(afterSt)).toBe(VisualPathKind.ST_GrToMdrToMemory);
    expect(resolveVisualPath(finished)).toBe(VisualPathKind.Finished_None);
  });
});
