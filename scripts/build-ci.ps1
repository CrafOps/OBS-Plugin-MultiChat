param(
    [ValidateSet('Debug', 'Release')][string]$Configuration = 'Release',
    [switch]$WithoutTikTok
)

# This script runs on the GitHub Windows runner, never installs SDKs on the user's PC.
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$obsSource = Join-Path $projectRoot '.ci/obs-studio'
$obsBuild = Join-Path $obsSource 'build_x64'
$sdkPrefix = Join-Path $projectRoot 'build/obs-sdk'
$nativeBuild = Join-Path $projectRoot 'build/native'
$stage = Join-Path $projectRoot 'package'
$expectedObs = '32.2.2'
$expectedQt = '6.11.1'
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
if (-not (Test-Path -LiteralPath $vswhere)) {
    throw 'Runner has no Visual Studio installation locator.'
}
$vsVersion = & $vswhere -latest -products '*' `
    -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationVersion
if (-not $vsVersion) {
    throw 'Runner has no Visual Studio C++ toolchain.'
}
$vsMajor = [int]($vsVersion.Split('.')[0])
switch ($vsMajor) {
    17 {
        $generator = 'Visual Studio 17 2022'
    }
    18 {
        $generator = 'Visual Studio 18 2026'
    }
    default {
        throw "Unsupported Visual Studio major version: $vsMajor"
    }
}
Write-Host "Runner CMake generator: $generator"

function Assert-NativeSuccess([string]$operation) {
    if ($LASTEXITCODE -ne 0) {
        throw "$operation failed with exit code $LASTEXITCODE"
    }
}

foreach ($toolName in @('cmake', 'git', 'node', 'npm.cmd')) {
    if (-not (Get-Command $toolName -ErrorAction SilentlyContinue)) {
        throw "Runner is missing $toolName"
    }
}
if (-not (Test-Path -LiteralPath (Join-Path $obsSource 'CMakePresets.json'))) {
    throw 'Check out obsproject/obs-studio tag 32.2.2 into .ci/obs-studio first.'
}
$sourceTag = & git -C $obsSource describe --tags --exact-match
Assert-NativeSuccess 'Checking OBS source tag'
if ($sourceTag -ne $expectedObs) {
    throw "Expected OBS $expectedObs; found $sourceTag"
}

# OBS's own preset downloads its release-specific dependencies and verifies SHA256.
# Disable frontend/plugins; build only the two SDK library targets we need.
Push-Location -LiteralPath $obsSource
try {
    & cmake --preset windows-x64 -G $generator -A x64 `
        -DENABLE_FRONTEND=OFF -DENABLE_PLUGINS=OFF -DENABLE_SCRIPTING=OFF `
        -DENABLE_BROWSER=OFF -DENABLE_VIRTUALCAM=OFF
    Assert-NativeSuccess 'OBS SDK configuration'
    & cmake --build $obsBuild --config $Configuration --target libobs obs-frontend-api --parallel 4
    Assert-NativeSuccess 'OBS SDK build'
} finally {
    Pop-Location
}

# Install only the built library subdirectories, avoiding unbuilt OBS app/plugins.
foreach ($subdirectory in @('libobs', 'frontend/api')) {
    & cmake --install (Join-Path $obsBuild $subdirectory) --config $Configuration `
        --component Development --prefix $sdkPrefix
    Assert-NativeSuccess "Installing SDK $subdirectory"
}

