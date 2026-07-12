// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createIdleFileLifecycleState } from "../../documents/lifecycle";
import { learningLessons } from "../../examples/learningLessons";
import { AppStoreProvider, useAppStore } from "../../store/useAppStore";
import { LessonProgressController } from "../controller";
import type { LessonProgressStorage } from "../storage";
import type { LessonProgressPersistenceV1, LessonProgressState } from "../types";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("Phase 16C store hydration and writes", () => {
  it("hydrates_progress_before_first_store_render_without_side_effects", async () => {
    let store: ReturnType<typeof useAppStore> | null = null;
    const onChange = vi.fn();
    await renderStore({ "casl-gr2-addition": { assemble: true, "step-ld": true } }, (value) => { store = value; }, onChange);
    expect(store!.lessonProgress).toEqual({ "casl-gr2-addition": { assemble: true, "step-ld": true } });
    expect(store!.documentDirty).toBe(false);
    expect(store!.diagnostics).toEqual([]);
    expect(store!.cometState.runState).toBe("Idle");
    expect(store!.fileLifecycle).toEqual(createIdleFileLifecycleState());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("toggle_uncheck_and_per_lesson_reset_emit_progress_only", async () => {
    let store: ReturnType<typeof useAppStore> | null = null;
    const onChange = vi.fn();
    await renderStore({}, (value) => { store = value; }, onChange);
    const document = store!.currentDocument;
    const source = store!.sourceText;
    const vm = store!.cometState;

    await act(async () => store!.toggleLessonStep("casl-gr2-addition", "assemble"));
    expect(onChange).toHaveBeenLastCalledWith({ "casl-gr2-addition": { assemble: true } });
    await act(async () => store!.toggleLessonStep("casl-gr2-addition", "assemble"));
    expect(onChange).toHaveBeenLastCalledWith({ "casl-gr2-addition": { assemble: false } });
    await act(async () => store!.toggleLessonStep("casl-gr2-addition", "step-ld"));
    await act(async () => store!.resetLessonProgress("casl-gr2-addition"));
    expect(onChange).toHaveBeenLastCalledWith({});
    expect(store!.currentDocument).toBe(document);
    expect(store!.sourceText).toBe(source);
    expect(store!.cometState).toBe(vm);
    expect(store!.documentDirty).toBe(false);
  });

  it("unrelated_source_runtime_file_and_invalid_actions_do_not_emit_progress", async () => {
    let store: ReturnType<typeof useAppStore> | null = null;
    const onChange = vi.fn();
    await renderStore({}, (value) => { store = value; }, onChange);
    await act(async () => store!.setSourceText(`${store!.sourceText}\n; edit`));
    await act(async () => store!.setObservationMode("code-machine"));
    await act(async () => store!.setCircuitFocusEnabled(true));
    await act(async () => store!.setFileLifecycle({ status: "opening", operationId: "op", pendingDocumentId: store!.currentDocument.documentId, lastFailure: null }));
    await act(async () => store!.toggleLessonStep("external", "assemble"));
    await act(async () => store!.toggleLessonStep("casl-gr2-addition", "missing-step"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clear_all_clears_only_progress_storage_and_memory", async () => {
    const storage = new FakeStorage({ version: 1, entries: [{ lessonId: "casl-gr2-addition", exampleId: "casl-gr2-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble"] }] });
    const controller = new LessonProgressController(storage);
    let store: ReturnType<typeof useAppStore> | null = null;
    await renderStore(
      controller.hydrate(learningLessons),
      (value) => { store = value; },
      (progress) => controller.persist(progress, learningLessons),
      () => controller.clear()
    );
    const document = store!.currentDocument;
    await act(async () => store!.clearAllLessonProgress());
    expect(store!.lessonProgress).toEqual({});
    expect(storage.clears).toBe(1);
    expect(storage.writes).toBe(0);
    expect(store!.currentDocument).toBe(document);
    expect(store!.documentDirty).toBe(false);
  });

  it("storage_write_failure_keeps_ui_progress_and_clean_document", async () => {
    const controller = new LessonProgressController({ read: () => null, write: () => { throw new Error("quota"); }, clear: () => undefined });
    let store: ReturnType<typeof useAppStore> | null = null;
    await renderStore(controller.hydrate(learningLessons), (value) => { store = value; }, (progress) => controller.persist(progress, learningLessons));
    await act(async () => store!.toggleLessonStep("casl-gr2-addition", "assemble"));
    expect(store!.lessonProgress["casl-gr2-addition"].assemble).toBe(true);
    expect(store!.documentDirty).toBe(false);
    expect(store!.diagnostics).toEqual([]);
  });
});

async function renderStore(
  initialLessonProgress: LessonProgressState,
  capture: (store: ReturnType<typeof useAppStore>) => void,
  onChange?: (progress: LessonProgressState) => void,
  onClear?: () => void
) {
  function Probe() {
    capture(useAppStore());
    return null;
  }
  await act(async () => root.render(
    <AppStoreProvider initialLessonProgress={initialLessonProgress} onLessonProgressChange={onChange} onAllLessonProgressClear={onClear}>
      <Probe />
    </AppStoreProvider>
  ));
}

class FakeStorage implements LessonProgressStorage {
  writes = 0;
  clears = 0;
  constructor(private value: LessonProgressPersistenceV1 | null) {}
  read() { return this.value; }
  write(value: LessonProgressPersistenceV1) { this.writes += 1; this.value = value; }
  clear() { this.clears += 1; this.value = null; }
}
