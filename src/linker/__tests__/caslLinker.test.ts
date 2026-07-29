import { describe, expect, it } from "vitest";
import { MockCoreAdapter } from "../../core/mockCoreAdapter";
import { linkCaslProject } from "../caslLinker";
import type {
  LinkId,
  ModuleAssemblyId,
  ModuleId,
  ProjectId,
  ProjectLinkRequest
} from "../types";

const mainSource = `MAIN START
      CALL SUB
      RET
      END`;

const subSource = `SUB START
      LAD GR1,#0042
      RET
DATA  DC 1
      END`;

function request(sources = [mainSource, subSource]): ProjectLinkRequest {
  return {
    projectId: "project:test" as ProjectId,
    linkId: "link:test:1" as LinkId,
    linkRevision: 1,
    mainModuleId: "module:main" as ModuleId,
    modules: sources.map((source, index) => ({
      moduleId: (index === 0 ? "module:main" : `module:sub:${index}`) as ModuleId,
      sourceUnitId: (index === 0 ? "source:main" : `source:sub:${index}`) as never,
      moduleAssemblyId: `assembly:${index}` as ModuleAssemblyId,
      displayName: index === 0 ? "main.cas" : `sub${index}.cas`,
      source
    }))
  };
}

describe("deterministic CASL multi-program linker", () => {
  it("assembles modules independently and resolves only the CALL address word", () => {
    const result = linkCaslProject(request());
    expect(result.ok).toBe(true);
    expect(result.placements).toEqual([
      { moduleId: "module:main", baseAddress: 0x20, wordCount: 3, endAddressExclusive: 0x23 },
      { moduleId: "module:sub:1", baseAddress: 0x23, wordCount: 4, endAddressExclusive: 0x27 }
    ]);
    expect(result.words.slice(0, 3)).toEqual([0x8000, 0x0023, 0x8100]);
    expect(result.relocations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        moduleId: "module:main",
        kind: "call-target",
        linkedAddress: 0x21,
        targetModuleId: "module:sub:1",
        resolvedAddress: 0x23
      })
    ]));
  });

  it("allows local labels to repeat in different modules", () => {
    const withLocal = `SUB START
LOOP  NOP
      RET
      END`;
    const result = linkCaslProject(request([mainSource, withLocal, withLocal.replace("SUB START", "ALT START")]));
    expect(result.ok).toBe(true);
    expect(result.exportedSymbols.map((symbol) => symbol.name)).toEqual(["MAIN", "SUB", "ALT"]);
    expect(result.moduleAssemblies.flatMap((assembly) =>
      assembly.localSymbols.filter((symbol) => symbol.name === "LOOP")
    )).toHaveLength(2);
  });

  it("reports duplicate exports and unresolved external programs without committing words", () => {
    const duplicate = linkCaslProject(request([mainSource, subSource, subSource]));
    expect(duplicate.ok).toBe(false);
    expect(duplicate.words).toEqual([]);
    expect(duplicate.diagnostics.some((diagnostic) => diagnostic.code === "linker.duplicateExportedProgram")).toBe(true);

    const unresolved = linkCaslProject(request([mainSource, subSource.replace("SUB START", "OTHER START")]));
    expect(unresolved.ok).toBe(false);
    expect(unresolved.words).toEqual([]);
    expect(unresolved.diagnostics.some((diagnostic) => diagnostic.code === "linker.unresolvedExternalSymbol")).toBe(true);
  });

  it("loads the linked image into the Mock runtime and executes a real cross-module CALL/RET", async () => {
    const adapter = new MockCoreAdapter();
    const linked = await adapter.linkProject(request());
    expect(linked.ok).toBe(true);
    expect(linked.state.projectId).toBe("project:test");
    expect(linked.state.linkId).toBe("link:test:1");

    await adapter.step();
    expect((await adapter.getState()).pr).toBe(0x23);
    await adapter.step();
    expect((await adapter.getState()).gr[1]).toBe(0x42);
    await adapter.step();
    expect((await adapter.getState()).pr).toBe(0x22);
  });

  it("keeps a one-module link word-for-word equal to ordinary assembly", async () => {
    const source = `MAIN START
      LAD GR1,#1234
      ST GR1,DATA
      RET
DATA  DS 1
      END`;
    const single = request([source]);
    const linked = linkCaslProject(single);
    const adapter = new MockCoreAdapter();
    const assembled = await adapter.assemble(source);
    expect(linked.ok).toBe(true);
    expect(linked.words).toEqual(
      assembled.state.sourceRows.flatMap((row) => row.machineWords)
    );
  });
});
