import { test, expect, type Page } from "@playwright/test";
import { assemble, expectCurrentSourceInstruction, expectRegister, expectSourceContains, openStudio, run, selectDemoProgram, setSource, step, verifyCaslCompatibilityMode, verifyCometMicrocycleRuntime, verifyReverseMicrostep } from "./caslSmokeHelpers";

async function chooseTextFile(page: Page, fileName: string, text: string) {
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("open-file-button").click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: fileName, mimeType: "text/plain", buffer: Buffer.from(text, "utf8") });
}

async function switchObservationMode(page: Page, mode: "cpu-flow" | "register-stack" | "code-machine") {
  await page.getByTestId(`observation-mode-${mode}`).click();
}

async function ensureGuidedLessonOpen(page: Page) {
  const lesson = page.getByTestId("guided-lesson");
  if ((await lesson.getAttribute("open")) === null) await page.getByTestId("guided-lesson-summary").click();
}

const applicationPreferenceKey = "stugx.casl.preferences.v1";
const startupSelectionKey = "stugx.casl.startup-selection.v1";
const lessonProgressKey = "stugx.casl.lesson-progress.v1";
const localeStorageKey = "stugx.casl.locale";

test("Mock backend completes assemble and first step in the browser UI", async ({ page }) => {
  await openStudio(page, "Mock Core");

  await expect(page.getByTestId("step-button")).toBeDisabled();
  await assemble(page);
  await expectRegister(page, "register-pr", "0020");
  await expectCurrentSourceInstruction(page, /LD\s+GR2,A/);

  await step(page);
  await expectRegister(page, "register-gr2", "0003");
  await expectRegister(page, "register-pr", "0022");
  await expectCurrentSourceInstruction(page, /ADDA\s+GR2,B/);
});

test("Mock backend completes the CASL compatibility mode workflow", async ({ page }) => {
  await verifyCaslCompatibilityMode(page, "Mock Core");
});

test("Mock backend executes the COMET instruction-cycle runtime", async ({ page }) => {
  await verifyCometMicrocycleRuntime(page, "Mock Core");
});

test("Mock backend reverses one committed COMET microcycle", async ({ page }) => {
  await verifyReverseMicrostep(page, "Mock Core");
});

