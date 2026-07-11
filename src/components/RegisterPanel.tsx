import { CometState, formatFlags, formatWord } from "../core/types";
import { formatRegisterDisplay } from "../core/selectors";
import { useI18n } from "../i18n/useI18n";

export default function RegisterPanel({ state, embedded = false }: { state: CometState; embedded?: boolean }) {
  const { t } = useI18n();
  const general = state.registers.filter((register) => register.name.startsWith("GR"));
  const other = state.registers.filter((register) => !register.name.startsWith("GR"));

  return (
    <section className={embedded ? "embedded-panel" : "panel"}>
      {!embedded ? (
        <header className="panel-header">
          <h2>{t("inspector.registers")}</h2>
        </header>
      ) : null}
      <h3>{t("registerStack.generalRegisters")}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th>{t("table.name")}</th>
            <th>{t("table.value")}</th>
            <th title={t("registerStack.decimal")}>({t("registerStack.decimal")})</th>
          </tr>
        </thead>
        <tbody>
          {general.map((register) => (
            <tr key={register.name} className={register.changed ? "changed" : ""} data-testid={`register-${register.name.toLowerCase()}`}>
              <td className="compact-label">{register.name}</td>
              <td className="hex mono-value">{formatWord(register.value)}</td>
              <td className="text-ellipsis">{register.decimal}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>{t("registerStack.otherRegisters")}</h3>
      <table className="data-table compact">
        <tbody>
          {other.map((register) => (
            <tr key={register.name} className={register.changed ? "changed" : ""} data-testid={`register-${register.name.toLowerCase()}`}>
              <td className="compact-label">{register.name}</td>
              <td className="hex mono-value">{formatRegisterDisplay(register, state)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
