import { describe, expect, it } from "vitest";
import readme from "../../README.md?raw";
import demoScript from "../../docs/demo-script.md?raw";
import learningGuide from "../../docs/learning-guide.md?raw";
import projectOverview from "../../docs/project-overview.md?raw";
import screenshotsGuide from "../../docs/screenshots-guide.md?raw";
import validateAllScript from "../../scripts/validate-all.ps1?raw";

describe("learning use documentation", () => {
  it("learning_guide_exists", () => {
    expect(learningGuide).toContain("stugx.CASL Learning Guide");
    expect(learningGuide).toContain("What This Tool Is");
  });

  it("learning_guide_lists_recommended_order", () => {
    expect(learningGuide).toContain("Step 1: CASL Direct Execution");
    expect(learningGuide).toContain("Step 2: C++ to CASL");
    expect(learningGuide).toContain("Step 6: break / continue");
  });

  it("learning_guide_mentions_generated_casl", () => {
    expect(learningGuide).toContain("Generated CASL II Assembly");
    expect(learningGuide).toContain("How To Read Generated CASL");
  });

  it("learning_guide_mentions_machine_code", () => {
    expect(learningGuide).toContain("COMET II Machine Code");
    expect(learningGuide).toContain("How To Read Machine Code");
  });

  it("learning_guide_mentions_memory_trace_control_flow", () => {
    expect(learningGuide).toContain("How To Use Memory Viewer");
    expect(learningGuide).toContain("How To Use Trace");
    expect(learningGuide).toContain("How To Use Control Flow Badges");
  });

  it("demo_script_uses_learning_demo_wording", () => {
    expect(demoScript).toContain("学習");
    expect(demoScript).toContain("前輩や先生");
    expect(demoScript.toLowerCase()).not.toContain("hackathon");
    expect(demoScript).not.toContain("コンテスト");
  });

  it("screenshots_guide_exists", () => {
    expect(screenshotsGuide).toContain("Screenshots Guide");
    expect(screenshotsGuide).toContain("C++ Addition -> Generated CASL");
    expect(screenshotsGuide).toContain("Memory Viewer");
  });

  it("project_overview_uses_learning_wording", () => {
    expect(projectOverview).toContain("learning studio");
    expect(projectOverview).toContain("Recommended Study Demos");
    expect(projectOverview.toLowerCase()).not.toContain("hackathon");
  });

  it("readme_does_not_overemphasize_contest_submission", () => {
    const normalized = readme.toLowerCase();

    expect(readme).toContain("learning studio");
    expect(readme).toContain("docs/learning-guide.md");
    expect(normalized).not.toContain("hackathon");
    expect(normalized).not.toContain("contest submission");
    expect(normalized).not.toContain("submission-oriented");
  });

  it("validate_all_script_exists", () => {
    expect(validateAllScript).toContain("pnpm test");
    expect(validateAllScript).toContain("pnpm build:wasm");
    expect(validateAllScript).toContain("ctest --test-dir cpp-core/build");
  });
});
