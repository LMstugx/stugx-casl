param([int]$Port = 5180, [string]$BasePath = "/")
$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
if (Test-Path $bundledNode) { $env:Path = "$bundledNode;$env:Path" }
Set-Location $repoRoot
$env:PRODUCTION_PORT = "$Port"
$env:PRODUCTION_BASE_PATH = $BasePath
node scripts/serve-production.mjs
exit $LASTEXITCODE
