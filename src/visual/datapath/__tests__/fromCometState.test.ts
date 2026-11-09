import { describe, expect, it } from "vitest";
import { toCometStateDto } from "../../../core/coreDto";
import { createCometStateFromDto } from "../../../core/coreStateAdapter";
import { mockCaslCore } from "../../../core/mockCaslCore";
import type { CometState } from "../../../core/types";
import { VisualPathKind } from "../../../core/types";
import { demoPrograms } from "../../../examples/demoPrograms";
import { resolveActiveWires, toDatapathViewModel } from "../fromCometState";
import { MEMORY_VISIBLE_ROWS, resolvePath } from "../geometry";
import type { DatapathViewModel } from "../model";

/**
 * These tests carry over what the old circuit tests protected: which path is active for which
 * instruction and phase is decided by the runtime state, and the datapath shows exactly that.
 */

const SIMPLE = `MAIN START
     LD    GR1,A
     ADDA  GR1,B
     ST    GR1,C
     RET
A    DC    5
B    DC    6
C    DS    1
     END`;

const BRANCH = `MAIN START
     LAD   GR1,0
     CPA   GR1,ZERO
     JNZ   SKIP
     JZE   TAKEN
SKIP LAD   GR2,1
TAKEN RET
ZERO DC    0
     END`;

/**
 * One run of the core, seen the way the application sees it: every core state goes through the
 * DTO and the UI-state projection, chained to the previous UI state, exactly like the store does.
 */
interface Run {
  core: CometState;
  ui: CometState;
  previous?: CometState;
}

function start(source: string): Run {
  const core = mockCaslCore.assemble(source);
  return { core, ui: createCometStateFromDto(toCometStateDto(core)) };
}

function advance(run: Run, core: CometState): Run {
  return { core, ui: createCometStateFromDto(toCometStateDto(core), { previous: run.ui }), previous: run.ui };
}

function stepTimes(run: Run, count: number): Run {
  let next = run;
  for (let index = 0; index < count; index += 1) next = advance(next, mockCaslCore.step(next.core));
  return next;
}

function microUntil(run: Run, phase: string, kind?: string): Run {
  let next = run;
  for (let guard = 0; guard < 200; guard += 1) {
    next = advance(next, mockCaslCore.microStep(next.core));
    if (next.ui.microcycle.phase === phase && (kind === undefined || next.ui.microcycle.instructionKind === kind)) return next;
  }
  throw new Error(`phase ${phase} of ${kind ?? "any instruction"} was not reached`);
}

function modelOf(run: Run, withPrevious = false): DatapathViewModel {
  return toDatapathViewModel(run.ui, withPrevious ? { previous: run.previous } : {});
}

function pathIds(model: DatapathViewModel): string[] {
  return model.activePaths.map((path) => path.id).sort();
}

function isRunning(run: Run): boolean {
  return run.ui.runState !== "Finished" && run.ui.runState !== "Error" && run.ui.runState !== "WaitingInput";
}

