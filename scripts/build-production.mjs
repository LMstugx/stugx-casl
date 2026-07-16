import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const command = isWindows ? "powershell" : "bash";
const args = isWindows
  ? ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/build-production.ps1"]
  : ["scripts/build-cloudflare-pages.sh"];
const result = spawnSync(command, args, { stdio: "inherit", env: process.env });

if (result.error) {
  throw result.error;
}
process.exit(result.status ?? 1);
