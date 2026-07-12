import { describe, expect, it } from "vitest";
import { getApplicationRuntime } from "./applicationRuntime";

describe("application runtime detection", () => {
  it("uses the Tauri runtime API without user-agent inference", () => {
    expect(getApplicationRuntime(() => true)).toBe("tauri");
    expect(getApplicationRuntime(() => false)).toBe("web");
  });

  it("fails safely to the web runtime", () => {
    expect(getApplicationRuntime(() => { throw new Error("unavailable"); })).toBe("web");
  });
});
