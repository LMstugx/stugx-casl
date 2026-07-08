import { describe, expect, it } from "vitest";
import readme from "../../README.md?raw";
import demoScript from "../../docs/demo-script.md?raw";
import submissionOverview from "../../docs/submission-overview.md?raw";
import validateAllScript from "../../scripts/validate-all.ps1?raw";

describe("submission package documentation", () => {
  it("readme_mentions_machine_code", () => {
    expect(readme).toContain("Machine Code");
    expect(readme).toContain("Opcode / operand explanation");
  });

  it("readme_mentions_wasm_backend", () => {
    expect(readme).toContain("experimental WASM backend");
    expect(readme).toContain("pnpm dev:wasm");
  });

  it("submission_overview_exists", () => {
    expect(submissionOverview).toContain("Project Summary");
    expect(submissionOverview).toContain("Differentiation");
    expect(submissionOverview).toContain("C++ source");
    expect(submissionOverview).toContain("COMET II Machine Code");
  });

  it("demo_script_mentions_break_continue", () => {
    expect(demoScript).toContain("C++: Break Continue");
    expect(demoScript).toContain("FOR_CONTINUE_0");
    expect(demoScript).toContain("FOR_END_0");
  });

  it("validate_all_script_exists", () => {
    expect(validateAllScript).toContain("pnpm test");
    expect(validateAllScript).toContain("pnpm build:wasm");
    expect(validateAllScript).toContain("ctest --test-dir cpp-core/build");
  });
});
