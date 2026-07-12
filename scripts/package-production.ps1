param([string]$BasePath = $(if ($env:VITE_BASE_PATH) { $env:VITE_BASE_PATH } else { "/" }))
$ErrorActionPreference = "Stop"
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$distPath = Join-Path $repoRoot "dist"
$releasePath = Join-Path $repoRoot "release"
Set-Location $repoRoot
& (Join-Path $PSScriptRoot "verify-production-build.ps1") -BasePath $BasePath
$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
New-Item -ItemType Directory -Force -Path $releasePath | Out-Null
$zipPath = Join-Path $releasePath "stugx-casl-web-$version.zip"
if (Test-Path $zipPath) { Remove-Item -LiteralPath $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream = [IO.File]::Open($zipPath, [IO.FileMode]::CreateNew)
try {
  $archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create, $false)
  try {
    $files = Get-ChildItem -LiteralPath $distPath -Recurse -File | Sort-Object { $_.FullName.Substring($distPath.Length) }
    foreach ($file in $files) {
      $entryName = $file.FullName.Substring($distPath.Length).TrimStart('\', '/').Replace('\', '/')
      if ($entryName -match '(^|/)(tests?|fixtures?|artifacts?|coverage|node_modules|\.env)(/|$)' -or $entryName.EndsWith('.map')) {
        throw "Prohibited package entry: $entryName"
      }
      $entry = $archive.CreateEntry($entryName, [IO.Compression.CompressionLevel]::Optimal)
      $entry.LastWriteTime = [DateTimeOffset]::new(2000, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
      $input = $file.OpenRead()
      $output = $entry.Open()
      try { $input.CopyTo($output) } finally { $output.Dispose(); $input.Dispose() }
    }
  } finally { $archive.Dispose() }
} finally { $stream.Dispose() }

$package = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $expectedFiles = Get-ChildItem -LiteralPath $distPath -Recurse -File | ForEach-Object { $_.FullName.Substring($distPath.Length).TrimStart('\', '/').Replace('\', '/') } | Sort-Object
  $actualFiles = @($package.Entries | ForEach-Object { $_.FullName } | Sort-Object)
  if ([string]::Join("`n", $expectedFiles) -ne [string]::Join("`n", $actualFiles)) { throw "Package entries do not match verified dist files." }
  foreach ($entry in $package.Entries) {
    if ($entry.FullName.StartsWith('/') -or $entry.FullName.Contains('..') -or $entry.FullName.Contains('\')) { throw "Unsafe ZIP entry: $($entry.FullName)" }
    $distFile = Join-Path $distPath $entry.FullName
    if ($entry.Length -ne (Get-Item -LiteralPath $distFile).Length) { throw "Package size mismatch: $($entry.FullName)" }
    $entryStream = $entry.Open()
    try {
      $sha = [Security.Cryptography.SHA256]::Create()
      try { $entryHash = [BitConverter]::ToString($sha.ComputeHash($entryStream)).Replace("-", "") } finally { $sha.Dispose() }
    } finally { $entryStream.Dispose() }
    if ($entryHash -ne (Get-FileHash -Algorithm SHA256 -LiteralPath $distFile).Hash) { throw "Package hash mismatch: $($entry.FullName)" }
  }
} finally { $package.Dispose() }

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $zipPath).Hash.ToLowerInvariant()
$checksumPath = "$zipPath.sha256"
[IO.File]::WriteAllText($checksumPath, "$hash  $([IO.Path]::GetFileName($zipPath))`n", [Text.UTF8Encoding]::new($false))
Write-Host "Production package created locally: $zipPath" -ForegroundColor Green
