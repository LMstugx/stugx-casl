// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OutputPanel from "../components/OutputPanel";
import { mockCaslCore } from "../core/mockCaslCore";
import type { CometState } from "../core/types";
import { I18nProvider } from "../i18n/I18nProvider";

/**
 * The output dock of the workbench: collapsing, what happens when the program waits for input
 * (standard 3.3 and F08), and the error count on the Messages tab.
 */

const ready = mockCaslCore.assemble(`MAIN START
     RET
     END`);

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

function Dock({ state, messages = [], onConsoleInput = () => undefined, onTab = () => undefined }: {
  state: CometState;
  messages?: string[];
  onConsoleInput?: (text: string, endOfFile?: boolean) => void;
  onTab?: (tab: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <I18nProvider initialLocale="en">
      <button type="button" id="elsewhere">elsewhere</button>
      <OutputPanel
        lines={["one"]}
        messages={messages}
        state={state}
        onActiveTabChange={onTab}
        onConsoleInput={onConsoleInput}
        onClear={() => undefined}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />
    </I18nProvider>
  );
}

const panel = () => container.querySelector<HTMLElement>(".output-panel")!;
const toggle = () => container.querySelector<HTMLButtonElement>('[data-testid="dock-collapse-toggle"]')!;
const consoleInput = () => container.querySelector<HTMLInputElement>('[data-testid="dock-console-input"]');

describe("output dock", () => {
  it("collapses to its tab row and says so to assistive technology", async () => {
    await act(async () => root.render(<Dock state={ready} />));
    expect(panel().getAttribute("data-collapsed")).toBe("false");
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    expect(toggle().getAttribute("aria-label")).toBe("Collapse the output panel");

    await act(async () => toggle().click());
    expect(panel().getAttribute("data-collapsed")).toBe("true");
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(toggle().getAttribute("aria-label")).toBe("Expand the output panel");
    expect(container.querySelector<HTMLElement>('[role="tabpanel"]')!.hidden).toBe(true);
    // The tabs stay, so the panel can be reopened on the tab that is wanted.
    expect(container.querySelectorAll('[role="tab"]')).toHaveLength(5);
  });

  it("choosing a tab reopens a collapsed dock", async () => {
    await act(async () => root.render(<Dock state={ready} />));
    await act(async () => toggle().click());
    await act(async () => container.querySelector<HTMLButtonElement>("#output-tab-messages")!.click());
    expect(panel().getAttribute("data-collapsed")).toBe("false");
    expect(panel().getAttribute("data-active-tab")).toBe("messages");
  });

  it("when the program waits for input the console opens, its field takes the focus, and the preference is left alone", async () => {
    const onTab = vi.fn();
    await act(async () => root.render(<Dock state={ready} onTab={onTab} />));
    await act(async () => toggle().click());
    container.querySelector<HTMLButtonElement>("#elsewhere")!.focus();

    await act(async () => root.render(<Dock state={{ ...ready, runState: "WaitingInput" }} onTab={onTab} />));
    expect(panel().getAttribute("data-collapsed")).toBe("false");
    expect(panel().getAttribute("data-active-tab")).toBe("console");
    expect(consoleInput()!.disabled).toBe(false);
    expect(document.activeElement).toBe(consoleInput());
    // Opening the console for the reader is not a choice of the reader: nothing is persisted.
    expect(onTab).not.toHaveBeenCalled();
  });

  it("after the input is taken the field is disabled again and the focus goes back where it was", async () => {
    await act(async () => root.render(<Dock state={ready} />));
    const elsewhere = container.querySelector<HTMLButtonElement>("#elsewhere")!;
    elsewhere.focus();
    await act(async () => root.render(<Dock state={{ ...ready, runState: "WaitingInput" }} />));
    expect(document.activeElement).toBe(consoleInput());

    await act(async () => root.render(<Dock state={ready} />));
    expect(consoleInput()!.disabled).toBe(true);
    expect(document.activeElement).toBe(elsewhere);
  });

  it("the Messages tab shows the number of errors as text, and nothing when there are none", async () => {
    await act(async () => root.render(<Dock state={ready} />));
    const tab = () => container.querySelector<HTMLElement>("#output-tab-messages")!;
    expect(tab().querySelector(".tab-count")).toBeNull();
    expect(tab().getAttribute("data-count")).toBe("0");

    await act(async () => root.render(<Dock state={ready} messages={["Line 2: unknown instruction", "Line 5: undefined label"]} />));
    expect(tab().querySelector(".tab-count")?.textContent).toBe("2");
    expect(tab().getAttribute("data-count")).toBe("2");
    // The accessible name of the tab is unchanged; the count is an addition for sighted readers.
    expect(tab().getAttribute("aria-label")).toBe("Open Messages tab");
  });
});
