import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import type { Plugin } from "vite";
import packageJson from "./package.json";
import { createReadStream, existsSync } from "node:fs";
import { resolve } from "node:path";

function normalizeBasePath(value: string | undefined): string {
  const candidate = value?.trim() || "/";
  if (!candidate.startsWith("/") || !candidate.endsWith("/") || candidate.includes("\\") || candidate.includes("?") || candidate.includes("#")) {
    throw new Error(`VITE_BASE_PATH must be an absolute path ending in '/': ${candidate}`);
  }
  if (candidate.split("/").some((segment) => segment === ".." || segment === ".")) {
    throw new Error("VITE_BASE_PATH cannot contain relative path segments.");
  }
  return candidate.replace(/\/{2,}/g, "/");
}

function safeBuildValue(value: string | undefined, fallback: string, pattern: RegExp): string {
  const candidate = value?.trim();
  return candidate && pattern.test(candidate) ? candidate : fallback;
}

function serveDevelopmentWasmGlue(): Plugin {
  const gluePath = resolve("public/wasm/stugx_casl_core.js");
  return {
    name: "serve-development-wasm-glue",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split("?", 1)[0] !== "/wasm/stugx_casl_core.js") return next();
        if (!existsSync(gluePath)) {
          response.statusCode = 404;
          response.end("WASM glue is not built.");
          return;
        }
        response.setHeader("Content-Type", "text/javascript; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        createReadStream(gluePath).pipe(response);
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const base = normalizeBasePath(env.VITE_BASE_PATH);
  const requestedBackend = env.VITE_CORE_BACKEND ?? (mode === "production" ? "wasm" : "mock");
  if (mode === "production" && requestedBackend !== "wasm") {
    throw new Error("Production builds require VITE_CORE_BACKEND=wasm; Mock is development/test only.");
  }
  const buildMetadata = {
    version: safeBuildValue(env.STUGX_BUILD_VERSION, packageJson.version, /^[0-9A-Za-z][0-9A-Za-z.+-]{0,63}$/),
    commit: safeBuildValue(env.STUGX_BUILD_COMMIT, "local", /^(?:[0-9a-f]{7,40}|local)$/),
    buildMode: mode === "production" ? "production" : "development",
    wasmBackend: requestedBackend === "wasm",
    basePath: base
  };

  return {
    base,
    plugins: [serveDevelopmentWasmGlue(), react()],
    define: {
      "import.meta.env.VITE_CORE_BACKEND": JSON.stringify(requestedBackend),
      __STUGX_BUILD_METADATA__: JSON.stringify(buildMetadata)
    },
    build: {
      manifest: true,
      sourcemap: false
    },
    test: {
      environment: "node",
      globals: true,
      exclude: ["tests/e2e/**", "node_modules/**", "dist/**"]
    }
  };
});
