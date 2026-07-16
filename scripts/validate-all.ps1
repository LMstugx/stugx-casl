$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$bundledBin = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\bin"
if (Test-Path $bundledNode) {
  $env:Path = "$bundledNode;$bundledBin;$env:Path"
}

$emsdkEnv = if ($env:EMSDK) { Join-Path $env:EMSDK "emsdk_env.ps1" } else { $null }
if ($emsdkEnv -and (Test-Path $emsdkEnv)) {
  . $emsdkEnv | Out-Null
}

function Invoke-ValidationStep {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Name" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
}

Invoke-ValidationStep "pnpm test" { pnpm test }
Invoke-ValidationStep "pnpm build" { pnpm build }
Invoke-ValidationStep "pnpm build:wasm" { pnpm build:wasm }
Invoke-ValidationStep "pnpm test:wasm" { pnpm test:wasm }
Invoke-ValidationStep "pnpm test:e2e" { pnpm test:e2e }
Invoke-ValidationStep "pnpm test:e2e:wasm" { pnpm test:e2e:wasm }
Invoke-ValidationStep "C++ build" { cmake --build cpp-core/build }
Invoke-ValidationStep "C++ ctest" { ctest --test-dir cpp-core/build -C Debug --output-on-failure }

Write-Host ""
Write-Host "All validation steps passed." -ForegroundColor Green
