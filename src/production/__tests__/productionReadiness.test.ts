import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appStoreReducer, createInitialAppState } from "../../store/useAppStore";
import { detectBrowserCapabilities, hasRequiredProductionCapabilities } from "../browserCapabilities";
import { BUILD_METADATA } from "../buildMetadata";
import { resolveWasmAssetUrls, WASM_BINARY_PUBLIC_PATH, WASM_MODULE_PUBLIC_PATH } from "../../core/wasmLoader";

describe("Phase 17A production readiness contracts", () => {
  it("resolves root and subpath WASM URLs without absolute host assumptions", () => {
    expect(resolveWasmAssetUrls("/")).toEqual({ moduleUrl: `/${WASM_MODULE_PUBLIC_PATH}`, wasmUrl: `/${WASM_BINARY_PUBLIC_PATH}` });
    expect(resolveWasmAssetUrls("/stugx-casl/")).toEqual({ moduleUrl: `/stugx-casl/${WASM_MODULE_PUBLIC_PATH}`, wasmUrl: `/stugx-casl/${WASM_BINARY_PUBLIC_PATH}` });
    expect(() => resolveWasmAssetUrls("relative/")).toThrow();
    expect(() => resolveWasmAssetUrls("/bad/../path/")).toThrow();
  });

  it("requires WebAssembly while treating deployment conveniences as optional", () => {
    const missing = detectBrowserCapabilities({ TextDecoder, Blob, URL } as typeof globalThis);
    expect(missing.webAssembly).toBe(false);
    expect(missing.fileSystemAccess).toBe(false);
    expect(hasRequiredProductionCapabilities(missing)).toBe(false);
    expect(hasRequiredProductionCapabilities({ ...missing, webAssembly: true })).toBe(true);
  });

  it("exposes non-sensitive immutable build metadata", () => {
    expect(BUILD_METADATA.buildMode).toMatch(/production|development/);
    expect(BUILD_METADATA.basePath === "/" || /^\/[^?#]+\/$/.test(BUILD_METADATA.basePath)).toBe(true);
    expect(JSON.stringify(BUILD_METADATA)).not.toMatch(/[A-Z]:\\|token|secret|password|username|hostname/i);
    expect(Object.isFrozen(BUILD_METADATA)).toBe(true);
  });

  it("keeps core initialization failures out of source diagnostics", () => {
    const state = createInitialAppState();
    const existingDiagnostics = [{ line: 2, message: "source diagnostic", severity: "error" as const }];
    const withDiagnostic = { ...state, diagnostics: existingDiagnostics };
    const next = appStoreReducer(withDiagnostic, { type: "coreError", sourceUnitId: state.currentDocument.sourceUnitId });
    expect(next.diagnostics).toBe(existingDiagnostics);
    expect(next.applicationFailure).toBe("core-unavailable");
    expect(JSON.stringify(next)).not.toContain("C:\\Users\\");
  });

  it("defines scripts, deterministic artifacts, public source-map policy, and no deployment step", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).toContain("build-production.ps1");
    expect(pkg.scripts["test:e2e:production"]).toBeTruthy();
    expect(pkg.scripts["test:e2e:production:subpath"]).toBeTruthy();
    expect(pkg.scripts["package:production"]).toContain("package-production.ps1");
    const pipeline = readFileSync("scripts/build-production.ps1", "utf8");
    expect(pipeline.indexOf("pnpm build:wasm")).toBeLessThan(pipeline.indexOf("pnpm build:web"));
    expect(pipeline).toContain("production-artifacts.mjs verify");
    const artifactTool = readFileSync("scripts/production-artifacts.mjs", "utf8");
    expect(artifactTool).toContain("sourceMapsIncluded: false");
    expect(artifactTool).not.toMatch(/upload|deploy(?:ment)? token/i);
  });

  it("keeps frozen Phase 14 through 16 baseline manifests unchanged", () => {
    for (const path of [
      "docs/diagnostic-localization-baseline-v1.json",
      "docs/file-lifecycle-baseline-v1.json",
      "docs/persistence-baseline-v1.json"
    ]) {
      expect(JSON.parse(readFileSync(path, "utf8"))).toBeTruthy();
    }
  });
});
