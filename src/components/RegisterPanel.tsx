import { CometState, formatFlags, formatWord } from "../core/types";
import { formatRegisterDisplay } from "../core/selectors";

export default function RegisterPanel({ state, embedded = false }: { state: CometState; embedded?: boolean }) {
  const general = state.registers.filter((register) => register.name.startsWith("GR"));
  const other = state.registers.filter((register) => !register.name.startsWith("GR"));

  return (
    <section className={embedded ? "embedded-panel" : "panel"}>
      {!embedded ? (
        <header className="panel-header">
          <h2>Registers</h2>
        </header>
      ) : null}
      <h3>General Registers</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
            <th>(Dec)</th>
          </tr>
        </thead>
        <tbody>
          {general.map((register) => (
            <tr key={register.name} className={register.changed ? "changed" : ""} data-testid={`register-${register.name.toLowerCase()}`}>
              <td>{register.name}</td>
              <td className="hex">{formatWord(register.value)}</td>
              <td>{register.decimal}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Other Registers</h3>
      <table className="data-table compact">
        <tbody>
          {other.map((register) => (
            <tr key={register.name} className={register.changed ? "changed" : ""} data-testid={`register-${register.name.toLowerCase()}`}>
              <td>{register.name}</td>
              <td className="hex">{formatRegisterDisplay(register, state)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
