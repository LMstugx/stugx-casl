import type { DemoProgram } from "../examples/demoPrograms";
import type { LearningLesson } from "../examples/learningLessons";

type DemoGuidePanelProps = {
  program: DemoProgram;
  lesson?: LearningLesson;
  lessonProgress?: Record<string, boolean>;
  onToggleLessonStep?: (exampleId: string, stepId: string) => void;
  onResetLessonProgress?: (exampleId: string) => void;
};

export default function DemoGuidePanel({
  program,
  lesson,
  lessonProgress = {},
  onToggleLessonStep,
  onResetLessonProgress
}: DemoGuidePanelProps) {
  const completedSteps = lesson ? lesson.suggestedSteps.filter((step) => lessonProgress[step.id]).length : 0;
  const totalSteps = lesson?.suggestedSteps.length ?? 0;

  return (
    <section className="panel demo-guide-panel" data-testid="demo-guide">
      <details open>
        <summary>
          <span>Demo Guide</span>
          <strong>{program.name}</strong>
        </summary>
        <div className="demo-guide-body">
          <div>
            <h3>What this shows</h3>
            <p>{program.whatThisShows}</p>
          </div>
          <div>
            <h3>Expected result</h3>
            <p data-testid="demo-guide-expected-result">{program.expectedResult}</p>
          </div>
          <div>
            <h3>Suggested actions</h3>
            <ol>
              {program.suggestedActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ol>
          </div>
        </div>
      </details>
      <details className="guided-lesson" data-testid="guided-lesson">
        <summary data-testid="guided-lesson-summary">
          <span>Guided Lesson</span>
          <strong>{lesson ? lesson.title : "Custom Source"}</strong>
        </summary>
        {lesson ? (
          <div className="demo-guide-body guided-lesson-body">
            <div>
              <h3>Study Mode</h3>
              <div className="study-mode-progress">
                <span data-testid="study-mode-progress">
                  {completedSteps} / {totalSteps} steps completed
                </span>
                <button
                  type="button"
                  className="text-button study-mode-reset"
                  data-testid="study-mode-reset"
                  onClick={() => onResetLessonProgress?.(lesson.exampleId)}
                  disabled={completedSteps === 0}
                >
                  Reset lesson progress
                </button>
              </div>
              <p className="study-mode-note">Manual checklist only. Use it to follow the lesson; it does not grade your result.</p>
            </div>
            <div>
              <h3>Level</h3>
              <p data-testid="guided-lesson-level">{lesson.level}</p>
            </div>
            <div>
              <h3>Concepts</h3>
              <p data-testid="guided-lesson-concepts">{lesson.concepts.join(" / ")}</p>
            </div>
            <div>
              <h3>Learning goals</h3>
              <ul>
                {lesson.learningGoals.map((goal) => (
                  <li key={goal}>{goal}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Observe</h3>
              <ul>
                {lesson.observe.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Suggested steps checklist</h3>
              <ol className="study-step-list">
                {lesson.suggestedSteps.map((step) => (
                  <li key={step.id} data-testid="guided-lesson-step" data-completed={lessonProgress[step.id] ? "true" : "false"}>
                    <label className="study-step">
                      <input
                        type="checkbox"
                        checked={Boolean(lessonProgress[step.id])}
                        data-testid="study-mode-step-checkbox"
                        onChange={() => onToggleLessonStep?.(lesson.exampleId, step.id)}
                      />
                      <span>
                        <strong>{step.label}:</strong> {step.action}
                      </span>
                    </label>
                    <p>{step.expectedObservation}</p>
                    {step.recommendedTab ? (
                      <em data-testid="study-mode-recommended-tab">Recommended tab: {step.recommendedTab}</em>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3>Checkpoints</h3>
              <ul className="lesson-checkpoints">
                {lesson.checkpoints.map((checkpoint) => (
                  <li key={checkpoint.id} data-testid="guided-lesson-checkpoint">
                    <strong>{checkpoint.label}</strong>
                    <dl>
                      <div>
                        <dt>Expected</dt>
                        <dd>{checkpoint.expected}</dd>
                      </div>
                      <div>
                        <dt>Where to look</dt>
                        <dd>{checkpoint.whereToLook}</dd>
                      </div>
                      <div>
                        <dt>Note</dt>
                        <dd>{checkpoint.note}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </div>
            {lesson.commonQuestions?.length ? (
              <div>
                <h3>Common questions</h3>
                <ul>
                  {lesson.commonQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="demo-guide-body guided-lesson-body">
            <p data-testid="guided-lesson-empty">No guided lesson for custom source.</p>
          </div>
        )}
      </details>
      <details className="project-overview" data-testid="project-overview">
        <summary data-testid="project-overview-summary">
          <span>Project Overview</span>
          <strong>stugx.CASL</strong>
        </summary>
        <div className="demo-guide-body project-overview-body">
          <div>
            <h3>What this tool helps you learn</h3>
            <p data-testid="project-overview-title">
              stugx.CASL is a CASL II / COMET II Learning Studio for studying how source code, assembly, machine code, memory, trace, control flow, and circuit state connect.
            </p>
          </div>
          <div>
            <h3>Learning pipeline</h3>
            <p data-testid="project-overview-pipeline">
              C++ subset -&gt; Generated CASL II Assembly -&gt; COMET II Machine Code -&gt; opcode explanation -&gt; memory, trace, control flow, and circuit state.
            </p>
          </div>
          <div>
            <h3>Recommended examples</h3>
            <p>Start with CASL: GR2 Addition, then C++: Addition, Function Call, If Else, While Sum, For Sum Sugar, and Break Continue.</p>
          </div>
          <div>
            <h3>Supported C++ subset</h3>
            <p>
              int main, no-argument int functions, int variables, assignment, +, -, return, if/else, while, for, break/continue, i++, i--, +=, and -=.
            </p>
          </div>
          <div>
            <h3>Current limitations</h3>
            <p data-testid="project-overview-limitations">
              Not a full C++ compiler: function parameters, recursion, stack-frame locals, arrays, pointers, classes, templates, strings, and full CASL II coverage are outside the current scope.
            </p>
          </div>
        </div>
      </details>
    </section>
  );
}
