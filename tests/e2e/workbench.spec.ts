import { expect, test, type Page } from "@playwright/test";
import { assemble, expectSourceContains, gr2SourceWithA100, openStudio, setSource } from "./caslSmokeHelpers";

/**
 * The v1.0 workbench frame and what is new in it: the frame itself, the persistent datapath,
 * breakpoints with run to breakpoint, and the global shortcuts. Runs on both backends.
 */

const ALLOWED_STORAGE_KEYS = [
  "stugx.casl.locale",
  "stugx.casl.preferences.v1",
  "stugx.casl.startup-selection.v1",
  "stugx.casl.lesson-progress.v1"
];

function backendOf(projectName: string): "Mock Core" | "WASM Core" {
  return projectName === "wasm" ? "WASM Core" : "Mock Core";
}

async function runState(page: Page) {
  return page.getByTestId("run-state");
}

async function blur(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

async function clickLineNumber(page: Page, line: number) {
  await page.locator(".monaco-editor .margin-view-overlays .line-numbers", { hasText: new RegExp(`^${line}$`) }).click();
}

test("the frame fills the viewport, every region is on screen, and the page does not scroll", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 1180, height: 700 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await openStudio(page, backendOf(testInfo.project.name));
    await assemble(page);

    for (const region of ["workbench-code-pane", "workbench-workspace", "workbench-controls", "comet-circuit-svg"]) {
      await expect(page.getByTestId(region)).toBeInViewport();
    }
    await expect(page.locator(".toolbar")).toBeInViewport();
    await expect(page.locator(".output-panel")).toBeInViewport();

    const page_ = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      overflowY: document.documentElement.scrollHeight > window.innerHeight
    }));
    expect(page_, `${viewport.width}x${viewport.height}`).toEqual({ overflowX: false, overflowY: false });

    const datapath = await page.getByTestId("comet-circuit-svg").boundingBox();
    expect(datapath!.width, `datapath width at ${viewport.width}`).toBeGreaterThanOrEqual(599);
    // The tool bar is one row at every supported width.
    expect((await page.locator(".toolbar").boundingBox())!.height).toBeLessThan(60);
  }
});

test("the source pane can be hidden without losing the editor, and the dock can be collapsed", async ({ page }, testInfo) => {
  await openStudio(page, backendOf(testInfo.project.name));
  await setSource(page, gr2SourceWithA100);

  const toggle = page.getByTestId("code-pane-toggle");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const widthBefore = (await page.getByTestId("workbench-workspace").boundingBox())!.width;
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByTestId("workbench-code-pane")).toBeHidden();
  expect((await page.getByTestId("workbench-workspace").boundingBox())!.width).toBeGreaterThan(widthBefore + 200);
  // The editor is still there with its text; execution commands keep working without it.
  await expectSourceContains(page, "GR2,A");
  await assemble(page);
  await toggle.click();
  await expect(page.getByTestId("source-editor")).toBeVisible();
  await expectSourceContains(page, "GR2,A");

  const dockToggle = page.getByTestId("dock-collapse-toggle");
  const dockBefore = (await page.locator(".output-panel").boundingBox())!.height;
  await dockToggle.click();
  await expect(dockToggle).toHaveAttribute("aria-expanded", "false");
  expect((await page.locator(".output-panel").boundingBox())!.height).toBeLessThan(dockBefore - 60);
  await page.getByRole("tab", { name: "Open Messages tab" }).click();
  await expect(dockToggle).toHaveAttribute("aria-expanded", "true");
});

