import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MockCoreAdapter } from "../core/mockCoreAdapter";
import { mockCaslCore } from "../core/mockCaslCore";
import type { CometState } from "../core/types";
import type {
  LinkId,
  ModuleAssemblyId,
  ModuleId,
  ProjectId,
  ProjectLinkRequest
} from "../linker/types";

type ExpectedState = {
  runState: "Finished";
  registers?: Record<string, string>;
  memory?: Array<{ label: string; offset: number; value: string }>;
  flags?: { OF: boolean; SF: boolean; ZF: boolean };
  sp?: string;
  console?: string[];
};

type ClassroomModule = {
  moduleId: string;
  sourceUnitId: string;
  moduleAssemblyId: string;
  displayName: string;
  source: string;
};

type ClassroomProgram = {
  id: string;
  title: string;
  category: string;
  source?: string;
  input?: string;
  modules?: ClassroomModule[];
  mainModuleId?: string;
  expected: ExpectedState;
  teachingPoint: string;
};

type CompatibilityFeature = {
  currentStatus: string;
  priority: "P0" | "P1" | "P2";
};

type CompatibilityBaseline = {
  finalGate: {
    decision: "PASS" | "PASS_WITH_LIMITATIONS" | "BLOCKED";
    evaluatedBaselineCommit: string;
    featureCounts: Record<string, number>;
    gapCounts: Record<"P0" | "P1" | "P2" | "P3", number>;
    limitations: string[];
  };
  features: CompatibilityFeature[];
};

const root = resolve(".");
const baselineSource = readFileSync(resolve(root, "docs/wcasl-compatibility-baseline-v1.json"), "utf8").replace(/\r\n/g, "\n");
const baseline = JSON.parse(baselineSource) as CompatibilityBaseline;
const corpusSource = readFileSync(resolve(root, "src/tests/fixtures/classroom-demo-programs-v1.json"), "utf8").replace(/\r\n/g, "\n");
const corpus = JSON.parse(corpusSource) as {
  schemaVersion: number;
  copyrightPolicy: string;
  programs: ClassroomProgram[];
};
const gapStatuses = new Set(["missing", "partial", "blocked-needs-spec-evidence"]);
const officialInstructions = [
  "NOP", "LD", "ST", "LAD", "ADDA", "SUBA", "ADDL", "SUBL", "AND", "OR", "XOR",
  "CPA", "CPL", "SLA", "SRA", "SLL", "SRL", "JMI", "JNZ", "JZE", "JUMP", "JPL",
  "JOV", "PUSH", "POP", "CALL", "RET", "SVC"
];

function word(value: string) {
  return Number.parseInt(value, 16);
}

function executeSingleProgram(program: ClassroomProgram): CometState {
  let state = mockCaslCore.assemble(program.source!);
  expect(state.runState, program.id).toBe("Ready");
  let inputSubmitted = false;
  for (let steps = 0; steps < 2000; steps += 1) {
    if (state.runState === "WaitingInput") {
      expect(program.input, `${program.id} requires declared input`).toBeDefined();
      expect(inputSubmitted, `${program.id} requested input more than once`).toBe(false);
      state = mockCaslCore.enqueueInput(state, Array.from(program.input!, (character) => character.codePointAt(0)!));
      inputSubmitted = true;
      continue;
    }
    if (state.runState === "Finished" || state.runState === "Error") break;
    state = mockCaslCore.step(state);
  }
  return state;
}

function expectSingleResult(program: ClassroomProgram, state: CometState) {
  expect(state.runState, program.id).toBe(program.expected.runState);
  for (const [register, expected] of Object.entries(program.expected.registers ?? {})) {
    const index = Number.parseInt(register.slice(2), 10);
    expect(state.gr[index], `${program.id}:${register}`).toBe(word(expected));
  }
  for (const expected of program.expected.memory ?? []) {
    const base = state.symbols[expected.label];
    expect(base, `${program.id}:${expected.label}`).toBeDefined();
    expect(state.memory[base + expected.offset], `${program.id}:${expected.label}+${expected.offset}`).toBe(word(expected.value));
  }
  if (program.expected.flags) {
    expect(state.fr).toEqual({
      o: program.expected.flags.OF,
      n: program.expected.flags.SF,
      z: program.expected.flags.ZF
    });
  }
  if (program.expected.sp) expect(state.sp, `${program.id}:SP`).toBe(word(program.expected.sp));
  if (program.expected.console) expect(state.consoleOutput, `${program.id}:console`).toEqual(program.expected.console);
}

