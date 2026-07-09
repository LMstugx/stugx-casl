Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$artifactRoot = Join-Path $repoRoot "artifacts\visual-review"
$screenshotRoot = Join-Path $artifactRoot "screenshots"

function Run-Step {
    param(
        [string] $Name,
        [scriptblock] $Command
    )

    Write-Host ""
    Write-Host "==> $Name"
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
}

function HtmlEncode {
    param([string] $Value)
    return [System.Net.WebUtility]::HtmlEncode($Value)
}

Set-Location $repoRoot

Write-Host "Repository: $repoRoot"
$status = git status --short
if ($status) {
    Write-Host "Git status: working tree has local changes; capturing current working tree state."
    $status | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "Git status: clean"
}

if (Test-Path $artifactRoot) {
    Remove-Item -LiteralPath $artifactRoot -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $screenshotRoot | Out-Null

Run-Step "pnpm visual:review" { pnpm visual:review }

$pngFiles = Get-ChildItem -Path $screenshotRoot -Recurse -Filter *.png | Sort-Object FullName
if (-not $pngFiles) {
    throw "No screenshots were generated under $screenshotRoot"
}

$commit = (git rev-parse --short HEAD).Trim()
$generatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss zzz")
$descriptions = @{
    "project-overview.png" = "Project overview, learning pipeline, and guided lesson context."
    "casl-gr2-ld.png" = "After LD: Memory row A flows through MDR into the GR2 row."
    "casl-gr2-adda.png" = "After ADDA: GR2 and Memory[B] feed the ALU, then update GR2 and FR."
    "casl-gr2-st.png" = "After ST: GR2 flows through MDR into Memory[C]."
    "cpp-addition-generated-casl.png" = "C++ Addition lowered into Generated CASL II Assembly."
    "machine-code-explanation.png" = "Machine Code explanation for an LD instruction word."
    "for-sum-control-flow.png" = "For Sum Sugar generated labels and control-flow targets."
    "break-continue-trace.png" = "Trace after Break Continue shows continue and break jumps."
    "logic-operations-machine-code.png" = "Logic Operations machine code for AND / OR / XOR."
    "logical-add-compare-jov.png" = "Logical Add Compare machine code and JOV control-flow row."
}

$cards = foreach ($file in $pngFiles) {
    $artifactUri = New-Object System.Uri (($artifactRoot.TrimEnd("\") + "\"))
    $fileUri = New-Object System.Uri $file.FullName
    $relativePath = $artifactUri.MakeRelativeUri($fileUri).ToString()
    $name = $file.Name
    $title = [System.IO.Path]::GetFileNameWithoutExtension($name).Replace("-", " ")
    $viewport = Split-Path -Leaf (Split-Path -Parent $file.FullName)
    if ($viewport -eq "screenshots") {
        $viewport = "1440x900 primary"
    }
    $description = $descriptions[$name]
    if (-not $description) {
        $description = "Visual review screenshot."
    }

    @"
      <article class="card">
        <a href="$relativePath" target="_blank" rel="noreferrer">
          <img src="$relativePath" alt="$(HtmlEncode $title)" loading="lazy" />
        </a>
        <div class="card-body">
          <h2>$(HtmlEncode $title)</h2>
          <p class="meta">$(HtmlEncode $viewport)</p>
          <p>$(HtmlEncode $description)</p>
        </div>
      </article>
"@
}

$html = @"
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>stugx.CASL Visual Review</title>
  <style>
    :root {
      --bg: #eef2f7;
      --surface: #ffffff;
      --border: #cbd5e1;
      --text: #0f172a;
      --muted: #64748b;
      --primary: #1d4ed8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, "Segoe UI", Arial, sans-serif;
    }
    header {
      padding: 22px 26px 14px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    h1 {
      margin: 0 0 6px;
      font-size: 24px;
    }
    .summary {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
    }
    main {
      padding: 18px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 16px;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .card img {
      display: block;
      width: 100%;
      height: auto;
      border-bottom: 1px solid var(--border);
    }
    .card-body {
      padding: 12px 14px 14px;
    }
    .card h2 {
      margin: 0 0 4px;
      font-size: 16px;
      text-transform: capitalize;
    }
    .card p {
      margin: 6px 0 0;
      line-height: 1.45;
    }
    .meta {
      color: var(--primary);
      font: 12px/1.3 "Cascadia Mono", Consolas, monospace;
    }
    footer {
      padding: 12px 26px 24px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <header>
    <h1>stugx.CASL Visual Review</h1>
    <p class="summary">Generated: $(HtmlEncode $generatedAt) | Commit: $(HtmlEncode $commit) | Screenshots: $($pngFiles.Count)</p>
    <p class="summary">Click a screenshot to open it full size. Use this gallery for remote UI review, especially circuit row anchors, Machine Code explanations, Trace, and Control Flow.</p>
  </header>
  <main>
$($cards -join "`n")
  </main>
  <footer>
    Local file: $(HtmlEncode (Join-Path $artifactRoot "index.html"))
  </footer>
</body>
</html>
"@

$indexPath = Join-Path $artifactRoot "index.html"
Set-Content -LiteralPath $indexPath -Value $html -Encoding UTF8

Write-Host ""
Write-Host "Visual review gallery generated:"
Write-Host "  $indexPath"
Write-Host ""
Write-Host "To serve it locally:"
Write-Host "  pnpm visual:serve"