test("tabs, layouts and languages never rebuild the datapath or touch the machine", async ({ page }, testInfo) => {
  await openStudio(page, backendOf(testInfo.project.name));
  await assemble(page);
  await page.getByTestId("step-button").click();
  await expect(page.getByTestId("comet-circuit-svg")).toHaveAttribute("data-active-wires", /memory-to-mdr/);

  const mark = async () => page.getByTestId("comet-circuit-svg").evaluate((element) => { (element as unknown as { __kept: boolean }).__kept = true; });
  const kept = async () => page.getByTestId("comet-circuit-svg").evaluate((element) => (element as unknown as { __kept?: boolean }).__kept === true);
  const machine = async () => ({
    wires: await page.getByTestId("comet-circuit-svg").getAttribute("data-active-wires"),
    run: await (await runState(page)).getAttribute("data-run-state"),
    history: await page.getByTestId("history-count").textContent()
  });

  // Studio view: inspector tabs, dock tabs, languages.
  await mark();
  const before = await machine();
  for (const tab of ["Memory", "Trace", "Registers"]) await page.locator(".inspector-panel").getByRole("tab", { name: new RegExp(tab) }).click();
  for (const tab of ["Messages", "Machine Code", "Output Log"]) await page.getByRole("tab", { name: `Open ${tab} tab` }).click();
  for (const locale of ["ja", "zh-CN", "en"]) await page.getByTestId(`locale-${locale}`).click();
  await page.getByTestId("dock-collapse-toggle").click();
  await page.getByTestId("dock-collapse-toggle").click();
  await page.getByTestId("code-pane-toggle").click();
  await page.getByTestId("code-pane-toggle").click();
  expect(await kept()).toBe(true);
  expect(await machine()).toEqual(before);

  // Observation workspace: all eight data tabs and the three layouts.
  await page.getByTestId("circuit-focus-toggle").click();
  await mark();
  for (const tab of ["observation-mode-register-stack", "auxiliary-observation-stack", "observation-mode-code-machine", "auxiliary-observation-source-mapping", "auxiliary-observation-trace", "auxiliary-observation-console", "auxiliary-observation-inspector", "observation-mode-cpu-flow"]) {
    await page.getByTestId(tab).click();
  }
  for (const layout of ["circuit-focus", "data-focus", "show-both"]) await page.getByTestId(`workspace-layout-${layout}`).click();
  for (const locale of ["zh-CN", "en"]) await page.getByTestId(`locale-${locale}`).click();
  expect(await kept()).toBe(true);
  expect(await machine()).toEqual(before);
});

test("breakpoints: set on a line, run to it, continue, and nothing is stored", async ({ page }, testInfo) => {
  await openStudio(page, backendOf(testInfo.project.name));
  await setSource(page, gr2SourceWithA100);

  // Before the program is assembled no line holds an instruction, so nothing can carry a breakpoint.
  await clickLineNumber(page, 4);
  await expect(page.getByTestId("breakpoint-count")).toHaveAttribute("data-count", "0");
  await expect(page.getByTestId("run-to-breakpoint-button")).toBeDisabled();

  await assemble(page);
  await clickLineNumber(page, 6); // A DC 100: data, not an instruction
  await expect(page.getByTestId("breakpoint-count")).toHaveAttribute("data-count", "0");
  await clickLineNumber(page, 4); // ST GR2,C
  await expect(page.getByTestId("source-editor")).toHaveAttribute("data-breakpoint-lines", "4");
  await expect(page.getByTestId("breakpoint-count")).toHaveAttribute("data-count", "1");
  await expect(page.locator(".monaco-editor .breakpoint-marker")).toHaveCount(1);

  await page.getByTestId("run-to-breakpoint-button").click();
  await expect(await runState(page)).toHaveAttribute("data-run-state", "Stopped");
  await expect(page.getByTestId("breakpoint-notice")).toContainText("line 4");
  await expect(page.getByTestId("breakpoint-notice")).toContainText("0024");
  // LD and ADDA have run; the ST on the breakpoint line has not.
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='register-gr2']")).toContainText("0078");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='memory-row-0029']")).toContainText("0000");
  await expect(page.locator(".output-panel")).toContainText("Breakpoint reached at #0024");

  // Setting and hitting a breakpoint changes neither the document nor what is stored.
  await expect(page.locator(".source-dirty-indicator")).toBeVisible(); // dirty from the edit, as before
  const keys = await page.evaluate(() => Object.keys(localStorage));
  for (const key of keys) expect(ALLOWED_STORAGE_KEYS, `unexpected storage key ${key}`).toContain(key);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toMatch(/breakpoint/i);

  // Continuing does not stop on the same line again; the program runs to its end.
  await page.getByTestId("run-to-breakpoint-button").click();
  await expect(await runState(page)).toHaveAttribute("data-run-state", "Finished");
  await expect(page.getByTestId("breakpoint-notice")).toHaveText("");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='memory-row-0029']")).toContainText("0078");
  await expect(page.getByTestId("circuit-state-note")).toHaveText("Program finished");
  await expect(page.getByTestId("source-editor")).toHaveAttribute("data-last-executed-line", "5");

  // Assembling again clears the breakpoints.
  await assemble(page);
  await expect(page.getByTestId("breakpoint-count")).toHaveAttribute("data-count", "0");
  await expect(page.locator(".monaco-editor .breakpoint-marker")).toHaveCount(0);

  // Toggle with the clear button.
  await clickLineNumber(page, 2);
  await clickLineNumber(page, 3);
  await expect(page.getByTestId("breakpoint-count")).toHaveAttribute("data-count", "2");
  await clickLineNumber(page, 2);
  await expect(page.getByTestId("source-editor")).toHaveAttribute("data-breakpoint-lines", "3");
  await page.getByTestId("clear-breakpoints-button").click();
  await expect(page.getByTestId("breakpoint-count")).toHaveAttribute("data-count", "0");
});

