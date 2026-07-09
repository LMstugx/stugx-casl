import { describe, expect, it } from "vitest";
import readme from "../../README.md?raw";
import demoScript from "../../docs/demo-script.md?raw";
import learningGuide from "../../docs/learning-guide.md?raw";
import phase8e from "../../docs/phase8e-circuit-focus-final-layout.md?raw";
import phase9a from "../../docs/phase9a-casl-instruction-coverage.md?raw";
import practiceTasks from "../../docs/practice-tasks.md?raw";
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
    expect(learningGuide).toContain("CASL: Logic Operations");
    expect(learningGuide).toContain("CASL: Logical Add Compare");
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
    expect(learningGuide).toContain("How To Read Circuit Focus Mode");
    expect(learningGuide).toContain("How To Use Trace");
    expect(learningGuide).toContain("How To Use Control Flow Badges");
  });

  it("learning_guide_mentions_guided_lesson", () => {
    expect(learningGuide).toContain("How To Use Guided Lesson");
    expect(learningGuide).toContain("How To Use Checkpoints");
    expect(learningGuide).toContain("No guided lesson for custom source.");
  });

  it("learning_guide_mentions_study_mode", () => {
    expect(learningGuide).toContain("How To Use Study Mode");
    expect(learningGuide).toContain("manual, not automatic grading");
    expect(learningGuide).toContain("recommended tab hints");
    expect(learningGuide).toContain("Reset lesson progress");
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

  it("practice_tasks_exists", () => {
    expect(practiceTasks).toContain("Practice Tasks");
    expect(practiceTasks).toContain("Level 1: CASL Basics");
    expect(practiceTasks).toContain("Inspect bitwise logic instructions");
    expect(practiceTasks).toContain("Observe ADDL / CPL / JOV");
    expect(practiceTasks).toContain("Level 5: break / continue");
  });

  it("phase9a_instruction_coverage_doc_exists", () => {
    expect(phase9a).toContain("Phase 9A: CASL II Instruction Coverage Batch 1");
    expect(phase9a).toContain("ADDL");
    expect(phase9a).toContain("JOV");
    expect(phase9a).toContain("No index addressing");
  });

  it("phase8e_circuit_focus_doc_exists", () => {
    expect(phase8e).toContain("Phase 8E: Circuit Focus Final Layout");
    expect(phase8e).toContain("SP Semantic Rule");
    expect(phase8e).toContain("Memory Row Anchors");
    expect(phase8e).toContain("Register Row Anchors");
  });

  it("practice_tasks_do_not_use_unsupported_syntax", () => {
    expect(practiceTasks).not.toContain("std::");
    expect(practiceTasks).not.toContain("cout");
    expect(practiceTasks).not.toContain("vector");
    expect(practiceTasks).not.toContain("do while");
    expect(practiceTasks).not.toContain("switch");
    expect(practiceTasks).not.toContain("&&");
    expect(practiceTasks).not.toContain("||");
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
    expect(readme).toContain("docs/phase8e-circuit-focus-final-layout.md");
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
