// @vitest-environment jsdom
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CircuitFocusLayout from "../../components/CircuitFocusLayout";
import { mockCaslCore } from "../../core/mockCaslCore";
import type { CometState } from "../../core/types";
import { getDemoProgram } from "../../examples/demoPrograms";
import { prepareSourceForCoreAssembly, type ObservationMode } from "../../store/useAppStore";
import { I18nProvider } from "../I18nProvider";
import { resources, translate } from "../resources";
import type { SupportedLocale, TranslationKey } from "../types";

const phase14cPrefixes = [
  "circuit.",
  "instruction.",
  "timeline.",
  "signalProbe.",
  "stackPreview.",
  "callStack.",
  "stackFrame.",
  "codeMachine.",
  "registerStack."
] as const;

const timelineItems = [
  { key: "ld", index: 1, label: "LD", phase: "current" },
  { key: "adda", index: 2, label: "ADDA", phase: "pending" }
];

function stepSource(source: string, count: number): CometState {
  let state = mockCaslCore.assemble(source);
  for (let index = 0; index < count; index += 1) state = mockCaslCore.step(state);
  return state;
}

function renderCaslFocus(locale: SupportedLocale, mode: ObservationMode = "cpu-flow"): string {
  const source = getDemoProgram("casl-gr2-addition")!.source;
  return renderToStaticMarkup(
    <I18nProvider initialLocale={locale}>
      <CircuitFocusLayout
        state={stepSource(source, 2)}
        sourceMode="casl"
        sourceText={source}
        generatedCaslSource=""
        cppToCaslMapping={[]}
        isSourceDirty={false}
        timelineItems={timelineItems}
        observationMode={mode}
        initialAuxiliaryObservation={mode === "register-stack" ? "stack" : undefined}
      />
    </I18nProvider>
  );
}

function renderCppFocus(locale: SupportedLocale, mode: ObservationMode): string {
  const source = getDemoProgram("cpp-function-arguments")!.source;
  const prepared = prepareSourceForCoreAssembly(source, "cpp");
  return renderToStaticMarkup(
    <I18nProvider initialLocale={locale}>
      <CircuitFocusLayout
        state={mockCaslCore.assemble(prepared.coreSourceText)}
        sourceMode="cpp"
        sourceText={source}
        generatedCaslSource={prepared.generatedCaslSource}
        cppToCaslMapping={prepared.mapping}
        isSourceDirty={false}
        timelineItems={timelineItems}
        observationMode={mode}
        initialAuxiliaryObservation={mode === "register-stack" ? "stack" : undefined}
      />
    </I18nProvider>
  );
}

describe("Phase 14C Circuit Focus compact localization", () => {
  it("approved_phase14c_keys_exist_in_all_resources", () => {
    const approvedKeys = (Object.keys(resources.en) as TranslationKey[]).filter((key) =>
      phase14cPrefixes.some((prefix) => key.startsWith(prefix))
    );
    expect(approvedKeys.length).toBeGreaterThan(120);
    for (const locale of ["en", "ja", "zh-CN"] as const) {
      for (const key of approvedKeys) {
        expect(Object.prototype.hasOwnProperty.call(resources[locale], key), `${locale}.${key}`).toBe(true);
        expect(translate(locale, key).trim(), `${locale}.${key}`).not.toBe("");
      }
    }
  });

  it("circuit_instruction_timeline_and_signal_probe_labels_translate", () => {
    const japanese = renderCaslFocus("ja");
    const chinese = renderCaslFocus("zh-CN");

    for (const label of ["回路フォーカスモード", "現在の命令", "ステップタイムライン", "信号プローブ", "現在のソース対応"]) {
      expect(japanese).toContain(label);
    }
    for (const label of ["电路聚焦模式", "当前指令", "单步时间线", "信号探针", "当前源码映射"]) {
      expect(chinese).toContain(label);
    }
  });

  it("stack_preview_call_stack_and_frame_compact_labels_translate", () => {
    const japanese = renderCppFocus("ja", "register-stack");
    const chinese = renderCppFocus("zh-CN", "register-stack");

    for (const label of ["スタックプレビュー", "コールスタック", "スタックフレーム表示", "設計プレビュー", "実行時状態ではない"]) {
      expect(japanese).toContain(label);
    }
    for (const label of ["栈预览", "调用栈", "栈帧视图", "设计预览", "非运行时状态"]) {
      expect(chinese).toContain(label);
    }
    expect(japanese).toContain("No live stack frame locals yet.");
    expect(chinese).toContain("No live stack frame locals yet.");
  });

  it("code_machine_compact_labels_translate_without_translating_payload", () => {
    const japanese = renderCppFocus("ja", "code-machine");
    const chinese = renderCppFocus("zh-CN", "code-machine");

    expect(japanese).toContain("生成CASL");
    expect(japanese).toContain("機械語");
    expect(chinese).toContain("生成的 CASL");
    expect(chinese).toContain("机器码");
    for (const markup of [japanese, chinese]) {
      expect(markup).toContain("FUNC_ADD");
      expect(markup).toContain("GR1");
      expect(markup).toContain("CALL");
    }
  });

  it("technical_abbreviations_mnemonics_addresses_and_source_remain_untranslated", () => {
    const japanese = renderCaslFocus("ja");
    const chinese = renderCaslFocus("zh-CN");
    for (const markup of [japanese, chinese]) {
      expect(markup).toContain("GR2");
      expect(markup).toContain("PR");
      expect(markup).toContain("MAR");
      expect(markup).toContain("MDR");
      expect(markup).toContain("ALU");
      expect(markup).toContain("ADDA GR2,B");
      expect(markup).toContain("0022");
    }
  });
});
