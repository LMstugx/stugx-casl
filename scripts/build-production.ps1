param(
  [string]$BasePath = $(if ($env:VITE_BASE_PATH) { $env:VITE_BASE_PATH } else { "/" })
)

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

$env:VITE_BASE_PATH = $BasePath
$env:VITE_CORE_BACKEND = "wasm"
if (-not $env:STUGX_BUILD_COMMIT) {
  $commit = (& git rev-parse HEAD 2>$null)
  $env:STUGX_BUILD_COMMIT = if ($LASTEXITCODE -eq 0 -and $commit -match '^[0-9a-f]{40}$') { $commit } else { "local" }
}

Write-Host "==> Building WASM backend" -ForegroundColor Cyan
pnpm build:wasm
if ($LASTEXITCODE -ne 0) { throw "WASM build failed." }
foreach ($file in @("public\wasm\stugx_casl_core.js", "public\wasm\stugx_casl_core.wasm")) {
  if (-not (Test-Path $file) -or (Get-Item $file).Length -eq 0) { throw "Required WASM output is missing: $file" }
}

Write-Host "==> Building production web bundle for $BasePath" -ForegroundColor Cyan
pnpm build:web
if ($LASTEXITCODE -ne 0) { throw "Web production build failed." }
$distPlaceholder = Join-Path $distPath "wasm\.gitkeep"
if (Test-Path $distPlaceholder) { Remove-Item -LiteralPath $distPlaceholder -Force }

Write-Host "==> Reporting and verifying deployment artifacts" -ForegroundColor Cyan
node scripts/production-artifacts.mjs report
if ($LASTEXITCODE -ne 0) { throw "Production size verification failed." }
node scripts/production-artifacts.mjs manifest
if ($LASTEXITCODE -ne 0) { throw "Deployment manifest generation failed." }
node scripts/production-artifacts.mjs verify
if ($LASTEXITCODE -ne 0) { throw "Production artifact verification failed." }

Write-Host "Production build verified: dist/ ($BasePath)" -ForegroundColor Green
