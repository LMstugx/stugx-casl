import { describe, expect, it } from "vitest";
import { mockCaslCore } from "../core/mockCaslCore";

function messagesFor(source: string): string {
  return mockCaslCore.assemble(source).diagnostics.map((diagnostic) => diagnostic.message).join("\n");
}

describe("assembler boundary diagnostics", () => {
  it("empty_source_and_comments_only_report_required_directives", () => {
    const empty = mockCaslCore.assemble("");
    const comments = mockCaslCore.assemble("; only a comment\n   ; another comment");

    for (const state of [empty, comments]) {
      expect(state.runState).toBe("Error");
      expect(state.assembled).toBe(false);
      expect(state.diagnostics.map((diagnostic) => diagnostic.message)).toEqual(
        expect.arrayContaining(["CASL source must contain START directive", "CASL source must contain END directive"])
      );
    }
  });

  it("missing_start_or_end_reports_clear_diagnostics", () => {
    expect(messagesFor("     RET\n     END")).toContain("START directive");
    expect(messagesFor("MAIN START\n     RET")).toContain("END directive");
  });

  it("malformed_operands_report_errors_without_crashing", () => {
    const cases = [
      ["MAIN START\n     LD    GR1\n     END", "LD requires register and address operands"],
      ["MAIN START\n     LD    GR1,A,GR2,EXTRA\nA    DC    1\n     END", "LD has too many operands"],
      ["MAIN START\n     ST    ,A\nA    DC    1\n     END", "ST requires register and address operands"],
      ["MAIN START\n     CALL\n     END", "CALL requires an address operand"],
      ["MAIN START\n     POP\n     END", "POP requires a register operand"],
      ["MAIN START\n     POP   GR1,GR2\n     END", "POP does not support index operands"]
    ] as const;

    for (const [source, expected] of cases) {
      const state = mockCaslCore.assemble(source);
      expect(state.runState).toBe("Error");
      expect(state.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain(expected);
    }
  });

  it("numeric_and_storage_boundaries_are_diagnosed", () => {
    expect(messagesFor("MAIN START\nA    DC    NOPE\n     END")).toContain("Invalid numeric value");
    expect(messagesFor("MAIN START\nA    DC    -1\n     END")).toContain("Invalid numeric value");
    expect(messagesFor("MAIN START\nA    DC    65536\n     END")).toContain("Numeric value out of 16-bit range");
    expect(messagesFor("MAIN START\nA    DS    65505\n     END")).toMatch(/Program memory exceeds 0xFFFF|DS address out of range/);

    const zeroDs = mockCaslCore.assemble("MAIN START\nA    DS    0\n     RET\n     END");
    expect(zeroDs.runState).toBe("Ready");
    expect(zeroDs.sourceMap.find((entry) => entry.label === "A")?.machineWords).toEqual([]);
  });

  it("whitespace_lowercase_and_inline_comments_remain_supported", () => {
    const state = mockCaslCore.assemble(`main start
        ld    gr1, a   ; load A
        ret
a       dc    #0001
        end`);

    expect(state.runState).toBe("Ready");
    expect(state.memory[0x20]).toBe(0x1010);
    expect(state.memory[state.symbols.A]).toBe(0x0001);
  });

  it("label_collision_is_reported", () => {
    expect(messagesFor("MAIN START\nMAIN DC 1\n     END")).toContain("Duplicate label");
  });
});