test("a running program can be stopped on the way to a breakpoint", async ({ page }, testInfo) => {
  await openStudio(page, backendOf(testInfo.project.name));
  await setSource(page, `MAIN START
LOOP LAD   GR1,1,GR1
     JUMP  LOOP
     RET
     END`);
  await assemble(page);
  await clickLineNumber(page, 4); // never reached
  await page.getByTestId("run-to-breakpoint-button").click();
  await expect(await runState(page)).toHaveAttribute("data-run-state", "Running");
  await page.getByTestId("stop-button").click();
  await expect(await runState(page)).toHaveAttribute("data-run-state", "Stopped");
  await expect(page.getByTestId("breakpoint-notice")).toHaveText("");
});

test("global shortcuts drive the machine, and stay out of the editor and of focused buttons", async ({ page }, testInfo) => {
  await openStudio(page, backendOf(testInfo.project.name));
  await setSource(page, gr2SourceWithA100);
  await blur(page);

  await page.keyboard.press("Control+Enter");
  await expect(await runState(page)).toHaveAttribute("data-run-state", "Ready");

  await page.keyboard.press("Space");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='register-gr2']")).toContainText("0064");
  await page.keyboard.press("Space");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='register-gr2']")).toContainText("0078");

  // Space on a focused button presses that button and does not also step.
  await page.getByTestId("locale-en").focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='memory-row-0029']")).toContainText("0000");

  await blur(page);
  await page.keyboard.press("F5");
  await expect(await runState(page)).toHaveAttribute("data-run-state", "Finished");
  await expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='memory-row-0029']")).toContainText("0078");
  // F5 ran the program; it did not reload the page.
  await expectSourceContains(page, "GR2,A");

  // The tooltips name the shortcuts.
  await expect(page.getByTestId("run-button")).toHaveAttribute("title", /\(F5\)$/);
  await expect(page.getByTestId("step-button")).toHaveAttribute("title", /\(Space\)$/);
  await expect(page.getByTestId("assemble-button")).toHaveAttribute("title", /\(Ctrl\+Enter\)$/);
  await expect(page.getByTestId("stop-button")).toHaveAttribute("title", /\(F6\)$/);

  // Inside the editor Space is a character, not a command.
  await page.getByTestId("reset-button").click();
  await expect(await runState(page)).toHaveAttribute("data-run-state", "Ready");
  await page.locator(".monaco-editor .view-lines").click();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("circuit-state-note")).toHaveText("Source changed. Assemble to update.");
  await expect(page.getByTestId("stale-data-banner")).toBeVisible();
  await expect(page.getByTestId("step-button")).toBeDisabled();
});
