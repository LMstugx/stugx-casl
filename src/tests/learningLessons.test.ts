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