describe("instruction steps show the paths the runtime reports", () => {
  const ready = start(SIMPLE);

  it("ready shows PR selecting the first address", () => {
    expect(ready.ui.visualPath).toBe(VisualPathKind.Ready_PrToMar);
    const model = modelOf(ready);
    expect(pathIds(model)).toEqual(["mux-to-mar", "pr-to-mux"]);
    expect(model.mux.selected).toBe("pr");
    expect(model.alu.operator).toBeNull();
    expect(model.memory.pins).toEqual({ adr: false, rd: false, wr: false, data: false });
  });

  it("LD moves a memory word through MDR into the register", () => {
    const model = modelOf(stepTimes(ready, 1), true);
    expect(pathIds(model)).toEqual(["mar-to-memory", "mdr-to-gr", "memory-to-mdr"]);
    expect(model.activePaths.find((path) => path.id === "mdr-to-gr")?.grIndex).toBe(1);
    expect(model.gr[1]).toEqual({ value: 5, state: "changed", previous: 0 });
    const read = model.memory.rows.filter((row) => row.access === "read");
    expect(read.map((row) => [row.label, row.value])).toEqual([["A", 5]]);
    expect(model.memory.pins).toEqual({ adr: true, rd: true, wr: false, data: true });
    expect(model.alu.operator).toBeNull();
    expect(model.assertedControlLines).toEqual(["gr-write", "mem-read"]);
  });

  it("ADDA sends the register and MDR through the ALU and updates the flags", () => {
    const model = modelOf(stepTimes(ready, 2), true);
    expect(pathIds(model)).toEqual(["alu-to-fr", "alu-to-gr", "gr-to-alu-a", "mar-to-memory", "mdr-to-alu-b", "memory-to-mdr"]);
    expect(model.alu.operator).toBe("+");
    expect(model.gr[1]).toEqual({ value: 11, state: "changed", previous: 5 });
    // Input A carries the value the register had before the ALU rewrote it.
    expect(model.activePaths.find((path) => path.id === "gr-to-alu-a")?.value).toBe(5);
    expect(model.activePaths.find((path) => path.id === "mdr-to-alu-b")?.value).toBe(6);
    expect(model.activePaths.find((path) => path.id === "alu-to-gr")?.value).toBe(11);
    expect(model.assertedControlLines).toEqual(["gr-select", "alu-op", "gr-write", "fr-write", "mem-read"]);
  });

  it("ST moves the register through MDR into the memory word", () => {
    const model = modelOf(stepTimes(ready, 3), true);
    expect(pathIds(model)).toEqual(["gr-to-mdr", "mar-to-memory", "mdr-to-memory"]);
    const written = model.memory.rows.filter((row) => row.access === "write");
    expect(written.map((row) => [row.label, row.value])).toEqual([["C", 11]]);
    expect(model.memory.pins).toEqual({ adr: true, rd: false, wr: true, data: true });
    expect(model.alu.operator).toBeNull();
  });

  it("a finished program shows no path at all", () => {
    const finished = stepTimes(ready, 4);
    expect(finished.ui.runState).toBe("Finished");
    const model = modelOf(finished);
    expect(model.activePaths).toEqual([]);
    expect(model.assertedControlLines).toEqual([]);
    expect(model.activeParts).toEqual([]);
  });

  it("without the previous state a rewritten value is marked but claims no earlier value", () => {
    const model = modelOf(stepTimes(ready, 1));
    expect(model.gr[1]).toEqual({ value: 5, state: "changed" });
    expect(model.mdr.previous).toBeUndefined();
  });
});

describe("microcycle steps show one phase at a time", () => {
  const ready = start(SIMPLE);

  it("fetch reads the instruction word", () => {
    expect(pathIds(modelOf(microUntil(ready, "fetch", "LD")))).toEqual(["mar-to-memory", "memory-to-mdr", "mux-to-mar", "pr-to-mux"]);
  });

  it("decode goes from IR through the decoder to the controller", () => {
    const model = modelOf(microUntil(ready, "decode", "LD"));
    expect(pathIds(model)).toEqual(["decoder-to-controller", "ir-to-decoder"]);
    expect(model.decoder?.opText).toBe("LD");
    expect(model.decoder?.rText).toBe("GR1");
    expect(model.decoder?.adrText).toBe("A");
  });

  it("effective address without an index register does not light the register bus", () => {
    const state = microUntil(ready, "effective-address", "LD");
    const model = modelOf(state);
    expect(pathIds(model)).toEqual(["decoder-to-ea", "ea-to-mux", "mux-to-mar"]);
    expect(model.mux.selected).toBe("ea");
    expect(model.ea.value).toBe(state.ui.lastEffectiveAddress);
  });

  it("operand read, write-back, and flag update are separate", () => {
    const read = microUntil(ready, "operand-read", "LD");
    expect(pathIds(modelOf(read))).toEqual(["mar-to-memory", "memory-to-mdr"]);
    const writeBack = microUntil(read, "write-back", "LD");
    const model = modelOf(writeBack, true);
    expect(pathIds(model)).toEqual(["mdr-to-gr"]);
    expect(model.gr[1]).toEqual({ value: 5, state: "changed", previous: 0 });
    const flags = microUntil(writeBack, "flag-update", "LD");
    expect(pathIds(modelOf(flags))).toEqual(["alu-to-fr"]);
  });

  it("ADDA execute feeds the ALU, and only write-back rewrites the register", () => {
    const execute = microUntil(ready, "execute", "ADDA");
    const executeModel = modelOf(execute);
    expect(pathIds(executeModel)).toEqual(["gr-to-alu-a", "mdr-to-alu-b"]);
    expect(executeModel.alu.operator).toBe("+");
    expect(executeModel.gr[1].state).toBe("selected");
    const writeBack = microUntil(execute, "write-back", "ADDA");
    expect(pathIds(modelOf(writeBack))).toEqual(["alu-to-gr"]);
  });

  it("ST execute loads MDR and write-back writes memory", () => {
    const execute = microUntil(ready, "execute", "ST");
    expect(pathIds(modelOf(execute))).toEqual(["gr-to-mdr"]);
    const writeBack = microUntil(execute, "write-back", "ST");
    const model = modelOf(writeBack);
    expect(pathIds(model)).toEqual(["gr-to-mdr", "mar-to-memory", "mdr-to-memory"]);
    expect(model.memory.rows.filter((row) => row.access === "write").map((row) => row.label)).toEqual(["C"]);
  });
});

