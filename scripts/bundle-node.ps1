$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$version = 'v22.23.3'
$filename = "node-$version-win-x64.zip"
$output = Join-Path $projectRoot 'build/node-runtime'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$checksums = (Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/$version/SHASUMS256.txt").Content
$line = @($checksums -split "`n" | Where-Object { $_.Trim().EndsWith("  $filename") })
if ($line.Count -ne 1) {
    throw 'Official Node.js checksum not found'
}
$expected = ($line[0] -split '\s+')[0]
$archive = Join-Path $output $filename
Invoke-WebRequest -UseBasicParsing -Uri "https://nodejs.org/dist/$version/$filename" -OutFile $archive
if ((Get-FileHash -LiteralPath $archive).Hash -ne $expected) {
    throw 'Node.js runtime checksum mismatch'
}
Add-Type -AssemblyName System.IO.Compression.FileSystem
$extracted = Join-Path $output 'extracted'
[IO.Compression.ZipFile]::ExtractToDirectory($archive, $extracted)
$runtime = Join-Path $projectRoot 'package/runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
foreach ($name in @('node.exe', 'LICENSE')) {
    Copy-Item -LiteralPath (Join-Path $extracted "node-$version-win-x64/$name") -Destination $runtime
}
& (Join-Path $runtime 'node.exe') --version
if ($LASTEXITCODE -ne 0) {
    throw 'Bundled runtime check failed'
}
