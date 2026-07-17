import type { CometState } from "../core/types";
import { formatWord } from "../core/types";
import { useI18n } from "../i18n/useI18n";
import type { TranslationKey } from "../i18n/types";
import { decodeBinary64Words, formatBinary64Binary } from "../transpiler/doubleRepresentation";
import type { ResolvedCppStorageObject } from "../transpiler/cppStorageObjects";

const classificationKeys: Record<string, TranslationKey> = {
  "positive-zero": "doubleInspector.positiveZero",
  "negative-zero": "doubleInspector.negativeZero",
  subnormal: "doubleInspector.subnormal",
  normal: "doubleInspector.normal",
  "positive-infinity": "doubleInspector.positiveInfinity",
  "negative-infinity": "doubleInspector.negativeInfinity",
  nan: "doubleInspector.nan"
};

export default function DoubleValueInspector({
  object,
  state
}: {
  object: ResolvedCppStorageObject;
  state: CometState;
}) {
  const { t } = useI18n();
  const words = object.words.map((word) => word.address === undefined ? 0 : state.memory[word.address] ?? 0) as [number, number, number, number];
  const representation = decodeBinary64Words(words);
  const decodedValue = formatDecodedValue(representation.decodedValue, representation.classification);

  return (
    <section className="double-inspector" data-testid="double-value-inspector" aria-label={t("doubleInspector.title")}>
      <header>
        <div>
          <h3>{t("doubleInspector.title")}</h3>
          <span>{t("doubleInspector.teachingAbi")}</span>
        </div>
        <code title={object.symbolName}>{object.symbolName}</code>
      </header>
      <dl className="double-inspector-summary">
        <div><dt>{t("doubleInspector.type")}</dt><dd><code>double</code></dd></div>
        <div><dt>{t("doubleInspector.baseAddress")}</dt><dd><code>{object.baseAddress === undefined ? "----" : formatWord(object.baseAddress)}</code></dd></div>
        <div><dt>{t("doubleInspector.wordCount")}</dt><dd><code>4</code></dd></div>
        <div><dt>{t("doubleInspector.classification")}</dt><dd>{t(classificationKeys[representation.classification])}</dd></div>
        <div><dt>{t("doubleInspector.decodedValue")}</dt><dd><code>{decodedValue}</code></dd></div>
      </dl>
      <div className="double-word-strip" aria-label={t("doubleInspector.wordValues")}>
        {object.words.map((word, index) => (
          <span key={word.label} data-active={word.address === state.mar ? "true" : "false"}>
            <small>{object.symbolName}.word{index}</small>
            <code>{formatWord(words[index])}</code>
            <small>{word.bitRange}</small>
          </span>
        ))}
      </div>
      <details className="double-inspector-details">
        <summary>{t("common.details")}</summary>
        <dl>
          <div><dt>{t("doubleInspector.rawHex")}</dt><dd><code>{representation.hex}</code></dd></div>
          <div><dt>{t("doubleInspector.rawBinary")}</dt><dd><code className="double-binary">{formatBinary64Binary(representation.rawBits)}</code></dd></div>
          <div><dt>{t("doubleInspector.sign")}</dt><dd><code>{representation.sign}</code></dd></div>
          <div><dt>{t("doubleInspector.exponentBits")}</dt><dd><code>{representation.exponentBits.toString(2).padStart(11, "0")}</code></dd></div>
          <div><dt>{t("doubleInspector.unbiasedExponent")}</dt><dd><code>{representation.unbiasedExponent ?? "-"}</code></dd></div>
          <div><dt>{t("doubleInspector.fractionBits")}</dt><dd><code>{representation.fractionBits.toString(16).toUpperCase().padStart(13, "0")}</code></dd></div>
        </dl>
      </details>
    </section>
  );
}

function formatDecodedValue(value: number, classification: string): string {
  if (classification === "negative-zero") return "-0";
  if (classification === "positive-infinity") return "Infinity";
  if (classification === "negative-infinity") return "-Infinity";
  if (classification === "nan") return "NaN";
  return String(value);
}
