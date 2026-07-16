import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { changelogPath, loadReleaseRegistry, readCurrentBuildVersion, renderChangelog, validateReleaseRegistry } from "./changelog-lib.mjs";

const fileArgument = process.argv.indexOf("--file");
const targetPath = fileArgument >= 0 && process.argv[fileArgument + 1] ? resolve(process.argv[fileArgument + 1]) : changelogPath;
const registry = await loadReleaseRegistry();
validateReleaseRegistry(registry, readCurrentBuildVersion());
const expected = renderChangelog(registry);
const actual = readFileSync(targetPath, "utf8").replace(/\r\n/g, "\n");
if (actual !== expected) {
  process.stderr.write("CHANGELOG.md does not match src/content/releases.ts. Run pnpm changelog:generate.\n");
  process.exit(1);
}
process.stdout.write("CHANGELOG.md matches the release registry.\n");
