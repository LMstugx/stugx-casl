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
    </section>
  );
}
