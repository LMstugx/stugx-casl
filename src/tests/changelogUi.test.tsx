// @vitest-environment jsdom
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DemoGuidePanel from "../components/DemoGuidePanel";
import changelogSource from "../components/ChangelogDialog.tsx?raw";
import { getDemoProgram } from "../examples/demoPrograms";
import { I18nProvider } from "../i18n/I18nProvider";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function renderGuide(locale: "en" | "ja" | "zh-CN" = "en") {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<I18nProvider initialLocale={locale}><DemoGuidePanel program={getDemoProgram("casl-gr2-addition")!} /></I18nProvider>);
  });
}

async function openChangelog() {
  const trigger = container?.querySelector<HTMLButtonElement>('[data-testid="changelog-trigger"]');
  expect(trigger).toBeTruthy();
  await act(async () => trigger?.click());
  return trigger!;
}

describe("changelog dialog", () => {
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    localStorage.clear();
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    root = null;
    container?.remove();
    container = null;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("changelog_entry_is_accessible", async () => {
    await renderGuide();
    const trigger = container?.querySelector<HTMLButtonElement>('[data-testid="changelog-trigger"]');
    expect(trigger?.textContent).toContain("Changelog");
    expect(trigger?.type).toBe("button");
  });

  it("changelog_dialog_has_accessible_title", async () => {
    await renderGuide();
    await openChangelog();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute("aria-labelledby")).toBe("changelog-title");
    expect(document.getElementById("changelog-title")?.textContent).toBe("Changelog");
  });

  it("changelog_escape_closes", async () => {
    await renderGuide();
    await openChangelog();
    await act(async () => document.querySelector('[role="dialog"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("changelog_focus_returns_to_trigger", async () => {
    await renderGuide();
    const trigger = await openChangelog();
    await act(async () => document.querySelector('[role="dialog"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.activeElement).toBe(trigger);
  });

  it("current_badge_matches_build_version", async () => {
    await renderGuide();
    await openChangelog();
    expect(document.querySelector('[data-testid="changelog-current-version"]')?.textContent).toBe("0.1.0");
    expect(document.querySelector('[data-testid="changelog-current-badge"]')?.closest("details")?.getAttribute("data-release-version")).toBe("0.1.0");
  });

  it("external_link_is_safe", async () => {
    await renderGuide();
    await openChangelog();
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(".changelog-release-links a"));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.protocol).toBe("https:");
      expect(link.target).toBe("_blank");
      expect(link.rel).toBe("noopener noreferrer");
    }
  });

  it("release_text_is_rendered_as_text", async () => {
    await renderGuide();
    await openChangelog();
    expect(document.querySelector(".changelog-release-content")?.textContent).toContain("Cloudflare Pages");
    expect(document.querySelector(".changelog-release-content script")).toBeNull();
    expect(changelogSource).not.toContain("dangerouslySetInnerHTML");
  });

  it("no_network_request_is_made", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await renderGuide();
    await openChangelog();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("no_new_persistence_key_is_created", async () => {
    await renderGuide();
    await openChangelog();
    expect(Object.keys(localStorage)).toEqual([]);
  });

  it.each([
    ["en", "Changelog"],
    ["ja", "変更履歴"],
    ["zh-CN", "更新日志"]
  ] as const)("changelog_%s_layout_has_complete_localized_content", async (locale, title) => {
    await renderGuide(locale);
    await openChangelog();
    expect(document.getElementById("changelog-title")?.textContent).toBe(title);
    expect(document.querySelectorAll('[data-testid="changelog-release"]')).toHaveLength(3);
  });
});
