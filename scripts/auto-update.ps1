param(
    [Parameter(Mandatory)][string]$PackageRoot,
    [Parameter(Mandatory)][string]$ObsRoot,
    [Parameter(Mandatory)][int]$ObsPid,
    [Parameter(Mandatory)][string]$ObsVersion,
    [Parameter(Mandatory)][string]$QtVersion
)

$ErrorActionPreference = 'Stop'
$repository = 'PPekKunGzDev/-OBS-Plugin-MultiChat'
$repositoryId = 1414781362L
$packagePath = [IO.Path]::GetFullPath($PackageRoot).TrimEnd('\', '/')
$obsPath = [IO.Path]::GetFullPath($ObsRoot).TrimEnd('\', '/')
$statusPath = Join-Path $packagePath '.update-status.txt'
$disabledPath = Join-Path $packagePath '.update-disabled'
$lock = $null
$work = $null
$cleanupWork = $false

function Set-UpdateStatus([string]$Message) {
    [IO.File]::WriteAllText($statusPath, $Message, [Text.Encoding]::UTF8)
}

function Register-AppIcon {
    $icon = Join-Path $packagePath 'scripts/appicon.ico'
    $key = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\{F58E5F24-EEDE-44B8-A2AB-EDB867CB384E}_is1'
    if (-not (Test-Path -LiteralPath $icon) -or -not (Test-Path -LiteralPath $key)) {
        return
    }
    try {
        $entry = Get-ItemProperty -LiteralPath $key
        $registered = [IO.Path]::GetFullPath($entry.InstallLocation).TrimEnd('\', '/')
        if ($registered -eq $packagePath) {
            Set-ItemProperty -LiteralPath $key -Name DisplayIcon -Value $icon
        }
    } catch {
        # Cosmetic registration must not prevent ordinary plugin updates.
    }
}

function Assert-AssetUrl([string]$Url) {
    $prefix = "https://github.com/$repository/releases/download/"
    if (-not $Url.StartsWith($prefix, [StringComparison]::Ordinal) -or $Url.Contains('?')) {
        throw 'Unexpected release download URL'
    }
}

function Resolve-Child([string]$Root, [string]$Relative) {
    $full = [IO.Path]::GetFullPath((Join-Path $Root $Relative))
    if (-not $full.StartsWith($Root + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Update contains an invalid path'
    }
    if (Test-Path -LiteralPath $full -PathType Container) {
        throw 'Update file destination is a directory'
    }
    # Refuse junctions/symlinks, including pre-existing destination parents.
    $cursor = $full
    while ($cursor -and $cursor.Length -ge $Root.Length) {
        if (Test-Path -LiteralPath $cursor) {
            $item = Get-Item -LiteralPath $cursor -Force
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
                throw 'Update destination contains a link'
            }
        }
        $cursor = Split-Path -Parent $cursor
    }
    return $full
}

try {
    Register-AppIcon
    if (Test-Path -LiteralPath $disabledPath) {
        exit 0
    }
    if (-not (Test-Path -LiteralPath (Join-Path $obsPath 'bin/64bit/obs64.exe')) -or
        -not (Test-Path -LiteralPath (Join-Path $packagePath 'build-info.json'))) {
        throw 'Choose the complete release package folder in Settings'
    }
    try {
        $lock = [IO.File]::Open((Join-Path $packagePath '.update.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    } catch {
        exit 0
    }
    $installed = Get-Content -LiteralPath (Join-Path $packagePath 'build-info.json') -Raw | ConvertFrom-Json
    Set-UpdateStatus 'Checking GitHub Releases...'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $headers = @{ 'User-Agent' = 'Multi-Live-Chat-Updater'; 'Accept' = 'application/vnd.github+json' }
    try {
        $identity = Invoke-RestMethod -Uri "https://api.github.com/repositories/$repositoryId" `
            -Headers $headers -TimeoutSec 20
    } catch {
        # The documented name endpoint follows GitHub's transfer/rename redirects.
        # Identity verification also protects against reuse of the original name.
        $identity = Invoke-RestMethod -Uri "https://api.github.com/repos/$repository" `
            -Headers $headers -TimeoutSec 20
    }
    if ([long]$identity.id -ne $repositoryId -or $identity.private -ne $false -or
        $identity.full_name -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') {
        throw 'The update source is not the original public repository'
    }
    $repository = [string]$identity.full_name
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repository/releases/latest" `
        -Headers $headers -TimeoutSec 20
    $manifestAsset = @($release.assets | Where-Object name -eq 'update-manifest.json')
    $zipAsset = @($release.assets | Where-Object name -eq 'multi-live-chat-windows-x64.zip')
    if ($manifestAsset.Count -ne 1 -or $zipAsset.Count -ne 1 -or $release.prerelease -or $release.draft) {
        throw 'Latest release has no compatible update package'
    }
    Assert-AssetUrl $manifestAsset[0].browser_download_url
    Assert-AssetUrl $zipAsset[0].browser_download_url
    $work = Join-Path $env:LOCALAPPDATA ("MultiLiveChat/updates/" + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $work -Force | Out-Null
    $manifestPath = Join-Path $work 'manifest.json'
    Invoke-WebRequest -UseBasicParsing -Uri $manifestAsset[0].browser_download_url -OutFile $manifestPath -TimeoutSec 30
    if ((Get-Item -LiteralPath $manifestPath).Length -gt 16384) {
        throw 'Invalid update manifest size'
    }
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.repositoryId -and [long]$manifest.repositoryId -ne $repositoryId) {
        throw 'Update manifest belongs to a different repository'
    }
    if ($manifest.schema -ne 1 -or $manifest.architecture -ne 'x64' -or
        $manifest.configuration -ne 'Release' -or $manifest.obsVersion -ne $ObsVersion -or
        $manifest.qtVersion -ne $QtVersion -or $manifest.sha256 -notmatch '^[a-fA-F0-9]{64}$' -or
        $manifest.buildNumber -notmatch '^\d+$') {
        throw 'Update is incompatible with this OBS / Qt version'
    }
    if ([long]$manifest.buildNumber -le [long]$installed.buildNumber) {
        Set-UpdateStatus 'Multi Live Chat is up to date'
        $cleanupWork = $true
        exit 0
    }
    if ($zipAsset[0].size -gt 150MB) {
        throw 'Update download exceeds the size limit'
    }
    Set-UpdateStatus 'Downloading update; chat remains available...'
    $archive = Join-Path $work 'package.zip'
    Invoke-WebRequest -UseBasicParsing -Uri $zipAsset[0].browser_download_url -OutFile $archive -TimeoutSec 180
    if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $manifest.sha256) {
        throw 'Update checksum did not match'
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($archive)
    $names = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $expandedSize = 0L
    try {
        foreach ($entry in $zip.Entries) {
            $name = $entry.FullName.Replace('\', '/')
            if ($name.Contains(':') -or $name.StartsWith('/') -or $name -match '(^|/)\.\.(/|$)' -or
                -not $names.Add($name) -or $names.Count -gt 30000) {
                throw 'Unsafe update archive entry'
            }
            $expandedSize += $entry.Length
            if ($expandedSize -gt 500MB) {
                throw 'Expanded update exceeds the size limit'
            }
        }
    } finally {
        $zip.Dispose()
    }
    $extracted = Join-Path $work 'package'
    [IO.Compression.ZipFile]::ExtractToDirectory($archive, $extracted)
    $build = Get-Content -LiteralPath (Join-Path $extracted 'build-info.json') -Raw | ConvertFrom-Json
    if ($build.buildNumber -ne $manifest.buildNumber -or $build.pluginCommit -ne $manifest.pluginCommit -or
        $build.obsVersion -ne $ObsVersion -or $build.qtVersion -ne $QtVersion -or
        $build.architecture -ne 'x64' -or $build.configuration -ne 'Release') {
        throw 'Package metadata does not match the update manifest'
    }
    $operations = [Collections.Generic.List[object]]::new()
    foreach ($file in Get-ChildItem -LiteralPath $extracted -File -Recurse -Force) {
        $relative = $file.FullName.Substring($extracted.Length + 1).Replace('\', '/')
        if ($relative -notmatch '^(bridge/|overlay/|docs/|licenses/|scripts/|runtime/|appicon\.ico$|README\.md$|build-info\.json$|obs-plugins/|bin/|data/obs-plugins/obs-unified-chat/)') {
            throw 'Unexpected file in update package'
        }
        $targets = @((Resolve-Child $packagePath $relative))
        if ($relative.StartsWith('obs-plugins/') -or $relative.StartsWith('bin/') -or $relative.StartsWith('data/')) {
            if ($relative -notmatch '^(obs-plugins/64bit/obs-unified-chat\.dll|bin/64bit/Qt6(WebSockets|Concurrent)\.dll|bin/64bit/imageformats/q(gif|jpeg|webp)\.dll|bin/64bit/tls/q(schannel|certonly)backend\.dll|data/obs-plugins/obs-unified-chat/locale/[a-zA-Z0-9_-]+\.ini)$') {
                throw 'Update tried to replace an unsupported OBS runtime file'
            }
            $targets += Resolve-Child $obsPath $relative
        }
        foreach ($target in $targets | Select-Object -Unique) {
            $operations.Add([pscustomobject]@{ Source = $file.FullName; Target = $target; Backup = $null; Created = $false })
        }
    }
    if (-not (Test-Path -LiteralPath (Join-Path $extracted 'obs-plugins/64bit/obs-unified-chat.dll'))) {
        throw 'Update does not contain the plugin'
    }
    Set-UpdateStatus "Update ready (build $($manifest.buildNumber)); close OBS to install"
    # Wait outside the OBS/bridge process job so loaded DLLs can be replaced safely.
    while ((Get-Process -Id $ObsPid -ErrorAction SilentlyContinue) -or
        (Get-Process -Name obs64 -ErrorAction SilentlyContinue)) {
        if (Test-Path -LiteralPath $disabledPath) {
            $cleanupWork = $true
            exit 0
        }
        Start-Sleep -Seconds 2
    }
    if (Test-Path -LiteralPath $disabledPath) {
        $cleanupWork = $true
        exit 0
    }
    $backupRoot = Join-Path $work 'backup'
    New-Item -ItemType Directory -Path $backupRoot | Out-Null
    try {
        $index = 0
        foreach ($operation in $operations) {
            $parent = Split-Path -Parent $operation.Target
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
            if (Test-Path -LiteralPath $operation.Target) {
                $operation.Backup = Join-Path $backupRoot ([string]$index)
                Copy-Item -LiteralPath $operation.Target -Destination $operation.Backup
            } else {
                $operation.Created = $true
            }
            $index += 1
        }
        # Replace the native DLL before other files: a fast OBS restart leaves it locked
        # and aborts installation before the bridge or package metadata changes.
        $ordered = $operations | Sort-Object @{ Expression = {
            if ($_.Target -eq (Join-Path $obsPath 'obs-plugins/64bit/obs-unified-chat.dll')) {
                0
            } elseif ($_.Target.EndsWith('build-info.json')) {
                2
            } else {
                1
            }
        } }
        foreach ($operation in $ordered) {
            Copy-Item -LiteralPath $operation.Source -Destination $operation.Target -Force
        }
        Set-UpdateStatus "Updated to build $($manifest.buildNumber); ready for the next OBS launch"
        $cleanupWork = $true
    } catch {
        $installError = $_
        foreach ($operation in $operations) {
            if ($operation.Backup -and (Test-Path -LiteralPath $operation.Backup)) {
                Copy-Item -LiteralPath $operation.Backup -Destination $operation.Target -Force
            } elseif ($operation.Created -and (Test-Path -LiteralPath $operation.Target)) {
                Remove-Item -LiteralPath $operation.Target -Force
            }
        }
        throw $installError
    }
} catch {
    try {
        Set-UpdateStatus ("Update not installed: " + $_.Exception.Message + '. Check folder write permissions; existing chat remains available.')
    } catch {
        # A read-only package folder cannot store update status either.
    }
    exit 1
} finally {
    if ($lock) {
        $lock.Dispose()
    }
    if ($cleanupWork -and $work) {
        $updateRoot = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'MultiLiveChat/updates'))
        $resolvedWork = [IO.Path]::GetFullPath($work)
        if ($resolvedWork.StartsWith($updateRoot + '\', [StringComparison]::OrdinalIgnoreCase) -and
            (Split-Path -Leaf $resolvedWork) -match '^[a-f0-9]{32}$') {
            Remove-Item -LiteralPath $resolvedWork -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    # Failed installs retain staging and backups for diagnosis/recovery.
}
