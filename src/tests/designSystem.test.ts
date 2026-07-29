import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokensCss = readFileSync("src/styles/tokens.css", "utf8");
const appCss = readFileSync("src/styles/app.css", "utf8").replace(/\r\n/g, "\n");
const circuitSvg = readFileSync("src/visual/CometCircuitSvg.tsx", "utf8");
const appTsx = readFileSync("src/App.tsx", "utf8");
const toolbarTsx = readFileSync("src/components/Toolbar.tsx", "utf8");
const inspectorTsx = readFileSync("src/components/InspectorPanel.tsx", "utf8");
const outputTsx = readFileSync("src/components/OutputPanel.tsx", "utf8");
const focusLayoutTsx = readFileSync("src/components/CircuitFocusLayout.tsx", "utf8");
const tabKeyboardTs = readFileSync("src/components/tabKeyboard.ts", "utf8");

function cssBlock(selector: string): string {
  const index = appCss.indexOf(selector);
  expect(index).toBeGreaterThanOrEqual(0);
  const bodyStart = appCss.indexOf("{", index);
  const bodyEnd = appCss.indexOf("}", bodyStart);
  return appCss.slice(index, bodyEnd + 1);
}

describe("advanced UI design system foundation", () => {
  it("design_tokens_exist", () => {
    [
      "--color-background",
      "--color-surface",
      "--color-surface-muted",
      "--color-border",
      "--color-border-strong",
      "--color-text-primary",
      "--color-text-secondary",
      "--color-text-muted",
      "--color-accent",
      "--color-success",
      "--color-warning",
      "--color-warning-text",
      "--color-danger",
      "--color-text-disabled",
      "--color-focus-ring",
      "--color-active-data",
      "--color-active-control",
      "--color-active-flag",
      "--color-memory-highlight",
      "--color-register-highlight",
      "--space-2",
      "--space-4",
      "--space-6",
      "--space-8",
      "--space-12",
      "--space-16",
      "--space-20",
      "--space-24",
      "--space-32",
      "--radius-small",
      "--radius-medium",
      "--radius-large",
      "--radius-pill",
      "--shadow-none",
      "--shadow-card",
      "--shadow-floating",
      "--shadow-focus",
      "--font-size-app-title",
      "--font-size-panel-title",
      "--font-size-section-title",
      "--font-size-body",
      "--font-size-caption",
      "--font-size-mono-value",
      "--font-size-table-cell",
      "--motion-fast",
      "--motion-normal",
      "--motion-slow"
    ].forEach((token) => expect(tokensCss).toContain(token));
  });

  it("core_ui_uses_design_tokens", () => {
    expect(appCss).toContain("background: var(--color-surface)");
    expect(appCss).toContain("border: 1px solid var(--color-border)");
    expect(appCss).toContain("border-radius: var(--radius-md)");
    expect(appCss).toContain("box-shadow: var(--shadow-card)");
    expect(appCss).toContain("font-size: var(--font-size-panel-title)");
    expect(appCss).toContain("font-family: var(--font-family-mono)");
  });

  it("no_raw_random_colors_for_core_surfaces", () => {
    const toolbar = cssBlock(".toolbar {");
    const panel = cssBlock(".panel,\n.output-panel {");
    const tab = cssBlock(".tab-button.active {");

    expect(toolbar).not.toMatch(/#[0-9a-fA-F]{3,6}/);
    expect(panel).not.toMatch(/#[0-9a-fA-F]{3,6}/);
    expect(tab).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });

  it("buttons_use_shared_visual_classes", () => {
    expect(appCss).toContain(".tool-button,");
    expect(appCss).toContain(".icon-only,");
    expect(appCss).toContain(".theme-toggle,");
    expect(appCss).toContain(".text-button,");
    expect(appCss).toContain("background var(--motion-fast) var(--ease-standard)");
    expect(appCss).toContain("border-color: color-mix(in srgb, var(--color-danger) 28%, var(--color-border))");
  });

  it("tabs_use_shared_visual_classes", () => {
    expect(appCss).toContain(".tab-list");
    expect(appCss).toContain(".tab-button");
    expect(appCss).toContain("font-size: var(--font-size-table-cell)");
    expect(appCss).toContain("border-color: color-mix(in srgb, var(--color-primary) 28%, var(--color-border))");
  });

  it("panels_use_shared_card_style", () => {
    const panel = cssBlock(".panel,\n.output-panel {");

    expect(panel).toContain("background: var(--color-surface)");
    expect(panel).toContain("border: 1px solid var(--color-border)");
    expect(panel).toContain("border-radius: var(--radius-md)");
    expect(panel).toContain("box-shadow: var(--shadow-card)");
  });

  it("tables_use_shared_density_rules", () => {
    expect(appCss).toContain(".data-table");
    expect(appCss).toContain("font-size: var(--font-size-table-cell)");
    expect(appCss).toContain("border-bottom: 1px solid var(--color-border-subtle)");
    expect(appCss).toContain("background: color-mix(in srgb, var(--color-surface-muted) 72%, var(--color-border))");
  });

  it("focus_visible_style_exists", () => {
    expect(appCss).toContain(":focus-visible");
    expect(appCss).toContain("box-shadow: var(--shadow-focus)");
  });

  it("circuit_modules_use_shared_tokens", () => {
    expect(appCss).toContain("fill: var(--color-circuit-module-fill)");
    expect(appCss).toContain("stroke: var(--color-circuit-module-border)");
    expect(appCss).toContain("fill: var(--color-circuit-module-active-fill)");
    expect(appCss).toContain("stroke: var(--color-circuit-module-active-border)");
    expect(appCss).toContain("fill: var(--color-circuit-row-fill)");
    expect(appCss).toContain("fill: var(--color-register-highlight)");
  });

  it("no_arrow_or_dot_regression", () => {
    expect(circuitSvg).not.toContain("markerEnd");
    expect(circuitSvg).not.toContain("<marker");
    expect(circuitSvg).not.toContain("arrowhead");
    expect(circuitSvg).not.toContain("junction-data-left");
    expect(circuitSvg).not.toContain("junction-data-right");
  });

  it("no_ghost_wire_regression", () => {
    expect(circuitSvg).not.toContain("BusGuides");
    expect(circuitSvg).not.toContain('className="wire-layer"');
    expect(circuitSvg).not.toContain("wire-guide-");
    expect(circuitSvg).toContain('path.visualRole === "active-flow"');
  });

  it("memory_inspector_bounded_scroll_regression", () => {
    expect(appCss).toContain(".inspector-content[data-active-tab=\"memory\"]");
    expect(appCss).toContain("max-height: calc(100vh - 282px)");
    expect(appCss).toContain(".memory-table-scroll");
    expect(appCss).toContain("max-height: min(480px, calc(100vh - 410px))");
    expect(appCss).toContain("scrollbar-gutter: stable");
  });

  it("toolbar_actions_are_visually_grouped", () => {
    expect(appCss).toContain(".toolbar-actions .tool-button.group-start");
    expect(toolbarTsx).toContain("groupStart");
    expect(appCss).not.toContain("nth-of-type(4)");
    expect(appCss).not.toContain("nth-of-type(5)");
    expect(appCss).toContain("content: \"\"");
    expect(appCss).toContain("left: calc(-1 * var(--space-8))");
  });

  it("selected_active_changed_states_are_distinct", () => {
    expect(tokensCss).toContain("--color-state-selected-bg");
    expect(tokensCss).toContain("--color-state-active-bg");
    expect(tokensCss).toContain("--color-state-changed-bg");
    expect(tokensCss).toContain("--color-state-write-bg");
    expect(appCss).toContain("background: var(--color-state-selected-bg)");
    expect(appCss).toContain("background: var(--color-state-active-bg)");
    expect(appCss).toContain("background: var(--color-state-changed-bg)");
    expect(appCss).toContain("background: var(--color-state-write-bg)");
    expect(appCss).toContain(".data-table tr.changed td {");
    expect(appCss).toContain(".data-table tr.current td {");
  });

  it("core_text_contrast_uses_semantic_tokens", () => {
    expect(tokensCss).toContain("--color-text-muted: #5b687a");
    expect(tokensCss).toContain("--color-warning-text: #92400e");
    expect(appCss).toContain("color: var(--color-warning-text)");
    expect(appCss).toContain("color: var(--color-text-muted)");
  });

  it("disabled_controls_remain_legible", () => {
    expect(tokensCss).toContain("--color-text-disabled: #64748b");
    const disabledControls = cssBlock(".tool-button:disabled,");
    expect(disabledControls).toContain("color: var(--color-text-disabled)");
    expect(disabledControls).toContain("opacity: 1");
  });

  it("selected_and_focus_states_are_distinct", () => {
    expect(tokensCss).toContain("--color-focus-ring");
    expect(appCss).toContain("outline: 2px solid color-mix(in srgb, var(--color-focus-ring) 72%, transparent)");
    expect(appCss).toContain("background: var(--color-state-selected-bg)");
  });

  it("execution_and_changed_states_are_distinct", () => {
    expect(appCss).toMatch(/\.data-table tr\.changed td \{[\s\S]*?--color-state-changed-bg/);
    expect(appCss).toMatch(/\.data-table tr\.current td \{[\s\S]*?--color-state-active-bg/);
    expect(appCss).toMatch(/\.current-exec-line \{[\s\S]*?--color-state-active-bg/);
  });

  it("toggles_expose_pressed_state", () => {
    expect(toolbarTsx).toContain("aria-pressed={pressed}");
    expect(toolbarTsx).toContain("pressed={isCircuitFocusMode}");
    expect(outputTsx).toContain("aria-pressed={isSelected}");
    expect(focusLayoutTsx).toContain("aria-pressed={selectedFrameSlotId === slot.mappingId}");
  });

  it("observation_tabs_support_keyboard_navigation", () => {
    expect(focusLayoutTsx).toContain("onKeyDown={handleHorizontalTabListKeyDown}");
    expect(focusLayoutTsx).toContain("tabIndex={auxiliaryObservation === observation ? 0 : -1}");
    expect(inspectorTsx).toContain("onKeyDown={handleHorizontalTabListKeyDown}");
    expect(outputTsx).toContain("onKeyDown={handleHorizontalTabListKeyDown}");
    expect(tabKeyboardTs).toContain('"ArrowLeft"');
    expect(tabKeyboardTs).toContain('"ArrowRight"');
    expect(tabKeyboardTs).toContain('"Home"');
    expect(tabKeyboardTs).toContain('"End"');
  });

  it("long_panel_titles_do_not_hard_clip", () => {
    expect(appTsx).toContain('<h2 title="Current Instruction">Current Instruction</h2>');
    expect(appTsx).toContain('<h2 title={t("circuit.simulator")}>{t("circuit.simulator")}</h2>');
    expect(focusLayoutTsx).toContain('<h2 title={t("circuit.currentSourceMapping")}>{t("circuit.currentSourceMapping")}</h2>');
    expect(focusLayoutTsx).toContain('<h2 title={t("stackFrame.title")}>{t("stackFrame.title")}</h2>');
  });

  it("mono_values_do_not_wrap", () => {
    const monoValue = cssBlock(".mono-value {");
    expect(monoValue).toContain("font-family: var(--font-family-mono)");
    expect(monoValue).toContain("white-space: nowrap");
    expect(monoValue).toContain("text-overflow: ellipsis");
  });

  it("inspector_tabs_share_bounded_layout", () => {
    expect(appCss).toContain(".tab-list");
    expect(appCss).toContain(".compact-tabs");
    expect(appCss).toContain(".inspector-panel");
    expect(appCss).toContain("max-height: calc(100vh - 176px)");
  });

  it("bottom_dock_tabs_share_visual_contract", () => {
    expect(appCss).toContain(".dock-tabs");
    expect(appCss).toContain(".dock-header .text-button");
    expect(appCss).toContain("background: var(--color-surface-muted)");
    expect(appCss).toContain(".console-lines.generated");
  });

  it("source_editor_header_does_not_hard_clip_title", () => {
    expect(appTsx).toContain('<h2 title="Source Editor">{t("panel.source")}</h2>');
    expect(appCss).toContain(".source-panel .source-panel-header h2");
    expect(appCss).toContain("min-width: max-content");
    expect(appCss).toContain("overflow: visible");
  });

  it("frame_symbol_chips_use_secondary_style", () => {
    const marker = cssBlock(".source-editor-frame-symbol-marker {");

    expect(marker).toContain("border: 1px solid var(--color-empty-border)");
    expect(marker).toContain("background: var(--color-surface)");
    expect(marker).toContain("color: var(--color-text-secondary)");
  });

  it("frame_symbol_chips_keep_cjk_labels_on_one_line", () => {
    const marker = cssBlock(".source-editor-frame-symbol-marker {");
    const markerLabel = cssBlock(".source-editor-frame-symbol-marker span {");
    const markerList = cssBlock(".source-editor-frame-symbol-list {");

    expect(marker).toContain("min-width: 64px");
    expect(markerList).toContain("flex-wrap: wrap");
    expect(markerLabel).toContain("text-overflow: ellipsis");
    expect(markerLabel).toContain("white-space: nowrap");
  });

  it("circuit_active_state_uses_shared_tokens", () => {
    expect(tokensCss).toContain("--color-circuit-module-active-fill: var(--color-state-active-bg)");
    expect(tokensCss).toContain("--color-circuit-module-active-border: var(--color-state-active-border)");
    expect(appCss).toContain("background: var(--color-state-active-bg)");
    expect(appCss).toContain("stroke: var(--color-circuit-module-active-border)");
  });

  it("empty_states_use_shared_pattern", () => {
    expect(tokensCss).toContain("--color-empty-bg");
    expect(tokensCss).toContain("--color-empty-border");
    expect(appCss).toContain("background: var(--color-empty-bg)");
    expect(appCss).toContain("border: 1px dashed var(--color-empty-border)");
  });

  it("typography_tokens_are_applied", () => {
    expect(appCss).toContain("font-family: var(--font-family-ui)");
    expect(appCss).toContain("font-family: var(--font-family-mono)");
    expect(appCss).toContain("font-size: var(--font-size-panel-title)");
    expect(appCss).toContain("font-size: var(--font-size-table-cell)");
  });

  it("reduced_motion_remains_supported", () => {
    expect(appCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(appCss).toContain(".visual-review-static .circuit-wire--flow");
    expect(appCss).toContain(".visual-review-static *::before");
    expect(appCss).toContain("animation: none");
    expect(appCss).toContain("transition: none !important");
  });

  it("viewport_1280_has_no_horizontal_overflow_contract", () => {
    expect(appCss).toContain("@media (max-width: 1320px), (max-height: 760px)");
    expect(appCss).toContain(".toolbar-actions .tool-button.group-start::before");
    expect(appCss).toContain("grid-template-columns: clamp(230px, 17vw, 280px) minmax(620px, 1fr) clamp(260px, 20vw, 315px)");
  });

  it("phase18a1_toolbar_locale_controls_are_fixed_and_nonshrinking", () => {
    expect(tokensCss).toContain("--control-width-locale: 36px");
    expect(appCss).toMatch(/\.toolbar-meta \{[\s\S]*?flex: 0 0 auto;[\s\S]*?flex-shrink: 0;[\s\S]*?white-space: nowrap;[\s\S]*?overflow: visible;/);
    expect(appCss).toContain("flex: 0 0 var(--control-width-locale)");
    expect(appCss).toContain("box-shadow: inset 0 0 0 1px");
    expect(toolbarTsx).toContain("secondaryAction");
  });

  it("phase18a1_source_header_uses_stable_grid", () => {
    expect(appTsx).toContain('data-testid="source-panel-header"');
    expect(appCss).toMatch(/\.source-panel > \.source-panel-header \{[\s\S]*?grid-template-columns: max-content minmax\(0, 1fr\) max-content;/);
    expect(appCss).toMatch(/\.demo-program-picker select \{[\s\S]*?min-width: 0;[\s\S]*?max-width: 100%;/);
    expect(appCss).toMatch(/\.source-mode \{[\s\S]*?flex-shrink: 0;/);
    expect(appTsx).toContain('className="source-dirty-indicator"');
  });

  it("phase18a1_diagnostics_use_bounded_list_and_separate_context", () => {
    expect(appTsx).toContain('data-testid="diagnostic-list"');
    expect(appTsx).toContain('data-testid="diagnostic-context"');
    expect(appTsx).toContain('scrollIntoView({ block: "nearest" })');
    expect(appCss).toMatch(/\.diagnostic-list \{[\s\S]*?min-height: 168px;[\s\S]*?overflow-y: auto;[\s\S]*?scrollbar-gutter: stable;/);
    expect(appCss).toMatch(/\.errors-panel \{[\s\S]*?max-height: clamp\(280px, 46vh, 440px\);/);
    expect(appCss).toContain(".diagnostic-context");
    expect(appCss).toContain(".diagnostic-context-details");
    expect(appTsx).toContain("selectedDiagnosticDeveloperDetail");
  });
});
