// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InspectorPanel from "../../components/InspectorPanel";
import OutputPanel from "../../components/OutputPanel";
import { createSequentialDocumentIdFactory } from "../../documents/idFactory";
import { createIdleFileLifecycleState } from "../../documents/lifecycle";
import { I18nProvider } from "../../i18n/I18nProvider";
import { mockCaslCore } from "../../core/mockCaslCore";
import { appStoreReducer, AppStoreProvider, createInitialAppState, useAppStore } from "../../store/useAppStore";
import { selectApplicationPreferences } from "../selectors";
import { ApplicationPreferenceController } from "../controller";
import type { ApplicationPreferenceStorage } from "../storage";
import { DEFAULT_APPLICATION_PREFERENCES, type ResolvedApplicationPreferencesV1 } from "../types";

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

describe("Phase 16A store hydration and writes", () => {
  it("hydrates_only_safe_preferences_before_first_store_render", async () => {
    const preferences: ResolvedApplicationPreferencesV1 = {
      version: 1,
      observationMode: "register-stack",
      circuitFocusEnabled: true,
      inspectorActiveTab: "memory",
      outputDockActiveTab: "messages"
    };
    let store: ReturnType<typeof useAppStore> | null = null;
    await renderStore(preferences, (value) => { store = value; });
    expect(selectApplicationPreferences(store!)).toEqual(preferences);
    expect(store!.sourceText).toContain("MAIN START");
    expect(store!.documentDirty).toBe(false);
    expect(store!.diagnostics).toEqual([]);
    expect(store!.cometState.runState).toBe("Idle");
    expect(store!.fileLifecycle).toEqual(createIdleFileLifecycleState());
  });

  it("writes_only_when_allowlisted_preferences_change", async () => {
    const onChange = vi.fn();
    let store: ReturnType<typeof useAppStore> | null = null;
    await renderStore(DEFAULT_APPLICATION_PREFERENCES, (value) => { store = value; }, onChange);
    expect(onChange).not.toHaveBeenCalled();

    await act(async () => store!.setSourceText(`${store!.sourceText}\n; edit`));
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => store!.setFileLifecycle({ ...createIdleFileLifecycleState(), status: "opening", operationId: "op-1" }));
    expect(onChange).not.toHaveBeenCalled();

    await act(async () => store!.setObservationMode("code-machine"));
    expect(onChange).toHaveBeenCalledTimes(1);
    await act(async () => store!.setObservationMode("code-machine"));
    expect(onChange).toHaveBeenCalledTimes(1);
    await act(async () => store!.setCircuitFocusEnabled(true));
    await act(async () => store!.setInspectorActiveTab("trace"));
    await act(async () => store!.setOutputDockActiveTab("console"));
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange.mock.lastCall?.[0]).toEqual({ version: 1, observationMode: "code-machine", circuitFocusEnabled: true, inspectorActiveTab: "trace", outputDockActiveTab: "console" });
    expect(Object.keys(onChange.mock.lastCall?.[0] ?? {})).toEqual(["version", "observationMode", "circuitFocusEnabled", "inspectorActiveTab", "outputDockActiveTab"]);
  });

  it("preference_changes_do_not_mutate_document_source_dirty_diagnostics_or_vm", async () => {
    let store: ReturnType<typeof useAppStore> | null = null;
    await renderStore(DEFAULT_APPLICATION_PREFERENCES, (value) => { store = value; });
    const before = {
      documentId: store!.currentDocument.documentId,
      sourceUnitId: store!.sourceUnitId,
      sourceText: store!.sourceText,
      dirty: store!.documentDirty,
      diagnostics: store!.diagnostics,
      cometState: store!.cometState,
      localeAbsent: !("locale" in store!)
    };
    await act(async () => {
      store!.setObservationMode("register-stack");
      store!.setCircuitFocusEnabled(true);
      store!.setInspectorActiveTab("source-map");
      store!.setOutputDockActiveTab("generated-casl");
    });
    expect({
      documentId: store!.currentDocument.documentId,
      sourceUnitId: store!.sourceUnitId,
      sourceText: store!.sourceText,
      dirty: store!.documentDirty,
      diagnostics: store!.diagnostics,
      cometState: store!.cometState,
      localeAbsent: !("locale" in store!)
    }).toEqual(before);
  });

  it("source_replacement_preserves_preferences", () => {
    const ids = createSequentialDocumentIdFactory("preference-replacement");
    const initial = createInitialAppState(ids, { ...DEFAULT_APPLICATION_PREFERENCES, observationMode: "code-machine", circuitFocusEnabled: true, inspectorActiveTab: "trace", outputDockActiveTab: "machine-code" });
    const replacement = createInitialAppState(createSequentialDocumentIdFactory("replacement")).currentDocument;
    const next = appStoreReducer(initial, { type: "currentDocumentReplaced", document: replacement });
    expect(selectApplicationPreferences(next)).toEqual(selectApplicationPreferences(initial));
  });

  it("strict_mode_effects_do_not_duplicate_preference_writes", async () => {
    const onChange = vi.fn();
    function StrictProbe() {
      const store = useAppStore();
      React.useEffect(() => store.setCircuitFocusEnabled(true), [store.setCircuitFocusEnabled]);
      return null;
    }
    await act(async () => root.render(
      <React.StrictMode>
        <AppStoreProvider initialPreferences={DEFAULT_APPLICATION_PREFERENCES} onApplicationPreferencesChange={onChange}><StrictProbe /></AppStoreProvider>
      </React.StrictMode>
    ));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.lastCall?.[0].circuitFocusEnabled).toBe(true);
  });

  it("storage_write_failure_keeps_in_memory_preference_and_clean_document", async () => {
    const storage: ApplicationPreferenceStorage = { read: () => null, write: () => { throw new Error("quota"); }, clear: () => undefined };
    const controller = new ApplicationPreferenceController(storage);
    const preferences = controller.hydrate();
    let store: ReturnType<typeof useAppStore> | null = null;
    await renderStore(preferences, (value) => { store = value; }, (snapshot) => controller.persist(snapshot));
    await act(async () => store!.setCircuitFocusEnabled(true));
    expect(store!.circuitFocusEnabled).toBe(true);
    expect(store!.documentDirty).toBe(false);
    expect(store!.diagnostics).toEqual([]);
  });
});

