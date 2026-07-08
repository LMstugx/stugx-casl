import { describe, expect, it } from "vitest";
import { DEFAULT_CASL_SOURCE, mockCaslCore } from "../core/mockCaslCore";
import { selectHighlightedSourceLine } from "../core/selectors";

describe("source map", () => {
  it("maps source lines to machine addresses and words", () => {
    const state = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);

    expect(state.sourceMap).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ line: 2, address: 0x20, machineWords: [0x1010, 0x0027] }),
        expect.objectContaining({ line: 3, address: 0x22, machineWords: [0x2010, 0x0028] }),
        expect.objectContaining({ line: 4, address: 0x24, machineWords: [0x1110, 0x0029] }),
        expect.objectContaining({ line: 5, address: 0x26, machineWords: [0x8100] }),
        expect.objectContaining({ line: 6, address: 0x27, machineWords: [0x000a] }),
        expect.objectContaining({ line: 7, address: 0x28, machineWords: [0x0014] }),
        expect.objectContaining({ line: 8, address: 0x29, machineWords: [0x0000] })
      ])
    );
  });

  it("highlights the next source line after a step", () => {
    const afterLd = mockCaslCore.step(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    expect(selectHighlightedSourceLine(afterLd)).toBe(3);
  });
});
