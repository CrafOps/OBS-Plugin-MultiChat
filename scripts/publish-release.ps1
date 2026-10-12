$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$stage = Join-Path $projectRoot 'package'
$output = Join-Path $projectRoot 'build/release'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$archive = Join-Path $output 'multi-live-chat-windows-x64.zip'
Add-Type -AssemblyName System.IO.Compression.FileSystem
[IO.Compression.ZipFile]::CreateFromDirectory($stage, $archive, 'Optimal', $false)
$build = Get-Content -LiteralPath (Join-Path $stage 'build-info.json') -Raw | ConvertFrom-Json
$manifest = [ordered]@{
    schema = 1
    repositoryId = [long]$env:GITHUB_REPOSITORY_ID
    pluginVersion = $build.pluginVersion
    buildNumber = $build.buildNumber
    pluginCommit = $build.pluginCommit
    obsVersion = $build.obsVersion
    qtVersion = $build.qtVersion
    architecture = $build.architecture
    configuration = $build.configuration
    sha256 = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
}
$manifestPath = Join-Path $output 'update-manifest.json'
$manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding utf8
$notes = Join-Path $output 'notes.md'
@"
Multi Live Chat by @CrafOps — Windows x64, OBS $($build.obsVersion), Qt $($build.qtVersion).

Download Multi-Live-Chat-Setup.exe, close OBS, and choose your OBS installation folder. Setup includes the portable chat runtime, installs the plugin and configures Settings automatically. Later compatible releases install after OBS closes. The package folder and OBS plugin folders must be writable. The ZIP is available for manual installation.

Bridge tests and native UI checks passed. Actual OBS loading and public LIVE connectivity require user validation.
"@ | Set-Content -LiteralPath $notes -Encoding utf8
& gh release create "build-$($build.buildNumber)" $archive $manifestPath (Join-Path $output 'Multi-Live-Chat-Setup.exe') `
    --repo $env:GITHUB_REPOSITORY --target $env:GITHUB_SHA `
    --title "Multi Live Chat 0.2.0 · build $($build.buildNumber)" --notes-file $notes --latest
if ($LASTEXITCODE -ne 0) {
    throw 'GitHub Release publication failed'
}
