import { describe, expect, it } from "vitest";
import { demoPrograms } from "../examples/demoPrograms";
import { getLearningLesson, hasLearningLessonForEveryDemo, learningLessons } from "../examples/learningLessons";

describe("guided learning lessons", () => {
  it("learning_lessons_exist_for_all_examples", () => {
    expect(hasLearningLessonForEveryDemo()).toBe(true);
    expect(learningLessons.map((lesson) => lesson.exampleId)).toEqual(demoPrograms.map((program) => program.id));
  });

  it("learning_lesson_has_concepts_goals_steps_checkpoints", () => {
    for (const lesson of learningLessons) {
      expect(lesson.title).not.toHaveLength(0);
      expect(lesson.concepts.length).toBeGreaterThan(0);
      expect(lesson.learningGoals.length).toBeGreaterThan(0);
      expect(lesson.suggestedSteps.length).toBeGreaterThan(0);
      expect(lesson.checkpoints.length).toBeGreaterThan(0);
    }
  });

  it("lesson_for_casl_gr2_mentions_gr2_and_memory", () => {
    const lesson = getLearningLesson("casl-gr2-addition");

    expect(lesson).toBeDefined();
    expect(`${lesson!.concepts.join(" ")} ${lesson!.checkpoints.map((checkpoint) => checkpoint.expected).join(" ")}`).toContain("GR2");
    expect(lesson!.checkpoints.map((checkpoint) => checkpoint.expected).join(" ")).toContain("Memory[C]");
  });

  it("lesson_for_cpp_addition_mentions_generated_casl_and_machine_code", () => {
    const lesson = getLearningLesson("cpp-addition");
    const text = JSON.stringify(lesson);

    expect(text).toContain("Generated CASL");
    expect(text).toContain("Machine Code");
    expect(text).toContain("LD / ADDA / ST");
  });

  it("lesson_for_logic_operations_mentions_logic_and_memory", () => {
    const lesson = getLearningLesson("casl-logic-operations");
    const text = JSON.stringify(lesson);

    expect(text).toContain("AND");
    expect(text).toContain("OR");
    expect(text).toContain("XOR");
    expect(text).toContain("Memory[RESULT]");
  });

  it("lesson_for_logical_add_compare_mentions_addl_cpl_jov", () => {
    const lesson = getLearningLesson("casl-logical-add-compare");
    const text = JSON.stringify(lesson);

    expect(text).toContain("ADDL");
    expect(text).toContain("CPL");
    expect(text).toContain("JOV");
    expect(text).toContain("OF");
  });

  it("lesson_for_shift_operations_mentions_shift_count_and_fr", () => {
    const lesson = getLearningLesson("casl-shift-operations");
    const text = JSON.stringify(lesson);

    expect(text).toContain("SLL");
    expect(text).toContain("SRA");
    expect(text).toContain("shift count");
    expect(text).toContain("FR");
    expect(text).toContain("not a memory data read");
  });

  it("lesson_for_break_continue_mentions_for_continue_and_for_end", () => {
    const lesson = getLearningLesson("cpp-break-continue");
    const text = JSON.stringify(lesson);

    expect(text).toContain("FOR_CONTINUE");
    expect(text).toContain("FOR_END");
    expect(text).toContain("continue");
    expect(text).toContain("break");
  });

  it("lesson_for_call_return_mentions_call_stack_and_return_edge", () => {
    const lesson = getLearningLesson("casl-call-return");
    const text = JSON.stringify(lesson);

    expect(text).toContain("return address");
    expect(text).toContain("stack-aware RET");
    expect(text).toContain("top-level RET");
    expect(text).toContain("callDepth");
  });

  it("lesson_for_nested_call_return_mentions_lifo_order", () => {
    const lesson = getLearningLesson("casl-nested-call-return");
    const text = JSON.stringify(lesson);

    expect(text).toContain("nested CALL");
    expect(text).toContain("callDepth");
    expect(text).toContain("LIFO");
    expect(text).toContain("0004");
  });

  it("lesson_for_cpp_function_call_mentions_gr0_call_and_stack_ret", () => {
    const lesson = getLearningLesson("cpp-function-call");
    const text = JSON.stringify(lesson);

    expect(text).toContain("CALL");
    expect(text).toContain("GR0");
    expect(text).toContain("stack-aware RET");
    expect(text).toContain("FUNC_ADDONE");
  });

  it("lesson_for_cpp_function_argument_mentions_gr1_and_parameter_save", () => {
    const lesson = getLearningLesson("cpp-function-argument");
    const text = JSON.stringify(lesson);

    expect(text).toContain("GR1");
    expect(text).toContain("FUNC_ADDONE_X");
    expect(text).toContain("GR0");
    expect(text).toContain("static parameter label");
  });

  it("lesson_for_cpp_function_arguments_mentions_gr1_gr2_and_parameter_saves", () => {
    const lesson = getLearningLesson("cpp-function-arguments");
    const text = JSON.stringify(lesson);

    expect(text).toContain("GR1");
    expect(text).toContain("GR2");
    expect(text).toContain("FUNC_ADD_A");
    expect(text).toContain("FUNC_ADD_B");
    expect(text).toContain("no stack arguments yet");
  });

  it("learning_lessons_have_recommended_tabs", () => {
    for (const lesson of learningLessons) {
      expect(lesson.suggestedSteps.every((step) => step.recommendedTab)).toBe(true);
    }
  });
});
