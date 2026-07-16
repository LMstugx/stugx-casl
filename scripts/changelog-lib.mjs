import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

export const repositoryRoot = resolve(import.meta.dirname, "..");
export const releaseRegistryPath = resolve(repositoryRoot, "src/content/releases.ts");
export const changelogPath = resolve(repositoryRoot, "CHANGELOG.md");

const localizedKeys = ["en", "ja", "zh-CN"];
const versionPattern = /^(?:\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?|v1\.0-rc\d+)$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const commitPattern = /^[0-9a-f]{40}$/;

export async function loadReleaseRegistry() {
  const source = readFileSync(releaseRegistryPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const encoded = Buffer.from(transpiled, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

function assertLocalizedText(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${context} must be localized text.`);
  for (const locale of localizedKeys) {
    if (typeof value[locale] !== "string" || !value[locale].trim()) throw new Error(`${context}.${locale} must be non-empty.`);
    if (/[<>]/.test(value[locale])) throw new Error(`${context}.${locale} cannot contain HTML-like markup.`);
  }
}

function gitObjectExists(value) {
  try {
    execFileSync("git", ["cat-file", "-e", value], { cwd: repositoryRoot, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function gitRepositoryIsShallow() {
  try {
    return execFileSync("git", ["rev-parse", "--is-shallow-repository"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim() === "true";
  } catch {
    return false;
  }
}

export function validateReleaseRegistry(registry, packageVersion) {
  const { RELEASES, RELEASE_CHANNELS, RELEASE_SECTION_ORDER, CANONICAL_REPOSITORY_URL, PUBLIC_WEB_URL } = registry;
  if (!Array.isArray(RELEASES) || RELEASES.length === 0) throw new Error("Release registry must not be empty.");
  const shallowRepository = gitRepositoryIsShallow();
  const versions = new Set();
  let previousDate = "9999-12-31";
  for (const [releaseIndex, release] of RELEASES.entries()) {
    const context = `release[${releaseIndex}]`;
    if (!versionPattern.test(release.version)) throw new Error(`${context}.version is invalid.`);
    if (versions.has(release.version)) throw new Error(`Duplicate release version: ${release.version}`);
    versions.add(release.version);
    if (!datePattern.test(release.date) || Number.isNaN(Date.parse(`${release.date}T00:00:00Z`))) throw new Error(`${context}.date is invalid.`);
    if (release.date > previousDate) throw new Error("Releases must be sorted newest first.");
    previousDate = release.date;
    if (!RELEASE_CHANNELS.includes(release.channel)) throw new Error(`${context}.channel is invalid.`);
    assertLocalizedText(release.title, `${context}.title`);
    assertLocalizedText(release.summary, `${context}.summary`);
    if (!Array.isArray(release.sections)) throw new Error(`${context}.sections must be an array.`);
    let previousSectionIndex = -1;
    const sectionTypes = new Set();
    for (const [sectionIndex, section] of release.sections.entries()) {
      const orderIndex = RELEASE_SECTION_ORDER.indexOf(section.type);
      if (orderIndex < 0 || orderIndex <= previousSectionIndex || sectionTypes.has(section.type)) {
        throw new Error(`${context}.sections must use unique canonical ordering.`);
      }
      sectionTypes.add(section.type);
      previousSectionIndex = orderIndex;
      if (!Array.isArray(section.items) || section.items.length === 0) throw new Error(`${context}.sections[${sectionIndex}] must have items.`);
      section.items.forEach((item, itemIndex) => assertLocalizedText(item, `${context}.sections[${sectionIndex}].items[${itemIndex}]`));
    }
    if (release.commit && !commitPattern.test(release.commit)) {
      throw new Error(`${context}.commit is invalid.`);
    }
    if (release.commit && !shallowRepository && !gitObjectExists(`${release.commit}^{commit}`)) {
      throw new Error(`${context}.commit does not resolve to a commit in the complete repository.`);
    }
    if (release.tag && !/^v[0-9A-Za-z.-]+$/.test(release.tag)) {
      throw new Error(`${context}.tag is invalid.`);
    }
    if (release.tag && !shallowRepository && !gitObjectExists(`refs/tags/${release.tag}`)) {
      throw new Error(`${context}.tag does not exist in the complete repository.`);
    }
    if (release.webUrl) {
      const url = new URL(release.webUrl);
      if (url.protocol !== "https:" || url.href !== PUBLIC_WEB_URL) throw new Error(`${context}.webUrl is not allowlisted.`);
    }
  }
  if (RELEASES.filter((release) => release.version === packageVersion).length !== 1) {
    throw new Error(`Current package version ${packageVersion} must appear exactly once.`);
  }
  if (CANONICAL_REPOSITORY_URL !== "https://github.com/LMstugx/stugx-casl") throw new Error("Canonical repository URL changed unexpectedly.");
  if (PUBLIC_WEB_URL !== "https://stugx-casl.pages.dev/") throw new Error("Public Web URL changed unexpectedly.");
}

const sectionHeadings = {
  added: "Added",
  improved: "Improved",
  fixed: "Fixed",
  security: "Security",
  docs: "Documentation",
  "known-issues": "Known Issues"
};

const channelHeadings = {
  stable: "Stable",
  preview: "Preview",
  "desktop-demo": "Desktop Demo"
};

export function renderChangelog(registry) {
  const lines = [
    "# Changelog",
    "",
    "<!-- Generated by pnpm changelog:generate from src/content/releases.ts. Do not edit manually. -->",
    "",
    "User-visible changes for [stugx.CASL](https://github.com/LMstugx/stugx-casl). The application also packages the same registry for offline EN, JA, and zh-CN viewing.",
    ""
  ];
  for (const release of registry.RELEASES) {
    lines.push(`## ${release.version} - ${release.date} (${channelHeadings[release.channel]})`, "", release.summary.en, "");
    if (release.webUrl) lines.push(`[Open the public Web application](${release.webUrl})`, "");
    for (const section of release.sections) {
      lines.push(`### ${sectionHeadings[section.type]}`, "");
      for (const item of section.items) lines.push(`- ${item.en}`);
      lines.push("");
    }
    const references = [];
    if (release.commit) references.push(`[Commit](${registry.CANONICAL_REPOSITORY_URL}/commit/${release.commit})`);
    if (release.tag) references.push(`[Tag ${release.tag}](${registry.CANONICAL_REPOSITORY_URL}/releases/tag/${release.tag})`);
    if (references.length) lines.push(`Release references: ${references.join(" | ")}`, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export function readPackageVersion() {
  return JSON.parse(readFileSync(resolve(repositoryRoot, "package.json"), "utf8")).version;
}

export function readCurrentBuildVersion() {
  return process.env.STUGX_BUILD_VERSION?.trim() || readPackageVersion();
}
