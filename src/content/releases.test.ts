import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import packageJson from "../../package.json";
import { describe, expect, it } from "vitest";
import { CANONICAL_REPOSITORY_URL, PUBLIC_WEB_URL, RELEASE_CHANNELS, RELEASE_SECTION_ORDER, RELEASES } from "./releases";

const locales = ["en", "ja", "zh-CN"] as const;
const allText = JSON.stringify(RELEASES);

describe("versioned release registry", () => {
  it("release_versions_are_unique", () => {
    expect(new Set(RELEASES.map((release) => release.version)).size).toBe(RELEASES.length);
  });

  it("release_versions_follow_version_policy", () => {
    for (const release of RELEASES) expect(release.version).toMatch(/^(?:\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?|v1\.0-rc\d+)$/);
  });

  it("releases_are_sorted_newest_first", () => {
    expect(RELEASES.map((release) => release.date)).toEqual([...RELEASES].map((release) => release.date).sort().reverse());
  });

  it("release_dates_are_valid", () => {
    for (const release of RELEASES) {
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(`${release.date}T00:00:00Z`))).toBe(false);
    }
  });

  it("all_release_titles_have_three_locales", () => {
    for (const release of RELEASES) for (const locale of locales) expect(release.title[locale]).not.toBe("");
  });

  it("all_release_summaries_have_three_locales", () => {
    for (const release of RELEASES) for (const locale of locales) expect(release.summary[locale]).not.toBe("");
  });

  it("all_release_items_have_three_locales", () => {
    for (const release of RELEASES) for (const section of release.sections) for (const item of section.items) {
      for (const locale of locales) expect(item[locale]).not.toBe("");
    }
  });

  it("release_section_types_are_valid", () => {
    for (const release of RELEASES) {
      let prior = -1;
      for (const section of release.sections) {
        const current = RELEASE_SECTION_ORDER.indexOf(section.type);
        expect(current).toBeGreaterThan(prior);
        prior = current;
      }
      expect(RELEASE_CHANNELS).toContain(release.channel);
    }
  });

  it("current_build_version_exists_once", () => {
    expect(RELEASES.filter((release) => release.version === packageJson.version)).toHaveLength(1);
  });

  it("web_and_tauri_versions_match_the_canonical_package_version", () => {
    const tauriConfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
    const cargo = readFileSync("src-tauri/Cargo.toml", "utf8");
    expect(tauriConfig.version).toBe(packageJson.version);
    expect(cargo).toMatch(new RegExp(`^version = "${packageJson.version.replace(/\./g, "\\.")}"$`, "m"));
  });

  it("release_commits_exist_when_declared", () => {
    for (const release of RELEASES) if (release.commit) {
      expect(() => execFileSync("git", ["cat-file", "-e", `${release.commit}^{commit}`], { stdio: "ignore" })).not.toThrow();
    }
  });

  it("release_tags_exist_when_declared", () => {
    for (const release of RELEASES) if (release.tag) {
      expect(() => execFileSync("git", ["cat-file", "-e", `refs/tags/${release.tag}`], { stdio: "ignore" })).not.toThrow();
    }
  });

  it("unreleased_feature_is_not_claimed", () => {
    expect(allText).not.toMatch(/supports? (?:std::)?vector|supports? lambda|complete C\+\+ support|full standard library support/i);
  });

  it("tauri_release_only_appears_if_commit_is_in_master", () => {
    expect(allText).toContain("Tauri");
    expect(() => execFileSync("git", ["merge-base", "--is-ancestor", "a792f9ee174e133dd2afec68935cb9bf23e5ba35", "HEAD"], { stdio: "ignore" })).not.toThrow();
  });

  it("release_urls_are_fixed_trusted_https_values", () => {
    expect(CANONICAL_REPOSITORY_URL).toBe("https://github.com/LMstugx/stugx-casl");
    expect(PUBLIC_WEB_URL).toBe("https://stugx-casl.pages.dev/");
    for (const release of RELEASES) if (release.webUrl) expect(release.webUrl).toBe(PUBLIC_WEB_URL);
  });

  it("release_text_contains_no_html", () => {
    expect(allText).not.toMatch(/<\/?[a-z][^>]*>/i);
  });
});
