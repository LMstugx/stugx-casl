import { useEffect, useRef } from "react";

export interface BeforeUnloadWindow {
  addEventListener(type: "beforeunload", listener: (event: BeforeUnloadEvent) => void): void;
  removeEventListener(type: "beforeunload", listener: (event: BeforeUnloadEvent) => void): void;
}

export class BeforeUnloadGuardManager {
  private attached = false;
  private readonly handler = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = true;
  };

  constructor(private readonly target: BeforeUnloadWindow | null) {}

  setDirty(dirty: boolean): void {
    if (!this.target || dirty === this.attached) return;
    if (dirty) this.target.addEventListener("beforeunload", this.handler);
    else this.target.removeEventListener("beforeunload", this.handler);
    this.attached = dirty;
  }

  dispose(): void {
    if (this.target && this.attached) this.target.removeEventListener("beforeunload", this.handler);
    this.attached = false;
  }
}

export function useBeforeUnloadDirtyGuard(dirty: boolean): void {
  const managerRef = useRef<BeforeUnloadGuardManager | null>(null);
  if (!managerRef.current) managerRef.current = new BeforeUnloadGuardManager(typeof window === "undefined" ? null : window);
  useEffect(() => {
    managerRef.current?.setDirty(dirty);
  }, [dirty]);
  useEffect(() => () => managerRef.current?.dispose(), []);
}
