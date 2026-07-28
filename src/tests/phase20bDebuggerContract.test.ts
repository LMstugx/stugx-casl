import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { CoreAdapter } from "../core/coreAdapter";
import { coreBridge, setCoreAdapter } from "../core/coreBridge";
import type { CometStateDto } from "../core/coreDto";
import { MockCoreAdapter } from "../core/mockCoreAdapter";
import type { DebuggerMutationRequest } from "../debugger/debuggerMutation";
import type { SourceUnitId } from "../documents/types";

type CompatibilityFeature = {
  featureId: string;
  currentStatus: string;
  priority: "P0" | "P1" | "P2";
  targetPhase: string;
  tests: string[];
};

const root = resolve(".");
const baselineSource = readFileSync(resolve(root, "docs/wcasl-compatibility-baseline-v1.json"), "utf8").replace(/\r\n/g, "\n");
const baseline = JSON.parse(baselineSource) as { features: CompatibilityFeature[] };
const byId = new Map(baseline.features.map((feature) => [feature.featureId, feature]));

function emptyDto(): CometStateDto {
  return {
    runState: "Ready",
    stepCount: 0,
    pr: 0x20,
    sp: 0xfffe,
    callDepth: 0,
    ir0: 0,
    ir1: null,
    mar: 0x20,
    mdr: 0,
    gr: Array(8).fill(0),
    frOF: false,
    frSF: false,
    frZF: false,
    currentInstructionAddress: 0x20,
    currentSourceLineIndex: 1,
    currentInstructionText: "NOP",
    lastInstructionKind: null,
    lastMemoryReadAddress: null,
    lastMemoryWriteAddress: null,
    lastRegisterWriteIndex: null,
    baseAddress: null,
    indexRegister: null,
    indexValue: null,
    effectiveAddress: null,
    memoryWindow: [],
    sourceRows: [],
    diagnostics: []
  };
}

describe("Phase 20B compatibility baseline", () => {
  it("wcasl_register_memory_and_clear_statuses_are_explicitly_updated", () => {
    expect(byId.get("registers.edit")?.currentStatus).toBe("compatible");
    expect(byId.get("memory.edit")?.currentStatus).toBe("compatible");
    expect(byId.get("loading.full-clear")?.currentStatus).toBe("intentionally-different");
    for (const id of ["registers.edit", "memory.edit", "loading.full-clear"]) {
      expect(byId.get(id)?.targetPhase).toBe("20B");
      expect(byId.get(id)?.tests.length).toBeGreaterThan(0);
    }
  });

  it("p0_p1_remain_complete_and_p2_missing_is_zero", () => {
    const incomplete = new Set(["missing", "partial", "blocked-needs-spec-evidence"]);
    expect(baseline.features.filter((feature) => feature.priority === "P0" && incomplete.has(feature.currentStatus))).toEqual([]);
    expect(baseline.features.filter((feature) => feature.priority === "P1" && incomplete.has(feature.currentStatus))).toEqual([]);
    expect(baseline.features.filter((feature) => feature.priority === "P2" && feature.currentStatus === "missing")).toEqual([]);
  });

  it("reverse_microcycle_linker_and_project_format_remain_out_of_scope", () => {
    expect(byId.get("modern.reverse-step")?.currentStatus).toBe("partial");
    expect(byId.get("comet.microcycle")?.currentStatus).toBe("partial");
    expect(byId.get("project.multi-source-link")?.currentStatus).toBe("partial");
    expect(byId.get("project.wcasl-format")?.currentStatus).toBe("blocked-needs-spec-evidence");
  });

  it("baseline_json_remains_deterministic_and_is_not_a_runtime_source", () => {
    expect(baselineSource).toBe(`${JSON.stringify(baseline, null, 2)}\n`);
    for (const file of [
      "src/store/useAppStore.tsx",
      "src/debugger/debuggerMutation.ts",
      "src/core/mockCaslCore.ts",
      "cpp-core/src/CometVm.cpp"
    ]) {
      expect(readFileSync(resolve(root, file), "utf8")).not.toContain("wcasl-compatibility-baseline-v1.json");
    }
  });
});

describe("Phase 20B transaction and security boundaries", () => {
  afterEach(() => setCoreAdapter(new MockCoreAdapter()));

  it("core_bridge_serializes_mutation_before_step", async () => {
    const calls: string[] = [];
    let releaseMutation!: () => void;
    const mutationGate = new Promise<void>((resolve) => { releaseMutation = resolve; });
    const dto = emptyDto();
    const adapter: CoreAdapter = {
      async assemble() {
        return { ok: true, state: dto, diagnostics: [] };
      },
      async reset() {
        return dto;
      },
      async step() {
        calls.push("step");
        return { ok: true, state: dto, diagnostics: [] };
      },
      async run() {
        return dto;
      },
      async getState() {
        return dto;
      },
      async mutateDebuggerState() {
        calls.push("mutation:start");
        await mutationGate;
        calls.push("mutation:end");
        return { status: "applied", previousWord: 0, nextWord: 1, state: dto };
      }
    };
    setCoreAdapter(adapter);
    const request: DebuggerMutationRequest = {
      mutationId: "transaction:test",
      sourceUnitId: "source:test" as SourceUnitId,
      assemblyId: "assembly:test",
      executionEpoch: 1,
      target: { kind: "general-register", register: "GR0" },
      nextWord: 1
    };
    const mutation = coreBridge.mutateDebuggerState(request);
    const step = coreBridge.step();
    await Promise.resolve();
    expect(calls).toEqual(["mutation:start"]);
    releaseMutation();
    await Promise.all([mutation, step]);
    expect(calls).toEqual(["mutation:start", "mutation:end", "step"]);
  });

  it("debugger_runtime_does_not_use_network_storage_or_html_injection", () => {
    const sources = [
      "src/debugger/debuggerMutation.ts",
      "src/components/DebuggerDialogs.tsx",
      "src/components/CaslCompatibilityMode.tsx",
      "src/store/useAppStore.tsx"
    ].map((file) => readFileSync(resolve(root, file), "utf8")).join("\n");
    expect(sources).not.toMatch(/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\b/);
    expect(sources).not.toContain("dangerouslySetInnerHTML");
    expect(sources).not.toContain("Reverse Step");
    expect(sources).not.toContain("comet-microcycle");
  });

  it("debugger_changes_do_not_add_a_persistence_key", () => {
    const persistence = readFileSync(resolve(root, "docs/persistence-baseline-v1.json"), "utf8");
    expect(persistence).not.toMatch(/debugger|runtime-override|execution-epoch/i);
  });
});
