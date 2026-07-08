import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import OutputPanel from "../components/OutputPanel";
import { transpileCppToCasl } from "../transpiler/cppTranspiler";

describe("Generated CASL panel", () => {
  it("highlights current row and related C++ range", () => {
    const result = transpileCppToCasl(`int main() {
    int a = 10;
    int b = 10;
    int c;
    if (a == b) {
        c = 1;
    } else {
        c = 0;
    }
    return c;
}`);
    expect(result.ok).toBe(true);
    const currentCaslLine = result.mapping.find((entry) => entry.kind === "if-condition" && entry.cppLine === 5)?.caslLines[0] ?? 0;

    const markup = renderToStaticMarkup(
      createElement(OutputPanel, {
        lines: [],
        generatedCaslSource: result.caslSource,
        cppToCaslMapping: result.mapping,
        currentCaslLine,
        currentCppLine: 5,
        initialTab: "generated",
        onClear: () => undefined
      })
    );

    expect(markup).toContain('data-testid="generated-casl-output"');
    expect(markup).toContain('data-testid="generated-casl-line-current"');
    expect(markup).toContain('data-current="true"');
    expect(markup).toContain('data-related="true"');
  });
});
