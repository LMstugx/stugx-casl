import { CometState, formatWord } from "../core/types";
import { useI18n } from "../i18n/useI18n";
import type { CppToCaslMap } from "../transpiler/cppAst";

export default function SourceMapPanel({
  state,
  embedded = false,
  cppToCaslMapping = []
}: {
  state: CometState;
  embedded?: boolean;
  cppToCaslMapping?: readonly CppToCaslMap[];
}) {
  const { t } = useI18n();
  return (
    <section className={embedded ? "embedded-panel" : "panel"}>
      {!embedded ? (
        <header className="panel-header">
          <h2>{t("inspector.sourceMap")}</h2>
        </header>
      ) : null}
      <table className="data-table source-map-table">
        <thead>
          <tr>
            <th>{t("project.module")}</th>
            <th>Line</th>
            <th>{t("table.address")}</th>
            <th>Machine</th>
          </tr>
        </thead>
        <tbody>
          {state.sourceMap.length === 0 ? (
            <tr className="empty-table-row">
              <td colSpan={4}>{t("empty.noSourceMapping")}</td>
            </tr>
          ) : null}
          {state.sourceMap.map((entry) => {
            const isCurrent = entry.line === state.currentLine;
            const wordMapping = cppToCaslMapping.find((mapping) => mapping.caslLines.includes(entry.line) && mapping.wordIndex !== undefined);
            return (
            <tr
              key={`${entry.moduleId ?? "single"}-${entry.line}-${entry.address}`}
              className={isCurrent ? "current" : ""}
              data-testid={isCurrent ? "source-row-current" : undefined}
              data-instruction={entry.source}
            >
              <td title={entry.moduleName ?? entry.moduleId ?? ""}>{entry.moduleName ?? entry.moduleId ?? "-"}</td>
              <td className="mono-value" title={String(entry.line)}>{entry.line}</td>
              <td className="hex mono-value" title={formatWord(entry.address)}>{formatWord(entry.address)}</td>
              <td className="hex mono-value" title={entry.machineWords.map((word) => formatWord(word)).join(" ")}>
                {entry.machineWords.map((word) => formatWord(word)).join(" ")}
                {wordMapping?.wordIndex !== undefined ? <small className="source-map-word-index">{t("doubleTrace.wordOf", { word: wordMapping.wordIndex + 1 })}</small> : null}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
