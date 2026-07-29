import { afterEach, describe, expect, it } from "vitest";
import { WasmCoreAdapter } from "../../core/wasmCoreAdapter";
import type { LinkId, ModuleAssemblyId, ModuleId, ProjectId, ProjectLinkRequest } from "../types";

const adapters: WasmCoreAdapter[] = [];

afterEach(async () => {
  await Promise.all(adapters.splice(0).map((adapter) => adapter.dispose()));
});

function linkedRequest(): ProjectLinkRequest {
  return {
    projectId: "project:wasm" as ProjectId,
    linkId: "link:wasm:1" as LinkId,
    linkRevision: 1,
    mainModuleId: "module:main" as ModuleId,
    modules: [
      {
        moduleId: "module:main" as ModuleId,
        sourceUnitId: "source:main" as never,
        moduleAssemblyId: "assembly:main" as ModuleAssemblyId,
        displayName: "main.cas",
        source: "MAIN START\n CALL SUB\n RET\n END"
      },
      {
        moduleId: "module:sub" as ModuleId,
        sourceUnitId: "source:sub" as never,
        moduleAssemblyId: "assembly:sub" as ModuleAssemblyId,
        displayName: "sub.cas",
        source: "SUB START\n LAD GR1,#0042\n RET\n END"
      }
    ]
  };
}

describe("WASM linker bridge", () => {
  it("returns C++ linker metadata and executes the linked image", async () => {
    const adapter = new WasmCoreAdapter();
    adapters.push(adapter);
    const linked = await adapter.linkProject(linkedRequest());

    expect(linked.ok).toBe(true);
    expect(linked.link.placements).toEqual([
      { moduleId: "module:main", baseAddress: 0x20, wordCount: 3, endAddressExclusive: 0x23 },
      { moduleId: "module:sub", baseAddress: 0x23, wordCount: 3, endAddressExclusive: 0x26 }
    ]);
    expect(linked.link.words.slice(0, 3)).toEqual([0x8000, 0x23, 0x8100]);
    expect(linked.state).toMatchObject({
      projectId: "project:wasm",
      linkId: "link:wasm:1",
      linkRevision: 1,
      pr: 0x20
    });
    expect(linked.state.sourceRows.map((row) => row.moduleId)).toContain("module:sub");

    await adapter.step();
    expect((await adapter.getState()).pr).toBe(0x23);
    await adapter.step();
    expect((await adapter.getState()).gr[1]).toBe(0x42);
    await adapter.step();
    expect((await adapter.getState()).pr).toBe(0x22);
  });
});
