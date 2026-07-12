// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NewDocumentDialog from "../../components/NewDocumentDialog";
import Toolbar from "../../components/Toolbar";
import UnsavedOpenDialog from "../../components/UnsavedOpenDialog";
import { I18nProvider } from "../../i18n/I18nProvider";
import { LOCALE_STORAGE_KEY } from "../../i18n/localeStorage";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  localStorage.clear();
});

describe("Phase 15D New UI", () => {
  it("toolbar_new_opens_through_accessible_action", async () => {
    const onNew = vi.fn();
    await render(<Toolbar assembleStatus="default" canRun={false} canStep={false} canReset={false} isRunning={false} onNewDocument={onNew} onAssemble={() => undefined} onRun={() => undefined} onStep={() => undefined} onReset={() => undefined} onStop={() => undefined} />);
    const button = container.querySelector<HTMLButtonElement>('[data-testid="new-document-button"]')!;
    expect(button.getAttribute("aria-label")).toBe("New document");
    await act(async () => button.click());
    expect(onNew).toHaveBeenCalledOnce();
  });

  it("replacement_busy_disables_new_open_and_save", async () => {
    await render(<Toolbar assembleStatus="default" canRun={false} canStep={false} canReset={false} isRunning={false} isReplacingSource saveMode="save" onAssemble={() => undefined} onRun={() => undefined} onStep={() => undefined} onReset={() => undefined} onStop={() => undefined} />);
    expect(container.querySelector<HTMLButtonElement>('[data-testid="new-document-button"]')?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[data-testid="open-file-button"]')?.disabled).toBe(true);
    expect(container.querySelector<HTMLButtonElement>('[data-testid="save-file-button"]')?.disabled).toBe(true);
  });

  it("new_dialog_is_keyboard_accessible_with_safe_initial_focus", async () => {
    const onCancel = vi.fn();
    await render(<NewDocumentDialog open initialLanguage="cpp" onCancel={onCancel} onCreate={() => undefined} />);
    expect(container.querySelector('[role="dialog"]')?.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement?.textContent).toBe("Cancel");
    expect(container.querySelector<HTMLInputElement>('input[value="cpp"]')?.checked).toBe(true);
    await act(async () => container.querySelector('[role="dialog"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("new_dialog_creates_selected_language", async () => {
    const onCreate = vi.fn();
    await render(<NewDocumentDialog open initialLanguage="casl" onCancel={() => undefined} onCreate={onCreate} />);
    await act(async () => container.querySelector<HTMLInputElement>('input[value="cpp"]')?.click());
    await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="create-document"]')?.click());
    expect(onCreate).toHaveBeenCalledWith("cpp");
  });

  it.each([
    ["ja", "新規ドキュメント"],
    ["zh-CN", "新建文档"]
  ])("new_dialog_localizes_%s", async (locale, expected) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    await render(<NewDocumentDialog open initialLanguage="casl" onCancel={() => undefined} onCreate={() => undefined} />);
    expect(container.textContent).toContain(expected);
  });
});

describe("Phase 15D intent-aware guard", () => {
  it.each([
    [{ kind: "open-file" } as const, "Save and open", "Discard changes and open"],
    [{ kind: "new-document", language: "cpp" } as const, "Save and create", "Discard and create"],
    [{ kind: "select-example", exampleId: "cpp-addition" } as const, "Save and switch", "Discard and switch"]
  ])("guard labels follow machine intent", async (intent, saveLabel, discardLabel) => {
    await render(<UnsavedOpenDialog open intent={intent} displayName="main.cpp" onCancel={() => undefined} onSave={() => undefined} onDiscard={() => undefined} />);
    expect(container.textContent).toContain(saveLabel);
    expect(container.textContent).toContain(discardLabel);
    expect(document.activeElement?.textContent).toBe("Cancel");
  });

  it("locale_switch_changes_text_without_changing_intent_contract", async () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "ja");
    await render(<UnsavedOpenDialog open intent={{ kind: "select-example", exampleId: "cpp-addition" }} displayName="main.cpp" onCancel={() => undefined} onSave={() => undefined} onDiscard={() => undefined} />);
    expect(container.textContent).toContain("保存して切替");
    expect(container.textContent).toContain("変更を破棄して切替");
  });
});

async function render(element: React.ReactElement) {
  await act(async () => root.render(<I18nProvider>{element}</I18nProvider>));
}
