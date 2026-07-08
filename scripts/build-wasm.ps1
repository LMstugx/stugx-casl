$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$cppCoreDir = Join-Path $repoRoot "cpp-core"
$buildDir = Join-Path $cppCoreDir "build-wasm"
$outputDir = Join-Path $repoRoot "public\wasm"

if (-not (Get-Command emcc -ErrorAction SilentlyContinue)) {
  Write-Error "Emscripten not found: emcc is not available on PATH. Install/activate Emscripten SDK, then rerun scripts/build-wasm.ps1."
}

if (-not (Get-Command emcmake -ErrorAction SilentlyContinue)) {
  Write-Error "Emscripten not found: emcmake is not available on PATH. Activate Emscripten SDK before running this script."
}

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

& emcmake cmake -S $cppCoreDir -B $buildDir -DSTUGX_CASL_BUILD_WASM=ON -DCMAKE_BUILD_TYPE=Release
if ($LASTEXITCODE -ne 0) {
  throw "emcmake configure failed with exit code $LASTEXITCODE"
}

& cmake --build $buildDir --config Release
if ($LASTEXITCODE -ne 0) {
  throw "WASM build failed with exit code $LASTEXITCODE"
}

$jsPath = Join-Path $outputDir "stugx_casl_core.js"
$wasmPath = Join-Path $outputDir "stugx_casl_core.wasm"

if (-not (Test-Path $jsPath) -or -not (Test-Path $wasmPath)) {
  throw "WASM build completed but expected outputs were not found in $outputDir"
}

Write-Host "WASM build completed:"
Write-Host "  $jsPath"
Write-Host "  $wasmPath"
