import { describe, expect, it } from "vitest";
import { mockCaslCore } from "../core/mockCaslCore";
import { transpileCppToCasl } from "../transpiler/cppTranspiler";

function timed<T>(work: () => T): { result: T; elapsedMs: number } {
  const start = performance.now();
  const result = work();
  return { result, elapsedMs: performance.now() - start };
}

describe("large-source stress checks", () => {
  it("cpp_many_declarations_and_assignments_transpile_within_bounds", () => {
    const declarations = Array.from({ length: 200 }, (_, index) => `    int v${index} = ${index & 0x7fff};`).join("\n");
    const assignments = Array.from({ length: 120 }, (_, index) => `    v${index} = v${index} + 1;`).join("\n");
    const source = `int main() {
${declarations}
${assignments}
    return v119;
}`;

    const { result, elapsedMs } = timed(() => transpileCppToCasl(source));

    expect(elapsedMs).toBeLessThan(500);
    expect(result.ok).toBe(true);
    expect(result.caslSource).toContain("MAIN START");
    expect(result.mapping.length).toBeGreaterThan(200);
    expect(result.caslSource.length).toBeLessThan(120_000);
  });

  it("cpp_many_small_functions_transpile_without_forward_call_or_label_collisions", () => {
    const functions = Array.from({ length: 30 }, (_, index) => `int f${index}(int x) {
    return x + ${index};
}`).join("\n\n");
    const source = `${functions}

int main() {
    int result;
    result = f29(1);
    return result;
}`;

    const { result, elapsedMs } = timed(() => transpileCppToCasl(source));

    expect(elapsedMs).toBeLessThan(500);
    expect(result.ok).toBe(true);
    expect(result.caslSource).toContain("FUNC_F29");
    expect(result.caslSource).toContain("ST    GR1,FUNC_F29_X");
    expect(result.caslSource).toContain("CALL  FUNC_F29");
  });

  it("casl_many_labels_and_instructions_assemble_with_valid_source_map", () => {
    const body = Array.from({ length: 400 }, (_, index) => `L${index.toString().padStart(3, "0")}  NOP`).join("\n");
    const source = `MAIN START
${body}
     RET
     END`;
    const { result: state, elapsedMs } = timed(() => mockCaslCore.assemble(source));

    expect(elapsedMs).toBeLessThan(500);
    expect(state.runState).toBe("Ready");
    expect(state.sourceMap.length).toBe(401);
    expect(state.sourceMap[0].address).toBe(0x0020);
    expect(state.sourceMap[state.sourceMap.length - 1].source).toContain("RET");
  });

  it("casl_data_near_memory_boundary_is_safe", () => {
    const source = `MAIN START
     RET
FILL DS 65503
     END`;
    const { result: state, elapsedMs } = timed(() => mockCaslCore.assemble(source));

    expect(elapsedMs).toBeLessThan(1000);
    expect(state.runState).toBe("Ready");
    expect(state.symbols.FILL).toBe(0x0021);
    expect(state.memoryRows.some((row) => row.address === 0xffff)).toBe(true);
  });
});
