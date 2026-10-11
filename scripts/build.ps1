param(
    [Parameter(Mandatory = $true)][string]$ObsSdkPrefix,
    [Parameter(Mandatory = $true)][string]$QtPrefix,
    [ValidateSet('Debug', 'Release')][string]$Configuration = 'Release',
    [string]$ObsExecutable
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ObsExecutable) {
    $ObsExecutable = & (Join-Path $PSScriptRoot 'find-obs.ps1')
}
if (-not $ObsExecutable) {
    throw 'OBS installation not detected. Pass -ObsExecutable explicitly.'
}
foreach ($toolName in @('node', 'npm.cmd', 'cmake')) {
    if (-not (Get-Command $toolName -ErrorAction SilentlyContinue)) {
        throw "Missing development tool: $toolName"
    }
}
if (-not (Test-Path -LiteralPath $ObsExecutable)) {
    throw 'OBS executable not found. Pass -ObsExecutable for your installation.'
}
$obsVersion = (Get-Item -LiteralPath $ObsExecutable).VersionInfo.ProductVersion
Write-Host "Target installed OBS: $obsVersion"
if ([int]($obsVersion.Split('.')[0]) -lt 30) {
    throw 'OBS 30 or later is required for the native dock API.'
}
Write-Host 'Use the OBS SDK and Qt release matching this exact OBS build. CMake cannot prove ABI compatibility.'
$nodeMajor = [int]((& node --version).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) {
    throw 'Node.js 22 or later is required by the pinned TikTok dependency tree.'
}
Push-Location -LiteralPath (Join-Path $projectRoot 'bridge')
try {
    & npm.cmd ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        throw 'Dependency installation failed'
    }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) {
        throw 'TypeScript build failed'
    }
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) {
        throw 'Bridge tests failed'
    }
} finally {
    Pop-Location
}
$buildDirectory = Join-Path $projectRoot 'build/native'
& cmake -S (Join-Path $projectRoot 'native') -B $buildDirectory -A x64 `
    "-DCMAKE_PREFIX_PATH=$ObsSdkPrefix;$QtPrefix"
if ($LASTEXITCODE -ne 0) {
    throw 'CMake configuration failed'
}
& cmake --build $buildDirectory --config $Configuration
if ($LASTEXITCODE -ne 0) {
    throw 'Native compilation failed'
}
& cmake --install $buildDirectory --config $Configuration --prefix (Join-Path $projectRoot 'package')
if ($LASTEXITCODE -ne 0) {
    throw 'Native staging failed'
}
