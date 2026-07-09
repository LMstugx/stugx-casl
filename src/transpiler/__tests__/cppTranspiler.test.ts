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

  it("semantic_rejects_function_arguments", () => {
    const result = transpileCppToCasl(`int addOne() {
    return 1;
}

int main() {
    int x;
    x = addOne(1);
    return x;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("Function arguments are not supported yet");
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

  it("transpile_invalid_syntax", () => {
    const result = transpileCppToCasl(`int main() {
    int* p;
    return 0;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("pointer");
  });
});
