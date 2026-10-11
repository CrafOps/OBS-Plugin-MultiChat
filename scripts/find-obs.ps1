$defaultExecutable = 'C:\Program Files\obs-studio\bin\64bit\obs64.exe'
if (Test-Path -LiteralPath $defaultExecutable) {
    return $defaultExecutable
}
$registryLocations = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
)
$installations = Get-ItemProperty -Path $registryLocations -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -match '^OBS Studio' -and $_.InstallLocation }
foreach ($installation in $installations) {
    $candidate = Join-Path $installation.InstallLocation 'bin/64bit/obs64.exe'
    if (Test-Path -LiteralPath $candidate) {
        return $candidate
    }
}
return $null
