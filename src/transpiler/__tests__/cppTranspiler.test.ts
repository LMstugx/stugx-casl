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

  it("transpile_invalid_syntax", () => {
    const result = transpileCppToCasl(`int main() {
    int* p;
    return 0;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("pointer");
  });
});
