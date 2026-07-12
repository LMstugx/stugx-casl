# Static Host Security Headers

Provider-neutral template:

```text
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

`wasm-unsafe-eval` permits WebAssembly compilation; JavaScript `unsafe-eval` is not allowed. Monaco needs same-origin/blob workers and runtime style injection. No third-party origin is permitted. `frame-ancestors 'none'` prevents embedding. COOP/COEP are not required because the current build has no SharedArrayBuffer or WASM threads.

Serve `.wasm` as `application/wasm` and use HTTPS for optional File System Access. Without it, Save As remains an explicit download-copy fallback.
