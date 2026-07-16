const input = process.argv.slice(2).find((argument) => argument.startsWith("--base-url="))?.slice("--base-url=".length)
  ?? process.env.STUGX_DEPLOYED_BASE_URL;
const base = validatePagesUrl(input);

const root = await fetchChecked(base);
assertHeader(root, "content-security-policy", ["default-src 'self'", "frame-ancestors 'none'", "'wasm-unsafe-eval'"]);
assertHeader(root, "x-content-type-options", ["nosniff"]);
assertHeader(root, "referrer-policy", ["strict-origin-when-cross-origin"]);
assertHeader(root, "permissions-policy", ["camera=()", "microphone=()", "geolocation=()"]);
assertHeader(root, "x-frame-options", ["DENY"]);
assertCache(root, "no-cache");

const html = await root.text();
if (/https?:\/\/(?![^"']*\.pages\.dev)/i.test(html)) throw new Error("HTML contains an unexpected third-party URL.");
const manifestResponse = await fetchChecked(new URL("deployment-manifest.json", base));
assertCache(manifestResponse, "no-cache");
const manifest = await manifestResponse.json();
if (manifest.backend !== "wasm" || manifest.sourceMapsIncluded !== false || manifest.basePath !== "/") throw new Error("Deployment manifest contract failed.");

const metadata = await fetchChecked(new URL("build-metadata.json", base));
assertCache(metadata, "no-cache");
const buildMetadata = await metadata.json();
if (buildMetadata.buildMode !== "production" || buildMetadata.wasmBackend !== true || buildMetadata.basePath !== "/") throw new Error("Build metadata is not root-path production WASM.");

const wasm = await fetchChecked(new URL("wasm/stugx_casl_core.wasm", base));
if (wasm.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/wasm") throw new Error("WASM MIME type is not application/wasm.");
assertCache(wasm, "no-cache");
assertCache(await fetchChecked(new URL("wasm/stugx_casl_core.js", base)), "no-cache");

const hashedAssets = manifest.assetFiles.filter((entry) => /^assets\/.*\.(?:js|css)$/.test(entry.file));
for (const entry of hashedAssets) assertCache(await fetchChecked(new URL(entry.file, base)), "immutable");
if (manifest.assetFiles.some((entry) => entry.file.endsWith(".map"))) throw new Error("A public source map was deployed.");

const firstJs = hashedAssets.find((entry) => entry.file.endsWith(".js"));
if (firstJs) {
  const mapResponse = await fetch(new URL(`${firstJs.file}.map`, base), { redirect: "follow" });
  const mapText = await mapResponse.text();
  if ((mapResponse.headers.get("content-type") ?? "").includes("application/json") && /"(?:sources|mappings)"\s*:/.test(mapText)) throw new Error("A public source map is accessible.");
}

const directory = await fetch(new URL("assets/", base), { redirect: "follow" });
if (directory.ok && /(?:index of \/assets|directory listing)/i.test(await directory.text())) throw new Error("Asset directory listing is available.");
process.stdout.write(`Cloudflare Pages host verification passed: ${base.origin}/\n`);

async function fetchChecked(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${new URL(url).pathname}`);
  return response;
}

function assertHeader(response, name, required) {
  const value = response.headers.get(name) ?? "";
  for (const token of required) if (!value.includes(token)) throw new Error(`Missing ${name} token: ${token}`);
  if (name === "content-security-policy" && value.includes("'unsafe-eval'")) throw new Error("JavaScript unsafe-eval is deployed.");
}

function assertCache(response, expected) {
  const value = response.headers.get("cache-control") ?? "";
  if (!value.toLowerCase().includes(expected)) throw new Error(`Cache-Control does not include ${expected}: ${value}`);
}

function validatePagesUrl(value) {
  if (!value) throw new Error("Set STUGX_DEPLOYED_BASE_URL=https://<project>.pages.dev/.");
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".pages.dev") || parsed.username || parsed.password) throw new Error("Only credential-free HTTPS pages.dev URLs are accepted.");
  parsed.pathname = parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`;
  parsed.search = "";
  parsed.hash = "";
  return parsed;
}
