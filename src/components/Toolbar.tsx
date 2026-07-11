import { Check, Cpu, FolderOpen, Loader2, Moon, Play, Plus, RotateCcw, Save, Square, StepForward, Sun } from "lucide-react";
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
  onAssemble: () => void;
  onRun: () => void;
  onStep: () => void;
  onReset: () => void;
  onStop: () => void;
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
  onClick?: () => void;
};

const localeOptions: ReadonlyArray<{ locale: SupportedLocale; shortLabel: string; languageKey: TranslationKey }> = [
  { locale: "ja", shortLabel: "JP", languageKey: "locale.japanese" },
  { locale: "en", shortLabel: "EN", languageKey: "locale.english" },
  { locale: "zh-CN", shortLabel: "CN", languageKey: "locale.chineseSimplified" }
];

function ToolButton({ label, icon, testId, variant, emphasis, disabled, active, pressed, groupStart, loading, title, onClick }: ButtonProps) {
  return (
    <button
      data-testid={testId}
      className={`tool-button ${variant ?? ""} ${emphasis ? "emphasis" : ""} ${active ? "active" : ""} ${groupStart ? "group-start" : ""} ${loading ? "loading" : ""}`}
      disabled={disabled}
      onClick={onClick}
      title={title ?? label}
      aria-label={title ?? label}
      aria-pressed={pressed}
    >
      {loading ? <Loader2 className="spinner" size={17} /> : icon}
      <span>{label}</span>
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
  onAssemble,
  onRun,
  onStep,
  onReset,
  onStop,
}: ToolbarProps) {
  const { locale, setLocale, t } = useI18n();
  const [showAssembleSuccess, setShowAssembleSuccess] = useState(false);

  useEffect(() => {
    if (assembleStatus !== "success") return;
    setShowAssembleSuccess(true);
    const timeout = window.setTimeout(() => setShowAssembleSuccess(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [assembleStatus]);

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
        <ToolButton label={t("toolbar.new")} icon={<Plus size={18} />} disabled title="New file is not implemented in Phase 2B" />
        <ToolButton label={t("toolbar.open")} icon={<FolderOpen size={18} />} disabled title="File open is not implemented in Phase 2B" />
        <ToolButton label={t("toolbar.save")} icon={<Save size={18} />} disabled title="File save is not implemented in Phase 2B" />
        <ToolButton
          label={t("toolbar.circuitFocus")}
          icon={<Cpu size={18} />}
          active={isCircuitFocusMode}
          pressed={isCircuitFocusMode}
          groupStart
          testId="circuit-focus-toggle"
          onClick={onToggleCircuitFocusMode}
          title={isCircuitFocusMode ? "Return to studio layout" : "Open Circuit Focus Mode"}
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
        />
        <ToolButton label={isRunning ? t("toolbar.running") : t("toolbar.run")} icon={<Play size={18} />} variant="primary" emphasis disabled={!canRun} testId="run-button" onClick={onRun} title={canRun ? "Run with max step protection" : "Run is available after Assemble"} />
        <ToolButton label={t("toolbar.step")} icon={<StepForward size={18} />} variant="primary" emphasis disabled={!canStep} testId="step-button" onClick={onStep} />
        <ToolButton label={t("toolbar.reset")} icon={<RotateCcw size={18} />} emphasis disabled={!canReset} testId="reset-button" onClick={onReset} />
        <ToolButton label={t("toolbar.stop")} icon={<Square size={18} />} variant="danger" disabled={!isRunning} testId="stop-button" onClick={onStop} title="Stop is enabled only while running" />
      </nav>

      <div className="toolbar-meta">
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
