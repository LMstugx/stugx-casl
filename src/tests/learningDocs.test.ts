import { describe, expect, it } from "vitest";
import readme from "../../README.md?raw";
import demoScript from "../../docs/demo-script.md?raw";
import learningGuide from "../../docs/learning-guide.md?raw";
import phase8e from "../../docs/phase8e-circuit-focus-final-layout.md?raw";
import phase8g from "../../docs/phase8g-circuit-focus-visual-convergence.md?raw";
import phase8j from "../../docs/phase8j-lab-style-schematic-polish.md?raw";
import phase8k from "../../docs/phase8k-layered-study-mode-density-refinement.md?raw";
import phase8l from "../../docs/phase8l-circuit-arrow-routing.md?raw";
import phase8m from "../../docs/phase8m-lightweight-signal-flow-animation.md?raw";
import phase9a from "../../docs/phase9a-casl-instruction-coverage.md?raw";
import phase9b from "../../docs/phase9b-shift-instructions-and-path-templates.md?raw";
import futureCustomCircuit from "../../docs/future-custom-circuit-design.md?raw";
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
    expect(learningGuide).toContain("CASL: Shift Operations");
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
    expect(practiceTasks).toContain("Observe shift instructions");
    expect(practiceTasks).toContain("Level 5: break / continue");
  });

  it("phase9a_instruction_coverage_doc_exists", () => {
    expect(phase9a).toContain("Phase 9A: CASL II Instruction Coverage Batch 1");
    expect(phase9a).toContain("ADDL");
    expect(phase9a).toContain("JOV");
    expect(phase9a).toContain("No index addressing");
  });

  it("phase9b_shift_instruction_doc_exists", () => {
    expect(phase9b).toContain("Phase 9B: Shift Instructions and Path Templates");
    expect(phase9b).toContain("SLA");
    expect(phase9b).toContain("SRA");
    expect(phase9b).toContain("SLL");
    expect(phase9b).toContain("SRL");
    expect(phase9b).toContain("shift count / effective address");
    expect(phase9b).toContain("InstructionPathTemplate");
    expect(phase9b).toContain("not a memory data read");
  });

  it("phase8e_circuit_focus_doc_exists", () => {
    expect(phase8e).toContain("Phase 8E: Circuit Focus Final Layout");
    expect(phase8e).toContain("SP Semantic Rule");
    expect(phase8e).toContain("Memory Row Anchors");
    expect(phase8e).toContain("Register Row Anchors");
  });

  it("phase8g_circuit_focus_visual_convergence_doc_exists", () => {
    expect(phase8g).toContain("Phase 8G: Circuit Focus Visual Convergence");
    expect(phase8g).toContain("Focus Mode Layout");
    expect(phase8g).toContain("Program, Display, Current Instruction");
    expect(phase8g).toContain("SP Semantic Rule");
  });

  it("phase8j_lab_style_schematic_doc_exists", () => {
    expect(phase8j).toContain("Phase 8J: Lab-Style Schematic Polish");
    expect(phase8j).toContain("DATA BUS");
    expect(phase8j).toContain("ADDR BUS");
    expect(phase8j).toContain("LD / ST Non-ALU Rule");
    expect(phase8j).toContain("Status Indicator Rule");
  });

  it("phase8k_layered_study_mode_doc_exists", () => {
    expect(phase8k).toContain("Phase 8K: Layered Study Mode and Circuit Flow Refinement");
    expect(phase8k).toContain("Primary layer");
    expect(phase8k).toContain("Signal Probe Foundation");
    expect(phase8k).toContain("Dynamic Path Metadata");
  });

  it("phase8l_circuit_arrow_routing_doc_exists", () => {
    expect(phase8l).toContain("Phase 8L Circuit Arrow Routing");
    expect(phase8l).toContain("Anchor-To-Anchor Rule");
    expect(phase8l).toContain("LD / ST Bypass Routing");
    expect(phase8l).toContain("Arrow Marker Rule");
  });

  it("phase8m_lightweight_signal_flow_doc_exists", () => {
    expect(phase8m).toContain("Phase 8M: Lightweight Signal Flow Animation");
    expect(phase8m).toContain("Active Path Only Rule");
    expect(phase8m).toContain("semanticType");
    expect(phase8m).toContain("Reduced Motion Support");
    expect(phase8m).toContain("Visual Review Static Mode");
  });

  it("future_custom_circuit_design_doc_exists", () => {
    expect(futureCustomCircuit).toContain("Future Custom Circuit Design");
    expect(futureCustomCircuit).toContain("inputs");
    expect(futureCustomCircuit).toContain("outputs");
    expect(futureCustomCircuit).toContain("anchors");
    expect(futureCustomCircuit).toContain("current phase does not implement");
    expect(futureCustomCircuit).toContain("InstructionPathTemplate");
    expect(futureCustomCircuit).toContain("shift template");
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
    expect(readme).toContain("docs/phase8g-circuit-focus-visual-convergence.md");
    expect(readme).toContain("docs/phase8j-lab-style-schematic-polish.md");
    expect(readme).toContain("docs/phase8k-layered-study-mode-density-refinement.md");
    expect(readme).toContain("docs/phase8l-circuit-arrow-routing.md");
    expect(readme).toContain("docs/phase9b-shift-instructions-and-path-templates.md");
    expect(readme).toContain("docs/future-custom-circuit-design.md");
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