test("Safe application preferences restore independently from source and locale", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await page.evaluate((preferenceKey) => {
    localStorage.removeItem(preferenceKey);
    localStorage.removeItem("stugx.casl.locale");
  }, applicationPreferenceKey);
  const initialSource = await page.evaluate(() => (window as unknown as { monaco?: { editor: { getModels(): Array<{ getValue(): string }> } } }).monaco?.editor.getModels().at(-1)?.getValue());

  await page.locator("#inspector-tab-memory").click();
  await page.locator("#output-tab-messages").click();
  await page.getByTestId("circuit-focus-toggle").click();
  await switchObservationMode(page, "register-stack");

  const storedBeforeLocale = await page.evaluate((key) => localStorage.getItem(key), applicationPreferenceKey);
  expect(JSON.parse(storedBeforeLocale!)).toEqual({ version: 1, observationMode: "register-stack", circuitFocusEnabled: true, inspectorActiveTab: "memory", outputDockActiveTab: "messages" });
  expect(storedBeforeLocale).not.toMatch(/source|document|diagnostic|locale|path|handle/i);

  await page.getByTestId("locale-ja").click();
  expect(await page.evaluate((key) => localStorage.getItem(key), applicationPreferenceKey)).toBe(storedBeforeLocale);
  await page.reload();
  await expect(page.getByTestId("backend-label")).toHaveText("Mock Core");
  await expect(page.getByTestId("locale-ja")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("circuit-focus-toggle")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("circuit-focus-layout")).toHaveAttribute("data-observation-mode", "register-stack");
  await expect(page.locator(".output-panel")).toHaveAttribute("data-active-tab", "messages");
  await page.getByTestId("circuit-focus-toggle").click();
  await expect(page.locator(".inspector-panel")).toHaveAttribute("data-active-tab", "memory");
  expect(await page.evaluate(() => (window as unknown as { monaco?: { editor: { getModels(): Array<{ getValue(): string }> } } }).monaco?.editor.getModels().at(-1)?.getValue())).toBe(initialSource);
  await expect(page.locator(".source-dirty-indicator")).toHaveCount(0);

  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ version: 1, observationMode: "code-machine", circuitFocusEnabled: "invalid", inspectorActiveTab: "bad", outputDockActiveTab: "console", sourceContent: "ignored" })), applicationPreferenceKey);
  await page.reload();
  await page.getByTestId("circuit-focus-toggle").click();
  await expect(page.getByTestId("circuit-focus-layout")).toHaveAttribute("data-observation-mode", "code-machine");
  await page.getByTestId("circuit-focus-toggle").click();
  await expect(page.locator(".inspector-panel")).toHaveAttribute("data-active-tab", "registers");
  await expect(page.locator(".output-panel")).toHaveAttribute("data-active-tab", "console");

  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ version: 99, observationMode: "register-stack", circuitFocusEnabled: true })), applicationPreferenceKey);
  await page.reload();
  await expect(page.getByTestId("circuit-focus-layout")).toHaveCount(0);
  await page.getByTestId("circuit-focus-toggle").click();
  await expect(page.getByTestId("circuit-focus-layout")).toHaveAttribute("data-observation-mode", "cpu-flow");
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("Last successful built-in example restores synchronously and independently", async ({ page }) => {
  await page.addInitScript(({ startupKey, preferenceKey }) => {
    if (sessionStorage.getItem("phase16b-seeded") === "true") return;
    localStorage.setItem(startupKey, JSON.stringify({ version: 1, lastExampleId: "cpp-addition" }));
    localStorage.setItem(preferenceKey, JSON.stringify({ version: 1, observationMode: "code-machine", circuitFocusEnabled: false, inspectorActiveTab: "memory", outputDockActiveTab: "messages" }));
    localStorage.setItem("stugx.casl.locale", "en");
    sessionStorage.setItem("phase16b-seeded", "true");
  }, { startupKey: startupSelectionKey, preferenceKey: applicationPreferenceKey });

  await page.goto("/");
  await expect(page.getByTestId("backend-label")).toHaveText("Mock Core");
  await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-addition");
  await expectSourceContains(page, "int a = 10;");
  await expect(page.getByTestId("source-mode-cpp")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".source-dirty-indicator")).toHaveCount(0);
  await expect(page.getByTestId("save-file-button")).toHaveAttribute("aria-label", "Save As");
  await expect(page.getByTestId("run-state")).toHaveText("Idle");
  await expect(page.locator(".inspector-panel")).toHaveAttribute("data-active-tab", "memory");
  await expect(page.locator(".output-panel")).toHaveAttribute("data-active-tab", "messages");
  await expect(page.getByTestId("generated-casl-output")).toHaveCount(0);

  await page.getByTestId("locale-ja").click();
  await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-addition");
  await page.getByTestId("locale-zh-CN").click();
  await expectSourceContains(page, "int a = 10;");
  expect(JSON.parse((await page.evaluate((key) => localStorage.getItem(key), startupSelectionKey))!)).toEqual({ version: 1, lastExampleId: "cpp-addition" });
  await page.getByTestId("locale-en").click();

  await page.getByTestId("demo-program-select").selectOption("casl-call-return");
  await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-call-return");
  await expectSourceContains(page, "CALL  SUB");
  expect(JSON.parse((await page.evaluate((key) => localStorage.getItem(key), startupSelectionKey))!)).toEqual({ version: 1, lastExampleId: "casl-call-return" });
  await page.reload();
  await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-call-return");
  await expectSourceContains(page, "CALL  SUB");

  await chooseTextFile(page, "external.cpp", "int main() { return 9; }");
  await expect(page.getByTestId("demo-program-select")).toHaveValue("");
  await page.reload();
  await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-call-return");
  await expectSourceContains(page, "CALL  SUB");

  await page.getByTestId("new-document-button").click();
  await page.getByRole("dialog", { name: "New document" }).locator('input[value="cpp"]').check();
  await page.getByTestId("create-document").click();
  await expect(page.getByTestId("demo-program-select")).toHaveValue("");
  await page.reload();
  await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-call-return");

  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ version: 1, lastExampleId: "deleted-example" })), startupSelectionKey);
  await page.reload();
  await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-gr2-addition");
  await expectSourceContains(page, "LD    GR2,A");
  expect(JSON.parse((await page.evaluate((key) => localStorage.getItem(key), startupSelectionKey))!)).toEqual({ version: 1, lastExampleId: "deleted-example" });

  await page.evaluate(({ startupKey, preferenceKey }) => {
    localStorage.setItem(startupKey, JSON.stringify({ version: 1, lastExampleId: "cpp-addition" }));
    localStorage.setItem(preferenceKey, "{");
  }, { startupKey: startupSelectionKey, preferenceKey: applicationPreferenceKey });
  await page.reload();
  await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-addition");
  await expectSourceContains(page, "int a = 10;");
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("Built-in lesson progress restores with versioned identities and isolated storage", async ({ page }) => {
  await page.addInitScript((progressKey) => {
    if (sessionStorage.getItem("phase16c-seeded") === "true") return;
    localStorage.removeItem(progressKey);
    sessionStorage.setItem("phase16c-seeded", "true");
  }, lessonProgressKey);
  await openStudio(page, "Mock Core");
  await ensureGuidedLessonOpen(page);
  await page.locator('[data-step-id="assemble"] input').check();
  await page.locator('[data-step-id="step-ld"] input').check();
  await expect(page.getByTestId("study-mode-progress")).toContainText("2 / 4");
  const firstSnapshot = await page.evaluate((key) => localStorage.getItem(key), lessonProgressKey);
  expect(JSON.parse(firstSnapshot!)).toEqual({
    version: 1,
    entries: [{ lessonId: "casl-gr2-addition", exampleId: "casl-gr2-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble", "step-ld"] }]
  });

  await page.reload();
  await ensureGuidedLessonOpen(page);
  await expect(page.getByTestId("study-mode-progress")).toContainText("2 / 4");
  await expect(page.locator('[data-step-id="assemble"] input')).toBeChecked();
  await expect(page.locator('[data-step-id="step-ld"] input')).toBeChecked();
  await page.getByTestId("locale-ja").click();
  await expect(page.getByTestId("study-mode-progress")).toContainText("2 / 4");
  await page.getByTestId("locale-zh-CN").click();
  await expect(page.locator('[data-step-id="assemble"] input')).toBeChecked();
  expect(await page.evaluate((key) => localStorage.getItem(key), lessonProgressKey)).toBe(firstSnapshot);
  await page.getByTestId("locale-en").click();

  await page.getByTestId("demo-program-select").selectOption("cpp-addition");
  await ensureGuidedLessonOpen(page);
  await page.locator('[data-step-id="assemble"] input').check();
  await expect(page.getByTestId("study-mode-progress")).toContainText("1 / 3");
  await page.getByTestId("demo-program-select").selectOption("casl-gr2-addition");
  await ensureGuidedLessonOpen(page);
  await expect(page.getByTestId("study-mode-progress")).toContainText("2 / 4");

  await chooseTextFile(page, "external.cas", "MAIN START\n RET\n END");
  await expect(page.getByTestId("demo-guide")).toHaveCount(0);
  const afterOpen = await page.evaluate((key) => localStorage.getItem(key), lessonProgressKey);
  expect(afterOpen).toContain("casl-gr2-addition");
  expect(afterOpen).toContain("cpp-addition");
  await page.getByTestId("demo-program-select").selectOption("casl-gr2-addition");
  await ensureGuidedLessonOpen(page);
  await expect(page.getByTestId("study-mode-progress")).toContainText("2 / 4");

  await page.getByTestId("study-mode-reset").click();
  await expect(page.getByTestId("study-mode-progress")).toContainText("0 / 4");
  await page.reload();
  await ensureGuidedLessonOpen(page);
  await expect(page.getByTestId("study-mode-progress")).toContainText("0 / 4");
  const afterReset = JSON.parse((await page.evaluate((key) => localStorage.getItem(key), lessonProgressKey))!);
  expect(afterReset.entries).toEqual([{ lessonId: "cpp-addition", exampleId: "cpp-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble"] }]);

  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ version: 1, entries: [{ lessonId: "casl-gr2-addition", exampleId: "casl-gr2-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble", "deleted-step"] }] })), lessonProgressKey);
  await page.reload();
  await ensureGuidedLessonOpen(page);
  await expect(page.getByTestId("study-mode-progress")).toContainText("1 / 4");
  await expect(page.locator('[data-step-id="assemble"] input')).toBeChecked();

  await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ version: 1, entries: [{ lessonId: "casl-gr2-addition", exampleId: "casl-gr2-addition", progressCompatibilityVersion: 2, completedStepIds: ["assemble"] }] })), lessonProgressKey);
  await page.reload();
  await ensureGuidedLessonOpen(page);
  await expect(page.getByTestId("study-mode-progress")).toContainText("0 / 4");

  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(name: string, value: string) {
      if (name === key) throw new DOMException("quota", "QuotaExceededError");
      return original.call(this, name, value);
    };
  }, lessonProgressKey);
  await page.locator('[data-step-id="assemble"] input').check();
  await expect(page.getByTestId("study-mode-progress")).toContainText("1 / 4");
  await expect(page.locator(".source-dirty-indicator")).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("Four persistence keys hydrate write and fail independently", async ({ page }) => {
  const seed = async (invalidKey?: "locale" | "preferences" | "startup" | "lesson" | "all") => {
    await page.evaluate(({ localeKey, preferenceKey, startupKey, progressKey, invalidKey }) => {
      const valid = {
        locale: "ja",
        preferences: JSON.stringify({ version: 1, observationMode: "register-stack", circuitFocusEnabled: false, inspectorActiveTab: "memory", outputDockActiveTab: "messages" }),
        startup: JSON.stringify({ version: 1, lastExampleId: "cpp-addition" }),
        lesson: JSON.stringify({ version: 1, entries: [
          { lessonId: "casl-gr2-addition", exampleId: "casl-gr2-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble"] },
          { lessonId: "cpp-addition", exampleId: "cpp-addition", progressCompatibilityVersion: 1, completedStepIds: ["assemble"] }
        ] })
      };
      localStorage.setItem(localeKey, invalidKey === "locale" || invalidKey === "all" ? "invalid" : valid.locale);
      localStorage.setItem(preferenceKey, invalidKey === "preferences" || invalidKey === "all" ? '{"version":2}' : valid.preferences);
      localStorage.setItem(startupKey, invalidKey === "startup" || invalidKey === "all" ? '{"version":2}' : valid.startup);
      localStorage.setItem(progressKey, invalidKey === "lesson" || invalidKey === "all" ? '{"version":2}' : valid.lesson);
    }, { localeKey: localeStorageKey, preferenceKey: applicationPreferenceKey, startupKey: startupSelectionKey, progressKey: lessonProgressKey, invalidKey });
    await page.reload();
  };
  const expectProgress = async (count: string) => {
    const lesson = page.getByTestId("guided-lesson");
    if ((await lesson.getAttribute("open")) === null) await page.getByTestId("guided-lesson-summary").click();
    await expect(page.getByTestId("study-mode-progress")).toContainText(count);
  };

  await page.goto("/");
  await seed();
  await expect(page.getByTestId("backend-label")).toHaveText("Mock Core");
  await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-addition");
  await expectSourceContains(page, "int a = 10;");
  await expect(page.locator(".inspector-panel")).toHaveAttribute("data-active-tab", "memory");
  await expect(page.locator(".output-panel")).toHaveAttribute("data-active-tab", "messages");
  await expectProgress("1 / 3");
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("ja");
  await expect(page.locator(".source-dirty-indicator")).toHaveCount(0);
  await expect(page.getByTestId("run-state")).toHaveAttribute("data-run-state", "Idle");
  await expect(page.locator(".diagnostic")).toHaveCount(0);

  await seed("locale");
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("en");
  await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-addition");
  await expect(page.locator(".inspector-panel")).toHaveAttribute("data-active-tab", "memory");
  await expectProgress("1 / 3");

  await seed("preferences");
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("ja");
  await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-addition");
  await expect(page.locator(".inspector-panel")).toHaveAttribute("data-active-tab", "registers");
  await expectProgress("1 / 3");

  await seed("startup");
  await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-gr2-addition");
  await expectSourceContains(page, "LD    GR2,A");
  await expect(page.locator(".inspector-panel")).toHaveAttribute("data-active-tab", "memory");
  await expectProgress("1 / 4");

  await seed("lesson");
  await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-addition");
  await expectProgress("0 / 3");
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("ja");

  await seed("all");
  expect(await page.evaluate(() => document.documentElement.lang)).toBe("en");
  await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-gr2-addition");
  await expect(page.locator(".inspector-panel")).toHaveAttribute("data-active-tab", "registers");
  await expectProgress("0 / 4");

  await seed();
  await page.getByTestId("demo-program-select").selectOption("casl-gr2-addition");
  await page.evaluate(() => {
    const target = window as unknown as { __persistenceWrites: string[] };
    target.__persistenceWrites = [];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function trackedSetItem(key: string, value: string) {
      if (this === localStorage) target.__persistenceWrites.push(key);
      return original.call(this, key, value);
    };
  });
  const takeWrites = () => page.evaluate(() => {
    const target = window as unknown as { __persistenceWrites: string[] };
    const writes = [...target.__persistenceWrites];
    target.__persistenceWrites.length = 0;
    return writes;
  });

  await page.getByTestId("locale-zh-CN").click();
  expect(await takeWrites()).toEqual([localeStorageKey]);
  await page.getByTestId("locale-en").click();
  expect(await takeWrites()).toEqual([localeStorageKey]);
  await ensureGuidedLessonOpen(page);
  await page.locator('[data-step-id="assemble"] input').uncheck();
  expect(await takeWrites()).toEqual([lessonProgressKey]);
  await page.getByTestId("demo-program-select").selectOption("cpp-addition");
  expect(await takeWrites()).toEqual([startupSelectionKey]);
  await page.getByTestId("circuit-focus-toggle").click();
  expect(await takeWrites()).toEqual([applicationPreferenceKey]);
  await page.getByTestId("observation-mode-code-machine").click();
  expect(await takeWrites()).toEqual([applicationPreferenceKey]);
  await page.getByTestId("circuit-focus-toggle").click();
  expect(await takeWrites()).toEqual([applicationPreferenceKey]);

  await chooseTextFile(page, "isolated.cpp", "int main() { return 7; }");
  expect(await takeWrites()).toEqual([]);
  await page.evaluate(() => {
    delete (window as unknown as { showSaveFilePicker?: unknown }).showSaveFilePicker;
    HTMLAnchorElement.prototype.click = function click() { /* controlled download fallback */ };
  });
  await page.getByTestId("save-file-button").click();
  await expect(page.getByTestId("file-operation-notice")).toBeVisible();
  expect(await takeWrites()).toEqual([]);
  await setSource(page, "int main() { return 8; }");
  expect(await takeWrites()).toEqual([]);
  await assemble(page);
  await step(page);
  expect(await takeWrites()).toEqual([]);

  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => { throw new DOMException("blocked", "SecurityError"); } });
  });
  await page.reload();
  await expect(page.getByTestId("demo-program-select")).toHaveValue("casl-gr2-addition");
  await expect(page.locator(".source-dirty-indicator")).toHaveCount(0);
  await expect(page.getByTestId("run-state")).toHaveAttribute("data-run-state", "Idle");
  await expect(page.locator(".diagnostic")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("Browser Open replaces one document atomically and guards dirty source", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-addition");
  await assemble(page);
  await expect(page.getByTestId("generated-casl-output")).toContainText("MAIN");

  await chooseTextFile(page, "external.cpp", "int main() {\r\n  return 7;\r\n}\r\n");
  await expect(page.locator(".source-file-name")).toHaveText("external.cpp");
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expectSourceContains(page, "return 7;");
  await expect(page.getByTestId("source-mode-cpp")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("run-state")).toHaveText("Idle");
  await expect(page.getByTestId("run-button")).toBeDisabled();
  await expect(page.getByTestId("step-button")).toBeDisabled();
  await expect(page.getByTestId("generated-casl-output")).not.toContainText("MAIN START");
  await expect(page.locator(".diagnostic")).toHaveCount(0);
  await expect(page.getByTestId("demo-program-select")).toHaveValue("");

  await setSource(page, "int main() { return 8; }");
  await expect(page.locator(".source-dirty-indicator")).toBeVisible();
  await page.getByTestId("open-file-button").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expectSourceContains(page, "return 8;");

  await page.getByTestId("open-file-button").click();
  const cancelChooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("discard-and-open").click();
  const cancelledChooser = await cancelChooserPromise;
  await cancelledChooser.setFiles([]);
  await expectSourceContains(page, "return 8;");
  await expect(page.locator(".source-dirty-indicator")).toBeVisible();

  await page.getByTestId("open-file-button").click();
  const caslChooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("discard-and-open").click();
  const caslChooser = await caslChooserPromise;
  await caslChooser.setFiles({ name: "external.cas", mimeType: "text/plain", buffer: Buffer.from("MAIN START\n RET\n END", "utf8") });
  await expect(page.locator(".source-file-name")).toHaveText("external.cas");
  await expectSourceContains(page, "MAIN START");
  await expect(page.getByTestId("source-mode-casl")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".source-dirty-indicator")).toHaveCount(0);

  const sourceBeforeLocale = await page.evaluate(() => (window as unknown as { monaco?: { editor: { getModels(): Array<{ getValue(): string }> } } }).monaco?.editor.getModels().at(-1)?.getValue());
  await page.getByTestId("locale-ja").click();
  await page.getByTestId("locale-zh-CN").click();
  await expect(page.locator(".source-file-name")).toHaveText("external.cas");
  expect(await page.evaluate(() => (window as unknown as { monaco?: { editor: { getModels(): Array<{ getValue(): string }> } } }).monaco?.editor.getModels().at(-1)?.getValue())).toBe(sourceBeforeLocale);
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("Browser Save As creates a session binding and later Save reuses it", async ({ page }) => {
  await page.addInitScript(() => {
    const browserWindow = window as unknown as {
      showSaveFilePicker: () => Promise<{ name: string; createWritable: () => Promise<{ write(data: Uint8Array): Promise<void>; close(): Promise<void> }> }>;
      __savedWrites: string[];
    };
    browserWindow.__savedWrites = [];
    browserWindow.showSaveFilePicker = async () => ({
      name: "saved.cpp",
      createWritable: async () => ({
        write: async (data) => { browserWindow.__savedWrites.push(new TextDecoder().decode(data)); },
        close: async () => undefined
      })
    });
  });
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-addition");
  await setSource(page, "int main() { return 9; }");

  await expect(page.getByTestId("save-file-button")).toHaveAttribute("aria-label", "Save As");
  await page.getByTestId("save-file-button").click();
  await expect(page.locator(".source-file-name")).toHaveText("saved.cpp");
  await expect(page.locator(".source-dirty-indicator")).toHaveCount(0);
  await expect(page.getByTestId("save-file-button")).toHaveAttribute("aria-label", "Save");
  await expect(page.getByTestId("file-operation-notice")).toContainText("Saved");

  await setSource(page, "int main() { return 10; }");
  await page.getByTestId("save-file-button").click();
  await expect(page.locator(".source-dirty-indicator")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __savedWrites: string[] }).__savedWrites)).toEqual([
    "int main() { return 9; }",
    "int main() { return 10; }"
  ]);
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const locale of ["ja", "zh-CN", "en"] as const) {
    await page.getByTestId(`locale-${locale}`).click();
    await expect(page.locator(".source-file-name")).toHaveText("saved.cpp");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test("Browser download fallback is presented as Saved a copy and remains Save As", async ({ page }) => {
  await page.addInitScript(() => {
    const browserWindow = window as unknown as { showSaveFilePicker?: unknown; __downloadNames: string[] };
    delete browserWindow.showSaveFilePicker;
    browserWindow.__downloadNames = [];
    URL.createObjectURL = () => "blob:test-save";
    URL.revokeObjectURL = () => undefined;
    HTMLAnchorElement.prototype.click = function click() { browserWindow.__downloadNames.push(this.download); };
  });
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-push-pop-stack");
  await setSource(page, "MAIN START\n RET\n END");
  await page.getByTestId("save-file-button").click();
  await expect(page.getByTestId("file-operation-notice")).toContainText("Saved a copy");
  await expect(page.getByTestId("save-file-button")).toHaveAttribute("aria-label", "Save As");
  expect(await page.evaluate(() => (window as unknown as { __downloadNames: string[] }).__downloadNames)).toEqual(["main.cas"]);
});

test("Save and Open guard waits for a successful save before replacement", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { showSaveFilePicker: () => Promise<unknown> }).showSaveFilePicker = async () => ({
      name: "guarded.cpp",
      createWritable: async () => ({ write: async () => undefined, close: async () => undefined })
    });
  });
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-addition");
  await setSource(page, "int main() { return 20; }");
  await page.getByTestId("open-file-button").click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("save-and-open").click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: "replacement.cas", mimeType: "text/plain", buffer: Buffer.from("MAIN START\n RET\n END", "utf8") });
  await expect(page.locator(".source-file-name")).toHaveText("replacement.cas");
  await expect(page.locator(".source-dirty-indicator")).toHaveCount(0);
});

