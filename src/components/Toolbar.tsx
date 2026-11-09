import { Check, Cpu, FolderOpen, Loader2, Moon, PanelLeft, Play, Plus, RotateCcw, Save, Square, StepForward, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useI18n } from "../i18n/useI18n";
import type { SupportedLocale, TranslationKey } from "../i18n/types";

type ToolbarProps = {
  assembleStatus: "default" | "running" | "success" | "error";
  canRun: boolean;
  canStep: boolean;
  canReset: boolean;
  isRunning: boolean;
  isCircuitFocusMode?: boolean;
  onToggleCircuitFocusMode?: () => void;
  isOpeningFile?: boolean;
  onOpenFile?: () => void;
  isReplacingSource?: boolean;
  onNewDocument?: () => void;
  saveMode?: "save" | "save-as" | "unsupported";
  isSavingFile?: boolean;
  onSaveFile?: () => void;
  onAssemble: () => void;
  onRun: () => void;
  onStep: () => void;
  onReset: () => void;
  onStop: () => void;
  /** Whether the source pane of the workbench is shown. Omit to leave the toggle out. */
  isCodePaneOpen?: boolean;
  onToggleCodePane?: () => void;
  /** Shortcut hints shown in the tooltips of the commands that have one. */
  shortcutHints?: Partial<Record<"assemble" | "run" | "step" | "stop" | "save", string>>;
  /** Rendered between the commands and the language selector: the view switch of the workbench. */
  viewSwitch?: ReactNode;
};

type ButtonProps = {
  label: string;
  icon: ReactNode;
  testId?: string;
  variant?: "primary" | "success" | "danger";
  emphasis?: boolean;
  disabled?: boolean;
  active?: boolean;
  pressed?: boolean;
  groupStart?: boolean;
  loading?: boolean;
  title?: string;
  accessibleLabel?: string;
  secondaryAction?: boolean;
  /** Shows the icon alone; the label stays in the accessible name and the tooltip. */
  iconOnly?: boolean;
  onClick?: () => void;
};

const localeOptions: ReadonlyArray<{ locale: SupportedLocale; shortLabel: string; languageKey: TranslationKey }> = [
  { locale: "ja", shortLabel: "JP", languageKey: "locale.japanese" },
  { locale: "en", shortLabel: "EN", languageKey: "locale.english" },
  { locale: "zh-CN", shortLabel: "CN", languageKey: "locale.chineseSimplified" }
];

