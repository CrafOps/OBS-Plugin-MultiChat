param(
    [ValidateSet('Debug', 'Release')][string]$Configuration = 'Release',
    [switch]$WithoutTikTok
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$stage = Join-Path $projectRoot 'package'
$dll = Join-Path $stage 'obs-plugins/64bit/obs-unified-chat.dll'
if (-not (Test-Path -LiteralPath $dll)) {
    throw 'No compiled DLL. Run build.ps1 successfully first.'
}
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'bridge') | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'bridge/dist') -Destination (Join-Path $stage 'bridge') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'overlay') -Destination $stage -Recurse -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'docs') -Destination $stage -Recurse -Force
foreach ($name in @('package.json', 'package-lock.json')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot "bridge/$name") -Destination (Join-Path $stage 'bridge') -Force
}
Copy-Item -LiteralPath (Join-Path $projectRoot 'README.md') -Destination $stage -Force
Push-Location -LiteralPath (Join-Path $stage 'bridge')
try {
    $arguments = @('ci', '--omit=dev', '--no-audit', '--no-fund')
    if ($WithoutTikTok) {
        $arguments += '--omit=optional'
    }
    & npm.cmd @arguments
    if ($LASTEXITCODE -ne 0) {
        throw 'Production dependency installation failed'
    }
} finally {
    Pop-Location
}
Write-Host "Staged package: $stage"
Write-Host 'Node.js 22+ must be installed separately. OBS supplies its matching Qt runtime.'
Write-Host 'Review dependency licenses before distributing; optional TikTok connector is AGPL-3.0-only.'
