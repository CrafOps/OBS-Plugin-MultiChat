$ErrorActionPreference = 'Continue'
foreach ($toolName in @('node', 'npm.cmd', 'cmake', 'cl', 'git')) {
    $command = Get-Command $toolName -ErrorAction SilentlyContinue
    if ($command) {
        Write-Host "$toolName : $($command.Source)"
    } else {
        Write-Host "$toolName : not found"
    }
}
$obsPath = & (Join-Path $PSScriptRoot 'find-obs.ps1')
if ($obsPath) {
    $obsDirectory = Split-Path -Parent $obsPath
    (Get-Item -LiteralPath $obsPath).VersionInfo | Select-Object ProductVersion, FileVersion
    Get-ChildItem -LiteralPath $obsDirectory -Filter 'Qt6*.dll' | ForEach-Object {
        $_.VersionInfo | Select-Object FileName, ProductVersion
    }
} else {
    Write-Host 'OBS installation not detected in default path or uninstall registry.'
}
