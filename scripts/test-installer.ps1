# Run on the disposable GitHub Windows runner only: Setup writes that runner's HKCU.
$ErrorActionPreference = 'Stop'
if ($env:GITHUB_ACTIONS -ne 'true') {
    throw 'Installer integration checks must run on the disposable CI runner'
}
$projectRoot = Split-Path -Parent $PSScriptRoot
$fixture = Join-Path $projectRoot 'build/installer-check'
$obs = Join-Path $fixture 'OBS Studio'
$destination = Join-Path $fixture 'Installed Chat'
New-Item -ItemType Directory -Path (Join-Path $obs 'bin/64bit') -Force | Out-Null
$generator = Join-Path $fixture 'generate-fixture.ps1'
@'
param([string]$ObsRoot)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System.Reflection;
[assembly: AssemblyFileVersion("32.2.2.0")]
public class FakeObs {
    public static void Main() {
    }
}
"@ -OutputAssembly (Join-Path $ObsRoot 'bin/64bit/obs64.exe') -OutputType ConsoleApplication
Add-Type -TypeDefinition @"
using System.Reflection;
[assembly: AssemblyFileVersion("6.11.1.0")]
public class FakeQt {
}
"@ -OutputAssembly (Join-Path $ObsRoot 'bin/64bit/Qt6Core.dll') -OutputType Library
'@ | Set-Content -LiteralPath $generator -Encoding utf8
& powershell.exe -NoProfile -NonInteractive -File $generator -ObsRoot $obs
if ($LASTEXITCODE -ne 0) {
    throw 'Versioned installer fixture generation failed'
}
$setup = Join-Path $projectRoot 'build/release/Multi-Live-Chat-Setup.exe'
$process = Start-Process -FilePath $setup -WindowStyle Hidden -Wait -PassThru -ArgumentList @(
    '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART',
    ('/DIR="' + $destination + '"'), ('/OBSROOT="' + $obs + '"'),
    ('/LOG="' + (Join-Path $fixture 'setup.log') + '"')
)
if ($process.ExitCode -ne 0) {
    Get-Content -LiteralPath (Join-Path $fixture 'setup.log') -Tail 50
    throw "Installer returned $($process.ExitCode)"
}
$native = 'obs-plugins/64bit/obs-unified-chat.dll'
if ((Get-FileHash -LiteralPath (Join-Path $obs $native)).Hash -ne
    (Get-FileHash -LiteralPath (Join-Path $projectRoot "package/$native")).Hash) {
    throw 'Installed plugin does not match the build'
}
foreach ($relative in @('bridge/dist/main.js', 'runtime/node.exe', 'scripts/auto-update.ps1', 'build-info.json')) {
    if (-not (Test-Path -LiteralPath (Join-Path $destination $relative))) {
        throw "Installed package is missing $relative"
    }
}
$uninstallKeys = Get-ChildItem -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall'
$registration = $uninstallKeys | Get-ItemProperty | Where-Object DisplayName -eq 'Multi Live Chat by @CrafOps'
if ($registration.DisplayIcon -ne (Join-Path $destination 'appicon.ico') -or
    -not (Test-Path -LiteralPath $registration.DisplayIcon)) {
    throw 'Programs and Features icon is missing or not registered'
}
Remove-ItemProperty -LiteralPath $registration.PSPath -Name DisplayIcon
$repair = Join-Path $fixture 'repair-icon.ps1'
@'
param([string]$PackageRoot, [string]$ObsRoot)
function Invoke-RestMethod {
    throw 'Simulated offline update check'
}
& (Join-Path $PackageRoot 'scripts/auto-update.ps1') -PackageRoot $PackageRoot -ObsRoot $ObsRoot `
    -ObsPid 999999 -ObsVersion '32.2.2' -QtVersion '6.11.1'
'@ | Set-Content -LiteralPath $repair -Encoding utf8
& powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $repair -PackageRoot $destination -ObsRoot $obs
$repaired = Get-ItemProperty -LiteralPath $registration.PSPath
if ($repaired.DisplayIcon -ne (Join-Path $destination 'appicon.ico')) {
    throw 'Existing install icon registration was not repaired at updater startup'
}
$settings = Get-ItemProperty -LiteralPath 'HKCU:\Software\OBSUnifiedChat\NativeDock'
if ($settings.bridgeRoot -ne $destination -or $settings.nodePath -ne (Join-Path $destination 'runtime/node.exe') -or
    $settings.autoUpdate -ne 1 -or $settings.startWithObs -ne 1) {
    throw 'Installer did not configure native Settings correctly'
}
& (Join-Path $destination 'runtime/node.exe') --version
if ($LASTEXITCODE -ne 0) {
    throw 'Installed portable Node runtime did not start'
}
$uninstaller = Join-Path $destination 'unins000.exe'
$process = Start-Process -FilePath $uninstaller -WindowStyle Hidden -Wait -PassThru `
    -ArgumentList '/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART'
if ($process.ExitCode -ne 0 -or (Test-Path -LiteralPath (Join-Path $obs $native))) {
    throw 'Installer uninstall validation failed'
}
if (-not (Test-Path -LiteralPath (Join-Path $obs 'bin/64bit/Qt6Core.dll')) -or
    -not (Test-Path -LiteralPath (Join-Path $obs 'bin/64bit/Qt6Concurrent.dll'))) {
    throw 'Uninstaller removed OBS or shared Qt files'
}
Write-Host 'Installer install, automatic configuration, runtime and uninstall checks passed in isolated CI fixtures.'
exit 0
