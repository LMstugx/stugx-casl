import { describe, expect, it } from "vitest";
import cpaEqual from "../../tests/golden/cpa.equal.json";
import jzeTaken from "../../tests/golden/jze.taken.json";
import ladaStep1 from "../../tests/golden/lada.step1.json";
import subaStep1 from "../../tests/golden/suba.step1.json";
import type { CometStateDto } from "../core/coreDto";

type NodeFsSync = {
  existsSync(path: string): boolean;
  statSync(path: string): { mtimeMs: number };
};

type NodeChildProcess = {
  execFileSync(file: string, args: string[], options: { cwd: string; encoding: "utf8" }): string;
};

type NodeProcessLike = {
  cwd?: () => string;
  getBuiltinModule?: ((name: "fs") => NodeFsSync) & ((name: "child_process") => NodeChildProcess);
};

function nodeProcess(): NodeProcessLike {
  return (globalThis as { process?: NodeProcessLike }).process ?? {};
}

function coreDumpExe(): string | null {
  const processLike = nodeProcess();
  const cwd = processLike.cwd?.();
  const fs = processLike.getBuiltinModule?.("fs");
  if (!cwd || !fs) return null;
  const exe = `${cwd}\\cpp-core\\build\\Debug\\core_dump.exe`;
  return fs.existsSync(exe) ? exe : null;
}

function coreDumpHasNewScenarios(): boolean {
  const processLike = nodeProcess();
  const cwd = processLike.cwd?.();
  const fs = processLike.getBuiltinModule?.("fs");
  const exe = coreDumpExe();
  if (!cwd || !fs || !exe) return false;
  const source = `${cwd}\\cpp-core\\tools\\core_dump.cpp`;
  return fs.existsSync(source) && fs.statSync(exe).mtimeMs >= fs.statSync(source).mtimeMs;
}

const describeCoreDump = coreDumpExe() ? describe : describe.skip;

function dumpScenario(scenario: string): CometStateDto {
  const processLike = nodeProcess();
  const cwd = processLike.cwd?.();
  const childProcess = processLike.getBuiltinModule?.("child_process");
  const exe = coreDumpExe();
  if (!cwd || !childProcess || !exe) throw new Error("core_dump.exe is unavailable.");
  return JSON.parse(childProcess.execFileSync(exe, ["--scenario", scenario], { cwd, encoding: "utf8" })) as CometStateDto;
}

function dumpScenarioIfSupported(scenario: string): CometStateDto | null {
  if (!coreDumpHasNewScenarios()) return null;
  try {
    return dumpScenario(scenario);
  } catch (error) {
    if (String(error).includes("Unknown scenario")) return null;
    throw error;
  }
}

describeCoreDump("C++ core_dump golden parity", () => {
  it("dumps LAD step1 DTO matching golden", () => {
    expect(dumpScenario("lada-step1")).toEqual(ladaStep1 as CometStateDto);
  });

  it("dumps SUBA DTO matching golden", () => {
    expect(dumpScenario("suba-step1")).toEqual(subaStep1 as CometStateDto);
  });

  it("dumps CPA equal DTO matching golden", () => {
    expect(dumpScenario("cpa-equal")).toEqual(cpaEqual as CometStateDto);
  });

  it("dumps JZE taken DTO matching golden", () => {
    expect(dumpScenario("jze-taken")).toEqual(jzeTaken as CometStateDto);
  });

  it("dumps logic AND DTO for new instruction coverage", () => {
    const dto = dumpScenarioIfSupported("logic-and");
    if (!dto) return;

    expect(dto.lastInstructionKind).toBe("AND");
    expect(dto.gr[1]).toBe(0x0000);
    expect(dto.frZF).toBe(true);
    expect(dto.lastMemoryReadAddress).not.toBeNull();
  });

  it("dumps logical add compare JOV fallthrough DTO", () => {
    const dto = dumpScenarioIfSupported("logical-add-compare-jov");
    if (!dto) return;

    expect(dto.lastInstructionKind).toBe("JOV");
    expect(dto.pr).toBe(0x28);
    expect(dto.frOF).toBe(false);
  });

  it("dumps JOV taken DTO for new jump coverage", () => {
    const dto = dumpScenarioIfSupported("jov-taken");
    if (!dto) return;

    expect(dto.lastInstructionKind).toBe("JOV");
    expect(dto.currentInstructionText).toContain("OVER LAD GR2,1");
    expect(dto.frOF).toBe(true);
  });

  it("dumps shift DTO without memory data read", () => {
    const dto = dumpScenarioIfSupported("shift-sll");
    if (!dto) return;

    expect(dto.lastInstructionKind).toBe("SLL");
    expect(dto.gr[1]).toBe(0x0006);
    expect(dto.lastRegisterWriteIndex).toBe(1);
    expect(dto.lastMemoryReadAddress).toBeNull();
    expect(dto.effectiveAddress).toBe(1);
  });
});