test("Editing while Save As is pending keeps the newer revision dirty", async ({ page }) => {
  await page.addInitScript(() => {
    const browserWindow = window as unknown as { showSaveFilePicker: () => Promise<unknown>; __finishSave?: () => void };
    browserWindow.showSaveFilePicker = async () => ({
      name: "pending.cpp",
      createWritable: async () => ({
        write: async () => undefined,
        close: () => new Promise<void>((resolve) => { browserWindow.__finishSave = resolve; })
      })
    });
  });
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-addition");
  await setSource(page, "int main() { return 21; }");
  await page.getByTestId("save-file-button").click();
  await expect(page.getByTestId("save-file-button")).toHaveAttribute("aria-busy", "true");
  await setSource(page, "int main() { return 22; }");
  await page.evaluate(() => (window as unknown as { __finishSave?: () => void }).__finishSave?.());
  await expect(page.getByTestId("file-operation-notice")).toContainText("still unsaved");
  await expect(page.locator(".source-dirty-indicator")).toBeVisible();
  await expect(page.getByTestId("save-file-button")).toHaveAttribute("aria-label", "Save");
});

test("New and Demo replacement use the shared intent guard", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { showSaveFilePicker: () => Promise<unknown> }).showSaveFilePicker = async () => ({
      name: "before-switch.cpp",
      createWritable: async () => ({ write: async () => undefined, close: async () => undefined })
    });
  });
  await openStudio(page, "Mock Core");

  await page.getByTestId("new-document-button").click();
  const newDialog = page.getByRole("dialog", { name: "New document" });
  await expect(newDialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await newDialog.locator('input[value="cpp"]').check();
  await newDialog.getByTestId("create-document").click();
  await expect(page.locator(".source-file-name")).toHaveText("Untitled");
  await expect(page.getByTestId("source-mode-cpp")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("run-state")).toHaveText("Idle");
  await expect(page.locator(".source-dirty-indicator")).toHaveCount(0);

  await setSource(page, "int main() { return 15; }");
  await page.getByTestId("new-document-button").click();
  await page.getByRole("dialog", { name: "New document" }).locator('input[value="casl"]').check();
  await page.getByTestId("create-document").click();
  await expect(page.getByTestId("save-and-open")).toHaveText("Save and create");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expectSourceContains(page, "return 15;");

  await page.getByTestId("demo-program-select").selectOption("cpp-addition");
  await expect(page.getByTestId("demo-program-select")).toHaveValue("");
  await expect(page.getByTestId("save-and-open")).toHaveText("Save and switch");
  const sourceBeforeLocale = await page.evaluate(() => (window as unknown as { monaco?: { editor: { getModels(): Array<{ getValue(): string }> } } }).monaco?.editor.getModels().at(-1)?.getValue());
  await page.getByTestId("locale-ja").evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByTestId("save-and-open")).not.toHaveText("Save and switch");
  await page.getByTestId("locale-zh-CN").evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByTestId("demo-program-select")).toHaveValue("");
  expect(await page.evaluate(() => (window as unknown as { monaco?: { editor: { getModels(): Array<{ getValue(): string }> } } }).monaco?.editor.getModels().at(-1)?.getValue())).toBe(sourceBeforeLocale);
  await page.getByTestId("locale-en").evaluate((button: HTMLButtonElement) => button.click());
  await page.getByTestId("save-and-open").click();

  await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-addition");
  await expectSourceContains(page, "int main()");
  await expect(page.locator(".source-dirty-indicator")).toHaveCount(0);
  await expect(page.getByTestId("run-state")).toHaveText("Idle");
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("Concurrent edit during guarded save blocks Demo replacement", async ({ page }) => {
  await page.addInitScript(() => {
    const browserWindow = window as unknown as { showSaveFilePicker: () => Promise<unknown>; __finishGuardedSave?: () => void };
    browserWindow.showSaveFilePicker = async () => ({
      name: "guarded-switch.cas",
      createWritable: async () => ({
        write: async () => undefined,
        close: () => new Promise<void>((resolve) => { browserWindow.__finishGuardedSave = resolve; })
      })
    });
  });
  await openStudio(page, "Mock Core");
  await setSource(page, "MAIN START\n RET\n END\n; dirty");
  await page.getByTestId("demo-program-select").selectOption("cpp-addition");
  await page.getByTestId("save-and-open").click();
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as { __finishGuardedSave?: () => void }).__finishGuardedSave))).toBe(true);
  await setSource(page, "MAIN START\n RET\n END\n; edited while saving");
  await page.evaluate(() => (window as unknown as { __finishGuardedSave?: () => void }).__finishGuardedSave?.());

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("demo-program-select")).not.toHaveValue("cpp-addition");
  await expectSourceContains(page, "edited while saving");
  await expect(page.locator(".source-dirty-indicator")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
});

test("Mock backend shows project overview and keeps learning demo views working", async ({ page }) => {
  await openStudio(page, "Mock Core");

  await page.getByTestId("project-overview-summary").click();
  await expect(page.getByTestId("project-overview")).toContainText("stugx.CASL");
  await expect(page.getByTestId("project-overview")).toContainText("Learning Studio");
  await expect(page.getByTestId("project-overview")).toContainText("C++ subset -> Generated CASL II Assembly -> COMET II Machine Code");
  await expect(page.getByTestId("project-overview")).not.toContainText(/contest|hackathon/i);

  await expect(page.getByTestId("guided-lesson")).toBeVisible();
  await page.getByTestId("guided-lesson-summary").click();
  await expect(page.getByTestId("study-mode-progress")).toContainText("0 /");
  await page.getByTestId("study-mode-step-checkbox").first().check();
  await expect(page.getByTestId("study-mode-progress")).toContainText("1 /");

  await selectDemoProgram(page, "cpp-break-continue");
  await expect(page.getByTestId("guided-lesson")).toContainText("FOR_CONTINUE");
  await expect(page.getByTestId("guided-lesson")).toContainText("FOR_END");
  await expect(page.getByTestId("study-mode-progress")).toContainText("0 /");
  await page.getByTestId("study-mode-step-checkbox").first().check();
  await expect(page.getByTestId("study-mode-progress")).toContainText("1 /");
  await page.getByTestId("study-mode-reset").click();
  await expect(page.getByTestId("study-mode-progress")).toContainText("0 /");

  await selectDemoProgram(page, "cpp-addition");
  await expect(page.getByTestId("guided-lesson")).toContainText("Generated CASL");
  await expect(page.getByTestId("guided-lesson")).toContainText("Machine Code");

  await selectDemoProgram(page, "cpp-break-continue");
  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_CONTINUE_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("break -> FOR_END_0");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("JUMP FOR_CONTINUE_0");
  await expect(page.getByTestId("machine-code-output")).toContainText("JUMP FOR_END_0");
});

test("Changelog is offline, keyboard accessible, localized, and stable at 1280", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, "Mock Core");
  const requests: string[] = [];
  const trackRequest = (request: { url(): string }) => requests.push(request.url());
  page.on("request", trackRequest);

  await page.getByTestId("project-overview-summary").click();
  const trigger = page.getByTestId("changelog-trigger");
  await trigger.click();
  await expect(page.getByRole("dialog", { name: "Changelog" })).toBeVisible();
  await expect(page.getByTestId("changelog-current-version")).toHaveText("0.1.0");
  await expect(page.getByTestId("changelog-current-badge")).toHaveText("Current");
  const older = page.locator('[data-testid="changelog-release"][data-release-version="v1.0-rc10"]');
  await older.locator("summary").focus();
  await older.locator("summary").press("Enter");
  await expect(older).toHaveJSProperty("open", true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await page.getByTestId("locale-ja").click();
  await page.getByTestId("changelog-trigger").click();
  await expect(page.getByRole("dialog", { name: "変更履歴" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByTestId("locale-zh-CN").click();
  await page.getByTestId("changelog-trigger").click();
  await expect(page.getByRole("dialog", { name: "更新日志" })).toBeVisible();
  await page.keyboard.press("Escape");

  page.off("request", trackRequest);
  expect(requests).toEqual([]);
});

test("Mock backend runs CASL logic operations and shows machine code", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-logic-operations");

  await assemble(page);
  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("AND GR1,MASK");
  await expect(page.getByTestId("machine-code-output")).toContainText("OR GR1,B");
  await expect(page.getByTestId("machine-code-output")).toContainText("XOR GR1,C");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr1", "0002");
  await page.getByRole("tab", { name: "Memory" }).click();
  await expect(page.getByTestId("memory-view-row-002F")).toContainText("RESULT");
  await expect(page.getByTestId("memory-view-row-002F")).toContainText("0002");
});

test("Mock backend runs CASL shift operations and shows shifter path", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-shift-operations");
  await page.getByTestId("circuit-focus-toggle").click();

  await assemble(page);
  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("SLL GR1,1");
  await expect(page.getByTestId("machine-code-output")).toContainText("SRL GR1,1");
  await expect(page.getByTestId("machine-code-output")).toContainText("SLA GR1,1");
  await expect(page.getByTestId("machine-code-output")).toContainText("SRA GR1,1");

  const circuit = page.getByTestId("comet-circuit-svg");
  await step(page);
  await step(page);

  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("SLL");
  await expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='alu-shift-badge']")).toContainText("SLL");
  await expect(circuit.locator("[data-testid='wire-shift-count-to-alu']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-shift-count-to-alu']")).toHaveAttribute("data-lane", "data-compute");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveCount(0);
  await expect(circuit.locator("[data-testid='module-memory']")).toHaveAttribute("data-active", "false");
  await expect(circuit.locator("[data-testid='module-mdr']")).toHaveAttribute("data-active", "false");
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr1")).toContainText("0006");
});

test("Mock backend runs CASL index addressing and explains effective address", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-index-addressing");
  await page.getByTestId("circuit-focus-toggle").click();

  await assemble(page);
  await step(page);
  await step(page);

  const circuit = page.getByTestId("comet-circuit-svg");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("LD");
  await expect(circuit.locator("[data-testid='register-gr2']")).toHaveAttribute("data-index", "true");
  await expect(circuit.locator("[data-testid='effective-address-unit']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='effective-address-unit']")).toContainText("Address Unit");
  await expect(circuit.locator("[data-testid='effective-address-base-row']")).toContainText("0027");
  await expect(circuit.locator("[data-testid='effective-address-index-row']")).toContainText("GR2=0001");
  await expect(circuit.locator("[data-testid='effective-address-ea-row']")).toContainText("0028");
  await expect(circuit.locator("[data-testid='memory-row-0028']")).toHaveAttribute("data-read", "true");
  await expect(circuit.locator("[data-testid='wire-base-to-eau']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-index-to-eau']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-eau-to-mar']")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("Base");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("EA");
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr1")).toContainText("0014");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await page.getByTestId("machine-code-row-0022").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("x = GR2");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("0001");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("0028");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await switchObservationMode(page, "register-stack");
  await expect(page.locator("[data-testid='focus-memory-window-row'][data-address='0029']")).toContainText("RESULT");
  await expect(page.locator("[data-testid='focus-memory-window-row'][data-address='0029']")).toContainText("0014");
});

