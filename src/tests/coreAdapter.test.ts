import { afterEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import simpleReady from "../../tests/golden/simple.ready.json";
import simpleStep1 from "../../tests/golden/simple.step1.json";
import StatusBar from "../components/StatusBar";
import type { CoreAdapter } from "../core/coreAdapter";
import {
  coreBridge,
  createCoreAdapterForBackend,
  getCoreBackendInfo,
  resolveCoreBackend,
  setCoreAdapter
} from "../core/coreBridge";
import type { AssembleResultDto, CometStateDto, StepResultDto } from "../core/coreDto";
import { DEFAULT_CASL_SOURCE } from "../core/defaultSource";
import { MockCoreAdapter } from "../core/mockCoreAdapter";
import { createCometStateFromDto } from "../core/coreStateAdapter";
import { createEmptyUiCometState } from "../core/coreStateAdapter";
import { loadWasmModule } from "../core/wasmLoader";
import { WasmCoreAdapter } from "../core/wasmCoreAdapter";
import useAppStoreSource from "../store/useAppStore.tsx?raw";

const readyDto = simpleReady as CometStateDto;
const changedConstantSource = DEFAULT_CASL_SOURCE.replace("A    DC    10", "A    DC    100");
const gr2Source = `MAIN START
     LD    GR2,A
     ADDA  GR2,B
     ST    GR2,C
     RET
A    DC    10
B    DC    20
C    DS    1
     END`;

function makeAssembleResult(state: CometStateDto): AssembleResultDto {
  return {
    ok: state.runState !== "Error",
    state,
    diagnostics: state.diagnostics
  };
}

function makeStepResult(state: CometStateDto): StepResultDto {
  return {
    ok: state.runState !== "Error",
    state,
    diagnostics: state.diagnostics
  };
}

describe("core adapter abstraction", () => {
  afterEach(() => {
    setCoreAdapter(new MockCoreAdapter());
  });

  it("default_backend_is_mock", () => {
    const selection = createCoreAdapterForBackend(undefined);

    expect(resolveCoreBackend(undefined)).toBe("mock");
    expect(selection.adapter).toBeInstanceOf(MockCoreAdapter);
    expect(selection.info).toEqual({ kind: "mock", label: "Mock Core", status: "ready" });
  });

  it("wasm_backend_can_be_selected", () => {
    const selection = createCoreAdapterForBackend("wasm");

    expect(resolveCoreBackend("wasm")).toBe("wasm");
    expect(selection.adapter).toBeInstanceOf(WasmCoreAdapter);
    expect(selection.info).toEqual({ kind: "wasm", label: "WASM Core", status: "ready" });
  });

  it("wasm_missing_files_error_is_clear", async () => {
    const cwd = getNodeCwd();
    const missingRoot = `${cwd}\\__missing_wasm__`;

    await expect(
      loadWasmModule({
        modulePath: `${missingRoot}\\public\\wasm\\stugx_casl_core.js`,
        wasmPath: `${missingRoot}\\public\\wasm\\stugx_casl_core.wasm`
      })
    ).rejects.toThrow(/public\/wasm\/stugx_casl_core\.js not found.*scripts\/build-wasm\.ps1/);
  });

  it("backend_label_matches_adapter", () => {
    setCoreAdapter(new WasmCoreAdapter(), { kind: "wasm", label: "WASM Core", status: "ready" });
    const markup = renderToStaticMarkup(
      createElement(StatusBar, {
        state: createEmptyUiCometState("Idle", []),
        backendInfo: getCoreBackendInfo()
      })
    );

    expect(markup).toContain("WASM Core");
  });

  it("coreAdapter.mock.assemble matches simple ready golden DTO", async () => {
    const adapter = new MockCoreAdapter();
    const result = await adapter.assemble(DEFAULT_CASL_SOURCE);

    expect(result).toEqual(makeAssembleResult(readyDto));
  });

  it("coreAdapter.mock.step1 matches simple step1 golden DTO", async () => {
    const adapter = new MockCoreAdapter();
    await adapter.assemble(DEFAULT_CASL_SOURCE);
    const result = await adapter.step();

    expect(result).toEqual(makeStepResult(simpleStep1 as CometStateDto));
  });

  it("coreBridge.usesActiveAdapter delegates to the configured adapter", async () => {
    const calls: string[] = [];
    const fakeAdapter: CoreAdapter = {
      async assemble(sourceText) {
        calls.push(`assemble:${sourceText}`);
        return makeAssembleResult(readyDto);
      },
      async reset() {
        calls.push("reset");
        return readyDto;
      },
      async step() {
        calls.push("step");
        return makeStepResult(readyDto);
      },
      async run(maxSteps) {
        calls.push(`run:${maxSteps}`);
        return readyDto;
      },
      async getState() {
        calls.push("getState");
        return readyDto;
      }
    };

    setCoreAdapter(fakeAdapter);
    const result = await coreBridge.assemble("TEST SOURCE");

    expect(calls).toEqual(["assemble:TEST SOURCE"]);
    expect(result.state).toEqual(readyDto);
  });

  it("store.doesNotImportMockDirectly", () => {
    expect(useAppStoreSource).not.toContain("mockCaslCore");
  });

  it("adapter DTO projection preserves edited constants for UI state", async () => {
    const adapter = new MockCoreAdapter();
    const ready = await adapter.assemble(changedConstantSource);
    const readyState = createCometStateFromDto(ready.state);
    const step1 = await adapter.step();
    const stepState = createCometStateFromDto(step1.state, { previous: readyState });

    expect(stepState.gr[1]).toBe(0x0064);
  });

  it("adapter DTO projection preserves GR2 execution for UI state", async () => {
    const adapter = new MockCoreAdapter();
    const ready = await adapter.assemble(gr2Source);
    const readyState = createCometStateFromDto(ready.state);
    const step1 = await adapter.step();
    const stepState = createCometStateFromDto(step1.state, { previous: readyState });

    expect(stepState.gr[2]).toBe(0x000a);
    expect(stepState.gr[1]).toBe(0x0000);
  });
});

function getNodeCwd(): string {
  const processLike = (globalThis as { process?: { cwd?: () => string } }).process;
  const cwd = processLike?.cwd?.();
  if (!cwd) throw new Error("Node cwd is unavailable.");
  return cwd;
}
