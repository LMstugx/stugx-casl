// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../../App";
import type { LocaleStorage } from "../../i18n/localeStorage";
import type { SupportedLocale } from "../../i18n/types";
import type { LessonProgressStorage } from "../../lessonProgress/storage";
import type { LessonProgressPersistenceV1 } from "../../lessonProgress/types";
import type { ApplicationPreferenceStorage } from "../../preferences/storage";
import type { ApplicationPreferencesV1 } from "../../preferences/types";
import type { StartupSelectionStorage } from "../../startupSelection/storage";
import type { StartupSelectionV1 } from "../../startupSelection/types";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.documentElement.lang = "";
});

describe("Phase 16D bootstrap composition", () => {
  it("reads locale preferences startup and lesson progress in order before exposing one clean document", async () => {
    const order: string[] = [];
    const writes: string[] = [];
    const storage = createStorageSet(order, writes);
    await act(async () => root.render(<App {...storage} browserLocale="en-US" />));

    expect(order).toEqual(["locale", "application-preferences", "startup-selection", "lesson-progress"]);
    expect(writes).toEqual([]);
    expect(document.documentElement.lang).toBe("ja");
    expect(select<HTMLSelectElement>('[data-testid="demo-program-select"]').value).toBe("cpp-addition");
    expect(container.querySelector('[data-testid="source-mode-cpp"]')?.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelector(".source-dirty-indicator")).toBeNull();
    expect(container.querySelector('[data-testid="run-state"]')?.getAttribute("data-run-state")).toBe("Idle");
    expect(container.querySelector(".diagnostic")).toBeNull();
    expect(container.querySelector('[data-testid="generated-casl-output"]')).toBeNull();
    expect(container.querySelector(".inspector-panel")?.getAttribute("data-active-tab")).toBe("memory");
    expect(container.querySelector(".output-panel")?.getAttribute("data-active-tab")).toBe("messages");
    expect(container.querySelector('[data-testid="circuit-focus-toggle"]')?.getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelector('[data-testid="study-mode-progress"]')?.textContent).toContain("1 / 3");
  });

  it("each failed bootstrap read leaves the other storage domains usable", async () => {
    const domains = ["locale", "application-preferences", "startup-selection", "lesson-progress"] as const;
    for (const failed of domains) {
      const child = document.createElement("div");
      document.body.appendChild(child);
      const childRoot = createRoot(child);
      const storage = createStorageSet([], [], failed);
      await act(async () => childRoot.render(<App {...storage} browserLocale="en" />));
      expect(document.documentElement.lang).toBe(failed === "locale" ? "en" : "ja");
      expect(selectFrom<HTMLSelectElement>(child, '[data-testid="demo-program-select"]').value)
        .toBe(failed === "startup-selection" ? "casl-gr2-addition" : "cpp-addition");
      expect(child.querySelector(".source-dirty-indicator")).toBeNull();
      expect(child.querySelector('[data-testid="run-state"]')?.getAttribute("data-run-state")).toBe("Idle");
      expect(child.querySelector(".diagnostic")).toBeNull();
      expect(child.querySelector(".inspector-panel")?.getAttribute("data-active-tab")).toBe(failed === "application-preferences" ? "registers" : "memory");
      expect(child.querySelector('[data-testid="study-mode-progress"]')?.textContent).toContain(failed === "lesson-progress" ? "0 /" : "1 /");
      await act(async () => childRoot.unmount());
      child.remove();
    }
  });

  it("one user action writes only its owning key and unrelated renders do not write", async () => {
    const writes: string[] = [];
    const storage = createStorageSet([], writes, undefined, {
      locale: "en",
      startup: { version: 1, lastExampleId: "casl-gr2-addition" },
      preferences: { version: 1, observationMode: "cpu-flow", circuitFocusEnabled: false, inspectorActiveTab: "registers", outputDockActiveTab: "output" },
      lesson: { version: 1, entries: [] }
    });
    await act(async () => root.render(<App {...storage} browserLocale="en" />));
    expect(writes).toEqual([]);

    await act(async () => button('[data-testid="locale-ja"]').click());
    expect(writes).toEqual(["locale"]);
    await act(async () => input('[data-step-id="assemble"] input').click());
    expect(writes).toEqual(["locale", "lesson-progress"]);
    const demo = select<HTMLSelectElement>('[data-testid="demo-program-select"]');
    await act(async () => {
      demo.value = "cpp-addition";
      demo.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(writes).toEqual(["locale", "lesson-progress", "startup-selection"]);
    await act(async () => button('[data-testid="circuit-focus-toggle"]').click());
    expect(writes).toEqual(["locale", "lesson-progress", "startup-selection", "application-preferences"]);
    await act(async () => button('[data-testid="observation-mode-register-stack"]').click());
    expect(writes).toEqual(["locale", "lesson-progress", "startup-selection", "application-preferences", "application-preferences"]);
  });
});

type FailureDomain = "locale" | "application-preferences" | "startup-selection" | "lesson-progress";

function createStorageSet(
  reads: string[],
  writes: string[],
  failRead?: FailureDomain,
  overrides: {
    locale?: SupportedLocale;
    preferences?: ApplicationPreferencesV1;
    startup?: StartupSelectionV1;
    lesson?: LessonProgressPersistenceV1;
  } = {}
) {
  const locale: LocaleStorage = {
    read: () => readValue("locale", overrides.locale ?? "ja", reads, failRead),
    write: () => { writes.push("locale"); },
    clear: () => undefined
  };
  const preferences: ApplicationPreferenceStorage = {
    read: () => readValue("application-preferences", overrides.preferences ?? { version: 1, observationMode: "register-stack", circuitFocusEnabled: false, inspectorActiveTab: "memory", outputDockActiveTab: "messages" }, reads, failRead),
    write: () => { writes.push("application-preferences"); },
    clear: () => undefined
  };
  const startup: StartupSelectionStorage = {
    read: () => readValue("startup-selection", overrides.startup ?? { version: 1, lastExampleId: "cpp-addition" }, reads, failRead),
    write: () => { writes.push("startup-selection"); },
    clear: () => undefined
  };
  const lesson: LessonProgressStorage = {
    read: () => readValue("lesson-progress", overrides.lesson ?? {
      version: 1,
      entries: [
        { lessonId: "casl-gr2-addition", exampleId: "casl-gr2-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble"] },
        { lessonId: "cpp-addition", exampleId: "cpp-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble"] }
      ]
    }, reads, failRead),
    write: () => { writes.push("lesson-progress"); },
    clear: () => undefined
  };
  return { localeStorage: locale, preferenceStorage: preferences, startupSelectionStorage: startup, lessonProgressStorage: lesson };
}

function readValue<T>(domain: FailureDomain, value: T, reads: string[], failRead?: FailureDomain): T {
  reads.push(domain);
  if (domain === failRead) throw new Error(`${domain} unavailable`);
  return value;
}

function select<T extends Element>(selector: string): T {
  const element = container.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function selectFrom<T extends Element>(parent: ParentNode, selector: string): T {
  const element = parent.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

function button(selector: string): HTMLButtonElement {
  return select<HTMLButtonElement>(selector);
}

function input(selector: string): HTMLInputElement {
  return select<HTMLInputElement>(selector);
}
