#!/usr/bin/env bash
set -euo pipefail

readonly EMSDK_VERSION="6.0.2"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
readonly EMSDK_ROOT="${HOME}/.cache/stugx-casl/emsdk-${EMSDK_VERSION}"

if [[ "$(uname -s)" != "Linux" || "$(uname -m)" != "x86_64" ]]; then
  echo "Cloudflare Pages build requires Linux x86_64." >&2
  exit 1
fi

if [[ ! -d "${EMSDK_ROOT}/.git" ]]; then
  mkdir -p "$(dirname "${EMSDK_ROOT}")"
  git clone --branch "${EMSDK_VERSION}" --depth 1 https://github.com/emscripten-core/emsdk.git "${EMSDK_ROOT}"
fi

pushd "${EMSDK_ROOT}" >/dev/null
./emsdk install "${EMSDK_VERSION}"
./emsdk activate "${EMSDK_VERSION}"
# shellcheck disable=SC1091
source ./emsdk_env.sh >/dev/null
popd >/dev/null

cd "${REPO_ROOT}"
rm -rf cpp-core/build-wasm dist
rm -f public/wasm/stugx_casl_core.js public/wasm/stugx_casl_core.wasm

emcmake cmake -S cpp-core -B cpp-core/build-wasm \
  -DSTUGX_CASL_BUILD_WASM=ON \
  -DCMAKE_BUILD_TYPE=Release
cmake --build cpp-core/build-wasm --config Release

for output in public/wasm/stugx_casl_core.js public/wasm/stugx_casl_core.wasm; do
  if [[ ! -s "${output}" ]]; then
    echo "Required WASM output is missing: ${output}" >&2
    exit 1
  fi
done

export VITE_BASE_PATH="/"
export VITE_CORE_BACKEND="wasm"
if [[ "${CF_PAGES_COMMIT_SHA:-}" =~ ^[0-9a-f]{40}$ ]]; then
  export STUGX_BUILD_COMMIT="${CF_PAGES_COMMIT_SHA}"
else
  candidate_commit="$(git rev-parse HEAD 2>/dev/null || true)"
  export STUGX_BUILD_COMMIT="$([[ "${candidate_commit}" =~ ^[0-9a-f]{40}$ ]] && echo "${candidate_commit}" || echo "local")"
fi

pnpm build:web
rm -f dist/wasm/.gitkeep
node scripts/production-artifacts.mjs report
node scripts/production-artifacts.mjs manifest
node scripts/production-artifacts.mjs verify

echo "Cloudflare Pages production build verified: dist/"
