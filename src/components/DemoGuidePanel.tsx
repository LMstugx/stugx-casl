import type { DemoProgram } from "../examples/demoPrograms";

export default function DemoGuidePanel({ program }: { program: DemoProgram }) {
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
      <details className="project-overview" data-testid="project-overview">
        <summary data-testid="project-overview-summary">
          <span>Project Overview</span>
          <strong>stugx.CASL</strong>
        </summary>
        <div className="demo-guide-body project-overview-body">
          <div>
            <h3>What it shows</h3>
            <p data-testid="project-overview-title">
              stugx.CASL is a CASL II / COMET II learning studio for connecting source code, assembly, machine code, runtime state, and circuit visualization.
            </p>
          </div>
          <div>
            <h3>Learning pipeline</h3>
            <p data-testid="project-overview-pipeline">
              C++ subset -&gt; Generated CASL II Assembly -&gt; COMET II Machine Code -&gt; opcode explanation -&gt; memory, trace, control flow, and circuit state.
            </p>
          </div>
          <div>
            <h3>Current C++ subset</h3>
            <p>
              int main, int variables, assignment, +, -, return, if/else, while, for, break/continue, i++, i--, +=, and -=.
            </p>
          </div>
          <div>
            <h3>Current limitations</h3>
            <p data-testid="project-overview-limitations">
              Not a full C++ compiler: arrays, pointers, functions, classes, templates, strings, and full CASL II coverage are outside the current scope.
            </p>
          </div>
          <div>
            <h3>Suggested demo examples</h3>
            <p>C++: For Sum Sugar, C++: Break Continue, and CASL: GR2 Addition.</p>
          </div>
        </div>
      </details>
    </section>
  );
}