test("Mock backend runs CASL PUSH POP stack demo and shows stack path", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-push-pop-stack");
  await page.getByTestId("circuit-focus-toggle").click();

  await assemble(page);
  await step(page);
  await step(page);

  const circuit = page.getByTestId("comet-circuit-svg");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("PUSH");
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-sp-to-mar-preview']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-FFFD']")).toHaveAttribute("data-write", "true");
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-stack-preview").locator("[data-testid='stack-preview-row'][data-address='FFFD']")).toHaveAttribute("data-write", "true");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("SP");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("Stack");

  await switchObservationMode(page, "cpu-flow");
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("POP");
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-gr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-FFFD']")).toHaveAttribute("data-read", "true");
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr1")).toContainText("0029");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await switchObservationMode(page, "register-stack");
  await expect(page.locator("[data-testid='focus-memory-window-row'][data-address='002A']")).toContainText("RESULT");
  await expect(page.locator("[data-testid='focus-memory-window-row'][data-address='002A']")).toContainText("0029");
});

test("Mock backend runs CASL CALL RETURN demo and shows stack-aware RET", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-call-return");
  await page.getByTestId("circuit-focus-toggle").click();

  await assemble(page);
  await step(page);
  await step(page);

  const circuit = page.getByTestId("comet-circuit-svg");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("CALL");
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='module-pr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-return-address-to-mdr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-eau-to-pr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-FFFD']")).toHaveAttribute("data-write", "true");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("Return");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("Depth");
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-call-stack")).toBeVisible();
  await expect(page.getByTestId("call-stack-depth")).toHaveText("1");
  await expect(page.getByTestId("call-stack-return-address")).toHaveText("0024");
  await expect(page.getByTestId("call-stack-routine")).toHaveText("SUB");
  await expect(page.getByTestId("call-stack-ret-mode")).toHaveText("Stack return");
  await expect(page.getByTestId("focus-call-stack")).toContainText("Call target SUB; return 0024");

  await switchObservationMode(page, "cpu-flow");
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ADDA");
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("RET");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-pr']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-FFFD']")).toHaveAttribute("data-read", "true");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ST GR1,RESULT");
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("call-stack-depth")).toHaveText("0");
  await expect(page.getByTestId("call-stack-return-address")).toHaveText("0024");
  await expect(page.getByTestId("call-stack-ret-mode")).toHaveText("Stack return");
  await expect(page.getByTestId("focus-call-stack")).toContainText("Return to 0024 from MEM[FFFD]");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expect(page.getByTestId("call-stack-depth")).toHaveText("0");
  await expect(page.getByTestId("call-stack-ret-mode")).toHaveText("Top-level finish");
  await switchObservationMode(page, "cpu-flow");
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
  await switchObservationMode(page, "register-stack");
  await page.getByTestId("circuit-focus-toggle").click();
  await page.getByRole("tab", { name: "Memory" }).click();
  await expect(page.getByTestId("memory-view-row-002B")).toContainText("RESULT");
  await expect(page.getByTestId("memory-view-row-002B")).toContainText("0006");
});

test("Mock backend keeps circuit focus paths anchored to rows", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-gr2-addition");
  await assemble(page);

  const circuit = page.getByTestId("comet-circuit-svg");
  await step(page);
  await expect(circuit.locator("[data-testid='register-gr2']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-0027']")).toHaveAttribute("data-read", "true");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveClass(/circuit-wire--data-flow/);
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-from-anchor", "memory.0027.left");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-to-anchor", "mdr.right");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).not.toHaveAttribute("marker-end", /.+/);
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).not.toHaveAttribute("marker-mid", /.+/);
  await expect(circuit.locator("[data-testid='wire-terminal-memory-to-mdr']")).toHaveCount(0);
  await expect(circuit.locator("[data-active-terminal='true']")).toHaveCount(0);
  await expect(circuit.locator("[data-testid='wire-junction-memory-to-mdr-0']")).toHaveCount(0);
  await expect(circuit.locator("[data-testid='junction-data-right']")).toHaveCount(0);
  await expect(circuit.locator("[data-testid^='memory-terminal-marker-']")).toHaveCount(0);
  await expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "false");
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");

  await step(page);
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveClass(/circuit-wire--data-flow/);
  await expect(circuit.locator("[data-testid='wire-mdr-to-alu']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-alu-to-fr']")).toHaveClass(/circuit-wire--flag-flow/);
  await expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "true");

  await step(page);
  await expect(circuit.locator("[data-testid='memory-row-0029']")).toHaveAttribute("data-write", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveClass(/circuit-wire--data-flow/);
  await expect(circuit.locator("[data-testid^='memory-terminal-marker-']")).toHaveCount(0);
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
});

test("Mock backend presents Circuit Focus Mode as a teaching layout", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-gr2-addition");
  await page.getByTestId("circuit-focus-toggle").click();

  await expect(page.getByTestId("circuit-focus-layout")).toBeVisible();
  await expect(page.getByTestId("focus-program-panel")).toBeVisible();
  await expect(page.getByTestId("focus-display-panel")).toContainText("No output");
  await expect(page.getByTestId("focus-current-instruction-panel")).toBeVisible();
  await expect(page.getByTestId("focus-circuit-panel")).toContainText("Circuit Focus Mode");
  await expect(page.getByTestId("observation-mode-selector")).toBeVisible();
  await expect(page.getByTestId("focus-memory-window")).toBeVisible();
  await expect(page.getByTestId("focus-signal-probe")).toBeVisible();
  await expect(page.getByTestId("focus-trace-panel")).toBeVisible();
  await expect(page.getByTestId("focus-step-timeline")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Output" })).toBeVisible();

  await assemble(page);
  const circuit = page.getByTestId("comet-circuit-svg");

  await step(page);
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
  await expect(circuit.locator("[data-testid='wire-guide-sp-to-mar-preview']")).toHaveCount(0);
  await expect(circuit.locator("[data-testid='wire-guide-mar-to-stack-memory-preview']")).toHaveCount(0);
  await expect(circuit.locator("[data-active='false'][data-path-id]")).toHaveCount(0);
  await expect(circuit).toContainText("DATA BUS");
  await expect(circuit).toContainText("ADDR BUS");
  await expect(circuit).toContainText("CTRL");
  await expect(page.getByTestId("focus-program-current-line")).toContainText(/LD\s+GR2,A/);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("LD");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Current PR");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("0020");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next PR");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("0022");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ADDA GR2,B");
  await expect(page.getByTestId("focus-current-instruction-panel")).not.toContainText(/^Ready$/);
  await expect(page.getByTestId("source-map-highlight")).toHaveAttribute("data-current-line", "2");
  await expect(page.getByTestId("focus-source-context-text")).toContainText(/LD\s+GR2,A/);
  await expect(page.getByTestId("focus-trace-latest")).toContainText(/LD/);
  await expect(circuit.locator("[data-testid='register-gr2']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='memory-row-0027']")).toHaveAttribute("data-read", "true");
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveClass(/circuit-wire--data-flow/);
  await expect(circuit.locator("[data-testid='wire-mdr-to-gr']")).toHaveAttribute("data-lane", "data-bypass");
  await expect(circuit.locator("[data-testid='wire-mdr-to-gr']")).toHaveAttribute("data-avoids-alu", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-gr']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='status-indicator-read']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='status-indicator-exec']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("GR2");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("MDR");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("Stack preview only");

  await step(page);
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("focus-program-current-line")).toContainText(/ADDA\s+GR2,B/);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ADDA");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Current PR");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("0022");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next PR");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("0024");
  await expect(page.getByTestId("source-map-highlight")).toHaveAttribute("data-current-line", "3");
  await expect(page.getByTestId("focus-source-context-text")).toContainText(/ADDA\s+GR2,B/);
  await expect(page.getByTestId("focus-trace-latest")).toContainText(/ADDA/);
  await expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveAttribute("data-lane", "data-compute");
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveAttribute("data-to-anchor", "alu.inputA");
  await expect(circuit.locator("[data-testid='wire-mdr-to-alu']")).toHaveAttribute("data-to-anchor", "alu.inputB");
  await expect(circuit.locator("[data-testid='wire-alu-to-gr']")).toHaveAttribute("data-from-anchor", "alu.outputY");
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveClass(/circuit-wire--data-flow/);
  await expect(circuit.locator("[data-testid='wire-alu-to-fr']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-alu-to-fr']")).toHaveClass(/circuit-wire--flag-flow/);
  await expect(circuit.locator("[data-testid='status-indicator-exec']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='status-indicator-flag']")).toHaveAttribute("data-active", "true");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("ALU.Y");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("0003");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("0007");

  await step(page);
  await expect(circuit.locator("[data-testid='module-sp']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("focus-program-current-line")).toContainText(/ST\s+GR2,C/);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("ST");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Current PR");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("0024");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next PR");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("0026");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("Next");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("RET");
  await expect(page.getByTestId("source-map-highlight")).toHaveAttribute("data-current-line", "4");
  await expect(page.getByTestId("focus-source-context-text")).toContainText(/ST\s+GR2,C/);
  await expect(page.getByTestId("focus-trace-latest")).toContainText(/ST/);
  await expect(circuit.locator("[data-testid='memory-row-0029']")).toHaveAttribute("data-write", "true");
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toBeVisible();
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveClass(/circuit-wire--flow/);
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveClass(/circuit-wire--data-flow/);
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveAttribute("data-to-anchor", "memory.0029.left");
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).not.toHaveAttribute("marker-end", /.+/);
  await expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).not.toHaveAttribute("marker-mid", /.+/);
  await expect(circuit.locator("[data-testid='wire-terminal-mdr-to-memory']")).toHaveCount(0);
  await expect(circuit.locator("[data-active-terminal='true']")).toHaveCount(0);
  await expect(circuit.locator("[data-testid='wire-gr-to-mdr']")).toHaveAttribute("data-lane", "data-bypass");
  await expect(circuit.locator("[data-testid='wire-gr-to-mdr']")).toHaveAttribute("data-avoids-alu", "true");
  await expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "false");
  await expect(circuit.locator("[data-testid='module-fr']")).toHaveAttribute("data-active", "false");
  await expect(circuit.locator("[data-testid='status-indicator-write']")).toHaveAttribute("data-active", "true");
  await expect(circuit.locator("[data-testid='status-indicator-exec']")).toHaveAttribute("data-active", "false");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("MEM[0029]");
});

test("Mock backend switches observation modes without resetting VM state", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "casl-gr2-addition");
  await page.getByTestId("circuit-focus-toggle").click();
  await assemble(page);
  await step(page);

  await switchObservationMode(page, "cpu-flow");
  await expect(page.getByTestId("focus-circuit-panel")).toBeVisible();
  await expect(page.getByTestId("focus-memory-window-row")).toHaveCount(9);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("LD");

  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr0")).toBeVisible();
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr7")).toBeVisible();
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-pr")).toContainText("0022");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-sp")).toContainText("FFFE");
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-fr")).toBeVisible();
  await expect(page.getByTestId("focus-stack-preview")).toBeVisible();
  await expect(page.getByTestId("focus-memory-window-row")).toHaveCount(10);

  await switchObservationMode(page, "code-machine");
  await expect(page.getByTestId("focus-generated-casl-panel")).toBeVisible();
  await expect(page.getByTestId("focus-machine-code-panel")).toBeVisible();
  await expect(page.getByTestId("focus-trace-panel")).toContainText("LD");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("LD");
});

