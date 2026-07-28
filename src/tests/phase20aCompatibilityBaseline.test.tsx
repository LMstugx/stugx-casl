import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CaslCompatibilityMode from "../components/CaslCompatibilityMode";
import { mockCaslCore } from "../core/mockCaslCore";
import { I18nProvider } from "../i18n/I18nProvider";

type CompatibilityFeature = {
  featureId: string;
  currentStatus: string;
  priority: "P0" | "P1" | "P2";
  evidenceReference: string;
  tests: string[];
};

const root = resolve(".");
const baselinePath = resolve(root, "docs/wcasl-compatibility-baseline-v1.json");
const cyclePath = resolve(root, "docs/comet-instruction-cycle-matrix-v1.json");
const baselineSource = readFileSync(baselinePath, "utf8").replace(/\r\n/g, "\n");
const baseline = JSON.parse(baselineSource) as {
  featureCategories: string[];
  features: CompatibilityFeature[];
};
const cycleSource = readFileSync(cyclePath, "utf8").replace(/\r\n/g, "\n");
const cycle = JSON.parse(cycleSource) as {
  runtimeEnabled: boolean;
  instructions: Array<{
    mnemonic: string;
    operandProfiles: string[];
    cyclePhases: string[];
    memoryAccess: string;
    sourceMapping: string;
    forbiddenFakeNodes: string[];
  }>;
  macroPolicy: { macros: string[] };
};

const officialMachineInstructions = [
  "NOP", "LD", "ST", "LAD", "ADDA", "SUBA", "ADDL", "SUBL", "AND", "OR", "XOR",
  "CPA", "CPL", "SLA", "SRA", "SLL", "SRL", "JMI", "JNZ", "JZE", "JUMP", "JPL",
  "JOV", "PUSH", "POP", "CALL", "RET", "SVC"
];

