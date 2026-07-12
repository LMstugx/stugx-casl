$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$distPath = [IO.Path]::GetFullPath((Join-Path $repoRoot "dist"))
if (-not $distPath.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to clean a dist path outside the repository."
}

$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$bundledBin = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\bin"
if (Test-Path $bundledNode) { $env:Path = "$bundledNode;$bundledBin;$env:Path" }

Set-Location $repoRoot
if (Test-Path $distPath) { Remove-Item -LiteralPath $distPath -Recurse -Force }

$env:STUGX_RUNTIME = "tauri"
$env:VITE_BASE_PATH = "./"
$env:VITE_CORE_BACKEND = "wasm"
if (-not $env:STUGX_BUILD_COMMIT) {
  $commit = (& git rev-parse HEAD 2>$null)
  $env:STUGX_BUILD_COMMIT = if ($LASTEXITCODE -eq 0 -and $commit -match '^[0-9a-f]{40}$') { $commit } else { "local" }
}

Write-Host "==> Building offline WASM backend" -ForegroundColor Cyan
pnpm build:wasm
if ($LASTEXITCODE -ne 0) { throw "WASM build failed." }

Write-Host "==> Building Tauri frontend bundle" -ForegroundColor Cyan
pnpm build:web
if ($LASTEXITCODE -ne 0) { throw "Tauri frontend build failed." }

$required = @(
  (Join-Path $distPath "index.html"),
  (Join-Path $distPath "wasm\stugx_casl_core.js"),
  (Join-Path $distPath "wasm\stugx_casl_core.wasm")
)
foreach ($path in $required) {
  if (-not (Test-Path -LiteralPath $path) -or (Get-Item -LiteralPath $path).Length -eq 0) {
    throw "Required Tauri frontend artifact is missing: $path"
  }
}
if (Get-ChildItem -LiteralPath $distPath -Recurse -File -Filter *.map) {
  throw "Tauri frontend source maps are prohibited."
}
$html = Get-Content -LiteralPath (Join-Path $distPath "index.html") -Raw
if ($html -match '(?:src|href)="/') { throw "Tauri frontend contains a root-absolute asset URL." }
Write-Host "Tauri frontend bundle verified: dist/" -ForegroundColor Green