test("Mock backend shows Stack Frame View FramePlan preview in Register Stack mode", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  const sourceEditorMarker = page.locator('[data-testid="source-editor-frame-symbol-marker"][data-slot-id="add:argument:a:1"]').first();
  await expect(sourceEditorMarker).toBeVisible();
  await sourceEditorMarker.click();
  await expect(sourceEditorMarker).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("circuit-focus-toggle").click();
  await assemble(page);
  await switchObservationMode(page, "register-stack");

  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr0")).toBeVisible();
  await expect(page.getByTestId("focus-register-bank").getByTestId("register-gr7")).toBeVisible();
  await expect(page.getByTestId("focus-stack-preview")).toBeVisible();
  await expect(page.getByTestId("focus-stack-frame-view")).toBeVisible();
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("Design preview");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("Not runtime state");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("Simple static locals");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("No live stack frame locals yet");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("GR0");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("GR1 / GR2 / GR3");
  await expect(page.getByTestId("stack-frame-function-select")).toContainText("main");
  await expect(page.getByTestId("stack-frame-function-select")).toContainText("add");
  await expect(page.getByTestId("focus-memory-window-row")).toHaveCount(10);

  await page.getByTestId("stack-frame-function-select").selectOption("add");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("FUNC_ADD_A");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("FUNC_ADD_B");
  await expect(page.getByTestId("focus-stack-frame-view")).not.toContainText("live value");

  await expect(page.getByTestId("stack-frame-view-details-summary")).toHaveAttribute("aria-expanded", "false");
  await page.getByTestId("stack-frame-view-details-summary").focus();
  await expect(page.getByTestId("stack-frame-view-details-summary")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("stack-frame-view-details-summary")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("StackFramePlan");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("FrameSlot");
  await expect(page.getByTestId("stack-frame-view-state")).toHaveAttribute("data-has-live-frame", "false");
  await expect(page.getByTestId("stack-frame-view-state")).toHaveAttribute("data-runtime-state", "false");
  await expect(page.locator('[data-slot-id="add:argument:a:1"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("Source Editor");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("GR1");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("FUNC_ADD_A");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("not runtime");

  const prBeforeSlotSelection = await page.getByTestId("focus-register-bank").getByTestId("register-pr").textContent();
  await page.getByTestId("stack-frame-view-state").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.locator('[data-slot-id="add:argument:a:1"]').click();
  await expect(page.locator('[data-slot-id="add:argument:a:1"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("a");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("argument");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("static label FUNC_ADD_A");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("GR1 -> FUNC_ADD_A");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("stack frame argument slot");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("Runtime value unavailable");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("a");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("GR1");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("FUNC_ADD_A");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("frame arg");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("not runtime");
  await expect(page.getByTestId("signal-probe-frame-slot-row").first()).toHaveAttribute("data-active", "false");
  await page.locator('[data-slot-id="add:argument:b:2"]').focus();
  await expect(page.locator('[data-slot-id="add:argument:b:2"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-slot-id="add:argument:b:2"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("stack-frame-slot-detail")).toContainText("FUNC_ADD_B");
  await page.getByTestId("stack-frame-function-select").selectOption("main");
  await expect(page.locator('[data-testid="stack-frame-future-slot"][data-selected="true"]')).toHaveCount(0);
  await page.getByTestId("stack-frame-view-state").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.locator('[data-slot-id="main:local:result:1"]').click();
  await expect(page.locator('[data-slot-id="main:local:result:1"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("result");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("MAIN_RESULT");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("frame local");
  await expect(page.getByTestId("signal-probe-frame-slot-relation")).toContainText("not runtime");
  expect(await page.getByTestId("focus-register-bank").getByTestId("register-pr").textContent()).toBe(prBeforeSlotSelection);
});

test("Mock backend wires Generated CASL and source chips to FramePlan slots", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  await page.getByTestId("circuit-focus-toggle").click();
  await assemble(page);
  await switchObservationMode(page, "code-machine");

  const slotBadge = page.locator('[data-testid="generated-casl-slot-badge"][data-slot-id="add:argument:a:1"]').first();
  await expect(slotBadge).toBeVisible();
  await slotBadge.click();
  await expect(slotBadge).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("focus-frame-slot-relation")).toContainText("a");
  await expect(page.getByTestId("focus-frame-slot-relation")).toContainText("argument");
  await expect(page.getByTestId("focus-frame-slot-relation")).toContainText("FUNC_ADD_A");
  await expect(page.getByTestId("focus-frame-slot-relation")).toContainText("Generated CASL");
  await expect(page.getByTestId("focus-frame-slot-relation")).toContainText("Runtime value unavailable");

  await switchObservationMode(page, "register-stack");
  await page.getByTestId("stack-frame-view-state").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(page.locator('[data-slot-id="add:argument:a:1"]')).toHaveAttribute("aria-pressed", "true");

  await switchObservationMode(page, "code-machine");
  await page.getByTestId("source-frame-slot-chip").first().click();
  await expect(page.getByTestId("focus-frame-slot-relation")).toContainText("Source Context");

  await page.getByTestId("circuit-focus-toggle").click();
  await selectDemoProgram(page, "casl-gr2-addition");
  await page.getByTestId("circuit-focus-toggle").click();
  await switchObservationMode(page, "register-stack");
  await expect(page.locator('[data-testid="stack-frame-future-slot"][data-selected="true"]')).toHaveCount(0);
});

test("focus_mode_works_at_1280x720", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, "Mock Core");
  await expect(page.getByTestId("source-editor")).toBeVisible();
  await selectDemoProgram(page, "cpp-function-arguments");
  await expect(page.getByTestId("demo-program-select")).toHaveAttribute("title", "C++: Function Arguments");
  await expect(page.getByTestId("demo-program-select")).toHaveAttribute("aria-label", "Demo program: C++: Function Arguments");
  await page.getByTestId("circuit-focus-toggle").click();
  await assemble(page);

  await expect(page.getByTestId("focus-program-panel")).toBeVisible();
  await expect(page.getByTestId("focus-circuit-panel")).toBeVisible();
  await expect(page.getByTestId("focus-signal-probe")).toBeVisible();
  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-call-stack")).toBeVisible();
  await expect(page.getByTestId("focus-stack-preview")).toBeVisible();
  await expect(page.getByTestId("focus-stack-frame-view")).toBeVisible();
  await expect(page.locator(".output-panel")).toBeVisible();

  await expect(page.getByTestId("circuit-focus-toggle")).toHaveAttribute("aria-label", "Return to studio layout");
  await page.getByTestId("circuit-focus-toggle").focus();
  await expect(page.getByTestId("circuit-focus-toggle")).toBeFocused();

  await step(page);
  await step(page);
  await step(page);
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("CALL");

  await expect(page.getByTestId("signal-probe-details-summary")).toHaveAttribute("aria-expanded", "false");
  await page.getByTestId("signal-probe-details-summary").focus();
  await expect(page.getByTestId("signal-probe-details-summary")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("signal-probe-details-summary")).toHaveAttribute("aria-expanded", "true");

  await expect(page.getByTestId("call-stack-details-summary")).toHaveAttribute("aria-expanded", "false");
  await page.getByTestId("call-stack-details-summary").focus();
  await expect(page.getByTestId("call-stack-details-summary")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("call-stack-details-summary")).toHaveAttribute("aria-expanded", "true");

  await page.getByTestId("stack-frame-view-details-summary").focus();
  await expect(page.getByTestId("stack-frame-view-details-summary")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("stack-frame-view-details-summary")).toHaveAttribute("aria-expanded", "true");

  const focusUsesPageScroll = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 24);
  expect(focusUsesPageScroll).toBe(true);

  const appShellOverflow = await page.locator(".app-shell").evaluate((element) => getComputedStyle(element).overflowY);
  expect(appShellOverflow).not.toBe("hidden");

  const signalProbeBodyOverflow = await page.locator(".signal-probe-body").first().evaluate((element) => getComputedStyle(element).overflowY);
  expect(signalProbeBodyOverflow).toBe("visible");

  const stackFrameBodyOverflow = await page.getByTestId("stack-frame-view-state").evaluate((element) => getComputedStyle(element).overflowY);
  expect(stackFrameBodyOverflow).toBe("visible");

  for (const testId of ["focus-current-instruction-panel", "focus-signal-probe", "focus-call-stack", "focus-stack-preview", "focus-stack-frame-view", "focus-trace-panel"]) {
    const hasHorizontalOverflow = await page.getByTestId(testId).evaluate((element) => element.scrollWidth > element.clientWidth + 1);
    expect(hasHorizontalOverflow, `${testId} should not overflow horizontally`).toBe(false);
  }
});

test("focus_mode_works_at_1440x900", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  await page.getByTestId("circuit-focus-toggle").click();
  await assemble(page);

  await expect(page.getByTestId("focus-program-panel")).toBeVisible();
  await expect(page.getByTestId("focus-circuit-panel")).toBeVisible();
  await expect(page.getByTestId("focus-memory-window")).toBeVisible();
  await expect(page.getByTestId("focus-trace-panel")).toBeVisible();
  await expect(page.getByTestId("focus-step-timeline")).toBeVisible();
  await expect(page.locator(".output-panel")).toBeVisible();
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(horizontalOverflow).toBe(false);
});

test("keyboard tab navigation and 1280 viewport remain consistent", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, "Mock Core");

  const focusToggle = page.getByTestId("circuit-focus-toggle");
  await expect(focusToggle).toHaveAttribute("aria-pressed", "false");

  const registersTab = page.getByRole("tab", { name: "Open Registers inspector tab" });
  await registersTab.focus();
  await page.keyboard.press("ArrowRight");
  const memoryTab = page.getByRole("tab", { name: "Open Memory inspector tab" });
  await expect(memoryTab).toBeFocused();
  await expect(memoryTab).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(registersTab).toBeFocused();
  await expect(registersTab).toHaveAttribute("aria-selected", "true");

  const outputTab = page.getByRole("tab", { name: "Open Output Log tab" });
  await outputTab.focus();
  await page.keyboard.press("End");
  const machineTab = page.getByRole("tab", { name: "Open Machine Code tab" });
  await expect(machineTab).toBeFocused();
  await expect(machineTab).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(outputTab).toBeFocused();

  await focusToggle.click();
  await expect(focusToggle).toHaveAttribute("aria-pressed", "true");
  const cpuFlowTab = page.getByRole("tab", { name: "Observation mode: CPU Flow" });
  const registerStackTab = page.getByRole("tab", { name: "Observation mode: Registers / Stack" });
  const codeMachineTab = page.getByRole("tab", { name: "Observation mode: Code / Machine" });
  await cpuFlowTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(registerStackTab).toBeFocused();
  await expect(registerStackTab).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(codeMachineTab).toBeFocused();
  await expect(codeMachineTab).toHaveAttribute("aria-selected", "true");

  for (const tab of [cpuFlowTab, registerStackTab, codeMachineTab]) {
    await tab.click();
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(hasHorizontalOverflow).toBe(false);
  }

  const newDocument = page.getByTestId("new-document-button");
  await expect(newDocument).toBeEnabled();
  await expect(newDocument).toHaveAttribute("aria-label", "New document");
});

