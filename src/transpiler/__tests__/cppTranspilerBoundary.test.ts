import { describe, expect, it } from "vitest";
import { transpileCppToCasl } from "../cppTranspiler";

function diagnosticsFor(source: string): string {
  return transpileCppToCasl(source).diagnostics.map((diagnostic) => diagnostic.message).join("\n");
}

describe("C++ transpiler boundary diagnostics", () => {
  it("empty_cpp_source_reports_missing_main", () => {
    const result = transpileCppToCasl("");

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toContain("C++ subset program must define int main().");
  });

  it("unsupported_types_arrays_pointers_and_references_report_diagnostics", () => {
    expect(diagnosticsFor("float main() { return 0; }")).toContain("only supports int function declarations");
    expect(diagnosticsFor("void main() { return 0; }")).toContain("only supports int function declarations");
    expect(diagnosticsFor("int main() { int* p; return 0; }")).toContain("pointer variables");
    expect(diagnosticsFor("int main() { int a[1]; return 0; }")).toContain("arrays are not supported");
    expect(diagnosticsFor("int main() { int& x; return 0; }")).toContain("Unsupported character '&'");
  });

  it("complex_call_forms_are_rejected_without_crashing", () => {
    const binaryArgument = diagnosticsFor(`int addOne(int x) {
    return x + 1;
}

int main() {
    int a = 1;
    return addOne(a + 1);
}`);
    expect(binaryArgument).toContain("complex function call arguments are not supported yet");

    const callInBinary = diagnosticsFor(`int one() {
    return 1;
}

int main() {
    return one() + 1;
}`);
    expect(callInBinary).toContain("Function calls inside binary expressions are not supported yet");

    const nestedCall = diagnosticsFor(`int one() {
    return 1;
}

int id(int x) {
    return x;
}

int main() {
    return id(one());
}`);
    expect(nestedCall).toContain("complex function call arguments are not supported yet");
  });

  it("standalone_function_call_is_rejected_if_not_part_of_assignment_or_return", () => {
    const result = transpileCppToCasl(`int one() {
    return 1;
}

int main() {
    one();
    return 0;
}`);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toContain("Function call statements are not supported yet");
  });

  it("generated_label_collision_prevention_keeps_reserved_variable_safe", () => {
    const result = transpileCppToCasl(`int main() {
    int RET = 7;
    return RET;
}`);

    expect(result.ok).toBe(true);
    expect(result.caslSource).toContain("VAR_RET");
    expect(result.caslSource).not.toMatch(/^RET\s+DS/m);
  });

  it("nested_loops_keep_break_and_continue_targets_nearby", () => {
    const result = transpileCppToCasl(`int main() {
    int sum = 0;
    for (int i = 0; i < 2; i++) {
        for (int j = 0; j < 2; j++) {
            if (j == 1) {
                continue;
            }
            sum += i;
            if (sum == 1) {
                break;
            }
        }
    }
    return sum;
}`);

    expect(result.ok).toBe(true);
    expect(result.caslSource).toContain("FOR_CONTINUE_");
    expect(result.caslSource).toContain("FOR_END_");
  });
});