describe("Phase 20A compatibility baseline", () => {
  it("wcasl_baseline_manifest_exists", () => {
    expect(baseline.features.length).toBeGreaterThan(40);
    expect(baseline.featureCategories).toHaveLength(20);
  });

  it("every_audited_feature_has_status", () => {
    expect(baseline.features.every((feature) => Boolean(feature.featureId && feature.currentStatus))).toBe(true);
    expect(new Set(baseline.features.map((feature) => feature.featureId)).size).toBe(baseline.features.length);
  });

  it("no_p0_feature_is_unclassified", () => {
    const rejected = new Set(["missing", "partial", "blocked-needs-spec-evidence"]);
    expect(baseline.features.filter((feature) => feature.priority === "P0").every((feature) => !rejected.has(feature.currentStatus))).toBe(true);
  });

  it("p1_features_are_admitted", () => {
    const admitted = new Set(["exact", "compatible", "superset"]);
    expect(baseline.features.filter((feature) => feature.priority === "P1").every((feature) => admitted.has(feature.currentStatus))).toBe(true);
  });

  it("official_spec_features_reference_runtime_evidence", () => {
    const official = baseline.features.filter((feature) => feature.featureId.startsWith("assembler.") || feature.featureId.startsWith("directives.") || feature.featureId.startsWith("macros."));
    expect(official.every((feature) => /^(?:src|cpp-core)\//.test(feature.evidenceReference) && feature.tests.length > 0)).toBe(true);
  });

  it("compatibility_baseline_is_not_runtime_source", () => {
    for (const file of ["src/App.tsx", "src/core/mockCaslCore.ts", "cpp-core/src/CometVm.cpp"]) {
      expect(readFileSync(resolve(root, file), "utf8")).not.toContain("wcasl-compatibility-baseline-v1.json");
    }
  });

  it("baseline_json_is_deterministic", () => {
    expect(baselineSource).toBe(`${JSON.stringify(baseline, null, 2)}\n`);
    expect(cycleSource).toBe(`${JSON.stringify(cycle, null, 2)}\n`);
  });

  it("every_machine_instruction_has_cycle_contract", () => {
    expect(cycle.instructions.map((entry) => entry.mnemonic).sort()).toEqual([...officialMachineInstructions].sort());
    expect(cycle.instructions.every((entry) => entry.cyclePhases[0] === "fetch" && entry.cyclePhases.at(-1) === "complete")).toBe(true);
  });

  it("every_operand_form_is_covered", () => {
    const registerForms = new Set(["LD", "ADDA", "SUBA", "ADDL", "SUBL", "AND", "OR", "XOR", "CPA", "CPL"]);
    for (const instruction of cycle.instructions) {
      if (registerForms.has(instruction.mnemonic)) expect(instruction.operandProfiles).toContain("register-register");
    }
    expect(cycle.instructions.find((entry) => entry.mnemonic === "LD")?.operandProfiles).toContain("register-address-indexed");
  });

  it("cycle_contract_does_not_create_fake_memory_access", () => {
    for (const mnemonic of ["LAD", "SLA", "SRA", "SLL", "SRL", "JUMP"]) {
      expect(cycle.instructions.find((entry) => entry.mnemonic === mnemonic)?.memoryAccess).toBe("instruction-fetch-only");
    }
  });

  it("register_form_has_no_fake_effective_address_read", () => {
    for (const mnemonic of ["LD", "ADDA", "SUBA", "ADDL", "SUBL", "AND", "OR", "XOR", "CPA", "CPL"]) {
      const entry = cycle.instructions.find((candidate) => candidate.mnemonic === mnemonic)!;
      expect(entry.memoryAccess).toContain("register form has no data-memory access");
      expect(entry.forbiddenFakeNodes).toContain("register-form-data-memory-read");
    }
  });

  it("macro_contract_uses_expanded_instructions", () => {
    expect(cycle.macroPolicy.macros).toEqual(["IN", "OUT", "RPUSH", "RPOP"]);
    expect(cycle.instructions.some((entry) => cycle.macroPolicy.macros.includes(entry.mnemonic))).toBe(false);
  });

  it("microcycle_contract_is_enabled_by_the_phase20c_runtime", () => {
    expect(cycle.runtimeEnabled).toBe(true);
    expect(readFileSync(resolve(root, "src/App.tsx"), "utf8")).toContain("CometMicrocyclePanel");
  });
});

describe("Phase 20A CASL Mode presentation contract", () => {
  const source = "MAIN START\n     LAD GR1,#FFFF\n     RET\n     END";
  const state = mockCaslCore.assemble(source);

  function render(locale: "en" | "ja" | "zh-CN") {
    return renderToStaticMarkup(
      <I18nProvider initialLocale={locale}>
        <CaslCompatibilityMode
          state={state}
          sourceText={source}
          isSourceDirty={false}
          onReset={() => undefined}
          onReload={() => undefined}
          onSubmitConsoleInput={() => undefined}
        />
      </I18nProvider>
    );
  }

  it("casl_mode_shows_all_registers", () => {
    const markup = render("en");
    for (let index = 0; index < 8; index += 1) expect(markup).toContain(`GR${index}`);
    for (const register of ["PR", "SP", "MAR", "MDR", "OF", "SF", "ZF"]) expect(markup).toContain(register);
    expect(markup).not.toContain(">CF<");
  });

  it("casl_mode_shows_memory_and_stack", () => {
    const markup = render("en");
    expect(markup).toContain("Memory");
    expect(markup).toContain("Stack");
    expect(markup).toContain("Assembler Output");
  });

  it.each(["en", "ja", "zh-CN"] as const)("casl_mode_is_localized_for_%s", (locale) => {
    const markup = render(locale);
    expect(markup).toContain('data-testid="casl-compatibility-mode"');
    expect(markup).toContain('aria-label="');
    expect(markup).not.toContain("undefined");
  });

  it("io_does_not_use_network_or_storage", () => {
    const component = readFileSync(resolve(root, "src/components/CaslCompatibilityMode.tsx"), "utf8");
    const adapter = readFileSync(resolve(root, "src/core/caslIoEncoding.ts"), "utf8");
    expect(`${component}\n${adapter}`).not.toMatch(/\b(?:fetch|XMLHttpRequest|localStorage|sessionStorage)\b/);
    expect(component).not.toContain("dangerouslySetInnerHTML");
  });

  it("no_new_persistence_key", () => {
    const persistence = readFileSync(resolve(root, "docs/persistence-baseline-v1.json"), "utf8");
    expect(persistence).not.toContain("casl-mode");
    expect(persistence).not.toContain("numeric-format");
  });
});