describe("Phase 16A tab wiring", () => {
  const state = mockCaslCore.assemble("MAIN START\n RET\n END");

  it("inspector_restores_canonical_tab_and_reports_user_changes", async () => {
    const onChange = vi.fn();
    await render(<InspectorPanel state={state} initialTab="source-map" onActiveTabChange={onChange} />);
    expect(container.querySelector(".inspector-panel")?.getAttribute("data-active-tab")).toBe("sourceMap");
    await act(async () => container.querySelector<HTMLButtonElement>("#inspector-tab-memory")?.click());
    expect(onChange).toHaveBeenCalledWith("memory");
  });

  it("output_dock_restores_canonical_tab_and_reports_user_changes", async () => {
    const onChange = vi.fn();
    await render(<OutputPanel lines={[]} state={state} initialTab="machine-code" onActiveTabChange={onChange} onClear={() => undefined} />);
    expect(container.querySelector(".output-panel")?.getAttribute("data-active-tab")).toBe("machine-code");
    await act(async () => container.querySelector<HTMLButtonElement>("#output-tab-generated")?.click());
    expect(onChange).toHaveBeenCalledWith("generated-casl");
  });

  it("source_driven_generated_auto_open_does_not_report_a_user_preference", async () => {
    const onChange = vi.fn();
    await render(<OutputPanel lines={[]} initialTab="output" autoOpenGenerated generatedCaslSource="MAIN START\n RET\n END" onActiveTabChange={onChange} onClear={() => undefined} />);
    expect(container.querySelector(".output-panel")?.getAttribute("data-active-tab")).toBe("generated-casl");
    expect(onChange).not.toHaveBeenCalled();
  });
});

async function renderStore(
  preferences: ResolvedApplicationPreferencesV1,
  capture: (store: ReturnType<typeof useAppStore>) => void,
  onChange?: (preferences: ResolvedApplicationPreferencesV1) => void
) {
  function Probe() {
    capture(useAppStore());
    return null;
  }
  await act(async () => root.render(<AppStoreProvider initialPreferences={preferences} onApplicationPreferencesChange={onChange}><Probe /></AppStoreProvider>));
}

async function render(element: React.ReactElement) {
  await act(async () => root.render(<I18nProvider>{element}</I18nProvider>));
}
