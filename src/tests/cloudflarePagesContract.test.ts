import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("Cloudflare Pages deployment contract", () => {
  const packageJson = JSON.parse(read("package.json"));
  const headers = read("public/_headers");
  const pagesBuild = read("scripts/build-cloudflare-pages.sh");
  const dispatcher = read("scripts/build-production.mjs");
  const artifacts = read("scripts/production-artifacts.mjs");
  const vite = read("vite.config.ts");

  it("uses the portable production dispatcher without Wrangler", () => {
    expect(packageJson.scripts.build).toBe("node scripts/build-production.mjs");
    expect(packageJson.scripts["build:pages"]).toBe("bash scripts/build-cloudflare-pages.sh");
    expect(packageJson.packageManager).toBe("pnpm@11.7.0");
    expect(packageJson.devDependencies.wrangler).toBeUndefined();
    expect(dispatcher).toContain("process.platform === \"win32\"");
    expect(dispatcher).toContain("scripts/build-cloudflare-pages.sh");
  });

  it("pins the official Emscripten SDK and requires WASM outputs", () => {
    expect(pagesBuild).toContain('EMSDK_VERSION="6.0.2"');
    expect(pagesBuild).toContain("https://github.com/emscripten-core/emsdk.git");
    expect(pagesBuild).toContain("public/wasm/stugx_casl_core.js");
    expect(pagesBuild).toContain("public/wasm/stugx_casl_core.wasm");
    expect(pagesBuild).toContain('VITE_CORE_BACKEND="wasm"');
    expect(pagesBuild).not.toContain("mock");
    expect(vite).toContain('Production builds require VITE_CORE_BACKEND=wasm');
  });

  it("ships strict same-origin security and cache policies", () => {
    expect(headers).toContain("default-src 'self'");
    expect(headers).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(headers).toContain("connect-src 'self'");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain("X-Frame-Options: DENY");
    expect(headers).toContain("X-Content-Type-Options: nosniff");
    expect(headers).toContain("Referrer-Policy: strict-origin-when-cross-origin");
    expect(headers).toContain("/wasm/*\n  Cache-Control: no-cache");
    expect(headers).toContain("/assets/*\n  Cache-Control: public, max-age=31536000, immutable");
    expect(headers).not.toMatch(/script-src[^;]*\s'unsafe-eval'/);
    expect(headers).not.toMatch(/https?:\/\//);
  });

  it("requires headers and excludes public source maps", () => {
    expect(artifacts).toContain('"_headers"');
    expect(artifacts).toContain("Public production source maps are prohibited");
    expect(packageJson.scripts["test:e2e:deployed"]).toBe("node scripts/test-deployed.mjs");
    expect(packageJson.scripts["verify:deployed"]).toBe("node scripts/verify-deployed-pages.mjs");
  });
});