$qtConfigs = @(Get-ChildItem -LiteralPath (Join-Path $obsSource '.deps') `
    -Filter 'Qt6Config.cmake' -Recurse)
if ($qtConfigs.Count -ne 1) {
    throw 'Expected exactly one Qt SDK downloaded by OBS. Inspect the dependency logs.'
}
$qtPrefix = $qtConfigs[0].Directory.Parent.Parent.Parent.FullName
$cacheLine = Get-Content -LiteralPath (Join-Path $obsBuild 'CMakeCache.txt') |
    Where-Object { $_ -match '^CMAKE_PREFIX_PATH:[^=]+=' } |
    Select-Object -First 1
if (-not $cacheLine) {
    throw 'OBS did not record its dependency prefixes in CMakeCache.txt.'
}
$dependencyPrefixes = ($cacheLine -split '=', 2)[1]
$qtCore = Join-Path $qtPrefix 'bin/Qt6Core.dll'
if (-not (Test-Path -LiteralPath $qtCore)) {
    throw "Qt runtime is missing from $qtPrefix"
}
$actualQt = (Get-Item -LiteralPath $qtCore).VersionInfo.ProductVersion
if (-not ($actualQt -eq $expectedQt -or $actualQt.StartsWith("$expectedQt."))) {
    throw "OBS dependency Qt version $actualQt does not match installed target Qt $expectedQt. No package will be produced."
}

# OBS may omit Qt WebSockets. Build that exact Qt module against its supplied Qt SDK.
$websocketConfig = Join-Path $qtPrefix 'lib/cmake/Qt6WebSockets/Qt6WebSocketsConfig.cmake'
if (-not (Test-Path -LiteralPath $websocketConfig)) {
    $moduleSource = Join-Path $projectRoot '.ci/qtwebsockets'
    $moduleBuild = Join-Path $projectRoot 'build/qtwebsockets'
    & git clone --depth 1 --branch "v$expectedQt" https://github.com/qt/qtwebsockets.git $moduleSource
    Assert-NativeSuccess 'Downloading official Qt WebSockets source'
    & cmake -S $moduleSource -B $moduleBuild -G $generator -A x64 `
        "-DCMAKE_PREFIX_PATH=$qtPrefix" "-DCMAKE_INSTALL_PREFIX=$qtPrefix" `
        -DQT_BUILD_TESTS=OFF -DQT_BUILD_EXAMPLES=OFF
    Assert-NativeSuccess 'Qt WebSockets configuration'
    & cmake --build $moduleBuild --config $Configuration --parallel 4
    Assert-NativeSuccess 'Qt WebSockets build'
    & cmake --install $moduleBuild --config $Configuration
    Assert-NativeSuccess 'Qt WebSockets installation'
}

& cmake -S (Join-Path $projectRoot 'native') -B $nativeBuild -G $generator -A x64 `
    "-DCMAKE_PREFIX_PATH=$sdkPrefix;$qtPrefix;$dependencyPrefixes" `
    "-DUNIFIED_CHAT_EXPECTED_QT=$expectedQt" -DUNIFIED_CHAT_BUILD_UI_TESTS=ON
Assert-NativeSuccess 'Plugin configuration'
& cmake --build $nativeBuild --config $Configuration --parallel 4
Assert-NativeSuccess 'Plugin build'
$savedRuntimePath = $env:PATH
$savedPluginPath = $env:QT_PLUGIN_PATH
$savedQtPlatform = $env:QT_QPA_PLATFORM
$runtimeBins = @((Join-Path $qtPrefix 'bin'))
foreach ($prefix in ($dependencyPrefixes -split ';')) {
    foreach ($subdirectory in @('bin', 'bin/64bit')) {
        $candidate = Join-Path $prefix $subdirectory
        if (Test-Path -LiteralPath $candidate) {
            $runtimeBins += $candidate
        }
    }
}
if (-not ('UnifiedChatBuild.NativeErrorMode' -as [type])) {
    Add-Type -TypeDefinition @'
namespace UnifiedChatBuild
{
    public static class NativeErrorMode
    {
        [System.Runtime.InteropServices.DllImport("kernel32.dll")]
        public static extern uint SetErrorMode(uint mode);
    }
}
'@
}
$savedErrorMode = [UnifiedChatBuild.NativeErrorMode]::SetErrorMode(0x8003)
try {
    $env:PATH = (($runtimeBins | Select-Object -Unique) -join ';') + ';' + $savedRuntimePath
    $env:QT_PLUGIN_PATH = Join-Path $qtPrefix 'plugins'
    $env:QT_QPA_PLATFORM = 'offscreen'
    & ctest --test-dir $nativeBuild -C $Configuration --output-on-failure --timeout 30
    Assert-NativeSuccess 'Native media and card layout checks'
} finally {
    $env:PATH = $savedRuntimePath
    $env:QT_PLUGIN_PATH = $savedPluginPath
    $env:QT_QPA_PLATFORM = $savedQtPlatform
    [UnifiedChatBuild.NativeErrorMode]::SetErrorMode($savedErrorMode) | Out-Null
}
& cmake --install $nativeBuild --config $Configuration --prefix $stage
Assert-NativeSuccess 'Plugin staging'
& (Join-Path $PSScriptRoot 'package.ps1') -Configuration $Configuration -WithoutTikTok:$WithoutTikTok

$qtSuffix = ''
if ($Configuration -eq 'Debug') {
    $qtSuffix = 'd'
}
$websocketDll = Join-Path $qtPrefix "bin/Qt6WebSockets$qtSuffix.dll"
if (-not (Test-Path -LiteralPath $websocketDll)) {
    throw "Matching Qt WebSockets runtime is missing: $websocketDll"
}
$runtimeDirectory = Join-Path $stage 'bin/64bit'
New-Item -ItemType Directory -Force -Path $runtimeDirectory | Out-Null
Copy-Item -LiteralPath $websocketDll -Destination $runtimeDirectory

# Media uses Qt Concurrent and matching image codecs; OBS supplies Core/Gui/Network.
$concurrentDll = Join-Path $qtPrefix "bin/Qt6Concurrent$qtSuffix.dll"
if (-not (Test-Path -LiteralPath $concurrentDll)) {
    throw "Matching Qt Concurrent runtime is missing: $concurrentDll"
}
Copy-Item -LiteralPath $concurrentDll -Destination $runtimeDirectory
$codecDestination = Join-Path $runtimeDirectory 'imageformats'
New-Item -ItemType Directory -Force -Path $codecDestination | Out-Null
foreach ($codecName in @('qgif', 'qjpeg', 'qwebp')) {
    $codec = Join-Path $qtPrefix "plugins/imageformats/$codecName$qtSuffix.dll"
    if (Test-Path -LiteralPath $codec) {
        Copy-Item -LiteralPath $codec -Destination $codecDestination
    }
}
$tlsDestination = Join-Path $runtimeDirectory 'tls'
New-Item -ItemType Directory -Force -Path $tlsDestination | Out-Null
foreach ($backendName in @('qschannelbackend', 'qcertonlybackend')) {
    $backend = Join-Path $qtPrefix "plugins/tls/$backendName$qtSuffix.dll"
    if (Test-Path -LiteralPath $backend) {
        Copy-Item -LiteralPath $backend -Destination $tlsDestination
    }
}

$manifest = [ordered]@{
    pluginVersion = '0.1.0'
    obsVersion = $expectedObs
    obsSourceCommit = (& git -C $obsSource rev-parse HEAD)
    qtVersion = $actualQt
    architecture = 'x64'
    configuration = $Configuration
    cmakeGenerator = $generator
    includeTikTok = -not $WithoutTikTok.IsPresent
    pluginCommit = (& git -C $projectRoot rev-parse HEAD)
    generatedUtc = [DateTime]::UtcNow.ToString('o')
    testedInObs = $false
}
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $stage 'build-info.json')

$licenseDirectory = Join-Path $stage 'licenses'
New-Item -ItemType Directory -Force -Path $licenseDirectory | Out-Null
Copy-Item -LiteralPath (Join-Path $obsSource 'COPYING') `
    -Destination (Join-Path $licenseDirectory 'OBS-COPYING.txt')
$qtLicenses = Join-Path $qtPrefix 'licenses'
if (Test-Path -LiteralPath $qtLicenses) {
    Copy-Item -LiteralPath $qtLicenses -Destination (Join-Path $licenseDirectory 'Qt') -Recurse
}
$moduleLicenses = Join-Path $projectRoot '.ci/qtwebsockets/LICENSES'
if (Test-Path -LiteralPath $moduleLicenses) {
    Copy-Item -LiteralPath $moduleLicenses -Destination (Join-Path $licenseDirectory 'QtWebSockets') -Recurse
}
Write-Host "Package ready for download: $stage"
Write-Host 'Compilation passed; actual OBS loading and LIVE accounts still require manual validation.'
