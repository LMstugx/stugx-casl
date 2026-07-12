import { isTauri } from "@tauri-apps/api/core";

export type ApplicationRuntime = "web" | "tauri";

export function getApplicationRuntime(detector: () => boolean = isTauri): ApplicationRuntime {
  try {
    return detector() ? "tauri" : "web";
  } catch {
    return "web";
  }
}
