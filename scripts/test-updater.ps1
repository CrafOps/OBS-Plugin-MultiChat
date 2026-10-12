$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$testRoot = Join-Path $projectRoot ('build/updater-tests-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem

# The child overrides only HTTP and process discovery. Real ZIP validation,
# checksums, compatibility guards, copying and rollback run against fixture folders.
$runner = Join-Path $testRoot 'runner.ps1'
@'
param([string]$Fixture, [string]$Updater)
$ErrorActionPreference = 'Stop'
$env:LOCALAPPDATA = Join-Path $Fixture 'local'
function Invoke-RestMethod {
    return [pscustomobject]@{
        draft = $false
        prerelease = $false
        assets = @(
            [pscustomobject]@{ name = 'update-manifest.json'; browser_download_url = 'https://github.com/PPekKunGzDev/-OBS-Plugin-MultiChat/releases/download/build-2/update-manifest.json' },
            [pscustomobject]@{ name = 'multi-live-chat-windows-x64.zip'; browser_download_url = 'https://github.com/PPekKunGzDev/-OBS-Plugin-MultiChat/releases/download/build-2/multi-live-chat-windows-x64.zip'; size = 4096 }
        )
    }
}
function Invoke-WebRequest {
    param([switch]$UseBasicParsing, [string]$Uri, [string]$OutFile, [int]$TimeoutSec)
    $source = if ($Uri.EndsWith('.json')) { 'manifest.json' } else { 'release.zip' }
    Copy-Item -LiteralPath (Join-Path $Fixture $source) -Destination $OutFile
}
function Get-Process {
    return $null
}
function Copy-Item {
    param([string]$LiteralPath, [string]$Destination, [switch]$Force)
    if ((Test-Path -LiteralPath (Join-Path $Fixture 'fail-copy')) -and
        $LiteralPath -match '\\package\\bridge\\main\.js$') {
        throw 'Injected disk write failure after DLL replacement'
    }
    Microsoft.PowerShell.Management\Copy-Item -LiteralPath $LiteralPath -Destination $Destination -Force:$Force
}
$held = $null
if (Test-Path -LiteralPath (Join-Path $Fixture 'lock-target')) {
    $held = [IO.File]::Open((Join-Path $Fixture 'obs/obs-plugins/64bit/obs-unified-chat.dll'), 'Open', 'Read', 'None')
}
& $Updater -PackageRoot (Join-Path $Fixture 'installed') -ObsRoot (Join-Path $Fixture 'obs') `
    -ObsPid 999999 -ObsVersion '32.2.2' -QtVersion '6.11.1'
if ($held) {
    $held.Dispose()
}
exit $LASTEXITCODE
'@ | Set-Content -LiteralPath $runner -Encoding utf8

foreach ($scenario in @('success', 'checksum', 'incompatible', 'traversal', 'locked', 'rollback')) {
    $fixture = Join-Path $testRoot $scenario
    $payload = Join-Path $fixture 'payload'
    foreach ($directory in @('installed', 'obs/bin/64bit', 'obs/obs-plugins/64bit', 'payload/obs-plugins/64bit',
        'payload/bridge', 'payload/data/obs-plugins/obs-unified-chat/locale')) {
        New-Item -ItemType Directory -Path (Join-Path $fixture $directory) -Force | Out-Null
    }
    $build = [ordered]@{
        pluginVersion = '0.2.0'
        buildNumber = 2
        pluginCommit = 'fixture-commit'
        obsVersion = '32.2.2'
        qtVersion = '6.11.1'
        architecture = 'x64'
        configuration = 'Release'
    }
    $build | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $payload 'build-info.json') -Encoding utf8
    $build.buildNumber = 1
    $build | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $fixture 'installed/build-info.json') -Encoding utf8
    'new-plugin' | Set-Content -LiteralPath (Join-Path $payload 'obs-plugins/64bit/obs-unified-chat.dll')
    'new-bridge' | Set-Content -LiteralPath (Join-Path $payload 'bridge/main.js')
    'PluginName="Multi Live Chat by @CrafOps"' | Set-Content -LiteralPath (Join-Path $payload 'data/obs-plugins/obs-unified-chat/locale/en-US.ini')
    'old-plugin' | Set-Content -LiteralPath (Join-Path $fixture 'obs/obs-plugins/64bit/obs-unified-chat.dll')
    'fixture-exe' | Set-Content -LiteralPath (Join-Path $fixture 'obs/bin/64bit/obs64.exe')
    if ($scenario -eq 'locked') {
        'lock' | Set-Content -LiteralPath (Join-Path $fixture 'lock-target')
    }
    if ($scenario -eq 'rollback') {
        'fail' | Set-Content -LiteralPath (Join-Path $fixture 'fail-copy')
    }
    $archive = Join-Path $fixture 'release.zip'
    [IO.Compression.ZipFile]::CreateFromDirectory($payload, $archive)
    if ($scenario -eq 'traversal') {
        $zip = [IO.Compression.ZipFile]::Open($archive, 'Update')
        $entry = $zip.CreateEntry('../escape.txt')
        $writer = [IO.StreamWriter]::new($entry.Open())
        $writer.Write('unsafe')
        $writer.Dispose()
        $zip.Dispose()
    }
    $manifest = [ordered]@{
        schema = 1
        buildNumber = 2
        pluginCommit = 'fixture-commit'
        obsVersion = if ($scenario -eq 'incompatible') { '31.0.0' } else { '32.2.2' }
        qtVersion = '6.11.1'
        architecture = 'x64'
        configuration = 'Release'
        sha256 = if ($scenario -eq 'checksum') { '0' * 64 } else { (Get-FileHash -LiteralPath $archive).Hash }
    }
    $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $fixture 'manifest.json') -Encoding utf8
    & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $runner `
        -Fixture $fixture -Updater (Join-Path $PSScriptRoot 'auto-update.ps1')
    $code = $LASTEXITCODE
    $plugin = (Get-Content -LiteralPath (Join-Path $fixture 'obs/obs-plugins/64bit/obs-unified-chat.dll') -Raw).Trim()
    $installed = Get-Content -LiteralPath (Join-Path $fixture 'installed/build-info.json') -Raw | ConvertFrom-Json
    $status = Get-Content -LiteralPath (Join-Path $fixture 'installed/.update-status.txt') -Raw
    if ($scenario -eq 'success') {
        if ($code -ne 0 -or $plugin -ne 'new-plugin' -or $installed.buildNumber -ne 2 -or $status -notmatch 'Updated to build') {
            throw "Successful update fixture failed: $status"
        }
        if (-not (Test-Path -LiteralPath (Join-Path $fixture 'obs/data/obs-plugins/obs-unified-chat/locale/en-US.ini'))) {
            throw 'Native locale data was not installed'
        }
    } elseif ($code -eq 0 -or $plugin -ne 'old-plugin' -or $installed.buildNumber -ne 1) {
        throw "Update guard / rollback fixture failed ($scenario): $status"
    }
    Write-Host "Updater check passed: $scenario"
}
Write-Host 'Automatic updater checks passed (fixture files only; no real OBS installation modified).'
exit 0
