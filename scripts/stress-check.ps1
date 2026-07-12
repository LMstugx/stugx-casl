$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$bundledBin = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\bin"
if (Test-Path $bundledNode) {
  $env:Path = "$bundledNode;$bundledBin;$env:Path"
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Name"
  $global:LASTEXITCODE = 0
  & $Command
  if ($global:LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $global:LASTEXITCODE"
  }
}

Invoke-Step "pnpm build:wasm" {
  pnpm build:wasm
}

Invoke-Step "stress vitest corpus" {
  pnpm exec vitest run `
    src/transpiler/__tests__/cppParserFuzzCorpus.test.ts `
    src/tests/caslAssemblerFuzzCorpus.test.ts `
    src/tests/largeSourceStress.test.ts `
    src/tests/wasmLifecycleStress.test.ts `
    src/tests/runStopResetStress.test.tsx
}

Invoke-Step "pnpm test:wasm" {
  pnpm test:wasm
}

Invoke-Step "C++ build" {
  cmake --build cpp-core/build
}

Invoke-Step "C++ ctest" {
  ctest --test-dir cpp-core/build -C Debug --output-on-failure
}

Write-Host ""
Write-Host "Stress check completed."
Write-Host "Sanitizer pass is optional and was not run by this script."
