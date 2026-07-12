$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$targetRoot = Join-Path $repoRoot "src-tauri\target"
$distRoot = Join-Path $repoRoot "dist"
Set-Location $repoRoot

$config = Get-Content -LiteralPath "src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json
$capability = Get-Content -LiteralPath "src-tauri\capabilities\default.json" -Raw | ConvertFrom-Json
if ($config.identifier -ne "com.stugx.casl") { throw "Unexpected Tauri identifier." }
if ($config.build.frontendDist -ne "../dist") { throw "Tauri must reuse the existing dist directory." }
if ($config.app.windows.Count -ne 1 -or $config.app.windows[0].label -ne "main") { throw "Tauri must define one main window." }
if ($config.app.windows[0].devtools -ne $false) { throw "Release DevTools must be disabled." }
if ($capability.windows.Count -ne 1 -or $capability.windows[0] -ne "main" -or $capability.permissions.Count -ne 0) { throw "Tauri capability is not minimal and main-window scoped." }

$cargo = Get-Content -LiteralPath "src-tauri\Cargo.toml" -Raw
if ($cargo -match 'tauri-plugin-(?:fs|dialog|shell|http|updater|process|store|clipboard|notification)' -or $cargo -match 'tauri-plugin-log') {
  throw "A prohibited Tauri plugin is enabled."
}
$rustSource = (Get-Content -LiteralPath "src-tauri\src\lib.rs" -Raw) + (Get-Content -LiteralPath "src-tauri\src\main.rs" -Raw)
if ($rustSource -match '#\[tauri::command\]|invoke_handler|generate_handler') { throw "Custom Rust commands are prohibited in Phase 18A." }

$requiredDist = @("index.html", "wasm\stugx_casl_core.js", "wasm\stugx_casl_core.wasm")
foreach ($relative in $requiredDist) {
  $path = Join-Path $distRoot $relative
  if (-not (Test-Path -LiteralPath $path) -or (Get-Item -LiteralPath $path).Length -eq 0) { throw "Missing Tauri frontend artifact: $relative" }
}
if (Get-ChildItem -LiteralPath $distRoot -Recurse -File -Filter *.map) { throw "Tauri release contains source maps." }
$html = Get-Content -LiteralPath (Join-Path $distRoot "index.html") -Raw
if ($html -match '(?:src|href)="/' -or $html -match '(?:src|href)="https?://') { throw "Tauri index contains a remote or root-absolute asset reference." }

$releaseExe = Join-Path $targetRoot "release\stugx-casl.exe"
$installerDir = Join-Path $targetRoot "release\bundle\nsis"
if (-not (Test-Path -LiteralPath $releaseExe)) { throw "Release executable is missing." }
$installer = Get-ChildItem -LiteralPath $installerDir -Filter *.exe -File -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $installer) { throw "NSIS installer is missing." }
foreach ($path in @($releaseExe, $installer.FullName)) {
  if (-not (Test-Path -LiteralPath "$path.sha256")) { throw "Checksum is missing for $path" }
}

$prohibitedNames = @('tests', 'docs', 'artifacts', 'coverage', 'node_modules', '.env')
if (Get-ChildItem -LiteralPath $distRoot -Recurse -Force | Where-Object { $prohibitedNames -contains $_.Name }) { throw "Tauri frontend contains a prohibited deployment path." }
$localMarkers = @($repoRoot, $env:USERPROFILE) | Where-Object { $_ } | ForEach-Object { $_.Replace('\', '/').ToLowerInvariant() }
foreach ($file in Get-ChildItem -LiteralPath $distRoot -Recurse -File | Where-Object { $_.Extension -in '.html', '.js', '.css', '.json' }) {
  $text = (Get-Content -LiteralPath $file.FullName -Raw).Replace('\', '/').ToLowerInvariant()
  if ($localMarkers | Where-Object { $text.Contains($_) }) { throw "Local absolute path leaked into $($file.FullName)." }
}

git check-ignore src-tauri/target | Out-Null
if ($LASTEXITCODE -ne 0) { throw "src-tauri/target is not gitignored." }
Write-Host "Tauri demo verification passed." -ForegroundColor Green
