// @vitest-environment jsdom
import React, { act, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DebuggerEditDialog } from "../components/DebuggerDialogs";
import type { DebuggerMutationTarget } from "../debugger/debuggerMutation";
import { I18nProvider } from "../i18n/I18nProvider";

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

/**
 * Records what the dialog shows in the very frame it is committed, before any passive effect has
 * had the chance to correct it. A layout effect of the parent runs after the children's DOM is in
 * place and before the browser paints.
 */
function Harness({ target, currentWord, frames }: { target: DebuggerMutationTarget | null; currentWord: number; frames: string[] }) {
  useLayoutEffect(() => {
    const boxes = [...container.querySelectorAll<HTMLInputElement>(".debugger-fr-editor input")];
    const text = container.querySelector<HTMLInputElement>(".debugger-value-field input");
    if (boxes.length > 0) frames.push(`fr:${boxes.map((box) => (box.checked ? "1" : "0")).join("")}`);
    else if (text) frames.push(`word:${text.value}`);
    else frames.push("closed");
  });
  return (
    <I18nProvider initialLocale="en">
      <DebuggerEditDialog
        target={target}
        currentWord={currentWord}
        numericMode="hex"
        onCancel={() => undefined}
        onApply={async () => ({ status: "applied" })}
      />
    </I18nProvider>
  );
}

describe("debugger edit dialog draft", () => {
  it("first_frame_for_a_new_target_never_shows_the_previous_targets_draft", async () => {
    const frames: string[] = [];
    const render = (target: DebuggerMutationTarget | null, currentWord: number) =>
      act(async () => root.render(<Harness target={target} currentWord={currentWord} frames={frames} />));

    // Edit SP: the stack pointer becomes #FFFC while the dialog is still open, then it closes.
    await render({ kind: "stack-pointer" }, 0xfffe);
    await render({ kind: "stack-pointer" }, 0xfffc);
    await render(null, 0);
    // Open FR, whose current value is 0. #FFFC has bit 2 set, which used to show as OF checked.
    await render({ kind: "flag-register" }, 0);
    // Then a general register.
    await render(null, 0);
    await render({ kind: "general-register", register: "GR2" }, 0x0042);

    expect(frames).toEqual(["word:#FFFE", "word:#FFFC", "closed", "fr:000", "closed", "word:#0042"]);
  });

  it("flag_boxes_start_from_the_current_flag_register", async () => {
    const frames: string[] = [];
    await act(async () => root.render(<Harness target={{ kind: "flag-register" }} currentWord={0b0101} frames={frames} />));
    expect(frames).toEqual(["fr:101"]);
  });

  it("reopening_the_same_target_discards_an_abandoned_draft", async () => {
    const frames: string[] = [];
    const target: DebuggerMutationTarget = { kind: "flag-register" };
    const render = (next: DebuggerMutationTarget | null) =>
      act(async () => root.render(<Harness target={next} currentWord={0} frames={frames} />));

    await render(target);
    const overflow = container.querySelector<HTMLInputElement>(".debugger-fr-editor input")!;
    await act(async () => overflow.click());
    expect(overflow.checked).toBe(true);
    await render(null);
    await render(target);

    expect(container.querySelector<HTMLInputElement>(".debugger-fr-editor input")!.checked).toBe(false);
    expect(frames.at(-1)).toBe("fr:000");
  });
});
