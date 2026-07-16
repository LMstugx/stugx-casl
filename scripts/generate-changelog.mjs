import { writeFileSync } from "node:fs";
import { changelogPath, loadReleaseRegistry, readPackageVersion, renderChangelog, validateReleaseRegistry } from "./changelog-lib.mjs";

const registry = await loadReleaseRegistry();
validateReleaseRegistry(registry, readPackageVersion());
writeFileSync(changelogPath, renderChangelog(registry), "utf8");
process.stdout.write("CHANGELOG.md generated from src/content/releases.ts.\n");