test("locale switching preserves source execution and FramePlan UI state", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  await page.getByTestId("guided-lesson-summary").click();
  await page.getByTestId("study-mode-step-checkbox").first().check();
  const lessonProgressBefore = await page.getByTestId("study-mode-progress").textContent();
  await assemble(page);
  await step(page);
  const generatedBefore = await page.getByTestId("generated-casl-line-current").textContent();
  await page.getByTestId("circuit-focus-toggle").click();
  await switchObservationMode(page, "code-machine");
  const slotBadge = page.locator('[data-testid="generated-casl-slot-badge"][data-slot-id="add:argument:a:1"]').first();
  await slotBadge.click();

  const programBefore = await page.getByTestId("focus-program-panel").locator("code").allTextContents();
  const traceBefore = await page.getByTestId("focus-trace-panel").locator("code").allTextContents();
  const instructionBefore = await page.getByTestId("focus-current-instruction-panel").locator("code").allTextContents();
  const selectorWidthBefore = (await page.getByTestId("locale-selector").boundingBox())?.width;

  const japanese = page.getByTestId("locale-ja");
  await japanese.focus();
  await page.keyboard.press("Enter");
  await expect(japanese).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByTestId("observation-mode-code-machine")).toContainText("コード / 機械語");
  await expect(slotBadge).toHaveAttribute("aria-pressed", "true");
  expect(await page.getByTestId("focus-program-panel").locator("code").allTextContents()).toEqual(programBefore);
  expect(await page.getByTestId("focus-trace-panel").locator("code").allTextContents()).toEqual(traceBefore);
  expect(await page.getByTestId("focus-current-instruction-panel").locator("code").allTextContents()).toEqual(instructionBefore);
  expect((await page.getByTestId("locale-selector").boundingBox())?.width).toBe(selectorWidthBefore);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

  const chinese = page.getByTestId("locale-zh-CN");
  await chinese.focus();
  await page.keyboard.press("Space");
  await expect(chinese).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(slotBadge).toHaveAttribute("aria-pressed", "true");

  await page.getByTestId("locale-en").click();
  await page.getByTestId("circuit-focus-toggle").click();
  await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-function-arguments");
  await expect(page.getByTestId("study-mode-progress")).toHaveText(lessonProgressBefore ?? "");
  expect(await page.getByTestId("generated-casl-line-current").textContent()).toBe(generatedBefore);

  await japanese.click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByTestId("locale-ja")).toHaveAttribute("aria-pressed", "true");
});

test("Phase 14B short UI strings translate without changing program state", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-addition");
  const sourceBefore = await page.evaluate(() => (window as unknown as { monaco?: { editor: { getModels(): Array<{ getValue(): string }> } } }).monaco?.editor.getModels().at(-1)?.getValue());
  await assemble(page);
  await step(page);

  const generatedBefore = await page.getByTestId("generated-casl-line-current").textContent();
  const currentLineBefore = await page.getByTestId("generated-casl-line-current").getAttribute("data-line");
  const prBefore = await page.getByTestId("register-pr").textContent();
  const toolbarWidthBefore = (await page.locator(".toolbar").boundingBox())?.width;

  await page.getByTestId("locale-ja").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.locator("#output-tab-output")).toHaveText("出力ログ");
  await expect(page.locator("#output-tab-console")).toHaveText("コンソール");
  await expect(page.locator("#output-tab-generated")).toHaveText("生成CASL");
  await expect(page.locator("#output-tab-machine")).toHaveText("機械語");
  await page.locator("#output-tab-messages").click();
  await expect(page.locator("#output-panel-messages")).toContainText("メッセージなし");
  await page.locator("#inspector-tab-memory").click();
  await expect(page.getByTestId("memory-go-button")).toHaveText("移動");
  await expect(page.getByTestId("memory-jump-start")).toHaveText("プログラム");
  await expect(page.getByTestId("memory-jump-read")).toHaveText("読み取り");
  await expect(page.getByTestId("memory-jump-write")).toHaveText("書き込み");

  for (const tab of await page.locator(".dock-tabs [role=tab]").all()) {
    expect(await tab.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  }
  for (const label of await page.locator(".toolbar-actions .tool-button > span").all()) {
    expect(await label.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  }
  for (const tab of await page.locator(".inspector-panel .compact-tabs [role=tab]").all()) {
    expect(await tab.evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  }
  const inspectorBoxes = await page.locator(".inspector-panel .compact-tabs [role=tab]").evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right };
    })
  );
  for (let index = 1; index < inspectorBoxes.length; index += 1) {
    expect(inspectorBoxes[index - 1].right).toBeLessThanOrEqual(inspectorBoxes[index].left + 1);
  }

  await page.locator("#output-tab-generated").click();
  await page.locator("#inspector-tab-registers").click();
  expect(await page.evaluate(() => (window as unknown as { monaco?: { editor: { getModels(): Array<{ getValue(): string }> } } }).monaco?.editor.getModels().at(-1)?.getValue())).toBe(sourceBefore);
  expect(await page.getByTestId("generated-casl-line-current").textContent()).toBe(generatedBefore);
  expect(await page.getByTestId("generated-casl-line-current").getAttribute("data-line")).toBe(currentLineBefore);
  expect(await page.getByTestId("register-pr").textContent()).toBe(prBefore);
  expect((await page.locator(".toolbar").boundingBox())?.width).toBe(toolbarWidthBefore);

  await page.getByTestId("locale-zh-CN").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.locator("#output-tab-output")).toHaveText("输出日志");
  await expect(page.locator("#output-tab-generated")).toHaveText("生成的 CASL");
  await expect(page.locator("#output-tab-machine")).toHaveText("机器码");
  await page.locator("#inspector-tab-memory").click();
  await expect(page.getByTestId("memory-go-button")).toHaveText("转到");
  await expect(page.getByTestId("memory-jump-read")).toHaveText("读取");
  await expect(page.getByTestId("memory-jump-write")).toHaveText("写入");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByTestId("locale-zh-CN")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("locale-en").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("Phase 18A.1 keeps toolbar and source header stable across desktop locales", async ({ page }) => {
  await openStudio(page, "Mock Core");
  const viewports = [
    { width: 1180, height: 700 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 }
  ];
  const localeIds = ["locale-en", "locale-ja", "locale-zh-CN"] as const;

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const localeId of localeIds) {
      await page.getByTestId(localeId).click();
      const localeSelector = page.getByTestId("locale-selector");
      const toolbar = page.locator(".toolbar");
      const actions = page.locator(".toolbar-actions");
      const sourceHeader = page.getByTestId("source-panel-header");
      const sourceTitle = sourceHeader.getByRole("heading");
      const demoPicker = sourceHeader.locator(".demo-program-picker");
      const modeSwitch = sourceHeader.locator(".source-mode");
      const boxes = await Promise.all([
        toolbar.boundingBox(),
        actions.boundingBox(),
        localeSelector.boundingBox(),
        sourceHeader.boundingBox(),
        sourceTitle.boundingBox(),
        demoPicker.boundingBox(),
        modeSwitch.boundingBox()
      ]);
      const [toolbarBox, actionBox, localeBox, sourceHeaderBox, titleBox, demoBox, modeBox] = boxes;
      expect(toolbarBox && actionBox && localeBox && sourceHeaderBox && titleBox && demoBox && modeBox).toBeTruthy();
      expect(actionBox!.x + actionBox!.width).toBeLessThanOrEqual(localeBox!.x + 1);
      expect(localeBox!.x + localeBox!.width).toBeLessThanOrEqual(toolbarBox!.x + toolbarBox!.width + 1);
      expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(demoBox!.x + 1);
      expect(demoBox!.x + demoBox!.width).toBeLessThanOrEqual(modeBox!.x + 1);
      expect(modeBox!.x + modeBox!.width).toBeLessThanOrEqual(sourceHeaderBox!.x + sourceHeaderBox!.width + 1);
      await expect(demoPicker.locator("span")).toHaveText("Demo");
      await expect(page.getByTestId("locale-ja")).toHaveText("JP");

      const localeWidths = await localeSelector.locator("button").evaluateAll((buttons) =>
        buttons.map((button) => button.getBoundingClientRect().width)
      );
      expect(Math.min(...localeWidths)).toBeGreaterThanOrEqual(34);
      expect(Math.max(...localeWidths) - Math.min(...localeWidths)).toBeLessThanOrEqual(0.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  }
});

test("Phase 18A.1 bounds long diagnostics and keeps selected context visible", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, "Mock Core");
  const invalidLines = Array.from({ length: 28 }, (_, index) => `     BAD${index} GR9`).join("\n");
  await setSource(page, `MAIN START\n${invalidLines}\n     END`);
  await page.getByTestId("assemble-button").click();

  const diagnostics = page.locator(".diagnostic");
  expect(await diagnostics.count()).toBeGreaterThanOrEqual(20);
  const list = page.getByTestId("diagnostic-list");
  const errorsPanel = page.getByTestId("errors-panel");
  const sourceEditor = page.getByTestId("source-editor");
  const metrics = await list.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY
  }));
  expect(metrics.clientHeight).toBeGreaterThanOrEqual(168);
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  expect(metrics.overflowY).toBe("auto");
  expect((await errorsPanel.boundingBox())!.height).toBeLessThanOrEqual(365);
  expect((await sourceEditor.boundingBox())!.height).toBeGreaterThanOrEqual(175);

  const listBox = (await list.boundingBox())!;
  const fullyVisibleRows = await page.locator(".diagnostic-entry").evaluateAll((entries, listBounds) =>
    entries.filter((entry) => {
      const row = entry.getBoundingClientRect();
      return row.top >= listBounds.top - 1 && row.bottom <= listBounds.bottom + 1;
    }).length,
    { top: listBox.y, bottom: listBox.y + listBox.height }
  );
  expect(fullyVisibleRows).toBeGreaterThanOrEqual(4);

  const lastDiagnostic = diagnostics.last();
  await lastDiagnostic.click();
  await expect(lastDiagnostic).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("diagnostic-context")).toBeVisible();
  const selectedListBox = (await list.boundingBox())!;
  const selectedBox = (await lastDiagnostic.locator("..").boundingBox())!;
  expect(selectedBox.y).toBeGreaterThanOrEqual(selectedListBox.y - 1);
  expect(selectedBox.y + selectedBox.height).toBeLessThanOrEqual(selectedListBox.y + selectedListBox.height + 1);
  const selectedCode = await lastDiagnostic.getAttribute("data-diagnostic-code");
  await page.getByTestId("locale-ja").click();
  await expect(page.locator(`.diagnostic[data-diagnostic-code="${selectedCode}"]`).last()).toHaveAttribute("aria-selected", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.getByTestId("source-mode-casl").click();
  await setSource(page, "MAIN START\nA DC 1\nA DC 2\n END");
  await page.getByTestId("assemble-button").click();
  await page.locator('.diagnostic[data-diagnostic-code="assembler.duplicateLabel"]').click();
  const contextDetails = page.getByTestId("diagnostic-context").locator(".diagnostic-context-details");
  await expect(contextDetails).not.toHaveAttribute("open", "");
  await contextDetails.locator("summary").press("Enter");
  await expect(contextDetails).toHaveAttribute("open", "");
  await expect(contextDetails.getByRole("button")).toBeVisible();
});

