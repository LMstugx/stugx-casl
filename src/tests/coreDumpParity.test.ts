import { describe, expect, it } from "vitest";
import cpaEqual from "../../tests/golden/cpa.equal.json";
import jzeTaken from "../../tests/golden/jze.taken.json";
import ladaStep1 from "../../tests/golden/lada.step1.json";
import subaStep1 from "../../tests/golden/suba.step1.json";
import type { CometStateDto } from "../core/coreDto";

type NodeFsSync = {
  existsSync(path: string): boolean;
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

const describeCoreDump = coreDumpExe() ? describe : describe.skip;

function dumpScenario(scenario: string): CometStateDto {
  const processLike = nodeProcess();
  const cwd = processLike.cwd?.();
  const childProcess = processLike.getBuiltinModule?.("child_process");
  const exe = coreDumpExe();
  if (!cwd || !childProcess || !exe) throw new Error("core_dump.exe is unavailable.");
  return JSON.parse(childProcess.execFileSync(exe, ["--scenario", scenario], { cwd, encoding: "utf8" })) as CometStateDto;
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
});
