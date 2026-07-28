import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(".");
const baselinePath = resolve(root, "docs/wcasl-compatibility-baseline-v1.json");
const cyclePath = resolve(root, "docs/comet-instruction-cycle-matrix-v1.json");
const instructionHeaderPath = resolve(root, "cpp-core/include/InstructionSet.hpp");
const failures = [];

const allowedStatuses = new Set([
  "exact",
  "compatible",
  "superset",
  "missing",
  "partial",
  "intentionally-different",
  "not-applicable",
  "blocked-needs-spec-evidence"
]);
const requiredFeatureFields = [
  "featureId",
  "featureName",
  "sourceCategory",
  "evidenceReference",
  "currentStatus",
  "priority",
  "implementationOwner",
  "tests",
  "limitations",
  "targetPhase"
];

function fail(message) {
  failures.push(message);
}

function loadDeterministicJson(path, label) {
  if (!existsSync(path)) {
    fail(`${label} is missing`);
    return {};
  }
  const source = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  let value;
  try {
    value = JSON.parse(source);
  } catch (error) {
    fail(`${label} is invalid JSON: ${error.message}`);
    return {};
  }
  if (`${JSON.stringify(value, null, 2)}\n` !== source) fail(`${label} is not deterministic two-space JSON`);
  return value;
}

function walkTextFiles(directory) {
  const files = [];
  if (!existsSync(directory)) return files;
  for (const name of readdirSync(directory)) {
    const path = resolve(directory, name);
    const stats = statSync(path);
    if (stats.isDirectory()) files.push(...walkTextFiles(path));
    else if (/\.(?:ts|tsx|cpp|hpp|h|c)$/.test(name)) files.push(path);
  }
  return files;
}

const baseline = loadDeterministicJson(baselinePath, "compatibility baseline");
const matrix = loadDeterministicJson(cyclePath, "instruction cycle matrix");
const features = Array.isArray(baseline.features) ? baseline.features : [];
const featureIds = new Set();
const categorySet = new Set(Array.isArray(baseline.featureCategories) ? baseline.featureCategories : []);
const counts = Object.fromEntries([...allowedStatuses].map((status) => [status, 0]));

if (baseline.baselineVersion !== "1.0.0") fail("baselineVersion must be 1.0.0");
if (categorySet.size !== 20) fail("all 20 compatibility categories must be declared once");

for (const [index, feature] of features.entries()) {
  for (const field of requiredFeatureFields) {
    if (!(field in feature)) fail(`feature ${index} is missing ${field}`);
  }
  if (featureIds.has(feature.featureId)) fail(`duplicate featureId ${feature.featureId}`);
  featureIds.add(feature.featureId);
  if (!allowedStatuses.has(feature.currentStatus)) fail(`feature ${feature.featureId} has invalid status`);
  else counts[feature.currentStatus] += 1;
  if (!["P0", "P1", "P2"].includes(feature.priority)) fail(`feature ${feature.featureId} has invalid priority`);
  if (feature.priority === "P0" && ["missing", "partial", "blocked-needs-spec-evidence"].includes(feature.currentStatus)) {
    fail(`P0 feature ${feature.featureId} is not admitted`);
  }
  if (feature.priority === "P1" && !["exact", "compatible", "superset"].includes(feature.currentStatus)) {
    fail(`P1 feature ${feature.featureId} must be exact, compatible, or superset`);
  }
  if (!Array.isArray(feature.tests)) fail(`feature ${feature.featureId} tests must be an array`);
  const evidence = String(feature.evidenceReference ?? "");
  if (/^(?:src|cpp-core|docs)\//.test(evidence) && !existsSync(resolve(root, evidence))) {
    fail(`feature ${feature.featureId} evidence does not exist: ${evidence}`);
  }
}

const enumMatch = /enum class Opcode\s*\{([\s\S]*?)\};/.exec(readFileSync(instructionHeaderPath, "utf8"));
const nonMachine = new Set(["START", "END", "DC", "DS", "IN", "OUT", "RPUSH", "RPOP"]);
const runtimeOpcodes = (enumMatch?.[1] ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .filter((entry) => !nonMachine.has(entry));
const matrixOpcodes = Array.isArray(matrix.instructions) ? matrix.instructions.map((entry) => entry.mnemonic) : [];
if (new Set(runtimeOpcodes).size !== runtimeOpcodes.length) fail("runtime opcode registry contains duplicates");
if (new Set(matrixOpcodes).size !== matrixOpcodes.length) fail("cycle matrix contains duplicate instructions");
if (JSON.stringify([...runtimeOpcodes].sort()) !== JSON.stringify([...matrixOpcodes].sort())) {
  fail("cycle matrix must cover exactly the runtime machine opcode registry");
}
if (matrix.runtimeEnabled !== false) fail("microcycle contract must not be runtime-enabled in Phase 20A");

for (const path of [...walkTextFiles(resolve(root, "src")), ...walkTextFiles(resolve(root, "cpp-core"))]) {
  if (/[\\/](?:tests|__tests__)[\\/]/.test(path) || /\.test\.[^.]+$/.test(path)) continue;
  const content = readFileSync(path, "utf8");
  if (content.includes("wcasl-compatibility-baseline-v1.json") || content.includes("comet-instruction-cycle-matrix-v1.json")) {
    fail(`contract manifest is imported or referenced by runtime source: ${path.slice(root.length + 1)}`);
  }
}

for (const fixture of [
  "src/tests/fixtures/casl2-official-conformance-v1.json",
  "src/tests/fixtures/wcasl-workflow-parity-v1.json"
]) {
  loadDeterministicJson(resolve(root, fixture), fixture);
}

if (failures.length) {
  process.stderr.write(`CASL parity verification failed (${failures.length}):\n${failures.map((failure) => `- ${failure}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(
  `CASL parity verification passed: ${features.length} features; ` +
  [...allowedStatuses].map((status) => `${status}=${counts[status]}`).join(", ") +
  `; machine instructions=${matrixOpcodes.length}.\n`
);