describe("jumps move the address into PR only when taken", () => {
  const ready = start(BRANCH);

  it("a conditional jump that is not taken shows no route into PR", () => {
    const notTaken = microUntil(ready, "execute", "JNZ");
    expect(resolveActiveWires(notTaken.ui).has("eau-to-pr")).toBe(false);
    expect(pathIds(modelOf(notTaken))).toEqual([]);
  });

  it("a conditional jump that is taken shows the effective address entering PR", () => {
    const taken = microUntil(ready, "execute", "JZE");
    const model = modelOf(taken);
    expect(pathIds(model)).toEqual(["ea-to-pr"]);
    expect(model.activePaths[0].value).toBe(taken.ui.pr);
  });
});

describe("every state of every built-in CASL program can be drawn", () => {
  const programs = demoPrograms.filter((program) => program.mode === "casl");

  function checkModel(state: CometState, context: string): void {
    const model = toDatapathViewModel(state);
    expect(model.gr, context).toHaveLength(8);
    expect(model.memory.rows.length, context).toBe(MEMORY_VISIBLE_ROWS);
    // No route is dropped: every index the runtime implies is inside the picture.
    for (const path of model.activePaths) expect(resolvePath(path.id, path), `${context} ${path.id}`).not.toBeNull();
    // Stages are consecutive from 0.
    const stages = [...new Set(model.activePaths.map((path) => path.stage ?? 0))].sort((a, b) => a - b);
    expect(stages, context).toEqual(stages.map((_, index) => index));
    // Memory is never read and written by the same step.
    expect(model.memory.pins.rd && model.memory.pins.wr, context).toBe(false);
    // The word being read or written is always visible.
    if (model.memory.pins.rd) expect(model.memory.rows.some((row) => row.access === "read"), context).toBe(true);
    if (model.memory.pins.wr) expect(model.memory.rows.some((row) => row.access === "write"), context).toBe(true);
    if (state.runState === "Finished") expect(model.activePaths, context).toEqual([]);
  }

  it("lists at least the eight CASL examples", () => {
    expect(programs.length).toBeGreaterThanOrEqual(8);
  });

  for (const program of programs) {
    it(`${program.id}: instruction steps`, () => {
      let run = start(program.source);
      expect(run.ui.assembled, program.id).toBe(true);
      checkModel(run.ui, `${program.id} ready`);
      for (let step = 0; step < 400 && isRunning(run); step += 1) {
        run = advance(run, mockCaslCore.step(run.core));
        checkModel(run.ui, `${program.id} step ${step + 1}`);
      }
      expect(run.ui.runState, program.id).toBe("Finished");
    });

    it(`${program.id}: microcycle steps`, () => {
      let run = start(program.source);
      for (let step = 0; step < 3000 && isRunning(run); step += 1) {
        run = advance(run, mockCaslCore.microStep(run.core));
        checkModel(run.ui, `${program.id} microstep ${step + 1} ${run.ui.microcycle.instructionKind ?? ""} ${run.ui.microcycle.phase}`);
      }
      expect(run.ui.runState, program.id).toBe("Finished");
    });
  }
});
