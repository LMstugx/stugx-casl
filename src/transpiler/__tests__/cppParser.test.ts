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

  it("parse_while", () => {
    const result = parseCpp(`int main() {
    int i = 3;
    while (i > 0) {
        i = i - 1;
    }
    return i;
}`);

    expect(result.diagnostics).toEqual([]);
    const whileStatement = result.program?.main.body.find((statement) => statement.kind === "WhileStatement");
    expect(whileStatement).toMatchObject({
      kind: "WhileStatement",
      condition: { operator: ">" },
      body: [expect.objectContaining({ kind: "Assignment", target: "i" })]
    });
  });

  it("parse_for_with_int_initializer", () => {
    const result = parseCpp(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i = i + 1) {
        sum = sum + i;
    }
    return sum;
}`);

    expect(result.diagnostics).toEqual([]);
    const forStatement = result.program?.main.body.find((statement) => statement.kind === "ForStatement");
    expect(forStatement).toMatchObject({
      kind: "ForStatement",
      initializer: { kind: "VarDecl", name: "i" },
      condition: { operator: "<=" },
      increment: { kind: "Assignment", target: "i" },
      body: [expect.objectContaining({ kind: "Assignment", target: "sum" })]
    });
  });

  it("parse_for_with_assignment_initializer", () => {
    const result = parseCpp(`int main() {
    int i;
    int sum = 0;
    for (i = 1; i <= 3; i = i + 1) {
        sum = sum + i;
    }
    return sum;
}`);

    expect(result.diagnostics).toEqual([]);
    const forStatement = result.program?.main.body.find((statement) => statement.kind === "ForStatement");
    expect(forStatement).toMatchObject({
      kind: "ForStatement",
      initializer: { kind: "Assignment", target: "i" },
      condition: { operator: "<=" },
      increment: { kind: "Assignment", target: "i" }
    });
  });

  it("parse_post_increment_statement", () => {
    const result = parseCpp(`int main() {
    int i = 0;
    i++;
    return i;
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.program?.main.body[1]).toMatchObject({
      kind: "Assignment",
      target: "i",
      loweredFrom: "update-expression",
      expression: { kind: "BinaryExpression", operator: "+", right: { value: 1 } }
    });
  });

  it("parse_pre_increment_statement", () => {
    const result = parseCpp(`int main() {
    int i = 0;
    ++i;
    return i;
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.program?.main.body[1]).toMatchObject({
      kind: "Assignment",
      target: "i",
      loweredFrom: "update-expression",
      expression: { kind: "BinaryExpression", operator: "+", right: { value: 1 } }
    });
  });

  it("parse_post_decrement_statement", () => {
    const result = parseCpp(`int main() {
    int i = 3;
    i--;
    return i;
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.program?.main.body[1]).toMatchObject({
      kind: "Assignment",
      target: "i",
      loweredFrom: "update-expression",
      expression: { kind: "BinaryExpression", operator: "-", right: { value: 1 } }
    });
  });

  it("parse_compound_add_assignment", () => {
    const result = parseCpp(`int main() {
    int sum = 0;
    int i = 1;
    sum += i;
    return sum;
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.program?.main.body[2]).toMatchObject({
      kind: "Assignment",
      target: "sum",
      loweredFrom: "compound-assignment",
      expression: { kind: "BinaryExpression", operator: "+", right: { kind: "Identifier", name: "i" } }
    });
  });

  it("parse_compound_sub_assignment", () => {
    const result = parseCpp(`int main() {
    int sum = 3;
    sum -= 1;
    return sum;
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.program?.main.body[1]).toMatchObject({
      kind: "Assignment",
      target: "sum",
      loweredFrom: "compound-assignment",
      expression: { kind: "BinaryExpression", operator: "-", right: { kind: "IntegerLiteral", value: 1 } }
    });
  });
});
