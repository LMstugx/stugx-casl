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

  it("parse_if_without_else", () => {
    const result = parseCpp(`int main() {
    int a = 1;
    int b = 1;
    int c;
    if (a == b) {
        c = 1;
    }
    return c;
}`);

    expect(result.diagnostics).toEqual([]);
    const ifStatement = result.program?.main.body.find((statement) => statement.kind === "IfStatement");
    expect(ifStatement).toMatchObject({ kind: "IfStatement", condition: { operator: "==" }, thenBody: [expect.objectContaining({ kind: "Assignment" })] });
  });

  it("parse_if_else", () => {
    const result = parseCpp(`int main() {
    int a = 1;
    int b = 2;
    int c;
    if (a != b) {
        c = 1;
    } else {
        c = 0;
    }
    return c;
}`);

    expect(result.diagnostics).toEqual([]);
    const ifStatement = result.program?.main.body.find((statement) => statement.kind === "IfStatement");
    expect(ifStatement).toMatchObject({ kind: "IfStatement", condition: { operator: "!=" }, elseBody: [expect.objectContaining({ kind: "Assignment" })] });
  });
});
