import { useEffect, useRef } from "react";

/**
 * Global shortcuts of the workbench (docs/reference/keyboard-accessibility.md, "Workbench
 * Shortcuts"). A command that is not available right now is passed as `undefined`.
 */
export interface WorkbenchShortcutHandlers {
  /** Space: one step in the current granularity. */
  step?: () => void;
  /** Shift+Space: reverse one instruction. */
  reverseInstruction?: () => void;
  /** F5 */
  run?: () => void;
  /** F6 */
  stop?: () => void;
  /** Ctrl+Enter */
  assemble?: () => void;
  /** Ctrl+S */
  save?: () => void;
}

export type WorkbenchShortcut = keyof WorkbenchShortcutHandlers;

const TEXT_ENTRY = ".monaco-editor, input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='textbox'], [role='dialog']";
const USES_SPACE = "button, a[href], summary, [role='button'], [role='tab'], [role='option'], [role='checkbox'], [role='switch'], [role='menuitem'], [role='slider']";

/** Which shortcut a key event stands for, or `undefined`. Pure, so it can be tested directly. */
export function shortcutForKeyEvent(event: Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">): WorkbenchShortcut | undefined {
  if (event.altKey) return undefined;
  const command = event.ctrlKey || event.metaKey;
  if (event.code === "Space" || event.key === " ") {
    if (command) return undefined;
    return event.shiftKey ? "reverseInstruction" : "step";
  }
  if (event.key === "F5" && !command && !event.shiftKey) return "run";
  if (event.key === "F6" && !command && !event.shiftKey) return "stop";
  if (event.key === "Enter" && command && !event.shiftKey) return "assemble";
  if ((event.key === "s" || event.key === "S") && command && !event.shiftKey) return "save";
  return undefined;
}

/**
 * Shortcuts never act while the focus is somewhere that uses the keyboard itself: the editor,
 * a text field, a select, a dialog. Space additionally keeps its native meaning on buttons,
 * tabs and other controls it activates.
 */
export function isShortcutSuppressed(target: EventTarget | null, shortcut: WorkbenchShortcut): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(TEXT_ENTRY)) return true;
  if ((shortcut === "step" || shortcut === "reverseInstruction") && target.closest(USES_SPACE)) return true;
  return false;
}

export function useWorkbenchShortcuts(handlers: WorkbenchShortcutHandlers): void {
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const shortcut = shortcutForKeyEvent(event);
      if (!shortcut || isShortcutSuppressed(event.target, shortcut)) return;
      // The key belongs to the workbench here, whether or not the command is available: F5 does
      // not reload a page with unsaved work, Ctrl+S does not open the browser's save dialog, and
      // Space does not scroll.
      event.preventDefault();
      if (event.repeat) return;
      latest.current[shortcut]?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
