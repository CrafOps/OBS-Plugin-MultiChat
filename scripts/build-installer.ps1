$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$compiler = Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6/ISCC.exe'
if (-not (Test-Path -LiteralPath $compiler)) {
    throw 'Inno Setup compiler is missing from the build runner'
}
$build = Get-Content -LiteralPath (Join-Path $projectRoot 'package/build-info.json') -Raw | ConvertFrom-Json
& $compiler "/DBuildNumber=$($build.buildNumber)" (Join-Path $PSScriptRoot 'installer.iss')
if ($LASTEXITCODE -ne 0) {
    throw 'Installer compilation failed'
}
