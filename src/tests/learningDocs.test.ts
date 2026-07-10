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
import phase9d from "../../docs/phase9d-effective-address-unit.md?raw";
import phase9e from "../../docs/phase9e-stack-address-path-foundation.md?raw";
import phase9f from "../../docs/phase9f-push-pop-stack.md?raw";
import phase9g from "../../docs/phase9g-call-ret-stack-semantics.md?raw";
import phase9h from "../../docs/phase9h-subroutine-teaching-polish.md?raw";
import phase10a from "../../docs/phase10a-cpp-function-call-lowering.md?raw";
import phase10b from "../../docs/phase10b-calling-convention-design.md?raw";
import phase10c from "../../docs/phase10c-cpp-single-argument-function.md?raw";
import phase10d from "../../docs/phase10d-cpp-multi-register-arguments.md?raw";
import phase10e from "../../docs/phase10e-focus-text-overflow-cleanup.md?raw";
import phase10f from "../../docs/phase10f-small-viewport-accessibility.md?raw";
import phase10h from "../../docs/phase10h-robustness-audit.md?raw";
import phase10i from "../../docs/phase10i-release-hardening-stress-audit.md?raw";
import phase10j from "../../docs/phase10j-observation-mode-split.md?raw";
import phase10k from "../../docs/phase10k-observation-visual-defect-cleanup.md?raw";
import phase10l from "../../docs/phase10l-final-ui-detail-polish.md?raw";
import phase11a from "../../docs/phase11a-stack-frame-locals-design.md?raw";
import phase11b from "../../docs/phase11b-stack-frame-lowering-scaffold.md?raw";
import phase11c from "../../docs/phase11c-stack-frame-view-placeholder.md?raw";
import phase11d from "../../docs/phase11d-frameplan-generator-scaffold.md?raw";
import phase11e from "../../docs/phase11e-frameplan-stack-frame-view-preview.md?raw";
import phase11f from "../../docs/phase11f-frameplan-slot-highlighting-contract.md?raw";
import phase11g from "../../docs/phase11g-source-casl-frame-slot-selection.md?raw";
import phase11h from "../../docs/phase11h-frameplan-circuit-probe-relation.md?raw";
import phase11i from "../../docs/phase11i-editor-frameplan-symbol-hover.md?raw";
import circuitVisualContract from "../../docs/circuit-visual-contract.md?raw";
import frameplanRelationQaChecklist from "../../docs/frameplan-relation-qa-checklist.md?raw";
import futureCustomCircuit from "../../docs/future-custom-circuit-design.md?raw";
import manualQaChecklist from "../../docs/manual-qa-checklist.md?raw";
import phase11FrameplanDesignLayerSummary from "../../docs/phase11-frameplan-design-layer-summary.md?raw";
import practiceTasks from "../../docs/practice-tasks.md?raw";
import projectOverview from "../../docs/project-overview.md?raw";
import releaseCandidateNotes from "../../docs/release-candidate-notes.md?raw";
import screenshotsGuide from "../../docs/screenshots-guide.md?raw";
import visualRcBaseline from "../../docs/visual-rc-baseline.md?raw";
import validateAllScript from "../../scripts/validate-all.ps1?raw";
import v1ScopeFreeze from "../../docs/v1-scope-freeze.md?raw";

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
    expect(learningGuide).toContain("CASL: Push Pop Stack");
    expect(learningGuide).toContain("CASL: Call Return");
    expect(learningGuide).toContain("CASL: Nested Call Return");
    expect(learningGuide).toContain("C++: Function Call");
    expect(learningGuide).toContain("C++: Function Arguments");
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
    expect(practiceTasks).toContain("Observe PUSH / POP stack behavior");
    expect(practiceTasks).toContain("Observe CALL / stack-aware RET");
    expect(practiceTasks).toContain("Trace nested return order");
    expect(practiceTasks).toContain("Observe C++ function-call lowering");
    expect(practiceTasks).toContain("Read the calling convention design");
    expect(practiceTasks).toContain("Observe single-argument function lowering");
    expect(practiceTasks).toContain("Observe multi-register argument lowering");
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

  it("phase9d_effective_address_unit_doc_exists", () => {
    expect(phase9d).toContain("Phase 9D: Effective Address Unit Visualization");
    expect(phase9d).toContain("base address + index register value = effective address");
    expect(phase9d).toContain("EAU.BASE");
    expect(phase9d).toContain("Memory row highlight at the effective address");
    expect(phase9d).toContain("They do not read memory data for the shift count.");
    expect(phase9d).toContain("Signal Probe");
  });

  it("phase9e_stack_address_path_doc_exists", () => {
    expect(phase9e).toContain("Phase 9E: SP / Stack Address Path Foundation");
    expect(phase9e).toContain("SP -> MAR -> Memory[SP]");
    expect(phase9e).toContain("Stack Preview");
    expect(phase9e).toContain("At the time of Phase 9E");
    expect(phase9e).toContain("Phase 9F implements `PUSH` / `POP`");
    expect(phase9e).toContain("Phase 9G implements `CALL` and stack-aware `RET`");
    expect(phase9e).toContain("Top-level `RET` finish semantics remain compatible");
  });

  it("phase9f_push_pop_stack_doc_exists", () => {
    expect(phase9f).toContain("Phase 9F: PUSH / POP Stack Semantics");
    expect(phase9f).toContain("PUSH adr[,x]");
    expect(phase9f).toContain("POP GRr");
    expect(phase9f).toContain("PUSH Stores Effective Address");
    expect(phase9f).toContain("Memory[SP] = effectiveAddress");
    expect(phase9f).toContain("Phase 9G later adds `CALL` and stack-aware `RET`");
  });

  it("phase9g_call_ret_stack_doc_exists", () => {
    expect(phase9g).toContain("Phase 9G: CALL and Stack-Aware RET Semantics");
    expect(phase9g).toContain("CALL adr[,x]");
    expect(phase9g).toContain("returnAddress = current CALL address + 2");
    expect(phase9g).toContain("callDepth");
    expect(phase9g).toContain("Top-level `RET`");
    expect(phase9g).toContain("Stack Preview");
  });

  it("phase9h_subroutine_teaching_polish_doc_exists", () => {
    expect(phase9h).toContain("Phase 9H: Subroutine Teaching Polish");
    expect(phase9h).toContain("CALL target");
    expect(phase9h).toContain("return address");
    expect(phase9h).toContain("Call Stack view");
    expect(phase9h).toContain("stack RET vs top-level RET");
    expect(phase9h).toContain("return edge");
    expect(phase9h).toContain("Nested Call Return");
  });

  it("phase10a_cpp_function_call_lowering_doc_exists", () => {
    expect(phase10a).toContain("Phase 10A: C++ Function Call Lowering MVP");
    expect(phase10a).toContain("no-argument helper functions");
    expect(phase10a).toContain("GR0");
    expect(phase10a).toContain("CALL FUNC_ADDONE");
    expect(phase10a).toContain("static namespaced labels");
    expect(phase10a).toContain("no parameters");
    expect(phase10a).toContain("no recursion");
  });

  it("phase10b_calling_convention_design_doc_exists", () => {
    expect(phase10b).toContain("Phase 10B: C++ Calling Convention and Stack-Frame Design");
    expect(phase10b).toContain("GR0");
    expect(phase10b).toContain("GR1");
    expect(phase10b).toContain("GR2");
    expect(phase10b).toContain("GR3");
    expect(phase10b).toContain("register arguments");
    expect(phase10b).toContain("Phase 10D extends");
    expect(phase10b).toContain("stack arguments");
    expect(phase10b).toContain("stack-frame locals");
    expect(phase10b).toContain("Current Limitations");
    expect(phase10b).toContain("not implemented");
  });

  it("phase10c_single_argument_function_doc_exists", () => {
    expect(phase10c).toContain("Phase 10C: C++ Single-Argument Function Call Lowering");
    expect(phase10c).toContain("GR1");
    expect(phase10c).toContain("GR0");
    expect(phase10c).toContain("LAD   GR1,5");
    expect(phase10c).toContain("ST    GR1,FUNC_ADDONE_X");
    expect(phase10c).toContain("static parameter label");
    expect(phase10c).toContain("more than three parameters");
    expect(phase10c).toContain("complex function call arguments are not supported yet");
  });

  it("phase10d_multi_register_argument_doc_exists", () => {
    expect(phase10d).toContain("Phase 10D: C++ Multi-Register Argument Lowering");
    expect(phase10d).toContain("GR1");
    expect(phase10d).toContain("GR2");
    expect(phase10d).toContain("GR3");
    expect(phase10d).toContain("GR0");
    expect(phase10d).toContain("LAD   GR1,2");
    expect(phase10d).toContain("LAD   GR2,3");
    expect(phase10d).toContain("ST    GR1,FUNC_ADD_A");
    expect(phase10d).toContain("ST    GR2,FUNC_ADD_B");
    expect(phase10d).toContain("only up to three function parameters are supported yet");
    expect(phase10d).toContain("stack arguments");
  });

  it("phase10j_observation_mode_split_doc_exists", () => {
    expect(phase10j).toContain("Phase 10J: Observation Mode Split");
    expect(phase10j).toContain("CPU Flow");
    expect(phase10j).toContain("Register / Stack Mode");
    expect(phase10j).toContain("Code / Machine Mode");
    expect(phase10j).toContain("Switching observation mode must not reset");
    expect(learningGuide).toContain("Observation Mode selector");
    expect(readme).toContain("Observation Modes");
    expect(manualQaChecklist).toContain("Observation Mode selector");
  });

  it("phase10k_observation_visual_defect_cleanup_doc_exists", () => {
    expect(phase10k).toContain("Phase 10K: Observation Visual Defect Cleanup");
    expect(phase10k).toContain("EAU Visual Fixes");
    expect(phase10k).toContain("Signal Probe Density Fixes");
    expect(phase10k).toContain("Trace Compacting");
    expect(phase10k).toContain("Code / Machine Table Hierarchy");
    expect(phase10k).toContain("Route Spacing Fixes");
    expect(readme).toContain("docs/phase10k-observation-visual-defect-cleanup.md");
    expect(circuitVisualContract).toContain("BASE, INDEX, and EA rows");
  });

  it("phase10l_final_ui_detail_polish_doc_exists", () => {
    expect(phase10l).toContain("Phase 10L: Final UI Detail Polish");
    expect(phase10l).toContain("EAU Readability Polish");
    expect(phase10l).toContain("Signal Probe Label Cleanup");
    expect(phase10l).toContain("Call Stack Wording Cleanup");
    expect(phase10l).toContain("Current Instruction Naming");
    expect(phase10l).toContain("Machine Code Explanation Height Fix");
    expect(phase10l).toContain("Trace Secondary-Note Rule");
    expect(phase10l).toContain("Stack Terminology Rule");
    expect(readme).toContain("docs/phase10l-final-ui-detail-polish.md");
    expect(circuitVisualContract).toContain("Signal Probe labels use short stable names");
    expect(circuitVisualContract).toContain("Machine Code selected-word explanations");
    expect(circuitVisualContract).toContain("PUSH is Stack write");
  });

  it("visual_rc_baseline_doc_exists", () => {
    expect(visualRcBaseline).toContain("Visual RC Baseline");
    expect(visualRcBaseline).toContain("a6ce8a4");
    expect(visualRcBaseline).toContain("visual-rc-phase10l");
    expect(visualRcBaseline).toContain("docs/circuit-visual-contract.md");
    expect(visualRcBaseline).toContain("observation-cpu-flow");
    expect(visualRcBaseline).toContain("observation-register-stack");
    expect(visualRcBaseline).toContain("observation-code-machine");
    expect(visualRcBaseline).toContain("index-addressing-circuit");
    expect(visualRcBaseline).toContain("push-pop-stack-circuit");
    expect(visualRcBaseline).toContain("call-return-call");
    expect(visualRcBaseline).toContain("machine-code-explanation");
    expect(visualRcBaseline).toContain("cpp-function-arguments-generated-casl");
    expect(visualRcBaseline).toContain("must not be committed");
    expect(readme).toContain("docs/visual-rc-baseline.md");
  });

  it("phase11a_stack_frame_locals_design_doc_exists", () => {
    expect(phase11a).toContain("Phase 11A: C++ Stack-Frame Locals Design");
    expect(phase11a).toContain("static namespaced labels");
    expect(phase11a).toContain("GR0");
    expect(phase11a).toContain("GR1");
    expect(phase11a).toContain("GR2");
    expect(phase11a).toContain("GR3");
    expect(phase11a).toContain("stack frame");
    expect(phase11a).toContain("return address");
    expect(phase11a).toContain("FP");
    expect(phase11a).toContain("frame pointer");
    expect(phase11a).toContain("Stack Frame View");
    expect(phase11a).toContain("Circuit Focus Mode");
    expect(phase11a).toContain("Current Behavior Is Unchanged");
    expect(phase11a).toContain("Phase 11B");
    expect(phase11a).toContain("Phase 11E");
    expect(phase11a).toContain("Later phase: recursion teaching demo");
    expect(readme).toContain("docs/phase11a-stack-frame-locals-design.md");
    expect(learningGuide).toContain("phase11a-stack-frame-locals-design.md");
    expect(practiceTasks).toContain("phase11a-stack-frame-locals-design.md");
    expect(futureCustomCircuit).toContain("Phase 11A documents the future stack-frame locals design");
    expect(releaseCandidateNotes).toContain("Phase 11A records the design-only stack-frame locals plan");
  });

  it("phase11b_stack_frame_lowering_scaffold_doc_exists", () => {
    expect(phase11b).toContain("Phase 11B: Stack-Frame Lowering Scaffold");
    expect(phase11b).toContain("StackFramePlan");
    expect(phase11b).toContain("FrameSlot");
    expect(phase11b).toContain("MAIN_X");
    expect(phase11b).toContain("FUNC_ADD_A");
    expect(phase11b).toContain("FUNC_ADD_B");
    expect(phase11b).toContain("Future advanced mode");
    expect(phase11b).toContain("Prologue");
    expect(phase11b).toContain("Epilogue");
    expect(phase11b).toContain("Option A: No Frame Pointer");
    expect(phase11b).toContain("Option B: Virtual FP");
    expect(phase11b).toContain("Option C: Real FP Register");
    expect(phase11b).toContain("Stack Frame View");
    expect(phase11b).toContain("Observation Mode");
    expect(phase11b).toContain("Future Test Plan");
    expect(phase11b).toContain("No Runtime Behavior Changed");
    expect(readme).toContain("docs/phase11b-stack-frame-lowering-scaffold.md");
    expect(phase11a).toContain("phase11b-stack-frame-lowering-scaffold.md");
    expect(learningGuide).toContain("phase11b-stack-frame-lowering-scaffold.md");
    expect(practiceTasks).toContain("phase11b-stack-frame-lowering-scaffold.md");
    expect(futureCustomCircuit).toContain("Phase 11B adds the design scaffold");
    expect(releaseCandidateNotes).toContain("Phase 11B records the future lowering scaffold");
  });

  it("phase11c_stack_frame_view_placeholder_doc_exists", () => {
    expect(phase11c).toContain("Phase 11C: Stack Frame View Placeholder");
    expect(phase11c).toContain("StackFrameViewState");
    expect(phase11c).toContain("Simple static locals");
    expect(phase11c).toContain("hasLiveFrame");
    expect(phase11c).toContain("false");
    expect(phase11c).toContain("GR0");
    expect(phase11c).toContain("GR1");
    expect(phase11c).toContain("GR2");
    expect(phase11c).toContain("GR3");
    expect(phase11c).toContain("static namespaced labels");
    expect(phase11c).toContain("StackFramePlan");
    expect(phase11c).toContain("FrameSlot");
    expect(phase11c).toContain("Register / Stack observation mode");
    expect(phase11c).toContain("does not implement");
    expect(readme).toContain("docs/phase11c-stack-frame-view-placeholder.md");
    expect(phase11a).toContain("phase11c-stack-frame-view-placeholder.md");
    expect(phase11b).toContain("phase11c-stack-frame-view-placeholder.md");
    expect(learningGuide).toContain("phase11c-stack-frame-view-placeholder.md");
    expect(practiceTasks).toContain("phase11c-stack-frame-view-placeholder.md");
    expect(circuitVisualContract).toContain("Stack Frame View is tertiary");
  });

  it("phase11d_frameplan_generator_scaffold_doc_exists", () => {
    expect(phase11d).toContain("Phase 11D: FramePlan Generator Scaffold");
    expect(phase11d).toContain("StackFramePlan");
    expect(phase11d).toContain("FrameSlot");
    expect(phase11d).toContain("design-only");
    expect(phase11d).toContain("emitted CASL changes");
    expect(phase11d).toContain("emitted CASL is unchanged");
    expect(phase11d).toContain("GR0");
    expect(phase11d).toContain("GR1");
    expect(phase11d).toContain("GR2");
    expect(phase11d).toContain("GR3");
    expect(phase11d).toContain("static labels");
    expect(phase11d).toContain("Stack Frame View");
    expect(readme).toContain("docs/phase11d-frameplan-generator-scaffold.md");
    expect(phase11b).toContain("phase11d-frameplan-generator-scaffold.md");
    expect(phase11c).toContain("phase11d-frameplan-generator-scaffold.md");
    expect(learningGuide).toContain("phase11d-frameplan-generator-scaffold.md");
    expect(futureCustomCircuit).toContain("Phase 11D adds a TypeScript-only");
  });

  it("phase11e_frameplan_stack_frame_view_preview_doc_exists", () => {
    expect(phase11e).toContain("Phase 11E: FramePlan Stack Frame View Preview");
    expect(phase11e).toContain("FramePlan");
    expect(phase11e).toContain("Stack Frame View");
    expect(phase11e).toContain("design-only");
    expect(phase11e).toContain("Not runtime state");
    expect(phase11e).toContain("No Emitted CASL Change");
    expect(phase11e).toContain("No Runtime Change");
    expect(phase11e).toContain("GR0");
    expect(phase11e).toContain("GR1");
    expect(phase11e).toContain("GR2");
    expect(phase11e).toContain("GR3");
    expect(phase11e).toContain("static namespaced labels");
    expect(readme).toContain("docs/phase11e-frameplan-stack-frame-view-preview.md");
    expect(phase11c).toContain("phase11e-frameplan-stack-frame-view-preview.md");
    expect(phase11d).toContain("phase11e-frameplan-stack-frame-view-preview.md");
    expect(learningGuide).toContain("phase11e-frameplan-stack-frame-view-preview.md");
    expect(practiceTasks).toContain("phase11e-frameplan-stack-frame-view-preview.md");
    expect(futureCustomCircuit).toContain("Phase 11E connects the design-only FramePlan metadata");
  });

  it("phase11f_frameplan_slot_highlighting_contract_doc_exists", () => {
    expect(phase11f).toContain("Phase 11F: FramePlan Slot Highlighting Contract");
    expect(phase11f).toContain("FrameSlotMapping");
    expect(phase11f).toContain("Selected Slot Behavior");
    expect(phase11f).toContain("current static labels");
    expect(phase11f).toContain("Runtime state: Not available in simple mode");
    expect(phase11f).toContain("fake live stack slot values");
    expect(phase11f).toContain("aria-selected");
    expect(readme).toContain("docs/phase11f-frameplan-slot-highlighting-contract.md");
    expect(phase11d).toContain("phase11f-frameplan-slot-highlighting-contract.md");
    expect(phase11e).toContain("phase11f-frameplan-slot-highlighting-contract.md");
    expect(futureCustomCircuit).toContain("Phase 11F adds a design-only");
  });

  it("phase11g_source_casl_frame_slot_selection_doc_exists", () => {
    expect(phase11g).toContain("Phase 11G: Source and CASL Frame Slot Selection");
    expect(phase11g).toContain("design-only");
    expect(phase11g).toContain("C++ source context");
    expect(phase11g).toContain("Generated CASL static-label");
    expect(phase11g).toContain("slot badge");
    expect(phase11g).toContain("No Emitted CASL Change");
    expect(phase11g).toContain("No Runtime Value");
    expect(readme).toContain("docs/phase11g-source-casl-frame-slot-selection.md");
    expect(phase11f).toContain("phase11g-source-casl-frame-slot-selection.md");
    expect(phase11e).toContain("phase11g-source-casl-frame-slot-selection.md");
    expect(learningGuide).toContain("phase11g-source-casl-frame-slot-selection.md");
    expect(futureCustomCircuit).toContain("Phase 11G wires C++ source context chips");
  });

  it("phase11h_frameplan_circuit_probe_relation_doc_exists", () => {
    expect(phase11h).toContain("Phase 11H: FramePlan Circuit and Signal Probe Relation");
    expect(phase11h).toContain("design-only");
    expect(phase11h).toContain("Signal Probe Relation");
    expect(phase11h).toContain("GR1 -> FUNC_ADD_A");
    expect(phase11h).toContain("Local Slot Relation");
    expect(phase11h).toContain("Return-Address Relation");
    expect(phase11h).toContain("No Fake Live Values");
    expect(phase11h).toContain("No Fake Circuit Path");
    expect(readme).toContain("docs/phase11h-frameplan-circuit-probe-relation.md");
    expect(phase11g).toContain("phase11h-frameplan-circuit-probe-relation.md");
    expect(futureCustomCircuit).toContain("Phase 11H lets Signal Probe");
    expect(circuitVisualContract).toContain("Signal Probe may show selected FramePlan slot relation notes");
  });

  it("phase11i_editor_frameplan_symbol_hover_doc_exists", () => {
    expect(phase11i).toContain("Phase 11I: Editor FramePlan Symbol Hover");
    expect(phase11i).toContain("design-only");
    expect(phase11i).toContain("Related Frame Symbols");
    expect(phase11i).toContain("function parameters");
    expect(phase11i).toContain("local variables");
    expect(phase11i).toContain("current static label");
    expect(phase11i).toContain("future stack slot");
    expect(phase11i).toContain("No Emitted CASL Change");
    expect(phase11i).toContain("No Runtime Value");
    expect(readme).toContain("docs/phase11i-editor-frameplan-symbol-hover.md");
    expect(phase11g).toContain("phase11i-editor-frameplan-symbol-hover.md");
    expect(phase11h).toContain("phase11i-editor-frameplan-symbol-hover.md");
    expect(learningGuide).toContain("phase11i-editor-frameplan-symbol-hover.md");
    expect(futureCustomCircuit).toContain("Phase 11I adds a lightweight Source Editor");
  });

  it("phase11j_frameplan_relation_qa_baseline_docs_exist", () => {
    expect(frameplanRelationQaChecklist).toContain("FramePlan Relation QA Checklist");
    expect(frameplanRelationQaChecklist).toContain("SourceEditor Related Frame Symbols");
    expect(frameplanRelationQaChecklist).toContain("design preview");
    expect(frameplanRelationQaChecklist).toContain("Not runtime state");
    expect(frameplanRelationQaChecklist).toContain("static namespaced labels");
    expect(frameplanRelationQaChecklist).toContain("No Monaco hover provider yet");
    expect(frameplanRelationQaChecklist).toContain("No live stack-frame values");
    expect(frameplanRelationQaChecklist).toContain("Emitted CASL must remain unchanged");
    expect(frameplanRelationQaChecklist).toContain("Signal Probe relation");
    expect(frameplanRelationQaChecklist).toContain("Generated CASL slot badge");

    expect(phase11FrameplanDesignLayerSummary).toContain("Phase 11: FramePlan Design Layer Summary");
    expect(phase11FrameplanDesignLayerSummary).toContain("design-only");
    expect(phase11FrameplanDesignLayerSummary).toContain("design preview");
    expect(phase11FrameplanDesignLayerSummary).toContain("Not runtime state");
    expect(phase11FrameplanDesignLayerSummary).toContain("simple static namespaced labels");
    expect(phase11FrameplanDesignLayerSummary).toContain("does not change emitted CASL");
    expect(phase11FrameplanDesignLayerSummary).toContain("Generated CASL slot badge");
    expect(phase11FrameplanDesignLayerSummary).toContain("Signal Probe relation");

    expect(readme).toContain("docs/frameplan-relation-qa-checklist.md");
    expect(readme).toContain("docs/phase11-frameplan-design-layer-summary.md");
  });

  it("v1_scope_freeze_doc_exists", () => {
    expect(v1ScopeFreeze).toContain("v1.0 Scope Freeze");
    expect(v1ScopeFreeze).toContain("CASL II / COMET II learning studio");
    expect(v1ScopeFreeze).toContain("Generated CASL II");
    expect(v1ScopeFreeze).toContain("COMET II Machine Code");
    expect(v1ScopeFreeze).toContain("Observation Modes");
    expect(v1ScopeFreeze).toContain("C++ subset");
    expect(v1ScopeFreeze).toContain("CALL");
    expect(v1ScopeFreeze).toContain("stack-aware `RET`");
    expect(v1ScopeFreeze).toContain("FramePlan design preview");
    expect(v1ScopeFreeze).toContain("stack-frame locals");
    expect(v1ScopeFreeze).toContain("custom circuit editor");
    expect(v1ScopeFreeze).toContain("v1.1 Candidates");
    expect(v1ScopeFreeze).toContain("v1.2 Candidates");
    expect(v1ScopeFreeze).toContain("v2.0 Candidates");
    expect(readme).toContain("docs/v1-scope-freeze.md");
    expect(releaseCandidateNotes).toContain("v1-scope-freeze.md");
    expect(manualQaChecklist).toContain("v1.0 Final QA Gate");
    expect(learningGuide).toContain("v1-scope-freeze.md");
    expect(futureCustomCircuit).toContain("v2.0+ direction");
  });

  it("phase10e_focus_text_overflow_cleanup_doc_exists", () => {
    expect(phase10e).toContain("Phase 10E: Focus Mode Text Overflow Cleanup");
    expect(phase10e).toContain("Signal Probe Compact Design");
    expect(phase10e).toContain("Call Stack Compact Design");
    expect(phase10e).toContain("Trace Row Structure");
    expect(phase10e).toContain("Learning Flow Card Rules");
    expect(phase10e).toContain("Current Instruction Layered Structure");
    expect(phase10e).toContain("Table Overflow Rules");
    expect(phase10e).toContain("Circuit Visual Contract");
  });

  it("phase10f_small_viewport_accessibility_doc_exists", () => {
    expect(phase10f).toContain("Phase 10F: Small Viewport and Accessibility Polish");
    expect(phase10f).toContain("1280x720");
    expect(phase10f).toContain("Keyboard and Focus Rule");
    expect(phase10f).toContain("Ellipsis and Title Rule");
    expect(phase10f).toContain("Details Accessibility Rule");
    expect(phase10f).toContain("Tab Accessibility Rule");
    expect(phase10f).toContain("Visual Review Expectations");
  });

  it("audit_report_exists", () => {
    expect(phase10h).toContain("Phase 10H: Robustness, Boundary, and Code Safety Audit");
    expect(phase10h).toContain("Audit Scope");
    expect(phase10h).toContain("Boundary Tests Added");
    expect(phase10h).toContain("Bugs Found");
    expect(phase10h).toContain("Bugs Fixed");
    expect(phase10h).toContain("Remaining Risks");
  });

  it("cplusplus_safety_notes_and_wasm_notes_are_documented", () => {
    expect(phase10h).toContain("No raw `new`, raw `delete`, `malloc`, or `free`");
    expect(phase10h).toContain("std::unique_ptr");
    expect(phase10h).toContain("Shift execution uses widened integer values");
    expect(phase10h).toContain("WASM Bridge Notes");
    expect(phase10h).toContain("No critical runtime bug found.");
  });

  it("release_hardening_stress_audit_exists", () => {
    expect(phase10i).toContain("Phase 10I: Release Hardening and Stress Audit");
    expect(phase10i).toContain("Parser Malformed Corpus");
    expect(phase10i).toContain("CASL Malformed Corpus");
    expect(phase10i).toContain("Large-Source Stress Coverage");
    expect(phase10i).toContain("WASM Lifecycle Stress");
    expect(phase10i).toContain("Run / Stop / Reset Stress");
    expect(phase10i).toContain("Sanitizer / Toolchain Check");
  });

  it("release_hardening_docs_mention_stress_check_and_remaining_risks", () => {
    const combined = `${phase10i}\n${releaseCandidateNotes}\n${manualQaChecklist}`;

    expect(combined).toContain("scripts/stress-check.ps1");
    expect(combined).toContain("No sanitizer pass");
    expect(combined).toContain("deterministic malformed-input corpus");
    expect(combined).toContain("WASM lifecycle");
  });

  it("manual_qa_checklist_exists", () => {
    expect(manualQaChecklist).toContain("Manual QA Checklist");
    expect(manualQaChecklist).toContain("Smoke Test");
    expect(manualQaChecklist).toContain("Focus Mode Visual Check");
    expect(manualQaChecklist).toContain("Learning Flow Check");
    expect(manualQaChecklist).toContain("Keyboard-Only Walkthrough");
    expect(manualQaChecklist).toContain("Viewport Checklist");
    expect(manualQaChecklist).toContain("Known Limitations");
  });

  it("release_candidate_notes_exists", () => {
    expect(releaseCandidateNotes).toContain("Release Candidate Notes");
    expect(releaseCandidateNotes).toContain("Current Stable Capabilities");
    expect(releaseCandidateNotes).toContain("Current Demos");
    expect(releaseCandidateNotes).toContain("Supported CASL Subset");
    expect(releaseCandidateNotes).toContain("Supported C++ Subset");
    expect(releaseCandidateNotes).toContain("Testing Status");
    expect(releaseCandidateNotes).toContain("Next Recommended Phases");
  });

  it("manual_qa_and_release_notes_cover_release_candidate_topics", () => {
    const combined = `${manualQaChecklist}\n${releaseCandidateNotes}`;

    expect(combined).toContain("Focus Mode");
    expect(combined).toContain("Machine Code");
    expect(combined).toContain("CALL / RET");
    expect(combined).toContain("C++ function arguments");
    expect(combined).toContain("Keyboard-Only Walkthrough");
    expect(combined).toContain("keyboard walkthrough");
  });

  it("focus_visible_styles_exist", () => {
    expect(phase10f).toContain("focus ring");
    expect(phase10f).toContain("toolbar buttons");
    expect(phase10f).toContain("tabs");
    expect(phase10f).toContain("Signal Probe details");
    expect(circuitVisualContract).toContain("visible keyboard focus");
  });

  it("source_editor_header_handles_long_demo_name", () => {
    expect(phase10e).toContain("Source Editor header must not crop demo names");
    expect(phase10e).toContain("demo selector uses a stable min/max width and full title");
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
    expect(futureCustomCircuit).toContain("stack-read");
    expect(futureCustomCircuit).toContain("SP -> MAR -> Memory[SP]");
    expect(futureCustomCircuit).toContain("Phase 9F connects");
    expect(futureCustomCircuit).toContain("Phase 9G connects `CALL`");
    expect(futureCustomCircuit).toContain("Phase 10A connects no-argument C++ function-call lowering");
    expect(futureCustomCircuit).toContain("Phase 10B documents the future C++ calling convention");
    expect(futureCustomCircuit).toContain("Phase 10C implements the first concrete argument path");
    expect(futureCustomCircuit).toContain("Phase 10D extends that path");
    expect(futureCustomCircuit).toContain("Phase 11A documents the future stack-frame locals design");
    expect(futureCustomCircuit).toContain("Phase 11B adds the design scaffold");
    expect(futureCustomCircuit).toContain("GR1");
    expect(futureCustomCircuit).toContain("GR3");
    expect(futureCustomCircuit).toContain("stack-frame locals");
  });

  it("circuit_visual_contract_doc_exists", () => {
    expect(circuitVisualContract).toContain("Circuit Visual Contract");
    expect(circuitVisualContract).toContain("Routing Philosophy");
    expect(circuitVisualContract).toContain("Visual Hierarchy");
    expect(circuitVisualContract).toContain("Lane Definitions");
    expect(circuitVisualContract).toContain("Anchor Definitions");
    expect(circuitVisualContract).toContain("Instruction Category Rules");
    expect(circuitVisualContract).toContain("Text Overflow Rules");
    expect(circuitVisualContract).toContain("Active / Inactive Module Rules");
    expect(circuitVisualContract).toContain("Arrow Marker Rules");
    expect(circuitVisualContract).toContain("Small Viewport Rules");
    expect(circuitVisualContract).toContain("Visual Review Checklist");
    expect(circuitVisualContract).toContain("Future Custom Circuit Rules");
    expect(circuitVisualContract).toContain("data-bypass lane");
    expect(circuitVisualContract).toContain("data-compute lane");
    expect(circuitVisualContract).toContain("stack lane");
    expect(circuitVisualContract).toContain("ALU inactive for LD");
    expect(circuitVisualContract).toContain("ALU inactive for ST");
    expect(circuitVisualContract).toContain("ALU inactive for PUSH");
    expect(circuitVisualContract).toContain("ALU inactive for POP");
    expect(circuitVisualContract).toContain("Use EAU for index addressing");
    expect(circuitVisualContract).toContain("Text must never break the circuit layout");
    expect(circuitVisualContract).toContain("Phase 10E applies these rules");
    expect(circuitVisualContract).toContain("1280x720");
    expect(circuitVisualContract).toContain("visible keyboard focus");
    expect(circuitVisualContract).toContain("GR1-GR3 are argument registers");
    expect(circuitVisualContract).toContain("stack arguments are not supported yet");
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
    expect(readme).toContain("docs/phase9d-effective-address-unit.md");
    expect(readme).toContain("docs/phase9e-stack-address-path-foundation.md");
    expect(readme).toContain("docs/phase9f-push-pop-stack.md");
    expect(readme).toContain("docs/phase9g-call-ret-stack-semantics.md");
    expect(readme).toContain("docs/phase9h-subroutine-teaching-polish.md");
    expect(readme).toContain("docs/phase10a-cpp-function-call-lowering.md");
    expect(readme).toContain("docs/phase10b-calling-convention-design.md");
    expect(readme).toContain("docs/phase10c-cpp-single-argument-function.md");
    expect(readme).toContain("docs/phase10d-cpp-multi-register-arguments.md");
    expect(readme).toContain("docs/circuit-visual-contract.md");
    expect(readme).toContain("docs/phase10e-focus-text-overflow-cleanup.md");
    expect(readme).toContain("docs/phase10f-small-viewport-accessibility.md");
    expect(readme).toContain("docs/phase10j-observation-mode-split.md");
    expect(readme).toContain("docs/phase10k-observation-visual-defect-cleanup.md");
    expect(readme).toContain("docs/phase10l-final-ui-detail-polish.md");
    expect(readme).toContain("docs/visual-rc-baseline.md");
    expect(readme).toContain("docs/phase11a-stack-frame-locals-design.md");
    expect(readme).toContain("docs/phase11b-stack-frame-lowering-scaffold.md");
    expect(readme).toContain("docs/manual-qa-checklist.md");
    expect(readme).toContain("docs/release-candidate-notes.md");
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
