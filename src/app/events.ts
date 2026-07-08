import { Diagnostic } from "../core/types";

export const AppEvent = {
  CoreAssembleStarted: "core:assemble-started",
  CoreAssembleSucceeded: "core:assemble-succeeded",
  CoreAssembleFailed: "core:assemble-failed",
  VmStepCompleted: "vm:step-completed",
  VmRunStopped: "vm:run-stopped",
  VmError: "vm:error",
  UiThemeChanged: "ui:theme-changed",
  UiLanguageChanged: "ui:language-changed",
  VisualBenchmarkCompleted: "visual:benchmark-completed"
} as const;

export type AppEvents = {
  [AppEvent.CoreAssembleStarted]: { sourceLength: number };
  [AppEvent.CoreAssembleSucceeded]: { instructionCount: number; startAddress: number };
  [AppEvent.CoreAssembleFailed]: { diagnostics: Diagnostic[] };
  [AppEvent.VmStepCompleted]: { stepCount: number; instruction: string };
  [AppEvent.VmRunStopped]: { reason: "finished" | "error" | "maxSteps" | "manual" };
  [AppEvent.VmError]: { message: string };
  [AppEvent.UiThemeChanged]: { theme: "light" | "dark" };
  [AppEvent.UiLanguageChanged]: { language: "zh-CN" | "en-US" | "ja-JP" };
  [AppEvent.VisualBenchmarkCompleted]: { passed: boolean; changedSnapshots: string[] };
};
