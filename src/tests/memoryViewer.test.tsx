// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import MemoryPanel from "../components/MemoryPanel";
import { createCometStateFromDto } from "../core/coreStateAdapter";
import { toAssembleResultDto, toStepResultDto } from "../core/coreDto";
import { DEFAULT_CASL_SOURCE, mockCaslCore } from "../core/mockCaslCore";
import { selectMemoryViewerRows } from "../core/selectors";
import type { CometState } from "../core/types";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function stateFromRaw(raw: CometState, previous?: CometState): CometState {
  const dto = raw.stepIndex === 0 ? toAssembleResultDto(raw).state : toStepResultDto(raw).state;
  return createCometStateFromDto(dto, previous ? { previous } : {});
}

function stepRaw(times: number): CometState {
  let state = mockCaslCore.assemble(DEFAULT_CASL_SOURCE);
  for (let index = 0; index < times; index += 1) {
    state = mockCaslCore.step(state);
  }
  return state;
}

async function renderMemoryPanel(state: CometState) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<MemoryPanel state={state} />);
  });
  return container;
}

function getByTestId(testId: string): HTMLElement {
  const element = container?.querySelector(`[data-testid="${testId}"]`);
  if (!(element instanceof HTMLElement)) throw new Error(`Missing test id ${testId}`);
  return element;
}

async function fillInput(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => {
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function selectRows(select: HTMLSelectElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  await act(async () => {
    valueSetter?.call(select, value);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("Memory Viewer", () => {
  afterEach(async () => {
    await act(async () => {
      root?.unmount();
    });
    root = null;
    container?.remove();
    container = null;
  });

  it("memory_view_default_range_from_start", async () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));

    await renderMemoryPanel(state);

    expect(getByTestId("memory-view-row-0020")).toBeTruthy();
    expect(getByTestId("memory-view-row-005F")).toBeTruthy();
    expect(container?.querySelectorAll(".memory-table tbody tr")).toHaveLength(64);
  });

  it("memory_view_custom_start_address", async () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));

    await renderMemoryPanel(state);
    await fillInput(getByTestId("memory-start-input") as HTMLInputElement, "0028");
    await act(async () => {
      getByTestId("memory-go-button").click();
    });

    expect(getByTestId("memory-view-row-0028")).toBeTruthy();
    expect(container?.querySelector('[data-testid="memory-view-row-0020"]')).toBeNull();
  });

  it("memory_view_row_count_64", async () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));

    await renderMemoryPanel(state);
    await selectRows(getByTestId("memory-row-count") as HTMLSelectElement, "64");

    expect(container?.querySelectorAll(".memory-table tbody tr")).toHaveLength(64);
  });

  it("memory_jump_to_pr", async () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));

    await renderMemoryPanel(state);
    await act(async () => {
      getByTestId("memory-jump-pr").click();
    });

    expect((getByTestId("memory-start-input") as HTMLInputElement).value).toBe("0020");
    expect(getByTestId("memory-view-row-0020").dataset.pr).toBe("true");
  });

  it("memory_jump_to_mar", async () => {
    const state = stateFromRaw(stepRaw(1));

    await renderMemoryPanel(state);
    await act(async () => {
      getByTestId("memory-jump-mar").click();
    });

    expect((getByTestId("memory-start-input") as HTMLInputElement).value).toBe("0027");
    expect(getByTestId("memory-view-row-0027").dataset.mar).toBe("true");
    expect(getByTestId("memory-view-row-0027").dataset.read).toBe("true");
  });

  it("memory_highlight_last_write", async () => {
    const state = stateFromRaw(stepRaw(3));

    await renderMemoryPanel(state);
    const row = getByTestId("memory-view-row-0029");

    expect(row.dataset.write).toBe("true");
    expect(row.textContent).toContain("001E");
    expect(row.textContent).toContain("C");
  });

  it("memory_does_not_render_65536_rows", async () => {
    const state = stateFromRaw(mockCaslCore.assemble(DEFAULT_CASL_SOURCE));
    const rows = selectMemoryViewerRows(state, 0x0000, 65_536);

    await renderMemoryPanel(state);

    expect(rows).toHaveLength(256);
    expect(container?.querySelectorAll(".memory-table tbody tr").length).toBeLessThanOrEqual(256);
  });
});
