param([string]$BasePath = $(if ($env:VITE_BASE_PATH) { $env:VITE_BASE_PATH } else { "/" }))
$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
if (Test-Path $bundledNode) { $env:Path = "$bundledNode;$env:Path" }
Set-Location $repoRoot
$env:VITE_BASE_PATH = $BasePath
node scripts/production-artifacts.mjs verify
if ($LASTEXITCODE -ne 0) { throw "Production verification failed." }
Write-Host "Production artifact verification passed." -ForegroundColor Green
