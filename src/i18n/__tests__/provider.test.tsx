// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Toolbar from "../../components/Toolbar";
import MemoryPanel from "../../components/MemoryPanel";
import OutputPanel from "../../components/OutputPanel";
import RegisterPanel from "../../components/RegisterPanel";
import SourceMapPanel from "../../components/SourceMapPanel";
import TracePanel from "../../components/TracePanel";
import { createEmptyUiCometState } from "../../core/coreStateAdapter";
import { AppStoreProvider, useAppStore } from "../../store/useAppStore";
import { I18nProvider } from "../I18nProvider";
import type { LocaleStorage } from "../localeStorage";
import type { I18nContextValue, SupportedLocale } from "../types";
import { useI18n } from "../useI18n";

class MemoryLocaleStorage implements LocaleStorage {
  value: SupportedLocale | null;
  constructor(value: SupportedLocale | null = null) {
    this.value = value;
  }
  read() {
    return this.value;
  }
  write(locale: SupportedLocale) {
    this.value = locale;
  }
  clear() {
    this.value = null;
  }
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.documentElement.lang = "";
});

describe("I18nProvider", () => {
  it("document_lang_updates_with_locale_and_persists_selection", async () => {
    const storage = new MemoryLocaleStorage("ja");
    let i18n: I18nContextValue;
    function Harness() {
      i18n = useI18n();
      return <span>{i18n.locale}</span>;
    }

    await act(async () => root.render(<I18nProvider storage={storage} browserLocale="zh-Hans"><Harness /></I18nProvider>));
    expect(i18n!.locale).toBe("ja");
    expect(document.documentElement.lang).toBe("ja");

    await act(async () => i18n!.setLocale("zh-CN"));
    expect(i18n!.locale).toBe("zh-CN");
    expect(storage.value).toBe("zh-CN");
    expect(document.documentElement.lang).toBe("zh-CN");
  });

  it("locale_buttons_expose_aria_pressed_and_are_keyboard_focusable", async () => {
    await act(async () => root.render(
      <I18nProvider initialLocale="en" storage={new MemoryLocaleStorage()}>
        <Toolbar assembleStatus="default" canRun={false} canStep={false} canReset={false} isRunning={false} onAssemble={() => undefined} onRun={() => undefined} onStep={() => undefined} onReset={() => undefined} onStop={() => undefined} />
      </I18nProvider>
    ));

    const english = container.querySelector<HTMLButtonElement>('[data-testid="locale-en"]')!;
    const japanese = container.querySelector<HTMLButtonElement>('[data-testid="locale-ja"]')!;
    expect(english.getAttribute("aria-pressed")).toBe("true");
    expect(japanese.disabled).toBe(false);
    japanese.focus();
    expect(document.activeElement).toBe(japanese);
    await act(async () => japanese.click());
    expect(japanese.getAttribute("aria-pressed")).toBe("true");
    expect(english.getAttribute("aria-pressed")).toBe("false");
  });

  it("switching_locale_does_not_mutate_app_store_state", async () => {
    let i18n: I18nContextValue;
    let store: ReturnType<typeof useAppStore>;
    function Harness() {
      i18n = useI18n();
      store = useAppStore();
      return null;
    }

    await act(async () => root.render(
      <I18nProvider initialLocale="en" storage={new MemoryLocaleStorage()}>
        <AppStoreProvider><Harness /></AppStoreProvider>
      </I18nProvider>
    ));
    await act(async () => {
      store!.setObservationMode("code-machine");
      store!.toggleLessonStep("casl-gr2-addition", "observe-source");
    });
    const before = {
      sourceText: store!.sourceText,
      lastAssembledSource: store!.lastAssembledSource,
      isSourceDirty: store!.isSourceDirty,
      diagnostics: store!.diagnostics,
      assembleStatus: store!.assembleStatus,
      selectedDemoProgramId: store!.selectedDemoProgramId,
      observationMode: store!.observationMode,
      lessonProgress: store!.lessonProgress,
      cometState: store!.cometState,
      generatedCaslSource: store!.generatedCaslSource
    };

    await act(async () => i18n!.setLocale("ja"));

    expect(store!.sourceText).toBe(before.sourceText);
    expect(store!.lastAssembledSource).toBe(before.lastAssembledSource);
    expect(store!.isSourceDirty).toBe(before.isSourceDirty);
    expect(store!.diagnostics).toBe(before.diagnostics);
    expect(store!.assembleStatus).toBe(before.assembleStatus);
    expect(store!.selectedDemoProgramId).toBe(before.selectedDemoProgramId);
    expect(store!.observationMode).toBe(before.observationMode);
    expect(store!.lessonProgress).toBe(before.lessonProgress);
    expect(store!.cometState).toBe(before.cometState);
    expect(store!.generatedCaslSource).toBe(before.generatedCaslSource);
  });

  it("output_dock_tabs_translate_to_japanese_and_chinese", async () => {
    const renderOutput = (locale: SupportedLocale) => (
      <I18nProvider key={locale} initialLocale={locale} storage={new MemoryLocaleStorage()}>
        <OutputPanel lines={[]} messages={[]} onClear={() => undefined} />
      </I18nProvider>
    );
    await act(async () => root.render(renderOutput("ja")));
    expect(container.textContent).toContain("出力ログ");
    expect(container.textContent).toContain("コンソール");
    expect(container.textContent).toContain("生成CASL");
    expect(container.textContent).toContain("機械語");
    expect(container.textContent).toContain("出力なし");

    await act(async () => root.render(renderOutput("zh-CN")));
    expect(container.textContent).toContain("输出日志");
    expect(container.textContent).toContain("控制台");
    expect(container.textContent).toContain("生成的 CASL");
    expect(container.textContent).toContain("机器码");
    expect(container.textContent).toContain("无输出");
  });

  it("memory_controls_common_table_headings_and_empty_states_translate", async () => {
    const state = createEmptyUiCometState("Idle", []);
    await act(async () => root.render(
      <I18nProvider initialLocale="zh-CN" storage={new MemoryLocaleStorage()}>
        <MemoryPanel state={state} />
        <RegisterPanel state={state} />
        <SourceMapPanel state={state} />
        <TracePanel state={state} />
      </I18nProvider>
    ));

    for (const text of ["起始", "行数", "转到", "程序", "读取", "写入", "名称", "值", "地址", "标签", "标记", "无源码映射", "无跟踪记录"]) {
      expect(container.textContent).toContain(text);
    }
  });
});
