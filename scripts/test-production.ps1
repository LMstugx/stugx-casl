param([int]$Port = 5180, [string]$BasePath = "/")
$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$bundledBin = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\bin"
if (Test-Path $bundledNode) { $env:Path = "$bundledNode;$bundledBin;$env:Path" }
Set-Location $repoRoot
& (Join-Path $PSScriptRoot "build-production.ps1") -BasePath $BasePath
$env:PRODUCTION_PORT = "$Port"
$env:PRODUCTION_BASE_PATH = $BasePath
$env:PRODUCTION_BASE_URL = "http://127.0.0.1:$Port$BasePath"
pnpm exec playwright test --config playwright.production.config.ts
if ($LASTEXITCODE -ne 0) { throw "Production smoke test failed." }