async function executeLinkedProgram(program: ClassroomProgram) {
  const request: ProjectLinkRequest = {
    projectId: "project:phase20g-corpus" as ProjectId,
    linkId: "link:phase20g-corpus:1" as LinkId,
    linkRevision: 1,
    mainModuleId: program.mainModuleId as ModuleId,
    modules: program.modules!.map((module) => ({
      moduleId: module.moduleId as ModuleId,
      sourceUnitId: module.sourceUnitId as never,
      moduleAssemblyId: module.moduleAssemblyId as ModuleAssemblyId,
      displayName: module.displayName,
      source: module.source
    }))
  };
  const adapter = new MockCoreAdapter();
  const linked = await adapter.linkProject(request);
  expect(linked.ok, program.id).toBe(true);
  const state = await adapter.run(200);
  expect(state.runState, program.id).toBe(program.expected.runState);
  for (const [register, expected] of Object.entries(program.expected.registers ?? {})) {
    expect(state.gr[Number.parseInt(register.slice(2), 10)], `${program.id}:${register}`).toBe(word(expected));
  }
  if (program.expected.sp) expect(state.sp, `${program.id}:SP`).toBe(word(program.expected.sp));
}

describe("Phase 20G WCASL replacement final gate", () => {
  it("final_gate_manifest_exists", () => {
    expect(baseline.finalGate).toBeDefined();
    expect(readFileSync("docs/wcasl-replacement-final-gate.md", "utf8")).toContain("# WCASL Replacement Final Gate");
  });

  it("final_gate_has_decision", () => {
    expect(baseline.finalGate.decision).toBe("PASS_WITH_LIMITATIONS");
    expect(baseline.finalGate.evaluatedBaselineCommit).toBe("1c43887abce860535c040c5e7927c38eb3089aa5");
  });

  it("final_gate_blocks_if_p0_gap_exists", () => {
    const p0Gaps = baseline.features.filter((feature) => feature.priority === "P0" && gapStatuses.has(feature.currentStatus));
    expect(p0Gaps).toEqual([]);
    expect(baseline.finalGate.gapCounts.P0).toBe(0);
  });

  it("final_gate_lists_limitations", () => {
    expect(baseline.finalGate.limitations).toHaveLength(5);
    expect(baseline.finalGate.limitations.join("\n")).toMatch(/proprietary WCASL project format/);
  });

  it("compatibility_counts_are_consistent", () => {
    const statuses = ["exact", "compatible", "superset", "partial", "missing", "intentionally-different", "not-applicable", "blocked-needs-spec-evidence"];
    expect(baseline.finalGate.featureCounts.total).toBe(baseline.features.length);
    for (const status of statuses) {
      expect(baseline.finalGate.featureCounts[status], status).toBe(
        baseline.features.filter((feature) => feature.currentStatus === status).length
      );
    }
    for (const priority of ["P0", "P1", "P2"] as const) {
      expect(baseline.finalGate.gapCounts[priority], priority).toBe(
        baseline.features.filter((feature) => feature.priority === priority && gapStatuses.has(feature.currentStatus)).length
      );
    }
    expect(baseline.finalGate.gapCounts.P3).toBe(0);
  });

  it("official_instruction_coverage_complete", () => {
    const matrix = JSON.parse(readFileSync("docs/comet-instruction-cycle-matrix-v1.json", "utf8")) as {
      instructions: Array<{ mnemonic: string }>;
    };
    expect(matrix.instructions.map((entry) => entry.mnemonic).sort()).toEqual([...officialInstructions].sort());
    expect(readFileSync("docs/final-casl-comet-conformance-report.md", "utf8")).toContain("All 28 machine instructions");
  });

  it("no_public_cf_regression", () => {
    expect(readFileSync("scripts/verify-deployed-pages.mjs", "utf8")).toContain("pages.dev");
    expect(readFileSync("tests/e2e/deployed-smoke.spec.ts", "utf8")).toContain("WASM Core");
  });

  it("macros_final_regression_passes", () => {
    const macroPrograms = corpus.programs.filter((program) => ["in-out", "rpush-rpop", "teacher-prg0205-style-in-out"].includes(program.category));
    expect(macroPrograms).toHaveLength(3);
    for (const program of macroPrograms) expectSingleResult(program, executeSingleProgram(program));
  }, 30_000);

  it("classroom_demo_corpus_runs", async () => {
    expect(corpus.schemaVersion).toBe(1);
    expect(corpus.programs).toHaveLength(18);
    expect(new Set(corpus.programs.map((program) => program.id)).size).toBe(18);
    expect(corpusSource).toBe(`${JSON.stringify(corpus, null, 2)}\n`);
    for (const program of corpus.programs) {
      expect(program.teachingPoint.length, program.id).toBeGreaterThan(20);
      if (program.modules) await executeLinkedProgram(program);
      else expectSingleResult(program, executeSingleProgram(program));
    }
  }, 60_000);

  it("teacher_demo_script_exists", () => {
    for (const path of ["docs/demo/teacher-demo-script-ja.md", "docs/demo/teacher-demo-script-zh-cn.md"]) {
      const content = readFileSync(path, "utf8");
      expect(content).toContain("https://stugx-casl.pages.dev/");
      expect(content).toMatch(/COMET Mode/);
      expect(content).toMatch(/Multi-program|多程序/);
    }
  });

  it("first_year_usability_check_exists", () => {
    const content = readFileSync("docs/first-year-usability-check.md", "utf8");
    expect(content).toContain("PASS_WITH_LIMITATIONS");
    expect(content).toContain("not a completed moderated study");
  });

  it("known_limitations_are_explicit", () => {
    const content = [
      readFileSync("docs/user/known-limitations.md", "utf8"),
      readFileSync("docs/reference/known-limitations.md", "utf8")
    ].join("\n");
    for (const limitation of ["proprietary WCASL project", "project file", "Redo", "Reverse Run", "Reverse Macro", "dynamic linking", "double arithmetic"]) {
      expect(content, limitation).toMatch(new RegExp(limitation, "i"));
    }
  });

  it("README_does_not_claim_official_status", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain("independent, unofficial");
    expect(readme).not.toMatch(/\bofficial WCASL\b/i);
    expect(readme).not.toMatch(/\bofficial school (?:tool|product)\b/i);
  });

  it("README_does_not_claim_proprietary_project_support", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain("not a WCASL binary or project-format clone");
    expect(readme).toContain("proprietary WCASL project import");
  });

  it("public_docs_link_to_site", () => {
    for (const path of ["README.md", "docs/user/getting-started.md", "docs/wcasl-replacement-final-gate.md"]) {
      expect(readFileSync(path, "utf8"), path).toContain("https://stugx-casl.pages.dev/");
    }
  });

  it("no_new_network_request", () => {
    const changed = execFileSync("git", ["diff", "--name-only", "multi-program-linker-baseline-phase20f", "--", "src"], { encoding: "utf8" })
      .trim().split(/\r?\n/).filter(Boolean);
    expect(changed.filter((path) => path.startsWith("src/") && !path.startsWith("src/tests/"))).toEqual([]);
  });

  it("no_new_persistence_key", () => {
    const persistence = JSON.parse(readFileSync("docs/persistence-baseline-v1.json", "utf8")) as {
      storageKeys: Record<string, string>;
    };
    expect(persistence.storageKeys).toEqual({
      locale: "stugx.casl.locale",
      applicationPreferences: "stugx.casl.preferences.v1",
      startupSelection: "stugx.casl.startup-selection.v1",
      lessonProgress: "stugx.casl.lesson-progress.v1"
    });
  });

  it("Cloudflare_demo_smoke_passes", () => {
    const gate = readFileSync("docs/wcasl-replacement-final-gate.md", "utf8");
    expect(gate).toContain("1c43887abce860535c040c5e7927c38eb3089aa5");
    expect(gate).toContain("Cloudflare host checks confirm");
    expect(readFileSync("package.json", "utf8")).toContain("\"test:e2e:deployed\"");
  });

  it("Web_WASM_Tauri_parity_remains", () => {
    const report = readFileSync("docs/wcasl-replacement-final-gate.md", "utf8");
    expect(report).toContain("Unit, Web, WASM, C++ Core, production bundle, visual, stress, and Tauri validation pass");
  });

  it("no_build_artifacts", () => {
    const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).trim().split(/\r?\n/);
    const prohibited = tracked.filter((path) =>
      /(^|\/)(dist|target|artifacts|coverage)(\/|$)/i.test(path)
      || /(^|\/)\.env($|\.)/i.test(path)
      || /\.(exe|msi|msix|dmg|app|map)$/i.test(path)
    );
    expect(prohibited).toEqual([]);
  });

  it("final_visual_scenarios_are_confirmed", () => {
    const visual = readFileSync("docs/visual-review.md", "utf8");
    for (const id of [
      "final-getting-started-1180",
      "final-casl-mode-1280",
      "final-comet-mode-fetch-1280",
      "final-unified-workspace-1440",
      "final-reverse-microstep-1440",
      "final-reverse-instruction-1440",
      "final-in-out-workflow-1280",
      "final-multi-program-linker-1440",
      "final-ja-classroom-1180",
      "final-zh-cn-1180",
      "final-en-1180"
    ]) expect(visual).toContain(id);
  });
});
