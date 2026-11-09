// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CircuitFocusLayout from "../components/CircuitFocusLayout";
import { mockCaslCore } from "../core/mockCaslCore";
import { getDemoProgram } from "../examples/demoPrograms";
import { I18nProvider } from "../i18n/I18nProvider";
import { prepareSourceForCoreAssembly } from "../store/useAppStore";

/**
 * In the workbench the source pane and the observation pane are on screen together, so a frame
 * slot selected in the observation pane is reported to the source pane. The report comes back to
 * the layout as its "initial" selection. It must never be applied a second time.
 */

const source = getDemoProgram("cpp-function-arguments")!.source;
const prepared = prepareSourceForCoreAssembly(source, "cpp");
const state = mockCaslCore.assemble(prepared.generatedCaslSource);

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

function layout(initialSelectedFrameSlotId: string | undefined, onSelectedFrameSlotChange: (id: string | undefined) => void) {
  return (
    <I18nProvider initialLocale="en">
      <CircuitFocusLayout
        state={state}
        sourceMode="cpp"
        sourceText={source}
        generatedCaslSource={prepared.generatedCaslSource}
        cppToCaslMapping={prepared.mapping}
        isSourceDirty={false}
        timelineItems={[]}
        observationMode="register-stack"
        initialAuxiliaryObservation="stack"
        initialSelectedFrameSlotId={initialSelectedFrameSlotId}
        onSelectedFrameSlotChange={onSelectedFrameSlotChange}
      />
    </I18nProvider>
  );
}

const selectedSlots = () => [...container.querySelectorAll<HTMLElement>('[data-testid="stack-frame-future-slot"][data-selected="true"]')].map((slot) => slot.dataset.slotId);
const functionSelect = () => container.querySelector<HTMLSelectElement>('[data-testid="stack-frame-function-select"]')!;

async function chooseFunction(name: string) {
  await act(async () => {
    const select = functionSelect();
    select.value = name;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("frame slot selection shared with the source pane", () => {
  it("reports a slot selected in the observation pane", async () => {
    const report = vi.fn();
    await act(async () => root.render(layout(undefined, report)));
    await chooseFunction("add");
    await act(async () => container.querySelector<HTMLButtonElement>('[data-slot-id="add:argument:b:2"]')!.click());

    expect(selectedSlots()).toEqual(["add:argument:b:2"]);
    expect(report).toHaveBeenLastCalledWith("add:argument:b:2");
  });

  it("does not select the slot again when its own report comes back after the reader moved on", async () => {
    const report = vi.fn();
    await act(async () => root.render(layout(undefined, report)));
    await chooseFunction("add");
    await act(async () => container.querySelector<HTMLButtonElement>('[data-slot-id="add:argument:b:2"]')!.click());

    // The reader switches to another function before the report has come back.
    await chooseFunction("main");
    expect(selectedSlots()).toEqual([]);

    // Now the report arrives as the initial selection.
    await act(async () => root.render(layout("add:argument:b:2", report)));
    expect(selectedSlots()).toEqual([]);
    expect(functionSelect().value).toBe("main");
  });

  it("still applies a selection that really comes from the source pane", async () => {
    const report = vi.fn();
    await act(async () => root.render(layout(undefined, report)));
    await act(async () => root.render(layout("add:argument:a:1", report)));

    expect(selectedSlots()).toEqual(["add:argument:a:1"]);
    expect(functionSelect().value).toBe("add");
  });

  it("losing the selection is not reported, so the source pane keeps its own", async () => {
    const report = vi.fn();
    await act(async () => root.render(layout(undefined, report)));
    await chooseFunction("add");
    await act(async () => container.querySelector<HTMLButtonElement>('[data-slot-id="add:argument:b:2"]')!.click());
    report.mockClear();
    await chooseFunction("main");

    expect(report).not.toHaveBeenCalled();
  });
});
