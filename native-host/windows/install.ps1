[CmdletBinding()]
param(
  [string]$Configuration = "Release",
  [string]$Runtime = "win-x64",
  [string]$PublishDir = $(Join-Path $PSScriptRoot "build\win-x64"),
  [string]$InstallDir = $(Join-Path $env:LOCALAPPDATA "KhaosBox\KhaosBoxExplorer"),
  [switch]$SkipPublish
)

$ErrorActionPreference = "Stop"

$projectPath = Join-Path $PSScriptRoot "KhaosBoxExplorer.csproj"
$publishedExePath = Join-Path $PublishDir "KhaosBoxExplorer.exe"
$installedExePath = Join-Path $InstallDir "KhaosBoxExplorer.exe"

if (-not $SkipPublish) {
  dotnet publish $projectPath `
    -c $Configuration `
    -r $Runtime `
    --self-contained false `
    -p:PublishSingleFile=true `
    -o $PublishDir

  if ($LASTEXITCODE -ne 0) {
    throw "dotnet publish failed."
  }
}

if (-not (Test-Path -LiteralPath $publishedExePath)) {
  throw "Missing published executable at $publishedExePath"
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -LiteralPath $publishedExePath -Destination $installedExePath -Force

$publishedPdbPath = Join-Path $PublishDir "KhaosBoxExplorer.pdb"
$installedPdbPath = Join-Path $InstallDir "KhaosBoxExplorer.pdb"

if (Test-Path -LiteralPath $publishedPdbPath) {
  Copy-Item -LiteralPath $publishedPdbPath -Destination $installedPdbPath -Force
}

$protocolKey = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey("Software\Classes\kbe")
$protocolKey.SetValue("", "URL:KhaosBoxExplorer Protocol")
$protocolKey.SetValue("URL Protocol", "")

$defaultIconKey = $protocolKey.CreateSubKey("DefaultIcon")
$defaultIconKey.SetValue("", "`"$installedExePath`"")
$defaultIconKey.Close()

$commandKey = $protocolKey.CreateSubKey("shell\open\command")
$commandKey.SetValue("", "`"$installedExePath`" `"%1`"")
$commandKey.Close()
$protocolKey.Close()

Write-Host "Installed KhaosBoxExplorer to $installedExePath"
Write-Host "Registered HKCU\Software\Classes\kbe"
