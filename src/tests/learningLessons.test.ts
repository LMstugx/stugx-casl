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

  it("learning_lessons_have_recommended_tabs", () => {
    for (const lesson of learningLessons) {
      expect(lesson.suggestedSteps.every((step) => step.recommendedTab)).toBe(true);
    }
  });
});
