import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = readFileSync("docs/phase15c-browser-save-save-as-mvp.md", "utf8");
const strategy = readFileSync("docs/browser-save-strategy.md", "utf8");
const binding = readFileSync("docs/transient-write-binding-contract.md", "utf8");
const adapter = readFileSync("docs/file-io-adapter-contract.md", "utf8");

describe("Phase 15C documentation contracts", () => {
  it("documents_honest_confirmed_write_and_download_copy_semantics", () => {
    expect(phase).toContain("confirmed only after `writable.close()` succeeds");
    expect(phase).toContain("`Saved a copy`");
    expect(strategy).toContain("confirmedWrite: false");
  });

  it("documents_transient_nonpersistent_handle_ownership", () => {
    expect(binding).toContain("outside `SourceDocument` and persisted state");
    expect(binding).toContain("never written to localStorage");
    expect(adapter).toContain("No persistent file handle");
  });

  it("documents_revision_race_and_source_ownership_invariance", () => {
    expect(phase).toContain("editing during I/O leaves the newer current revision Dirty");
    expect(phase).toContain("preserve document/source-unit identity");
    expect(phase).toContain("never parses, assembles, transpiles, resets, steps, runs");
  });

  it("documents_phase15d_scope", () => {
    expect(phase).toContain("Phase 15D Recommendation");
    expect(phase).not.toContain("handle persistence is implemented");
  });
});
