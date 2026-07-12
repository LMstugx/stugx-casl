param([switch]$Dev)

$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path -LiteralPath $vswhere)) { throw "Visual Studio Installer vswhere.exe was not found." }
$vsInstall = (& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath | Select-Object -First 1)
if (-not $vsInstall) { throw "Visual Studio C++ x64 tools were not found." }
$vsDevCmd = Join-Path $vsInstall "Common7\Tools\VsDevCmd.bat"
if (-not (Test-Path -LiteralPath $vsDevCmd)) { throw "VsDevCmd.bat was not found." }

$vsEnvironmentCommand = "call `"$vsDevCmd`" -arch=x64 -host_arch=x64 >nul && set"
$environmentLines = @(& cmd.exe /d /c $vsEnvironmentCommand)
if ($LASTEXITCODE -ne 0) { throw "VsDevCmd.bat failed with exit code $LASTEXITCODE." }
foreach ($line in $environmentLines) {
  $separator = $line.IndexOf('=')
  if ($separator -gt 0) {
    [Environment]::SetEnvironmentVariable($line.Substring(0, $separator), $line.Substring($separator + 1), "Process")
  }
}

$cargoBin = Join-Path $env:USERPROFILE ".cargo\bin"
$nodeBin = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$nodeTools = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\bin"
$env:Path = "$cargoBin;$nodeBin;$nodeTools;$env:Path"
Set-Location $repoRoot

if ($Dev) {
  pnpm exec tauri dev
  exit $LASTEXITCODE
}

Write-Host "==> cargo check" -ForegroundColor Cyan
cargo check --locked --manifest-path src-tauri/Cargo.toml
if ($LASTEXITCODE -ne 0) { throw "cargo check failed." }

Write-Host "==> cargo clippy -D warnings" -ForegroundColor Cyan
cargo clippy --locked --manifest-path src-tauri/Cargo.toml -- -D warnings
if ($LASTEXITCODE -ne 0) { throw "cargo clippy failed." }

Write-Host "==> Tauri release build (NSIS)" -ForegroundColor Cyan
pnpm exec tauri build --bundles nsis
if ($LASTEXITCODE -ne 0) { throw "Tauri build failed." }

$targetRoot = Join-Path $repoRoot "src-tauri\target"
$releaseExe = Join-Path $targetRoot "release\stugx-casl.exe"
$installer = Get-ChildItem -LiteralPath (Join-Path $targetRoot "release\bundle\nsis") -Filter *.exe -File -ErrorAction SilentlyContinue | Sort-Object Name | Select-Object -First 1
if (-not (Test-Path -LiteralPath $releaseExe)) { throw "Release executable was not produced." }
if (-not $installer) { throw "NSIS installer was not produced." }

$outputs = @($releaseExe, $installer.FullName)
$checksums = foreach ($path in $outputs) {
  $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
  Set-Content -LiteralPath "$path.sha256" -Value "$hash  $([IO.Path]::GetFileName($path))" -Encoding ascii
  $relativePath = $path.Substring($targetRoot.TrimEnd('\').Length).TrimStart('\').Replace('\', '/')
  [ordered]@{ file = $relativePath; bytes = (Get-Item -LiteralPath $path).Length; sha256 = $hash }
}
$report = [ordered]@{
  schemaVersion = 1
  runtime = "tauri"
  backend = "wasm"
  signed = $false
  outputs = $checksums
}
$reportPath = Join-Path $targetRoot "tauri-demo-build-report.json"
$report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $reportPath -Encoding utf8
Write-Host "Tauri demo build completed. Report: $reportPath" -ForegroundColor Green
