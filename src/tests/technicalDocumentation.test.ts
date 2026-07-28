import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { CANONICAL_DOC_COUNT, CANONICAL_DOCS } from "../../scripts/docs-contract.mjs";

describe("canonical technical documentation", () => {
  let temporaryRoot: string | undefined;

  afterEach(() => {
    if (temporaryRoot) rmSync(temporaryRoot, { recursive: true, force: true });
    temporaryRoot = undefined;
  });

  function createDocumentationFixture() {
    temporaryRoot = mkdtempSync(join(tmpdir(), "stugx-docs-"));
    cpSync("docs", join(temporaryRoot, "docs"), { recursive: true });
    cpSync("README.md", join(temporaryRoot, "README.md"));
    cpSync("package.json", join(temporaryRoot, "package.json"));
    mkdirSync(join(temporaryRoot, "src-tauri"), { recursive: true });
    cpSync("src-tauri/tauri.conf.json", join(temporaryRoot, "src-tauri/tauri.conf.json"));
    cpSync("src-tauri/Cargo.toml", join(temporaryRoot, "src-tauri/Cargo.toml"));
    return temporaryRoot;
  }

  it("canonical_document_inventory_is_complete", () => {
    expect(CANONICAL_DOC_COUNT).toBe(68);
    expect(new Set(CANONICAL_DOCS).size).toBe(CANONICAL_DOCS.length);
  });

  it("canonical_documents_use_current_version_header", () => {
    for (const file of CANONICAL_DOCS) {
      const content = readFileSync(file, "utf8");
      expect(content).toContain("- Status: Canonical");
      expect(content).toContain("- Classification: Canonical");
      expect(content).toContain(`- Last reviewed version: ${packageJson.version}`);
    }
  });

  it("documentation_contract_verifies", () => {
    const result = spawnSync(process.execPath, ["scripts/verify-docs.mjs"], { encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(`passed for ${CANONICAL_DOC_COUNT} canonical files`);
  });

  it("documentation_contract_rejects_broken_relative_links", () => {
    const root = createDocumentationFixture();
    const indexPath = join(root, "docs/README.md");
    writeFileSync(indexPath, `${readFileSync(indexPath, "utf8")}\n[Broken](missing.md)\n`, "utf8");
    const result = spawnSync(process.execPath, ["scripts/verify-docs.mjs", "--root", root], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("broken relative link");
  });

  it("documentation_contract_rejects_review_version_drift", () => {
    const root = createDocumentationFixture();
    const guidePath = join(root, "docs/user/getting-started.md");
    writeFileSync(guidePath, readFileSync(guidePath, "utf8").replace("Last reviewed version: 0.1.0", "Last reviewed version: 9.9.9"), "utf8");
    const result = spawnSync(process.execPath, ["scripts/verify-docs.mjs", "--root", root], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Last reviewed version must be");
  });

  it("documentation_is_not_a_runtime_source", () => {
    const productionInputs = [
      "src/main.tsx",
      "src/App.tsx",
      "vite.config.ts"
    ].map((file) => readFileSync(file, "utf8")).join("\n");
    expect(productionInputs).not.toMatch(/docs-contract|verify-docs|docs\/(?:user|developer|reference|adr)/);
  });

  it("readme_links_all_documentation_layers", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain("docs/user/getting-started.md");
    expect(readme).toContain("docs/developer/architecture-overview.md");
    expect(readme).toContain("docs/reference/supported-casl-instructions.md");
    expect(readme).toContain("docs/adr/README.md");
  });

  it("historical_phase_records_remain_separate", () => {
    const docsIndex = readFileSync("docs/README.md", "utf8");
    expect(docsIndex).toContain("Historical Records");
    expect(docsIndex).toContain("phase*.md");
    expect(CANONICAL_DOCS.some((file) => /\/phase/i.test(file))).toBe(false);
  });
});
