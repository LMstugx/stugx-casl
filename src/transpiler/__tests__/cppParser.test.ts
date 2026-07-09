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

  it("parse_break_statement", () => {
    const result = parseCpp(`int main() {
    int i = 0;
    while (i < 3) {
        break;
    }
    return i;
}`);

    expect(result.diagnostics).toEqual([]);
    const whileStatement = result.program?.main.body.find((statement) => statement.kind === "WhileStatement");
    expect(whileStatement).toMatchObject({
      kind: "WhileStatement",
      body: [expect.objectContaining({ kind: "BreakStatement" })]
    });
  });

  it("parse_continue_statement", () => {
    const result = parseCpp(`int main() {
    int i = 0;
    while (i < 3) {
        continue;
    }
    return i;
}`);

    expect(result.diagnostics).toEqual([]);
    const whileStatement = result.program?.main.body.find((statement) => statement.kind === "WhileStatement");
    expect(whileStatement).toMatchObject({
      kind: "WhileStatement",
      body: [expect.objectContaining({ kind: "ContinueStatement" })]
    });
  });

  it("parse_multiple_int_functions", () => {
    const result = parseCpp(`int addOne() {
    return 1;
}

int main() {
    int x;
    x = addOne();
    return x;
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.program?.functions.map((fn) => fn.name)).toEqual(["addOne", "main"]);
    expect(result.program?.main.name).toBe("main");
  });

  it("parse_call_expression_no_args", () => {
    const result = parseCpp(`int addOne() {
    return 1;
}

int main() {
    int x;
    x = addOne();
    return addOne();
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.program?.main.body[1]).toMatchObject({
      kind: "Assignment",
      target: "x",
      expression: { kind: "CallExpression", callee: "addOne", arguments: [] }
    });
    expect(result.program?.main.body[2]).toMatchObject({
      kind: "Return",
      expression: { kind: "CallExpression", callee: "addOne", arguments: [] }
    });
  });

  it("parse_single_int_parameter_function", () => {
    const result = parseCpp(`int addOne(int x) {
    return x + 1;
}

int main() {
    return addOne(5);
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.program?.functions[0]).toMatchObject({
      kind: "Function",
      name: "addOne",
      parameters: [{ name: "x", type: "int" }]
    });
  });

  it("parse_single_argument_call_literal", () => {
    const result = parseCpp(`int addOne(int x) {
    return x;
}

int main() {
    int y;
    y = addOne(5);
    return y;
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.program?.main.body[1]).toMatchObject({
      kind: "Assignment",
      expression: { kind: "CallExpression", callee: "addOne", arguments: [{ kind: "IntegerLiteral", value: 5 }] }
    });
  });

  it("parse_single_argument_call_identifier", () => {
    const result = parseCpp(`int addOne(int x) {
    return x;
}

int main() {
    int a = 5;
    int y;
    y = addOne(a);
    return y;
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.program?.main.body[2]).toMatchObject({
      kind: "Assignment",
      expression: { kind: "CallExpression", callee: "addOne", arguments: [{ kind: "Identifier", name: "a" }] }
    });
  });

  it("existing_main_only_program_still_parses", () => {
    const result = parseCpp(`int main() {
    int a = 1;
    return a;
}`);

    expect(result.diagnostics).toEqual([]);
    expect(result.program?.functions).toHaveLength(1);
    expect(result.program?.main.body).toHaveLength(2);
  });
});
