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

  it("transpile_invalid_syntax", () => {
    const result = transpileCppToCasl(`int main() {
    int* p;
    return 0;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("pointer");
  });
});
