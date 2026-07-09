import { describe, expect, it } from "vitest";
import { transpileCppToCasl } from "../cppTranspiler";

describe("C++ subset transpiler diagnostics", () => {
  it("semantic_undeclared_variable", () => {
    const result = transpileCppToCasl(`int main() {
    a = 10;
    return a;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("not declared");
  });

  it("semantic_duplicate_variable", () => {
    const result = transpileCppToCasl(`int main() {
    int a = 10;
    int a = 20;
    return a;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("Duplicate variable");
  });

  it("semantic_if_undeclared_variable", () => {
    const result = transpileCppToCasl(`int main() {
    int a = 10;
    int c;
    if (a == b) {
        c = 1;
    }
    return c;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("used before declaration");
  });

  it("semantic_while_undeclared_condition", () => {
    const result = transpileCppToCasl(`int main() {
    int i = 3;
    while (missing > 0) {
        i = i - 1;
    }
    return i;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("used before declaration");
  });

  it("semantic_while_body_undeclared_variable", () => {
    const result = transpileCppToCasl(`int main() {
    int i = 3;
    while (i > 0) {
        sum = sum + i;
        i = i - 1;
    }
    return i;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("not declared");
  });

  it("semantic_for_undeclared_condition", () => {
    const result = transpileCppToCasl(`int main() {
    int sum = 0;
    for (int i = 1; missing <= 3; i = i + 1) {
        sum = sum + i;
    }
    return sum;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("used before declaration");
  });

  it("semantic_for_invalid_increment", () => {
    const result = transpileCppToCasl(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i = 1) {
        sum = sum + i;
    }
    return sum;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("for increment only as i = i + step or i = i - step");
  });

  it("semantic_for_without_condition_reports_error", () => {
    const result = transpileCppToCasl(`int main() {
    int sum = 0;
    for (int i = 1; ; i = i + 1) {
        sum = sum + i;
    }
    return sum;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("for without condition is not supported yet");
  });

  it("semantic_increment_undeclared_variable", () => {
    const result = transpileCppToCasl(`int main() {
    missing++;
    return 0;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("not declared");
  });

  it("semantic_compound_assignment_undeclared_variable", () => {
    const result = transpileCppToCasl(`int main() {
    int step = 1;
    missing += step;
    return 0;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("not declared");
  });

  it("semantic_break_outside_loop_reports_error", () => {
    const result = transpileCppToCasl(`int main() {
    break;
    return 0;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("break is only supported inside a loop");
  });

  it("semantic_continue_outside_loop_reports_error", () => {
    const result = transpileCppToCasl(`int main() {
    continue;
    return 0;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("continue is only supported inside a loop");
  });

  it("semantic_break_inside_if_inside_loop_is_valid", () => {
    const result = transpileCppToCasl(`int main() {
    int i = 0;
    while (i < 3) {
        if (i == 1) {
            break;
        }
        i++;
    }
    return i;
}`);

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("semantic_continue_inside_if_inside_loop_is_valid", () => {
    const result = transpileCppToCasl(`int main() {
    int sum = 0;
    for (int i = 1; i <= 3; i++) {
        if (i == 2) {
            continue;
        }
        sum += i;
    }
    return sum;
}`);

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("semantic_requires_main", () => {
    const result = transpileCppToCasl(`int helper() {
    return 1;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("must define int main");
  });

  it("semantic_rejects_duplicate_function", () => {
    const result = transpileCppToCasl(`int main() {
    return 0;
}

int main() {
    return 1;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("Duplicate function declaration");
  });

  it("semantic_rejects_unknown_function_call", () => {
    const result = transpileCppToCasl(`int main() {
    int x;
    x = missing();
    return x;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("Function 'missing' is not defined");
  });

  it("semantic_rejects_argument_count_mismatch", () => {
    const result = transpileCppToCasl(`int addOne() {
    return 1;
}

int main() {
    int x;
    x = addOne(1);
    return x;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("function call argument count mismatch");
  });

  it("semantic_rejects_four_parameters", () => {
    const result = transpileCppToCasl(`int sum4(int a, int b, int c, int d) {
    return a + b + c + d;
}

int main() {
    return sum4(1, 2, 3, 4);
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("only up to three function parameters are supported yet");
  });

  it("semantic_rejects_argument_count_mismatch_multi", () => {
    const result = transpileCppToCasl(`int add(int a, int b) {
    return a + b;
}

int main() {
    return add(1);
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("function call argument count mismatch");
  });

  it("semantic_rejects_duplicate_parameter_name", () => {
    const result = transpileCppToCasl(`int add(int a, int a) {
    return a;
}

int main() {
    return add(1, 2);
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("duplicate parameter name");
  });

  it("semantic_rejects_unknown_argument_identifier", () => {
    const result = transpileCppToCasl(`int addOne(int x) {
    return x + 1;
}

int main() {
    int y;
    y = addOne(missing);
    return y;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("Variable 'missing' is used before declaration");
  });

  it("semantic_rejects_unknown_identifier_argument_multi", () => {
    const result = transpileCppToCasl(`int add(int a, int b) {
    return a + b;
}

int main() {
    int known = 2;
    return add(known, missing);
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("Variable 'missing' is used before declaration");
  });

  it("semantic_rejects_parameter_local_name_conflict", () => {
    const result = transpileCppToCasl(`int id(int x) {
    int x;
    return x;
}

int main() {
    return id(1);
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("parameter name conflicts with local variable");
  });

  it("semantic_rejects_complex_function_call_argument", () => {
    const result = transpileCppToCasl(`int addOne(int x) {
    return x + 1;
}

int main() {
    int a = 5;
    return addOne(a + 1);
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("complex function call arguments are not supported yet");
  });

  it("semantic_rejects_complex_argument_expression", () => {
    const result = transpileCppToCasl(`int add(int a, int b) {
    return a + b;
}

int main() {
    int a = 1;
    int b = 2;
    return add(a + b, 3);
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("complex function call arguments are not supported yet");
  });

  it("semantic_rejects_recursive_function_call", () => {
    const result = transpileCppToCasl(`int main() {
    return main();
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("recursive function calls are not supported yet");
  });

  it("semantic_rejects_forward_function_call", () => {
    const result = transpileCppToCasl(`int main() {
    return helper();
}

int helper() {
    return 1;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("Forward declarations are not supported yet");
  });

  it("existing_no_argument_function_still_works", () => {
    const result = transpileCppToCasl(`int addOne() {
    return 1;
}

int main() {
    return addOne();
}`);

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("existing_single_argument_function_still_works", () => {
    const result = transpileCppToCasl(`int addOne(int x) {
    return x + 1;
}

int main() {
    return addOne(5);
}`);

    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("transpile_invalid_syntax", () => {
    const result = transpileCppToCasl(`int main() {
    int* p;
    return 0;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("pointer");
  });
});
