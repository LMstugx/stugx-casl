param(
    [int] $Port = 8765
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$galleryRoot = Join-Path $repoRoot "artifacts\visual-review"
$indexPath = Join-Path $galleryRoot "index.html"
$pidPath = Join-Path $galleryRoot "server.pid"

function Resolve-CommandPath {
    param([string[]] $Candidates)

    foreach ($candidate in $Candidates) {
        if ($candidate -and (Test-Path $candidate)) {
            return $candidate
        }
        $command = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($command) {
            return $command.Source
        }
    }
    return $null
}

function Get-LanIPv4 {
    try {
        $address = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.AddressState -eq "Preferred" } |
            Select-Object -First 1 -ExpandProperty IPAddress
        if ($address) { return $address }
    } catch {
        # Fall back to ipconfig below.
    }

    $match = (ipconfig | Select-String -Pattern "IPv4.*?:\s*([0-9.]+)" | Select-Object -First 1)
    if ($match -and $match.Matches.Count -gt 0) {
        return $match.Matches[0].Groups[1].Value
    }
    return $null
}

if (-not (Test-Path $indexPath)) {
    throw "Visual review gallery not found: $indexPath. Run pnpm visual:capture first."
}

if (Test-Path $pidPath) {
    $existingPidText = Get-Content -LiteralPath $pidPath -ErrorAction SilentlyContinue | Select-Object -First 1
    $existingPid = 0
    if ([int]::TryParse($existingPidText, [ref] $existingPid)) {
        $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
        if ($existingProcess) {
            $lanIp = Get-LanIPv4
            Write-Host "Visual review server already appears to be running."
            Write-Host "  PID: $existingPid"
            Write-Host "  Local URL: http://127.0.0.1:$Port/"
            if ($lanIp) {
                Write-Host "  LAN URL: http://$lanIp`:$Port/"
            } else {
                Write-Host "  LAN URL: run ipconfig, then open http://<IPv4>:$Port/ from your phone."
            }
            Write-Host "  Stop: Stop-Process -Id $existingPid"
            exit 0
        }
    }
}

$pythonCandidates = @(
    "C:\Users\LMSTUGX\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe",
    "python",
    "py"
)
$python = Resolve-CommandPath $pythonCandidates

if ($python) {
    $arguments = @("-m", "http.server", "$Port", "--bind", "0.0.0.0", "--directory", $galleryRoot)
    $process = Start-Process -FilePath $python -ArgumentList $arguments -PassThru -WindowStyle Hidden
} else {
    $node = Resolve-CommandPath @(
        "node",
        "C:\Users\LMSTUGX\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    )
    if (-not $node) {
        throw "Neither Python nor Node.js was found. Install or add one to PATH, then run pnpm visual:serve again."
    }

    $serverScript = Join-Path $galleryRoot "static-server.mjs"
    $serverSource = @"
import { createServer } from "node:http";
import { createReadStream, statSync, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = process.argv[2];
const port = Number(process.argv[3]);
const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".png", "image/png"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"]
]);

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = normalize(join(root, requested));
  if (!filePath.startsWith(normalize(root)) || !existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const stat = statSync(filePath);
  if (!stat.isFile()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": mime.get(extname(filePath)) ?? "application/octet-stream" });
  createReadStream(filePath).pipe(response);
}).listen(port, "0.0.0.0");
"@
    Set-Content -LiteralPath $serverScript -Value $serverSource -Encoding UTF8
    $process = Start-Process -FilePath $node -ArgumentList @($serverScript, $galleryRoot, "$Port") -PassThru -WindowStyle Hidden
}

Set-Content -LiteralPath $pidPath -Value $process.Id -Encoding ASCII
Start-Sleep -Milliseconds 750

$lanIp = Get-LanIPv4
Write-Host "Visual review server started."
Write-Host "  PID: $($process.Id)"
Write-Host "  Root: $galleryRoot"
Write-Host "  Local URL: http://127.0.0.1:$Port/"
if ($lanIp) {
    Write-Host "  LAN URL: http://$lanIp`:$Port/"
} else {
    Write-Host "  LAN URL: run ipconfig, then open http://<IPv4>:$Port/ from your phone."
}
Write-Host "  Stop: Stop-Process -Id $($process.Id)"

try {
    Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/" -TimeoutSec 5 | Out-Null
} catch {
    Write-Warning "Server started but local health check did not complete yet. Try the Local URL in a browser."
}
