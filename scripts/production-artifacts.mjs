import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(repoRoot, "dist");
const command = process.argv[2];
const basePath = normalizeBasePath(process.env.VITE_BASE_PATH ?? "/");

function normalizeBasePath(value) {
  if (!value.startsWith("/") || !value.endsWith("/") || /[\\?#]/.test(value) || value.split("/").some((part) => part === "." || part === "..")) {
    throw new Error("Base path must be an absolute URL path ending in '/'.");
  }
  return value.replace(/\/{2,}/g, "/");
}

function listFiles(root = distDir, dir = root) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory() ? listFiles(root, join(dir, entry.name)) : [relative(root, join(dir, entry.name)).split(sep).join("/")])
    .sort((a, b) => a.localeCompare(b));
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function reportSizes() {
  const budget = JSON.parse(readFileSync(join(repoRoot, "docs", "production-size-budget.json"), "utf8"));
  const files = listFiles();
  const js = files.filter((file) => file.endsWith(".js"));
  const viteManifest = JSON.parse(readFileSync(join(distDir, ".vite", "manifest.json"), "utf8"));
  const initialJs = Object.values(viteManifest).filter((entry) => entry.isEntry).map((entry) => entry.file).sort();
  const css = files.filter((file) => file.endsWith(".css"));
  const wasm = files.filter((file) => file.endsWith(".wasm"));
  const bytes = (items) => items.reduce((sum, file) => sum + statSync(join(distDir, file)).size, 0);
  const gzipBytes = (items) => items.reduce((sum, file) => sum + gzipSync(readFileSync(join(distDir, file))).byteLength, 0);
  const values = {
    initialJsBytes: bytes(initialJs),
    initialJsGzipBytes: gzipBytes(initialJs),
    totalJsBytes: bytes(js),
    cssBytes: bytes(css),
    wasmBytes: bytes(wasm),
    totalDistBytes: bytes(files),
    chunkCount: js.length,
    largestFiles: files.map((file) => ({ file, bytes: statSync(join(distDir, file)).size })).sort((a, b) => b.bytes - a.bytes || a.file.localeCompare(b.file)).slice(0, 10)
  };
  const checks = [
    ["initialJsBytes", "maxInitialJsBytes"],
    ["totalJsBytes", "maxTotalJsBytes"],
    ["cssBytes", "maxCssBytes"],
    ["wasmBytes", "maxWasmBytes"],
    ["totalDistBytes", "maxTotalDistBytes"]
  ].map(([metric, limit]) => ({ metric, bytes: values[metric], limit: budget[limit], status: values[metric] <= budget[limit] ? "pass" : "fail" }));
  const report = { schemaVersion: 1, budgetVersion: budget.baselineVersion, ...values, checks };
  writeJson(join(distDir, "production-size-report.json"), report);
  if (checks.some((check) => check.status === "fail")) throw new Error("Production size budget exceeded.");
  return report;
}

function generateManifest() {
  const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const metadata = {
    schemaVersion: 1,
    version: process.env.STUGX_BUILD_VERSION || pkg.version,
    commit: /^(?:[0-9a-f]{7,40}|local)$/.test(process.env.STUGX_BUILD_COMMIT ?? "") ? process.env.STUGX_BUILD_COMMIT : "local",
    buildMode: "production",
    wasmBackend: true,
    basePath
  };
  writeJson(join(distDir, "build-metadata.json"), metadata);
  const assetFiles = listFiles().filter((file) => file !== "deployment-manifest.json");
  const entries = assetFiles.map((file) => ({ file, bytes: statSync(join(distDir, file)).size, sha256: sha256(join(distDir, file)) }));
  const requiredFiles = ["index.html", ".vite/manifest.json", "wasm/stugx_casl_core.js", "wasm/stugx_casl_core.wasm", "build-metadata.json", "production-size-report.json"];
  const manifest = {
    schemaVersion: 1,
    appVersion: metadata.version,
    commit: metadata.commit,
    basePath,
    backend: "wasm",
    sourceMapsIncluded: false,
    requiredFiles,
    wasmFiles: ["wasm/stugx_casl_core.js", "wasm/stugx_casl_core.wasm"],
    assetFiles: entries
  };
  writeJson(join(distDir, "deployment-manifest.json"), manifest);
}

function verifyBuild() {
  const manifestPath = join(distDir, "deployment-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("deployment-manifest.json is missing.");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.backend !== "wasm" || manifest.sourceMapsIncluded !== false || manifest.basePath !== basePath) throw new Error("Deployment manifest contract mismatch.");
  for (const file of manifest.requiredFiles) {
    if (!existsSync(join(distDir, file))) throw new Error(`Required production file is missing: ${file}`);
  }
  for (const entry of manifest.assetFiles) {
    const path = join(distDir, entry.file);
    if (!existsSync(path) || statSync(path).size !== entry.bytes || sha256(path) !== entry.sha256) throw new Error(`Artifact verification failed: ${entry.file}`);
  }
  const files = listFiles();
  if (files.some((file) => file.endsWith(".map"))) throw new Error("Public production source maps are prohibited.");
  if (files.some((file) => /(^|\/)(tests?|fixtures?|artifacts?|screenshots?|coverage|node_modules|\.env)(\/|$)/i.test(file))) throw new Error("Production bundle contains a prohibited path.");
  const html = readFileSync(join(distDir, "index.html"), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]).filter((ref) => !ref.startsWith("data:"));
  for (const ref of refs) {
    if (!ref.startsWith(basePath)) throw new Error(`Asset URL is not base-aware: ${ref}`);
    const relativeRef = decodeURIComponent(ref.slice(basePath.length)).split(/[?#]/, 1)[0];
    if (relativeRef && !existsSync(join(distDir, relativeRef))) throw new Error(`Referenced asset is missing: ${ref}`);
  }
  const localMarkers = [repoRoot, process.env.USERPROFILE].filter(Boolean).map((value) => value.replaceAll("\\", "/").toLowerCase());
  for (const file of files.filter((name) => /\.(?:html|js|css|json)$/i.test(name))) {
    const text = readFileSync(join(distDir, file), "utf8").replaceAll("\\", "/").toLowerCase();
    if (localMarkers.some((marker) => text.includes(marker))) throw new Error(`Local absolute path leaked into ${file}`);
  }
  if (!readFileSync(join(distDir, "wasm", "stugx_casl_core.js"), "utf8").includes("stugx_casl_core.wasm")) throw new Error("WASM glue does not reference the expected binary.");
  return manifest;
}

if (command === "report") {
  reportSizes();
} else if (command === "manifest") {
  generateManifest();
} else if (command === "verify") {
  verifyBuild();
} else {
  throw new Error("Expected command: report, manifest, or verify.");
}