test("Phase 14C localizes Circuit Focus compact UI without changing technical state", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");
  await assemble(page);
  await step(page);
  await step(page);
  await step(page);
  const generatedBefore = await page.getByTestId("generated-casl-line-current").textContent();

  await page.getByTestId("circuit-focus-toggle").click();
  const instructionBefore = await page.getByTestId("focus-current-instruction-panel").locator("code").allTextContents();
  const programBefore = await page.getByTestId("focus-program-panel").locator("code").allTextContents();
  const traceBefore = await page.getByTestId("focus-trace-panel").locator("code").allTextContents();

  await page.getByTestId("locale-ja").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(page.getByTestId("focus-current-instruction-panel")).toContainText("現在の命令");
  await expect(page.getByTestId("focus-step-timeline")).toContainText("ステップタイムライン");
  await expect(page.getByTestId("focus-signal-probe")).toContainText("信号プローブ");
  expect(await page.getByTestId("focus-current-instruction-panel").locator("code").allTextContents()).toEqual(instructionBefore);
  expect(await page.getByTestId("focus-program-panel").locator("code").allTextContents()).toEqual(programBefore);
  expect(await page.getByTestId("focus-trace-panel").locator("code").allTextContents()).toEqual(traceBefore);

  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-stack-preview")).toContainText("スタックプレビュー");
  await expect(page.getByTestId("focus-call-stack")).toContainText("コールスタック");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("スタックフレーム表示");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("実行時状態ではない");
  const registerBefore = await page.getByTestId("focus-register-bank").locator("code").allTextContents();
  const memoryBefore = await page.getByTestId("focus-memory-window").locator("code").allTextContents();

  await switchObservationMode(page, "code-machine");
  const machineWordsBefore = await page.getByTestId("focus-machine-code-panel").locator("code").allTextContents();
  const slotBadge = page.locator('[data-testid="generated-casl-slot-badge"][data-slot-id="add:argument:a:1"]').first();
  await slotBadge.click();
  await expect(slotBadge).toHaveAttribute("aria-pressed", "true");

  await page.getByTestId("locale-zh-CN").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByTestId("focus-generated-casl-panel")).toContainText("生成的 CASL");
  await expect(page.getByTestId("focus-machine-code-panel")).toContainText("机器码");
  await expect(page.getByTestId("focus-frame-slot-relation")).toContainText("非运行时状态");
  await expect(slotBadge).toHaveAttribute("aria-pressed", "true");
  expect(await page.getByTestId("focus-machine-code-panel").locator("code").allTextContents()).toEqual(machineWordsBefore);

  await switchObservationMode(page, "register-stack");
  await expect(page.getByTestId("focus-stack-preview")).toContainText("栈预览");
  await expect(page.getByTestId("focus-call-stack")).toContainText("调用栈");
  await expect(page.getByTestId("focus-stack-frame-view")).toContainText("栈帧视图");
  await expect(page.locator('[data-testid="stack-frame-future-slot"][data-selected="true"]')).toHaveAttribute("data-slot-id", "add:argument:a:1");
  expect(await page.getByTestId("focus-register-bank").locator("code").allTextContents()).toEqual(registerBefore);
  expect(await page.getByTestId("focus-memory-window").locator("code").allTextContents()).toEqual(memoryBefore);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

  await page.getByTestId("locale-en").click();
  await page.getByTestId("circuit-focus-toggle").click();
  await expect(page.getByTestId("demo-program-select")).toHaveValue("cpp-function-arguments");
  await expect(page.getByTestId("source-mode-cpp")).toHaveAttribute("aria-pressed", "true");
  expect(await page.getByTestId("generated-casl-line-current").textContent()).toBe(generatedBefore);

  await page.getByTestId("locale-zh-CN").click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await expect(page.getByTestId("locale-zh-CN")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("locale-en").click();
});

test("Phase 14D rerenders structured diagnostics without reassembly or state mutation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, "Mock Core");
  await setSource(page, "MAIN START\n     LD GR1,MISSING\n     END");
  await page.getByTestId("assemble-button").click();

  const diagnostic = page.locator('.diagnostic[data-diagnostic-code="assembler.unknownSymbol"]').first();
  await expect(diagnostic).toBeVisible();
  const sourceBefore = await page.getByTestId("source-editor").locator(".view-lines").textContent();
  const countBefore = await page.locator(".diagnostic").count();
  const lineBefore = await diagnostic.locator(".diagnostic-location").textContent();
  const runStateBefore = await page.getByTestId("run-state").getAttribute("data-run-state");

  await page.getByTestId("locale-ja").click();
  await expect(diagnostic.locator(".diagnostic-message")).toContainText("MISSING");
  await expect(diagnostic.locator(".diagnostic-message")).toContainText("未定義");
  await expect(diagnostic).toHaveAttribute("data-diagnostic-code", "assembler.unknownSymbol");
  expect(await page.locator(".diagnostic").count()).toBe(countBefore);
  expect(await page.getByTestId("source-editor").locator(".view-lines").textContent()).toBe(sourceBefore);
  expect(await page.getByTestId("run-state").getAttribute("data-run-state")).toBe(runStateBefore);

  await page.getByTestId("locale-zh-CN").click();
  await expect(diagnostic.locator(".diagnostic-message")).toContainText("MISSING");
  await expect(diagnostic.locator(".diagnostic-message")).toContainText("未定义");
  expect(await diagnostic.locator(".diagnostic-location").textContent()).not.toBe(lineBefore);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

  await page.getByTestId("source-mode-cpp").click();
  await setSource(page, "int main() {\n  return missing;\n}");
  await page.getByTestId("assemble-button").click();
  const cppDiagnostic = page.locator('.diagnostic[data-diagnostic-code="semantic.unknownVariable"]').first();
  await expect(cppDiagnostic.locator(".diagnostic-message")).toContainText("missing");
  await expect(cppDiagnostic.locator(".diagnostic-message")).toContainText("未声明");
  await page.getByTestId("locale-en").click();
  await expect(cppDiagnostic.locator(".diagnostic-message")).toContainText('Variable "missing" is not declared.');
});

test("Phase 14E diagnostic ranges and related locations remain stable across locales", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, "Mock Core");
  await setSource(page, "MAIN START\n     LD GR1,MISSING\n     END");
  await page.getByTestId("assemble-button").click();

  const diagnostic = page.locator('.diagnostic[data-diagnostic-code="assembler.unknownSymbol"]').first();
  await diagnostic.click();
  const entry = diagnostic.locator("..");
  await expect(entry).toHaveAttribute("data-selected", "true");
  await expect(page.locator(".diagnostic-source-range-inline")).toContainText("MISSING");
  const selectedText = await page.locator(".diagnostic-source-range-inline").textContent();

  await page.getByTestId("locale-ja").click();
  await expect(entry).toHaveAttribute("data-selected", "true");
  expect(await page.locator(".diagnostic-source-range-inline").textContent()).toBe(selectedText);
  await page.getByTestId("locale-zh-CN").click();
  await expect(entry).toHaveAttribute("data-selected", "true");

  await setSource(page, "MAIN START\nA DC 1\nA DC 2\n END");
  await page.getByTestId("assemble-button").click();
  const duplicate = page.locator('.diagnostic[data-diagnostic-code="assembler.duplicateLabel"]').first();
  await duplicate.click();
  await expect(page.locator(".diagnostic-source-range-inline")).toContainText("A");
  const related = page.getByTestId("diagnostic-context");
  await expect(related).toContainText(/2/);

  await page.getByTestId("source-mode-cpp").click();
  await setSource(page, "int main() {\n  return missing;\n}");
  await page.getByTestId("assemble-button").click();
  const cppDiagnostic = page.locator('.diagnostic[data-diagnostic-code="semantic.unknownVariable"]').first();
  await cppDiagnostic.click();
  await expect(page.locator(".diagnostic-source-range-inline")).toContainText("missing");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("Phase 14F parser diagnostics localize without reparsing or moving selection", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, "Mock Core");
  await page.getByTestId("source-mode-cpp").click();
  const source = "int main() {\n  int value = 1\n  return value;\n}";
  await setSource(page, source);
  await page.getByTestId("assemble-button").click();

  const diagnostic = page.locator('.diagnostic[data-diagnostic-code="cppParser.missingSemicolon"]').first();
  await expect(diagnostic).toBeVisible();
  await diagnostic.click();
  const entry = diagnostic.locator("..");
  const count = await page.locator(".diagnostic").count();
  const editorText = await page.evaluate(() => (window as unknown as { monaco?: { editor: { getModels(): Array<{ getValue(): string }> } } }).monaco?.editor.getModels().at(-1)?.getValue());
  await expect(page.getByTestId("diagnostic-context")).toContainText("cpp-parser");

  await page.getByTestId("locale-ja").click();
  await expect(diagnostic.locator(".diagnostic-message")).toContainText("セミコロン");
  await expect(entry).toHaveAttribute("data-selected", "true");
  expect(await page.locator(".diagnostic").count()).toBe(count);
  expect(await page.evaluate(() => (window as unknown as { monaco?: { editor: { getModels(): Array<{ getValue(): string }> } } }).monaco?.editor.getModels().at(-1)?.getValue())).toBe(editorText);

  await page.getByTestId("locale-zh-CN").click();
  await expect(diagnostic.locator(".diagnostic-message")).toContainText("缺少分号");
  await expect(entry).toHaveAttribute("data-selected", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

  await page.getByTestId("locale-en").click();
  await page.getByTestId("source-mode-casl").click();
  await setSource(page, "MAIN START\n LD GR1\n END");
  await page.getByTestId("assemble-button").click();
  await expect(page.locator('.diagnostic[data-diagnostic-code="assembler.missingOperand"]')).toContainText("LD");
});

test("Phase 14G stable P2 diagnostic localizes without changing identity or source state", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, "Mock Core");
  await page.getByTestId("source-mode-cpp").click();
  const source = "int foo() { return 0; } int FOO() { return 0; } int main() { return 0; }";
  await setSource(page, source);
  await page.getByTestId("assemble-button").click();

  const diagnostic = page.locator('.diagnostic[data-diagnostic-code="transpiler.generatedLabelConflict"]').first();
  await expect(diagnostic).toBeVisible();
  await diagnostic.click();
  const entry = diagnostic.locator("..");
  const count = await page.locator(".diagnostic").count();
  const englishMessage = await diagnostic.locator(".diagnostic-message").textContent();
  const editorText = await page.evaluate(() => (window as unknown as { monaco?: { editor: { getModels(): Array<{ getValue(): string }> } } }).monaco?.editor.getModels().at(-1)?.getValue());
  await expect(page.locator(".diagnostic-source-range-inline")).toContainText("FOO");
  await expect(page.getByTestId("diagnostic-context")).toContainText("transpiler");

  await page.getByTestId("locale-ja").click();
  await expect(diagnostic.locator(".diagnostic-message")).toContainText("FOO");
  await expect(diagnostic.locator(".diagnostic-message")).toContainText("FUNC_FOO");
  expect(await diagnostic.locator(".diagnostic-message").textContent()).not.toBe(englishMessage);
  await expect(entry).toHaveAttribute("data-selected", "true");

  await page.getByTestId("locale-zh-CN").click();
  await expect(diagnostic.locator(".diagnostic-message")).toContainText("FOO");
  expect(await page.locator(".diagnostic").count()).toBe(count);
  expect(await page.evaluate(() => (window as unknown as { monaco?: { editor: { getModels(): Array<{ getValue(): string }> } } }).monaco?.editor.getModels().at(-1)?.getValue())).toBe(editorText);
  await expect(entry).toHaveAttribute("data-selected", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("Phase 14H diagnostic baseline keeps accessible selection related navigation and insertion markers", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openStudio(page, "Mock Core");
  await page.getByTestId("source-mode-cpp").click();
  const source = "int foo() { return 0; } int FOO() { return 0; } int main() { return 0; }";
  await setSource(page, source);
  await page.getByTestId("assemble-button").click();

  const list = page.getByRole("listbox", { name: "Errors" });
  const diagnostic = page.locator('.diagnostic[data-diagnostic-code="transpiler.generatedLabelConflict"]').first();
  const context = page.getByTestId("diagnostic-context");
  const details = context.locator(".diagnostic-context-details");
  await expect(list).toBeVisible();
  await expect(diagnostic).toHaveRole("option");
  await expect(diagnostic).toHaveAccessibleName(/Error.*FOO.*FUNC_FOO/);
  await expect(diagnostic).not.toContainText("transpiler.generatedLabelConflict");
  await diagnostic.click();
  await expect(diagnostic).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".diagnostic-source-range-inline")).toContainText("FOO");

  if (await details.count()) {
    await expect(details).not.toHaveAttribute("open", "");
    await details.locator("summary").press("Enter");
  }
  await expect(context.locator(".diagnostic-technical-detail").first()).toContainText("transpiler.generatedLabelConflict");
  const related = context.getByRole("button", { name: /First declared here.*Line 1/ });
  await related.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".diagnostic-source-range-inline")).toContainText("foo");
  await expect(diagnostic).toHaveAttribute("aria-selected", "true");

  await page.getByTestId("locale-ja").click();
  await expect(diagnostic).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".diagnostic-source-range-inline")).toContainText("foo");
  await page.getByTestId("locale-zh-CN").click();
  await expect(diagnostic).toHaveAttribute("aria-selected", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);

  await page.getByTestId("locale-en").click();
  await setSource(page, "int main() { int value = 1 return value; }");
  await page.getByTestId("assemble-button").click();
  const insertionDiagnostic = page.locator('.diagnostic[data-diagnostic-code="cppParser.missingSemicolon"]').first();
  await insertionDiagnostic.click();
  await expect(page.locator(".diagnostic-source-range-glyph")).toBeVisible();
  await expect(insertionDiagnostic).toHaveAttribute("aria-selected", "true");
});

