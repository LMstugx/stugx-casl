import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const phase = readFileSync("docs/phase15d-new-demo-beforeunload.md", "utf8");
const replacement = readFileSync("docs/source-replacement-intent-contract.md", "utf8");
const unload = readFileSync("docs/beforeunload-dirty-guard.md", "utf8");
const metadata = readFileSync("docs/session-lifecycle-metadata-contract.md", "utf8");
const visual = readFileSync("tests/e2e/visual-review.spec.ts", "utf8");

describe("Phase 15D documentation contracts", () => {
  it("documents_shared_intent_and_atomic_replacement", () => {
    expect(replacement).toContain("open-file");
    expect(replacement).toContain("new-document");
    expect(replacement).toContain("select-example");
    expect(phase).toContain("atomic store replacement");
    expect(phase).toContain("No intermediate new-source/old-runtime state");
  });

  it("documents_untitled_and_guard_presentation_boundaries", () => {
    expect(phase).toContain("Localized text is not stored as identity");
    expect(phase).toContain("Save/Discard and create");
    expect(phase).toContain("Save/Discard and switch");
  });

  it("documents_beforeunload_as_dirty_only", () => {
    expect(unload).toContain("active only while `isDocumentDirty(currentDocument)` is true");
    expect(unload).toContain("does not provide custom text");
    expect(unload).toContain("owns at most one listener");
  });

  it("documents_session_metadata_allowlist_and_no_persistence", () => {
    expect(metadata).toContain("Phase 15D validates this shape but does not persist or restore it");
    expect(metadata).toContain("must not contain source content");
    expect(metadata).toContain("Locale remains the independent application preference");
  });

  it("visual_review_covers_phase15d_without_native_picker", () => {
    for (const scenario of [
      "new-document-dialog-en.png",
      "new-document-dialog-ja.png",
      "new-document-dialog-zh-cn.png",
      "new-dirty-guard-save-create.png",
      "demo-switch-dirty-guard-en.png",
      "untitled-casl-document.png",
      "untitled-cpp-document.png",
      "long-example-title-1280.png",
      "replacement-busy-state.png"
    ]) expect(visual).toContain(scenario);
    expect(phase).toContain("no native picker");
  });
});
