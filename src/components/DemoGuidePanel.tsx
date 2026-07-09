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
            <p>Start with CASL: GR2 Addition, then C++: Addition, If Else, While Sum, For Sum Sugar, and Break Continue.</p>
          </div>
          <div>
            <h3>Supported C++ subset</h3>
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
        </div>
      </details>
    </section>
  );
}
