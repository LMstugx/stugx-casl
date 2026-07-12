import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distDir = join(repoRoot, "dist");
const port = Number(process.env.PRODUCTION_PORT ?? 5180);
const basePath = normalizeBasePath(process.env.PRODUCTION_BASE_PATH ?? "/");
const mime = new Map([
  [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".wasm", "application/wasm"], [".svg", "image/svg+xml"], [".png", "image/png"],
  [".woff2", "font/woff2"]
]);

function normalizeBasePath(value) {
  if (!value.startsWith("/") || !value.endsWith("/") || /[\\?#]/.test(value)) throw new Error("Invalid production base path.");
  return value.replace(/\/{2,}/g, "/");
}

function setHeaders(response, file) {
  response.setHeader("Content-Type", mime.get(extname(file)) ?? "application/octet-stream");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  response.setHeader("X-Stugx-Static-Production", "1");
  response.setHeader("Cache-Control", /(?:index\.html|build-metadata\.json|deployment-manifest\.json|\.wasm|stugx_casl_core\.js)$/.test(file) ? "no-cache" : "public, max-age=31536000, immutable");
}

const server = createServer((request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (basePath !== "/" && url.pathname === basePath.slice(0, -1)) {
      response.writeHead(308, { Location: `${basePath}${url.search}${url.hash}` });
      response.end();
      return;
    }
    if (!url.pathname.startsWith(basePath)) {
      response.writeHead(404).end("Not found");
      return;
    }
    const requested = decodeURIComponent(url.pathname.slice(basePath.length)) || "index.html";
    const normalized = normalize(requested).replace(/^([.][.][/\\])+/, "");
    const file = resolve(distDir, normalized);
    const rel = relative(distDir, file);
    if (rel.startsWith("..") || rel.includes(`..${sep}`) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end("Not found");
      return;
    }
    setHeaders(response, file);
    response.writeHead(200);
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(400).end("Bad request");
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Serving verified dist at http://127.0.0.1:${port}${basePath}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
