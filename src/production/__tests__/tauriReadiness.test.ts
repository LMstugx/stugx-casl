import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveWasmAssetUrls, WASM_BINARY_PUBLIC_PATH, WASM_MODULE_PUBLIC_PATH } from "../../core/wasmLoader";
import { getApplicationRuntime } from "../../runtime/applicationRuntime";

type TauriConfig = {
  identifier: string;
  build: { frontendDist: string; devUrl: string; beforeBuildCommand: string };
  app: { windows: Array<Record<string, unknown>>; security: { csp: string } };
  bundle: { targets: string[]; icon: string[] };
};

describe("Phase 18A Tauri Windows demo contracts", () => {
  const config = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as TauriConfig;
  const capability = JSON.parse(readFileSync("src-tauri/capabilities/default.json", "utf8")) as { windows: string[]; permissions: string[] };
  const cargo = readFileSync("src-tauri/Cargo.toml", "utf8");
  const rust = readFileSync("src-tauri/src/lib.rs", "utf8");
  const vite = readFileSync("vite.config.ts", "utf8");
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string>; dependencies: Record<string, string>; devDependencies: Record<string, string> };

  it("reuses the existing Vite frontend and dist directory", () => {
    expect(config.build.frontendDist).toBe("../dist");
    expect(config.build.devUrl).toBe("http://127.0.0.1:5173");
    expect(config.build.beforeBuildCommand).toBe("pnpm build:tauri:frontend");
    expect(pkg.scripts["build:tauri:frontend"]).toContain("build-tauri-frontend.ps1");
    expect(pkg.dependencies["@tauri-apps/api"]).toBeTruthy();
    expect(pkg.devDependencies["@tauri-apps/cli"]).toBeTruthy();
  });

  it("defines one safe main window and disables release DevTools", () => {
    expect(config.identifier).toBe("com.stugx.casl");
    expect(config.app.windows).toHaveLength(1);
    expect(config.app.windows[0]).toMatchObject({
      label: "main", title: "stugx.CASL", width: 1440, height: 900,
      minWidth: 1180, minHeight: 700, resizable: true, maximizable: true,
      fullscreen: false, devtools: false
    });
    expect(config.bundle.targets).toEqual(["nsis"]);
  });

  it("keeps the capability main-window scoped with no IPC permissions or plugins", () => {
    expect(capability).toMatchObject({ windows: ["main"], permissions: [] });
    expect(cargo).not.toMatch(/tauri-plugin-(?:fs|dialog|shell|http|updater|process|store|clipboard|notification|log)/);
    expect(rust).not.toMatch(/#\[tauri::command\]|invoke_handler|generate_handler/);
  });

  it("uses a local CSP without remote domains or general unsafe eval", () => {
    expect(config.app.security.csp).toContain("default-src 'self'");
    expect(config.app.security.csp).toContain("'wasm-unsafe-eval'");
    expect(config.app.security.csp).not.toContain("script-src 'self' 'unsafe-eval'");
    expect(config.app.security.csp).not.toMatch(/https:\/\/(?!ipc\.localhost)/);
  });

  it("resolves Tauri WASM and glue against the document root", () => {
    expect(resolveWasmAssetUrls("./", "http://tauri.localhost/")).toEqual({
      moduleUrl: `http://tauri.localhost/${WASM_MODULE_PUBLIC_PATH}`,
      wasmUrl: `http://tauri.localhost/${WASM_BINARY_PUBLIC_PATH}`
    });
    expect(vite).toContain('runtime === "tauri" ? "./"');
    expect(vite).toContain("Tauri builds require VITE_CORE_BACKEND=wasm");
  });

  it("detects runtime through the Tauri API and fails safely to web", () => {
    expect(getApplicationRuntime(() => true)).toBe("tauri");
    expect(getApplicationRuntime(() => false)).toBe("web");
    expect(getApplicationRuntime(() => { throw new Error("blocked"); })).toBe("web");
    expect(readFileSync("src/runtime/applicationRuntime.ts", "utf8")).not.toMatch(/userAgent/i);
  });

  it("keeps generated outputs ignored and frozen baselines present", () => {
    expect(readFileSync(".gitignore", "utf8")).toContain("src-tauri/target/");
    for (const path of [
      "docs/diagnostic-localization-baseline-v1.json",
      "docs/file-lifecycle-baseline-v1.json",
      "docs/persistence-baseline-v1.json"
    ]) {
      expect(JSON.parse(readFileSync(path, "utf8"))).toBeTruthy();
    }
  });

  it("uses the provided STUGX brand source for deterministic Windows icons", () => {
    for (const path of [
      "assets/branding/stugx-logo-source.jpg",
      "assets/branding/stugx-logo-source.png",
      "assets/branding/stugx-logo-horizontal.png"
    ]) {
      expect(readFileSync(path, "latin1").length).toBeGreaterThan(1_000);
    }
    const master = readFileSync("src-tauri/icons/app-icon-source.png", "latin1");
    const readUInt32BE = (offset: number) =>
      ((master.charCodeAt(offset) << 24) >>> 0)
      + (master.charCodeAt(offset + 1) << 16)
      + (master.charCodeAt(offset + 2) << 8)
      + master.charCodeAt(offset + 3);
    expect(readUInt32BE(16)).toBe(1024);
    expect(readUInt32BE(20)).toBe(1024);
    expect(config.bundle.icon).toEqual([
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.ico"
    ]);
  });
});
