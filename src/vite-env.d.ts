/// <reference types="vite/client" />

declare const __STUGX_BUILD_METADATA__: {
  readonly version: string;
  readonly commit: string;
  readonly buildMode: "production" | "development";
  readonly wasmBackend: boolean;
  readonly basePath: string;
};

declare module "node:fs" {
  export function readFileSync(path: string, encoding: string): string;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function resolve(...paths: string[]): string;
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}
