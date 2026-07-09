import { Check, Cpu, FolderOpen, Loader2, Moon, Play, Plus, RotateCcw, Save, Square, StepForward, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

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
  loading?: boolean;
  title?: string;
  onClick?: () => void;
};

function ToolButton({ label, icon, testId, variant, emphasis, disabled, active, loading, title, onClick }: ButtonProps) {
  return (
    <button data-testid={testId} className={`tool-button ${variant ?? ""} ${emphasis ? "emphasis" : ""} ${active ? "active" : ""} ${loading ? "loading" : ""}`} disabled={disabled} onClick={onClick} title={title ?? label}>
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
  const [showAssembleSuccess, setShowAssembleSuccess] = useState(false);

  useEffect(() => {
    if (assembleStatus !== "success") return;
    setShowAssembleSuccess(true);
    const timeout = window.setTimeout(() => setShowAssembleSuccess(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [assembleStatus]);

  const assembleLabel = assembleStatus === "running" ? "Assembling..." : showAssembleSuccess ? "Assembled" : "Assemble";

  return (
    <header className="toolbar">
      <div className="brand">
        <div className="brand-mark">CASL</div>
        <div>
          <h1>stugx.CASL</h1>
          <p>CASL II / COMET II Learning Studio</p>
        </div>
      </div>

      <nav className="toolbar-actions" aria-label="Primary commands">
        <ToolButton label="New" icon={<Plus size={18} />} disabled title="New file is not implemented in Phase 2B" />
        <ToolButton label="Open" icon={<FolderOpen size={18} />} disabled title="File open is not implemented in Phase 2B" />
        <ToolButton label="Save" icon={<Save size={18} />} disabled title="File save is not implemented in Phase 2B" />
        <ToolButton
          label="Circuit Focus"
          icon={<Cpu size={18} />}
          active={isCircuitFocusMode}
          testId="circuit-focus-toggle"
          onClick={onToggleCircuitFocusMode}
          title={isCircuitFocusMode ? "Return to studio layout" : "Open Circuit Focus Mode"}
        />
        <ToolButton
          label={assembleLabel}
          icon={<Check size={18} />}
          variant="success"
          emphasis
          active={showAssembleSuccess}
          loading={assembleStatus === "running"}
          disabled={assembleStatus === "running" || isRunning}
          testId="assemble-button"
          onClick={onAssemble}
        />
        <ToolButton label={isRunning ? "Running..." : "Run"} icon={<Play size={18} />} variant="primary" emphasis disabled={!canRun} testId="run-button" onClick={onRun} title={canRun ? "Run with max step protection" : "Run is available after Assemble"} />
        <ToolButton label="Step" icon={<StepForward size={18} />} variant="primary" emphasis disabled={!canStep} testId="step-button" onClick={onStep} />
        <ToolButton label="Reset" icon={<RotateCcw size={18} />} emphasis disabled={!canReset} testId="reset-button" onClick={onReset} />
        <ToolButton label="Stop" icon={<Square size={18} />} variant="danger" disabled={!isRunning} testId="stop-button" onClick={onStop} title="Stop is enabled only while running" />
      </nav>

      <div className="toolbar-meta">
        <div className="segmented" aria-label="Language selector">
          <button disabled>JP</button>
          <button className="selected">EN</button>
          <button disabled>CN</button>
        </div>
        <button className="theme-toggle" disabled title="Theme toggle">
          <Sun size={16} />
          <span />
          <Moon size={16} />
        </button>
      </div>
    </header>
  );
}
