// @vitest-environment jsdom
import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CaslCompatibilityMode from "../components/CaslCompatibilityMode";
import { DebuggerEditDialog, FullClearDialog } from "../components/DebuggerDialogs";
import { mockCaslCore } from "../core/mockCaslCore";
import type { DebuggerMutationTarget } from "../debugger/debuggerMutation";
import { I18nProvider } from "../i18n/I18nProvider";
import type { SupportedLocale } from "../i18n/types";

const source = `MAIN START
     LAD   GR2,#0003
     RET
     END`;

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
});

describe("Phase 20B debugger dialog accessibility", () => {
  it("register_edit_is_keyboard_accessible_cancel_is_initial_focus_and_focus_is_restored", async () => {
    function Harness() {
      const [target, setTarget] = useState<DebuggerMutationTarget | null>(null);
      return (
        <I18nProvider initialLocale="en">
          <button type="button" id="edit-trigger" onClick={() => setTarget({ kind: "general-register", register: "GR2" })}>
            Edit GR2
          </button>
          <DebuggerEditDialog
            target={target}
            currentWord={3}
            numericMode="hex"
            onCancel={() => setTarget(null)}
            onApply={async () => ({ status: "applied" })}
          />
        </I18nProvider>
      );
    }
    await act(async () => root.render(<Harness />));
    const trigger = container.querySelector<HTMLButtonElement>("#edit-trigger")!;
    trigger.focus();
    await act(async () => trigger.click());

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement?.textContent).toBe("Cancel");

    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("program_word_edit_requires_explicit_confirmation_and_cancel_is_atomic", async () => {
    const apply = vi.fn(async () => ({ status: "applied" as const }));
    const cancel = vi.fn();
    await act(async () => root.render(
      <I18nProvider initialLocale="en">
        <DebuggerEditDialog
          target={{ kind: "memory-word", address: 0x20 }}
          currentWord={0x1220}
          numericMode="hex"
          memoryCategory="program"
          label="MAIN"
          onCancel={cancel}
          onApply={apply}
        />
      </I18nProvider>
    ));
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>("button"));
    const applyButton = buttons.find((button) => button.textContent === "Apply")!;
    expect(applyButton.disabled).toBe(true);
    const confirmation = container.querySelector<HTMLInputElement>('.debugger-program-warning input[type="checkbox"]')!;
    await act(async () => confirmation.click());
    expect(applyButton.disabled).toBe(false);

    const cancelButton = buttons.find((button) => button.textContent === "Cancel")!;
    await act(async () => cancelButton.click());
    expect(cancel).toHaveBeenCalledOnce();
    expect(apply).not.toHaveBeenCalled();
  });

  it("full_clear_dialog_is_accessible_and_cancel_does_not_execute", async () => {
    const clear = vi.fn(async () => true);
    const cancel = vi.fn();
    await act(async () => root.render(
      <I18nProvider initialLocale="en">
        <FullClearDialog open onCancel={cancel} onConfirm={clear} />
      </I18nProvider>
    ));
    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    expect(document.activeElement?.textContent).toBe("Cancel");
    await act(async () => {
      container.querySelector<HTMLButtonElement>("button")!.click();
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(clear).not.toHaveBeenCalled();
  });

  it("unusual_stack_pointer_is_warned_without_blocking_apply", async () => {
    await act(async () => root.render(
      <I18nProvider initialLocale="en">
        <DebuggerEditDialog
          target={{ kind: "stack-pointer" }}
          currentWord={0x1234}
          numericMode="hex"
          onCancel={() => undefined}
          onApply={async () => ({ status: "applied" })}
        />
      </I18nProvider>
    ));
    expect(container.querySelector(".debugger-stack-warning")?.textContent).toContain("usual high-memory stack area");
    const apply = Array.from(container.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent === "Apply");
    expect(apply?.disabled).toBe(false);
  });

  it("fr_editor_exposes_only_official_flags_and_applies_them_atomically", async () => {
    const apply = vi.fn(async () => ({ status: "applied" as const }));
    await act(async () => root.render(
      <I18nProvider initialLocale="en">
        <DebuggerEditDialog
          target={{ kind: "flag-register" }}
          currentWord={0}
          numericMode="hex"
          onCancel={() => undefined}
          onApply={apply}
        />
      </I18nProvider>
    ));

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
    const checkboxes = Array.from(dialog.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    expect(checkboxes.map((checkbox) => checkbox.parentElement?.textContent?.trim())).toEqual(["OF", "SF", "ZF"]);
    expect(dialog.querySelector(".debugger-value-field")).toBeNull();
    expect(dialog.textContent).not.toContain("CF");

    await act(async () => {
      checkboxes[0].click();
      checkboxes[2].click();
    });
    const applyButton = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button"))
      .find((button) => button.textContent === "Apply")!;
    await act(async () => applyButton.click());

    expect(apply).toHaveBeenCalledWith({
      target: { kind: "flag-register" },
      nextFlags: { of: true, sf: false, zf: true }
    });
  });
});

describe("Phase 20B CASL Mode editing surface", () => {
  for (const locale of ["en", "ja", "zh-CN"] as const satisfies readonly SupportedLocale[]) {
    it(`three_locales_expose_read_only_cells_with_explicit_edit_actions_${locale}`, async () => {
      const state = mockCaslCore.assemble(source);
      await act(async () => root.render(
        <I18nProvider initialLocale={locale}>
          <CaslCompatibilityMode
            state={state}
            sourceText={source}
            isSourceDirty={false}
            assemblyId="assembly:test"
            onReset={() => undefined}
            onReload={() => undefined}
            onSubmitConsoleInput={() => undefined}
          />
        </I18nProvider>
      ));
      expect(container.querySelector('[data-testid="casl-register-gr2"] button')).not.toBeNull();
      expect(container.querySelectorAll(".casl-fr-grid div")).toHaveLength(3);
      expect(container.querySelector(".casl-fr-grid")?.textContent).toBe("OF0SF0ZF0");
      expect(container.querySelector(".casl-destructive-actions button")?.textContent?.trim()).toBeTruthy();
      expect(container.querySelector("main")?.scrollWidth).toBeLessThanOrEqual(container.querySelector("main")!.clientWidth);
    });
  }
});
