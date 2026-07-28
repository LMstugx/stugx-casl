import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { toCometStateDto } from "../core/coreDto";
import { mockCaslCore } from "../core/mockCaslCore";

const root = resolve(".");

function stepSource(source: string, steps: number) {
  let state = mockCaslCore.assemble(source);
  for (let index = 0; index < steps; index += 1) state = mockCaslCore.step(state);
  return state;
}

function shiftState(op: "SLA" | "SRA" | "SLL" | "SRL", value: string) {
  return stepSource(`MAIN START
     LD    GR1,VALUE
     ${op}   GR1,1
     RET
VALUE DC    ${value}
     END`, 2);
}

describe("Phase 20B.1 official COMET II flag-register contract", () => {
  it("fr_has_exactly_three_public_flags_of_sf_zf", () => {
    const state = mockCaslCore.assemble("MAIN START\n     NOP\n     RET\n     END");
    expect(Object.keys(state.fr).sort()).toEqual(["n", "o", "z"]);
    const dto = toCometStateDto(state);
    expect(Object.keys(dto).filter((key) => key.startsWith("fr")).sort()).toEqual(["frOF", "frSF", "frZF"]);
    expect(JSON.stringify(dto)).not.toMatch(/frCF|carry/i);
  });

  it("all_shift_families_store_the_last_shifted_bit_in_of", () => {
    expect(shiftState("SLA", "#4000").fr).toEqual({ o: true, n: false, z: true });
    expect(shiftState("SRA", "#0001").fr).toEqual({ o: true, n: false, z: true });
    expect(shiftState("SLL", "#8000").fr).toEqual({ o: true, n: false, z: true });
    expect(shiftState("SRL", "#0001").fr).toEqual({ o: true, n: false, z: true });
    expect(shiftState("SLL", "#0001").fr).toEqual({ o: false, n: false, z: false });
  });

  it("logical_arithmetic_compare_and_branch_use_only_official_flags", () => {
    const addl = stepSource(`MAIN START
     LD GR1,A
     ADDL GR1,B
     JOV OVER
     RET
OVER RET
A DC #FFFF
B DC 1
     END`, 3);
    expect(addl.fr).toEqual({ o: true, n: false, z: true });
    expect(addl.pr).toBe(addl.symbols.OVER);

    const logical = stepSource(`MAIN START
     LD GR1,A
     AND GR1,B
     CPL GR1,B
     RET
A DC #FFFF
B DC #0001
     END`, 3);
    expect(logical.fr).toEqual({ o: false, n: false, z: true });
  });

  it("full_clear_resets_only_the_official_flags", () => {
    const cleared = mockCaslCore.fullClear();
    expect(cleared.fr).toEqual({ o: false, n: false, z: false });
  });

  it("public_runtime_sources_do_not_expose_a_carry_flag", () => {
    const publicRuntimeFiles = [
      "src/core/types.ts",
      "src/core/coreDto.ts",
      "src/core/coreStateAdapter.ts",
      "src/components/CaslCompatibilityMode.tsx",
      "src/components/DebuggerDialogs.tsx",
      "cpp-core/include/CometState.hpp",
      "cpp-core/wasm/wasm_bridge.cpp"
    ];
    for (const file of publicRuntimeFiles) {
      const source = readFileSync(resolve(root, file), "utf8");
      expect(source, file).not.toMatch(/\bCF\b|frCF|\.c\b/);
    }
  });
});