test("Mock backend executes C++ subset if else lowering in the browser UI", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await page.getByTestId("source-mode-cpp").click();
  await setSource(
    page,
    `int main() {
    int a = 10;
    int b = 10;
    int c;
    if (a == b) {
        c = 1;
    } else {
        c = 0;
    }
    return c;
}`
  );

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("JZE");

  for (let index = 0; index < 7; index += 1) {
    await step(page);
  }

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0001");
});

test("Mock backend shows generated CASL and machine code for C++ addition", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-addition");

  await assemble(page);
  await expect(page.getByTestId("generated-casl-output")).toContainText("Generated CASL II Assembly");
  await expect(page.getByTestId("generated-casl-output")).toContainText("LD");
  await expect(page.getByTestId("generated-casl-output")).toContainText("ADDA");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("0020");
  await expect(page.getByTestId("machine-code-output")).toContainText("1010");
  await expect(page.getByTestId("machine-code-output")).toContainText("0027");
  await expect(page.getByTestId("machine-code-output")).toContainText("LD GR1,A");
  await expect(page.getByTestId("machine-code-row-0020")).toHaveAttribute("data-pr", "true");
  await page.getByTestId("machine-code-row-0020").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("LD");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("GR1");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("Operand");
  await page.getByTestId("machine-code-row-0021").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("operand word");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("address of A");

  await step(page);
  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-row-0022")).toHaveAttribute("data-pr", "true");
});

test("Mock backend executes C++ function call lowering", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-call");

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("FUNC_ADDONE");
  await expect(page.getByTestId("generated-casl-output")).toContainText("CALL");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("CALL FUNC_ADDONE");
  await page.getByTestId("machine-code-output").locator('[data-testid^="machine-code-row-"]').filter({ hasText: "CALL FUNC_ADDONE" }).first().click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("Push return address");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0001");
  await page.getByRole("tab", { name: "Trace" }).click();
  await expect(page.getByTestId("trace-list")).toContainText("CALL");
  await expect(page.getByTestId("trace-list")).toContainText("RET");
});

test("Mock backend executes C++ single argument function lowering", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-argument");

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,5");
  await expect(page.getByTestId("generated-casl-output")).toContainText("CALL");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FUNC_ADDONE");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,FUNC_ADDONE_X");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0006");
  await page.getByRole("tab", { name: "Trace" }).click();
  await expect(page.getByTestId("trace-list")).toContainText("CALL");
  await expect(page.getByTestId("trace-list")).toContainText("RET");
});

test("Mock backend executes C++ multi-register argument function lowering", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-function-arguments");

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,2");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR2,3");
  await expect(page.getByTestId("generated-casl-output")).toContainText("CALL");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FUNC_ADD");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR1,FUNC_ADD_A");
  await expect(page.getByTestId("generated-casl-output")).toContainText("GR2,FUNC_ADD_B");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0005");
  await page.getByRole("tab", { name: "Trace" }).click();
  await expect(page.getByTestId("trace-list")).toContainText("CALL");
  await expect(page.getByTestId("trace-list")).toContainText("RET");
});

test("Mock backend executes C++ subset while sum in the browser UI", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-while-sum");
  await expect(page.getByTestId("run-state")).toHaveText("Idle");
  await expect(page.getByTestId("demo-guide-expected-result")).toContainText("GR0 = 0006");

  await assemble(page);
  await expect(page.getByTestId("generated-casl-heading")).toHaveText("This CASL II code was generated from the C++ subset source.");
  await expect(page.getByTestId("generated-casl-output")).toContainText("LOOP_BEGIN_0");

  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0006");
  await page.getByRole("tab", { name: "Trace" }).click();
  await expect(page.getByTestId("trace-list")).toContainText("Step 36");
  await expect(page.getByTestId("trace-item").first().getByTestId("trace-row-effect")).toBeVisible();
  await expect(page.getByTestId("trace-item").first().getByTestId("trace-row-note")).toBeVisible();
  await page.getByRole("tab", { name: "Memory" }).click();
  await expect(page.locator(".inspector-panel")).toContainText("SUM");
  await page.getByRole("tab", { name: "Output" }).click();
  await expect(page.getByText("Run finished after")).toBeVisible();
});

test("Mock backend executes C++ subset for sum and shows generated machine code", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-for-sum");

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_BEGIN_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_BODY_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_END_0");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("JUMP FOR_BEGIN_0");
  await page.getByTestId("machine-code-row-0020").click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("Opcode");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0006");
});

test("Mock backend executes C++ subset for sum syntax sugar", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-for-sum-sugar");

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_BEGIN_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("ADDA");
  await expect(page.getByTestId("generated-casl-output")).toContainText("ST");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("ADDA GR1,CONST_1");
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0006");
});

test("Mock backend executes C++ subset break and continue lowering", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-break-continue");

  await assemble(page);
  await page.getByRole("tab", { name: "Generated CASL" }).click();
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_CONTINUE_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("FOR_END_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("continue -> FOR_CONTINUE_0");
  await expect(page.getByTestId("generated-casl-output")).toContainText("break -> FOR_END_0");

  await page.getByRole("tab", { name: "Machine Code" }).click();
  await expect(page.getByTestId("machine-code-output")).toContainText("JUMP FOR_CONTINUE_0");
  await expect(page.getByTestId("machine-code-output")).toContainText("JUMP FOR_END_0");
  await page.getByTestId("machine-code-output").locator('[data-testid^="machine-code-row-"]').filter({ hasText: "JUMP FOR_CONTINUE_0" }).first().click();
  await expect(page.getByTestId("machine-code-explanation")).toContainText("FOR_CONTINUE_0");
  await expect(page.getByTestId("machine-code-explanation")).toContainText("continue");

  await run(page);
  await expect(page.getByTestId("run-state")).toHaveText("Finished");
  await expectRegister(page, "register-gr0", "0004");
  await page.getByRole("tab", { name: "Trace" }).click();
  await expect(page.getByTestId("trace-list")).toContainText("FOR_CONTINUE_0");
  await expect(page.getByTestId("trace-list")).toContainText("FOR_END_0");
});

test("Mock backend stops runaway while programs at maxSteps and can reset", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await page.getByTestId("source-mode-cpp").click();
  await setSource(
    page,
    `int main() {
    int i = 1;
    while (i > 0) {
        i = i + 1;
    }
    return i;
}`
  );

  await assemble(page);
  await run(page);

  await expect(page.getByTestId("run-state")).toHaveText("Stopped", { timeout: 15_000 });
  await page.getByRole("tab", { name: "Output" }).click();
  await expect(page.getByText("Max steps reached. Possible infinite loop.")).toBeVisible();
  await expect(page.getByTestId("run-button")).toBeDisabled();
  await expect(page.getByTestId("step-button")).toBeDisabled();
  await expect(page.getByTestId("reset-button")).toBeEnabled();

  await page.getByTestId("reset-button").click();
  await expect(page.getByTestId("run-state")).toHaveText("Ready");
});

test("Mock backend memory viewer can inspect an extended range and highlight writes", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await assemble(page);

  const circuitPanel = page.locator(".circuit-panel");
  const circuitHeightBefore = (await circuitPanel.boundingBox())?.height ?? 0;

  await page.getByRole("tab", { name: "Memory" }).click();
  await page.getByTestId("memory-start-input").fill("0020");
  await page.getByTestId("memory-row-count").selectOption("64");
  await page.getByTestId("memory-go-button").click();

  const circuitHeightAfter = (await circuitPanel.boundingBox())?.height ?? 0;
  expect(circuitHeightAfter).toBeLessThanOrEqual(circuitHeightBefore + 40);
  const memoryScroll = page.locator(".inspector-content[data-active-tab='memory'] .memory-table-scroll");
  await expect(memoryScroll).toBeVisible();
  const scrollMetrics = await memoryScroll.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: window.getComputedStyle(element).overflowY
  }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
  expect(["auto", "scroll"]).toContain(scrollMetrics.overflowY);

  await expect(page.getByTestId("memory-view-row-0020")).toContainText("0020");
  await expect(page.getByTestId("memory-view-row-002B")).toContainText("002B");

  await step(page);
  await step(page);
  await step(page);

  const cRow = page.getByTestId("memory-view-row-0029");
  await expect(cRow).toContainText("0007");
  await expect(cRow).toContainText("C");
  await expect(cRow).toHaveAttribute("data-write", "true");
});

test("Mock backend exposes double storage and stable four-word assignment", async ({ page }) => {
  await openStudio(page, "Mock Core");
  await selectDemoProgram(page, "cpp-double-storage");
  await assemble(page);

  await expect(page.getByTestId("generated-casl-output")).toContainText("X_W3DS1");
  await expect(page.getByTestId("generated-casl-output")).toContainText("LDGR1,X_W3");
  await expect(page.getByTestId("generated-casl-output")).toContainText("STGR1,Y_W3");

  await page.getByRole("tab", { name: "Memory" }).click();
  await page.getByTestId("memory-object-select").selectOption({ label: "x" });
  await expect(page.getByTestId("double-value-inspector")).toContainText("0000000000000000");
  await expect(page.locator('[data-double-object="cpp-storage:main:x"]')).toHaveCount(4);
  const doubleRowBox = await page.locator('[data-double-object="cpp-storage:main:x"]').first().boundingBox();
  const ordinaryRowBox = await page.getByTestId("memory-view-row-005B").boundingBox();
  expect(doubleRowBox).not.toBeNull();
  expect(ordinaryRowBox).not.toBeNull();
  expect(Math.abs((doubleRowBox?.height ?? 0) - (ordinaryRowBox?.height ?? 0))).toBeLessThanOrEqual(1);
  await expect(page.locator('[data-double-object="cpp-storage:main:x"]').first().locator(".memory-object-word span")).toHaveText("x.word0");
  await expect(page.locator('[data-double-object="cpp-storage:main:x"]').first().locator(".memory-object-word small")).toHaveText("bits 63..48");

  await step(page);
  await step(page);
  await expect(page.getByTestId("double-value-inspector")).toContainText("400C000000000000");
  await run(page);

  await page.getByTestId("memory-object-select").selectOption({ label: "y" });
  await expect(page.getByTestId("double-value-inspector")).toContainText("400C000000000000");
  await expect(page.getByTestId("double-value-inspector")).toContainText("3.5");
  await page.getByRole("tab", { name: "Trace" }).click();
  await expect(page.getByTestId("trace-double-operation").filter({ hasText: "y = x" }).first()).toBeVisible();
  const copyTraceRows = page.locator('[data-double-operation^="double-copy:"]');
  await expect(copyTraceRows).toHaveCount(8);
  await expect(copyTraceRows.getByTestId("trace-double-operation")).toHaveText(Array.from({ length: 8 }, () => "double copy assignment: y = x"));
  for (const word of ["word 1 / 4", "word 2 / 4", "word 3 / 4", "word 4 / 4"]) {
    await expect(page.getByTestId("trace-double-word").filter({ hasText: word }).first()).toBeVisible();
  }

  await page.getByTestId("locale-ja").click();
  await page.getByRole("tab", { name: "メモリ" }).click();
  await expect(page.getByTestId("double-value-inspector")).toContainText("400C000000000000");
  await page.getByTestId("locale-zh-CN").click();
  await expect(page.getByTestId("double-value-inspector")).toContainText("400C000000000000");

  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.getByTestId("locale-en").click();
  await setSource(page, "int main() { double x = 1.0; x = x + x; return 0; }");
  await page.getByTestId("assemble-button").click();
  await expect(page.locator('[data-diagnostic-code="semantic.unsupportedDoubleArithmetic"]')).toBeVisible();
  await expect(page.getByTestId("generated-casl-output")).not.toContainText("MAIN");
});
