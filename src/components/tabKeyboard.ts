import type { KeyboardEvent } from "react";

const navigationKeys = new Set(["ArrowLeft", "ArrowRight", "Home", "End"]);

export function handleHorizontalTabListKeyDown(event: KeyboardEvent<HTMLElement>): void {
  if (!navigationKeys.has(event.key)) return;

  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'));
  if (!tabs.length) return;

  const focusedIndex = tabs.findIndex((tab) => tab === document.activeElement);
  const currentIndex = focusedIndex >= 0 ? focusedIndex : tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true");
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : event.key === "ArrowRight"
          ? (safeIndex + 1) % tabs.length
          : (safeIndex - 1 + tabs.length) % tabs.length;

  event.preventDefault();
  tabs[nextIndex].focus();
  tabs[nextIndex].click();
}