function ToolButton({ label, icon, testId, variant, emphasis, disabled, active, pressed, groupStart, loading, title, accessibleLabel, secondaryAction, iconOnly, onClick }: ButtonProps) {
  return (
    <button
      data-testid={testId}
      className={`tool-button ${variant ?? ""} ${emphasis ? "emphasis" : ""} ${active ? "active" : ""} ${groupStart ? "group-start" : ""} ${loading ? "loading" : ""} ${secondaryAction ? "secondary-action" : ""} ${iconOnly ? "icon-only-tool" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={title ?? label}
      aria-label={accessibleLabel ?? title ?? label}
      aria-pressed={pressed}
      aria-busy={loading || undefined}
    >
      {loading ? <Loader2 className="spinner" size={17} /> : icon}
      {iconOnly ? null : <span>{label}</span>}
    </button>
  );
}

export default function Toolbar({
  assembleStatus,
  canRun,
  canStep,
  canReset,
  isRunning,
  isCircuitFocusMode = false,
  onToggleCircuitFocusMode = () => undefined,
  isOpeningFile = false,
  onOpenFile = () => undefined,
  isReplacingSource = false,
  onNewDocument = () => undefined,
  saveMode = "unsupported",
  isSavingFile = false,
  onSaveFile = () => undefined,
  onAssemble,
  onRun,
  onStep,
  onReset,
  onStop,
  isCodePaneOpen,
  onToggleCodePane,
  shortcutHints = {},
  viewSwitch
}: ToolbarProps) {
  const { locale, setLocale, t } = useI18n();
  const [showAssembleSuccess, setShowAssembleSuccess] = useState(false);

  useEffect(() => {
    if (assembleStatus !== "success") return;
    setShowAssembleSuccess(true);
    const timeout = window.setTimeout(() => setShowAssembleSuccess(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [assembleStatus]);

  const withShortcut = (text: string, shortcut?: string) => (shortcut ? `${text} (${shortcut})` : text);
  const assembleLabel = assembleStatus === "running" ? t("toolbar.assembling") : showAssembleSuccess ? t("toolbar.assembled") : t("toolbar.assemble");

  return (
    <header className="toolbar">
      <div className="brand">
        <div className="brand-mark">CASL</div>
        <div>
          <h1>{t("app.title")}</h1>
          <p>CASL II / COMET II Learning Studio</p>
        </div>
      </div>

      <nav className="toolbar-actions" aria-label={t("accessibility.primaryCommands")}>
        {onToggleCodePane ? (
          <ToolButton
            label={t("workbench.region.code")}
            icon={<PanelLeft size={18} />}
            active={isCodePaneOpen}
            pressed={Boolean(isCodePaneOpen)}
            testId="code-pane-toggle"
            iconOnly
            onClick={onToggleCodePane}
            title={t(isCodePaneOpen ? "workbench.codePane.hide" : "workbench.codePane.show")}
            accessibleLabel={t(isCodePaneOpen ? "workbench.codePane.hide" : "workbench.codePane.show")}
            secondaryAction
          />
        ) : null}
        <ToolButton label={t("toolbar.new")} icon={<Plus size={18} />} disabled={isReplacingSource || isOpeningFile || isSavingFile || isRunning || assembleStatus === "running"} testId="new-document-button" onClick={onNewDocument} title={t("file.newDocument")} accessibleLabel={t("file.newDocument")} secondaryAction />
        <ToolButton
          label={isOpeningFile ? t("file.opening") : t("toolbar.open")}
          icon={<FolderOpen size={18} />}
          disabled={isReplacingSource || isOpeningFile || isSavingFile || isRunning || assembleStatus === "running"}
          loading={isOpeningFile}
          testId="open-file-button"
          onClick={onOpenFile}
          title={t("file.supportedFiles")}
          accessibleLabel={t("file.openFile")}
          secondaryAction
        />
        <ToolButton
          label={isSavingFile ? t("file.saving") : saveMode === "save" ? t("toolbar.save") : t("file.saveAs")}
          icon={<Save size={18} />}
          disabled={saveMode === "unsupported" || isReplacingSource || isSavingFile || isOpeningFile || isRunning || assembleStatus === "running"}
          loading={isSavingFile}
          testId="save-file-button"
          onClick={onSaveFile}
          title={withShortcut(saveMode === "save" ? t("toolbar.save") : t("file.chooseSaveLocation"), shortcutHints.save)}
          accessibleLabel={saveMode === "save" ? t("toolbar.save") : t("file.saveAs")}
          secondaryAction
        />
        <ToolButton
          label={t("toolbar.circuitFocus")}
          icon={<Cpu size={18} />}
          active={isCircuitFocusMode}
          pressed={isCircuitFocusMode}
          groupStart
          testId="circuit-focus-toggle"
          onClick={onToggleCircuitFocusMode}
          title={isCircuitFocusMode ? "Return to studio layout" : "Open Circuit Focus Mode"}
          secondaryAction
        />
        <ToolButton
          label={assembleLabel}
          icon={<Check size={18} />}
          variant="success"
          emphasis
          groupStart
          active={showAssembleSuccess}
          loading={assembleStatus === "running"}
          disabled={assembleStatus === "running" || isRunning}
          testId="assemble-button"
          onClick={onAssemble}
          title={withShortcut(assembleLabel, shortcutHints.assemble)}
          accessibleLabel={assembleLabel}
        />
        <ToolButton label={isRunning ? t("toolbar.running") : t("toolbar.run")} icon={<Play size={18} />} variant="primary" emphasis disabled={!canRun} testId="run-button" onClick={onRun} title={withShortcut(canRun ? "Run with max step protection" : "Run is available after Assemble", shortcutHints.run)} accessibleLabel={canRun ? "Run with max step protection" : "Run is available after Assemble"} />
        <ToolButton label={t("toolbar.step")} icon={<StepForward size={18} />} variant="primary" emphasis disabled={!canStep} testId="step-button" onClick={onStep} title={withShortcut(t("toolbar.step"), shortcutHints.step)} accessibleLabel={t("toolbar.step")} />
        <ToolButton label={t("toolbar.reset")} icon={<RotateCcw size={18} />} emphasis disabled={!canReset} testId="reset-button" onClick={onReset} />
        <ToolButton label={t("toolbar.stop")} icon={<Square size={18} />} variant="danger" disabled={!isRunning} testId="stop-button" onClick={onStop} title={withShortcut("Stop is enabled only while running", shortcutHints.stop)} accessibleLabel="Stop is enabled only while running" />
      </nav>

      <div className="toolbar-meta">
        {viewSwitch}
        <div className="segmented" aria-label={t("accessibility.languageSelector")} data-testid="locale-selector">
          {localeOptions.map((option) => {
            const selected = locale === option.locale;
            const accessibleName = t("accessibility.languageOption", { language: t(option.languageKey) });
            return (
              <button
                key={option.locale}
                type="button"
                className={selected ? "selected" : ""}
                aria-label={accessibleName}
                aria-pressed={selected}
                title={accessibleName}
                data-testid={`locale-${option.locale}`}
                onClick={() => setLocale(option.locale)}
              >
                {option.shortLabel}
              </button>
            );
          })}
        </div>
        <button className="theme-toggle" disabled title="Theme toggle" aria-label="Theme toggle">
          <Sun size={16} />
          <span />
          <Moon size={16} />
        </button>
      </div>
    </header>
  );
}
