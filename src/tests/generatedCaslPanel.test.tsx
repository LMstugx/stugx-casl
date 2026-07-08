import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import OutputPanel from "../components/OutputPanel";
import { createCometStateFromDto } from "../core/coreStateAdapter";
import { toAssembleResultDto } from "../core/coreDto";
import { mockCaslCore } from "../core/mockCaslCore";
import { getDemoProgram } from "../examples/demoPrograms";
import { prepareSourceForCoreAssembly } from "../store/useAppStore";
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
        sourceMode: "cpp",
        initialTab: "generated",
        onClear: () => undefined
      })
    );

    expect(markup).toContain("Generated CASL II Assembly");
    expect(markup).toContain('data-testid="generated-casl-output"');
    expect(markup).toContain("This CASL II code was generated from the C++ subset source.");
    expect(markup).toContain('data-testid="generated-casl-line-current"');
    expect(markup).toContain('data-current="true"');
    expect(markup).toContain('data-related="true"');
  });

  it("generated_casl_tab_title", () => {
    const markup = renderToStaticMarkup(
      createElement(OutputPanel, {
        lines: [],
        generatedCaslSource: "MAIN START\n     RET\n     END",
        initialTab: "generated",
        onClear: () => undefined
      })
    );

    expect(markup).toContain("Generated CASL II Assembly");
    expect(markup).not.toContain("This CASL II code was generated from the C++ subset source.");
  });

  it("generated_casl_shows_jump_target_label", () => {
    const program = getDemoProgram("cpp-break-continue");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = createCometStateFromDto(toAssembleResultDto(mockCaslCore.assemble(prepared.coreSourceText)).state);

    const markup = renderToStaticMarkup(
      createElement(OutputPanel, {
        lines: [],
        state,
        generatedCaslSource: prepared.generatedCaslSource,
        cppToCaslMapping: prepared.mapping,
        sourceMode: "cpp",
        initialTab: "generated",
        onClear: () => undefined
      })
    );

    expect(markup).toContain("JUMP");
    expect(markup).toContain("FOR_CONTINUE_0");
    expect(markup).toContain("continue -&gt; FOR_CONTINUE_0");
  });

  it("generated_casl_shows_break_continue_badges", () => {
    const program = getDemoProgram("cpp-break-continue");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = createCometStateFromDto(toAssembleResultDto(mockCaslCore.assemble(prepared.coreSourceText)).state);

    const markup = renderToStaticMarkup(
      createElement(OutputPanel, {
        lines: [],
        state,
        generatedCaslSource: prepared.generatedCaslSource,
        cppToCaslMapping: prepared.mapping,
        sourceMode: "cpp",
        initialTab: "generated",
        onClear: () => undefined
      })
    );

    expect(markup).toContain("CONTINUE");
    expect(markup).toContain("break-statement");
    expect(markup).toContain("continue-statement");
  });

  it("generated_casl_shows_target_address", () => {
    const program = getDemoProgram("cpp-break-continue");
    expect(program).toBeDefined();
    const prepared = prepareSourceForCoreAssembly(program!.source, "cpp");
    expect(prepared.ok).toBe(true);
    const state = createCometStateFromDto(toAssembleResultDto(mockCaslCore.assemble(prepared.coreSourceText)).state);

    const markup = renderToStaticMarkup(
      createElement(OutputPanel, {
        lines: [],
        state,
        generatedCaslSource: prepared.generatedCaslSource,
        cppToCaslMapping: prepared.mapping,
        sourceMode: "cpp",
        initialTab: "generated",
        onClear: () => undefined
      })
    );

    expect(markup).toContain("addr");
    expect(markup).toContain("line");
  });
});
