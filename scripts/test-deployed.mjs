import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const value = process.argv.slice(2).find((argument) => argument.startsWith("--base-url="))?.slice("--base-url=".length)
  ?? process.env.STUGX_DEPLOYED_BASE_URL;
const url = validatePagesUrl(value);
const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");
const result = spawnSync(process.execPath, [playwrightCli, "test", "--config", "playwright.deployed.config.ts"], {
  stdio: "inherit",
  env: { ...process.env, STUGX_DEPLOYED_BASE_URL: url }
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);

function validatePagesUrl(value) {
  if (!value) throw new Error("Set STUGX_DEPLOYED_BASE_URL=https://<project>.pages.dev/.");
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".pages.dev") || parsed.username || parsed.password) {
    throw new Error("Deployed smoke only accepts a credential-free HTTPS pages.dev URL.");
  }
  parsed.pathname = parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`;
  parsed.search = "";
  parsed.hash = "";
  return parsed.href;
}
