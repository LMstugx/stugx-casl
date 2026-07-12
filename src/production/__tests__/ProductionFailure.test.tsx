// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { ProductionErrorBoundary, ProductionFailureScreen } from "../ProductionFailure";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function BrokenComponent(): never {
  throw new Error("C:\\Users\\private\\source.cpp secret stack");
}

describe("production failure presentation", () => {
  it("shows an accessible localized reload action without raw detail", async () => {
    const reload = vi.fn();
    const root = createRoot(document.body.appendChild(document.createElement("div")));
    await act(async () => root.render(<ProductionFailureScreen kind="wasm-initialization" locale="zh-CN" onReload={reload} />));
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("无法初始化 WebAssembly 执行后端");
    await act(async () => (document.querySelector("button") as HTMLButtonElement).click());
    expect(reload).toHaveBeenCalledOnce();
    expect(document.body.textContent).not.toMatch(/C:\\Users|secret|stack/i);
    await act(async () => root.unmount());
  });

  it("contains render exceptions in the top-level safe boundary", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const root = createRoot(document.body.appendChild(document.createElement("div")));
    await act(async () => root.render(<ProductionErrorBoundary><BrokenComponent /></ProductionErrorBoundary>));
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("application could not start safely");
    expect(document.body.textContent).not.toMatch(/C:\\Users|private|source\.cpp|stack/i);
    await act(async () => root.unmount());
    consoleError.mockRestore();
  });
});
