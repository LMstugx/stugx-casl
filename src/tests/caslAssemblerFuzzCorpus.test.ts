import { describe, expect, it } from "vitest";
import { mockCaslCore } from "../core/mockCaslCore";

const malformedCorpus = [
  ["empty source", ""],
  ["comments only", "; comment\n; another"],
  ["missing START", "     RET\n     END"],
  ["missing END", "MAIN START\n     RET"],
  ["invalid mnemonic", "MAIN START\n     NOPE\n     END"],
  ["malformed register", "MAIN START\n     LD    GX1,A\nA    DC    1\n     END"],
  ["invalid index register", "MAIN START\n     LD    GR1,A,GR8\nA    DC    1\n     END"],
  ["GR0 index register", "MAIN START\n     LD    GR1,A,GR0\nA    DC    1\n     END"],
  ["undefined label", "MAIN START\n     LD    GR1,MISSING\n     END"],
  ["duplicate label", "MAIN START\nA    DC    1\nA    DC    2\n     END"],
  ["too many operands", "MAIN START\n     LD    GR1,A,GR2,EXTRA\nA    DC    1\n     END"],
  ["missing operands", "MAIN START\n     ADDA  GR1\n     END"],
  ["malformed DC", "MAIN START\nA    DC    NOPE\n     END"],
  ["malformed DS", "MAIN START\nA    DS    NOPE\n     END"],
  ["huge DS overflow", "MAIN START\nA    DS    65505\n     END"],
  ["negative numeric unsupported", "MAIN START\nA    DC    -1\n     END"],
  ["over 16-bit numeric", "MAIN START\nA    DC    65536\n     END"],
  ["trailing comma", "MAIN START\n     LD    GR1,A,\nA    DC    1\n     END"],
  ["bad hex literal", "MAIN START\nA    DC    #GGGG\n     END"],
  ["very long label undefined operand", `MAIN START\n     LD    GR1,${"LONG".repeat(80)}\n     END`],
  ["generated-style duplicate label", "MAIN START\nFUNC_ADD_A DC 1\nFUNC_ADD_A DC 2\n     END"]
] as const;

const validBoundaryCorpus = [
  [
    "lower-case mnemonic",
    `main start
        ld    gr1,a
        ret
a       dc    1
        end`
  ],
  [
    "mixed whitespace and comments",
    "MAIN   START\n\tLD\tGR1,A   ; read\n     RET\nA    DC    #0001\n     END"
  ],
  [
    "program exactly at memory boundary",
    "MAIN START\n     RET\nFILL DS 65503\n     END"
  ]
] as const;

describe("CASL assembler fuzz-style malformed corpus", () => {
  it.each(malformedCorpus)("casl_assembler_fuzz_corpus_%s", (_name, source) => {
    const start = performance.now();
    const state = mockCaslCore.assemble(source);
    const elapsedMs = performance.now() - start;

    expect(elapsedMs).toBeLessThan(1000);
    expect(state.runState).toBe("Error");
    expect(state.diagnostics.length).toBeGreaterThan(0);
    expect(state.diagnostics.map((diagnostic) => diagnostic.message).join("\n").trim()).not.toBe("");
  });

  it.each(validBoundaryCorpus)("casl_assembler_valid_boundary_%s", (_name, source) => {
    const state = mockCaslCore.assemble(source);

    expect(state.runState).toBe("Ready");
    expect(state.diagnostics).toEqual([]);
    expect(state.sourceMap.length).toBeGreaterThan(0);
  });
});
