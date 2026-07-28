import { describe, expect, it } from "vitest";
import { DEFAULT_CASL_SOURCE, mockCaslCore } from "../core/mockCaslCore";
import { formatRegisterDisplay, selectMemoryWindow } from "../core/selectors";

describe("presentation selectors", () => {
  it("generates a bounded memory window", () => {
    const state = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
    const rows = selectMemoryWindow(state, 0x20, 0x29);

    expect(rows).toHaveLength(10);
    expect(rows[0].address).toBe(0x20);
    expect(rows[rows.length - 1]?.address).toBe(0x29);
  });

  it("formats register rows without component logic", () => {
    const state = mockCaslCore.step(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const gr1 = state.registers.find((register) => register.name === "GR1");
    const fr = state.registers.find((register) => register.name === "FR");

    expect(gr1 && formatRegisterDisplay(gr1, state)).toBe("000A");
    expect(fr && formatRegisterDisplay(fr, state)).toBe("000 (OF0 SF0 ZF0)");
  });
});
