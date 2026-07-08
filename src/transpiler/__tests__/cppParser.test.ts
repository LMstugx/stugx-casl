import { describe, expect, it } from "vitest";
import { parseCpp } from "../cppParser";

describe("C++ subset parser", () => {
  it("parser_simple_main", () => {
    const result = parseCpp(`int main() {
    int a = 10;
    return a;
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.program?.main.name).toBe("main");
    expect(result.program?.main.body).toHaveLength(2);
    expect(result.program?.main.body[0]).toMatchObject({ kind: "VarDecl", name: "a" });
    expect(result.program?.main.body[1]).toMatchObject({ kind: "Return" });
  });
});
