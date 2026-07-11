// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FileOperationNotice from "../../components/FileOperationNotice";
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

describe("Phase 15B Open UI", () => {
  it("toolbar_open_uses_accessible_action_and_save_remains_disabled", async () => {
    const onOpen = vi.fn();
    await render(
      <Toolbar assembleStatus="default" canRun={false} canStep={false} canReset={false} isRunning={false} onOpenFile={onOpen} onAssemble={() => undefined} onRun={() => undefined} onStep={() => undefined} onReset={() => undefined} onStop={() => undefined} />
    );
    const open = container.querySelector<HTMLButtonElement>('[data-testid="open-file-button"]')!;
    expect(open.disabled).toBe(false);
    expect(open.getAttribute("aria-label")).toBe("Open file");
    await act(async () => open.click());
    expect(onOpen).toHaveBeenCalledOnce();
    expect(buttonNamed("Save").disabled).toBe(true);
  });

  it("toolbar_open_disabled_while_opening", async () => {
    await render(
      <Toolbar assembleStatus="default" canRun={false} canStep={false} canReset={false} isRunning={false} isOpeningFile onAssemble={() => undefined} onRun={() => undefined} onStep={() => undefined} onReset={() => undefined} onStop={() => undefined} />
    );
    const open = container.querySelector<HTMLButtonElement>('[data-testid="open-file-button"]')!;
    expect(open.disabled).toBe(true);
    expect(open.getAttribute("aria-busy")).toBe("true");
  });

  it("guard_dialog_is_keyboard_accessible_and_initial_focus_is_safe", async () => {
    const onCancel = vi.fn();
    await render(<UnsavedOpenDialog open displayName="main.cpp" onCancel={onCancel} onDiscard={() => undefined} />);
    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement?.textContent).toBe("Cancel");
    await act(async () => dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("backdrop_does_not_discard_without_confirmation", async () => {
    const onCancel = vi.fn();
    const onDiscard = vi.fn();
    await render(<UnsavedOpenDialog open displayName="main.cpp" onCancel={onCancel} onDiscard={onDiscard} />);
    const backdrop = container.querySelector<HTMLElement>('[data-testid="unsaved-open-backdrop"]')!;
    await act(async () => backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onDiscard).not.toHaveBeenCalled();
    expect(container.querySelector('[data-testid="discard-and-open"]')?.classList.contains("destructive")).toBe(true);
  });

  it.each([
    ["ja", "変更を破棄して開く"],
    ["zh-CN", "放弃更改并打开"]
  ])("guard_text_uses_%s_locale", async (locale, expected) => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    await render(<UnsavedOpenDialog open displayName="main.cpp" onCancel={() => undefined} onDiscard={() => undefined} />);
    expect(container.textContent).toContain(expected);
  });

  it("file_failure_notice_is_accessible_and_does_not_render_raw_exception", async () => {
    await render(<FileOperationNotice failure={{ kind: "io" }} onDismiss={() => undefined} />);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not read file");
    expect(container.textContent).not.toContain("stack");
    expect(buttonNamed("Dismiss")).toBeTruthy();
  });
});

async function render(element: React.ReactElement) {
  await act(async () => {
    root.render(<I18nProvider>{element}</I18nProvider>);
  });
}

function buttonNamed(name: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) => candidate.getAttribute("aria-label") === name || candidate.textContent === name);
  if (!button) throw new Error(`button not found: ${name}`);
  return button;
}
