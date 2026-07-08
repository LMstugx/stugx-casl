import { describe, expect, it } from "vitest";
import { mockCaslCore } from "../core/mockCaslCore";
import { appStoreReducer, createInitialAppState, prepareSourceForCoreAssembly } from "../store/useAppStore";

const changedConstantsSource = `MAIN START
     LD    GR1,A
     ADDA  GR1,B
     ST    GR1,C
     RET
A    DC    1
B    DC    2
C    DS    1
     END`;

const changedLabelsSource = `MAIN START
     LD    GR1,X
     ADDA  GR1,Y
     ST    GR1,Z
     RET
X    DC    1
Y    DC    2
Z    DS    1
     END`;

const gr2Source = `MAIN START
     LD    GR2,X
     ADDA  GR2,Y
     ST    GR2,Z
     RET
X    DC    3
Y    DC    4
Z    DS    1
     END`;

describe("real source loop", () => {
  it("assemble_changed_constants uses edited DC values", () => {
    const state = mockCaslCore.assemble(changedConstantsSource);

    expect(state.runState).toBe("Ready");
    expect(state.symbols.A).toBe(0x27);
    expect(state.symbols.B).toBe(0x28);
    expect(state.memory[state.symbols.A]).toBe(0x0001);
    expect(state.memory[state.symbols.B]).toBe(0x0002);
  });

  it("assemble_changed_labels builds symbols and source map for X/Y/Z", () => {
    const state = mockCaslCore.assemble(changedLabelsSource);

    expect(state.runState).toBe("Ready");
    expect(state.symbols.X).toBe(0x27);
    expect(state.symbols.Y).toBe(0x28);
    expect(state.symbols.Z).toBe(0x29);
    expect(state.sourceMap).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ line: 6, address: 0x27, label: "X", machineWords: [0x0001] }),
        expect.objectContaining({ line: 7, address: 0x28, label: "Y", machineWords: [0x0002] }),
        expect.objectContaining({ line: 8, address: 0x29, label: "Z", machineWords: [0x0000] })
      ])
    );
  });

  it("execute_gr2_program updates GR2 and stores to Z", () => {
    let state = mockCaslCore.assemble(gr2Source);
    state = mockCaslCore.step(state);
    expect(state.gr[2]).toBe(0x0003);
    expect(state.gr[1]).toBe(0x0000);

    state = mockCaslCore.step(state);
    expect(state.gr[2]).toBe(0x0007);
    expect(state.gr[1]).toBe(0x0000);

    state = mockCaslCore.step(state);
    expect(state.memory[state.symbols.Z]).toBe(0x0007);
  });

  it("source_edit_invalidates_vm", () => {
    const initial = createInitialAppState();
    const assembled = mockCaslCore.assemble(changedConstantsSource);
    const ready = appStoreReducer(initial, {
      type: "assembled",
      sourceText: changedConstantsSource,
      cometState: assembled,
      assembleStatus: "success"
    });

    const dirty = appStoreReducer(ready, { type: "setSourceText", sourceText: changedConstantsSource.replace("DC    1", "DC    100") });

    expect(dirty.isSourceDirty).toBe(true);
    expect(dirty.assembleResult).toBeNull();
    expect(dirty.cometState.assembled).toBe(false);
    expect(dirty.cometState.runState).toBe("Dirty");
  });

  it("assemble_invalid_source reports diagnostics and prevents stepping", () => {
    const invalidRegister = mockCaslCore.assemble(`MAIN START
     LD GR8,A
A    DC 1
     END`);
    const undefinedLabel = mockCaslCore.assemble(`MAIN START
     LD GR1,MISSING
     RET
     END`);

    expect(invalidRegister.runState).toBe("Error");
    expect(invalidRegister.assembled).toBe(false);
    expect(invalidRegister.diagnostics.length).toBeGreaterThan(0);

    expect(undefinedLabel.runState).toBe("Error");
    expect(undefinedLabel.assembled).toBe(false);
    expect(undefinedLabel.diagnostics.length).toBeGreaterThan(0);
  });

  it("cpp_mode_assemble_uses_generated_casl", () => {
    const prepared = prepareSourceForCoreAssembly(`int main() {
    int a = 10;
    int b = 20;
    int c;
    c = a + b;
    return c;
}`, "cpp");

    expect(prepared.ok).toBe(true);
    expect(prepared.coreSourceText).toContain("     ADDA  GR1,B");
    expect(prepared.generatedCaslSource).toBe(prepared.coreSourceText);

    let state = mockCaslCore.assemble(prepared.coreSourceText);
    state = mockCaslCore.step(state);
    expect(state.currentInstruction).toContain("ADDA");
  });
});
