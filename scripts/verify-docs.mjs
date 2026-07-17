import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { CANONICAL_DOCS, REQUIRED_HEADER_FIELDS } from "./docs-contract.mjs";

const rootArgument = process.argv.indexOf("--root");
const repositoryRoot = resolve(rootArgument >= 0 && process.argv[rootArgument + 1] ? process.argv[rootArgument + 1] : ".");
const packageJson = JSON.parse(readFileSync(resolve(repositoryRoot, "package.json"), "utf8"));
const expectedVersion = packageJson.version;
const failures = [];

const localPathPattern = /(?:^|[\s("'`])(?:[A-Za-z]:[\\/]|file:\/\/)/m;
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bghp_[A-Za-z0-9]{20,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\b(?:api[_-]?key|access[_-]?token|oauth[_-]?token|password)\s*[:=]\s*["']?[^\s"'`]{8,}/i
];
const unsupportedPositiveClaims = [
  /(?<!not )\b(?:supports?|provides?) (?:the )?(?:complete|full) C\+\+/i,
  /(?<!not )\b(?:supports?|provides?) (?:the )?(?:complete|full) (?:C\+\+ )?standard library/i,
  /(?<!not )\b(?:supports?|provides?) (?:std::)?vector\b/i,
  /(?<!not )\b(?:supports?|provides?) lambdas?\b/i,
  /(?<!not )\b(?:supports?|provides?) double\b/i
];

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}

function validateLinks(relativeFile, content) {
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (!rawTarget || rawTarget.startsWith("#") || /^(?:https?:|mailto:)/i.test(rawTarget)) continue;
    const targetWithoutAnchor = rawTarget.split("#", 1)[0].split("?", 1)[0];
    if (!targetWithoutAnchor) continue;
    if (isAbsolute(targetWithoutAnchor)) {
      fail(relativeFile, `absolute Markdown link is prohibited: ${rawTarget}`);
      continue;
    }
    const targetPath = resolve(repositoryRoot, dirname(relativeFile), targetWithoutAnchor);
    if (!targetPath.startsWith(repositoryRoot) || !existsSync(targetPath)) {
      fail(relativeFile, `broken relative link: ${rawTarget}`);
    }
  }
}

for (const relativeFile of CANONICAL_DOCS) {
  const absoluteFile = resolve(repositoryRoot, relativeFile);
  if (!existsSync(absoluteFile)) {
    fail(relativeFile, "canonical document is missing");
    continue;
  }

  const content = readFileSync(absoluteFile, "utf8").replace(/\r\n/g, "\n");
  if (!content.startsWith("# ")) fail(relativeFile, "document must start with one H1 title");
  for (const field of REQUIRED_HEADER_FIELDS) {
    if (!content.includes(field)) fail(relativeFile, `missing header field ${field}`);
  }
  if (!content.includes(`- Last reviewed version: ${expectedVersion}`)) {
    fail(relativeFile, `Last reviewed version must be ${expectedVersion}`);
  }
  if (!/^- Related: .*\[[^\]]+\]\([^)]+\)/m.test(content)) {
    fail(relativeFile, "Related must include at least one Markdown link");
  }
  if (localPathPattern.test(content)) fail(relativeFile, "contains an absolute local path");
  for (const pattern of secretPatterns) {
    if (pattern.test(content)) fail(relativeFile, "contains a credential-like value");
  }
  for (const pattern of unsupportedPositiveClaims) {
    if (pattern.test(content)) fail(relativeFile, "contains a prohibited positive capability claim");
  }
  if ((content.match(/```/g) ?? []).length % 2 !== 0) fail(relativeFile, "contains an unbalanced code fence");
  validateLinks(relativeFile, content);
}

const readmePath = resolve(repositoryRoot, "README.md");
if (!existsSync(readmePath)) {
  fail("README.md", "repository README is missing");
} else {
  const readme = readFileSync(readmePath, "utf8");
  for (const requiredLink of [
    "docs/README.md",
    "docs/user/getting-started.md",
    "docs/developer/architecture-overview.md",
    "docs/reference/supported-casl-instructions.md",
    "docs/adr/README.md"
  ]) {
    if (!readme.includes(requiredLink)) fail("README.md", `missing canonical documentation link ${requiredLink}`);
  }
  if (localPathPattern.test(readme)) fail("README.md", "contains an absolute local path");
}

const tauriConfig = JSON.parse(readFileSync(resolve(repositoryRoot, "src-tauri/tauri.conf.json"), "utf8"));
if (tauriConfig.version !== expectedVersion) fail("src-tauri/tauri.conf.json", `version must match package.json ${expectedVersion}`);

const cargo = readFileSync(resolve(repositoryRoot, "src-tauri/Cargo.toml"), "utf8");
if (!new RegExp(`^version = "${expectedVersion.replace(/\./g, "\\.")}"$`, "m").test(cargo)) {
  fail("src-tauri/Cargo.toml", `version must match package.json ${expectedVersion}`);
}

if (failures.length > 0) {
  process.stderr.write(`Documentation verification failed (${failures.length}):\n${failures.map((item) => `- ${item}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`Documentation verification passed for ${CANONICAL_DOCS.length} canonical files at version ${expectedVersion}.\n`);
