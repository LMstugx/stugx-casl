$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
if (Test-Path $bundledNode) { $env:Path = "$bundledNode;$env:Path" }
Set-Location $repoRoot
node scripts/production-artifacts.mjs report
if ($LASTEXITCODE -ne 0) { throw "Production size report failed." }
Get-Content dist\production-size-report.json
