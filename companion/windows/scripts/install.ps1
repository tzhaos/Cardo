[CmdletBinding()]
param(
  [string]$Configuration = "Release",
  [string]$Runtime = "win-x64",
  [string]$PublishDir = "",
  [string]$InstallDir = $(Join-Path $env:LOCALAPPDATA "KhaosBox\Companion"),
  [switch]$SkipPublish
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$windowsRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot ".."))
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $windowsRoot "..\.."))

if ([string]::IsNullOrWhiteSpace($PublishDir)) {
  $PublishDir = Join-Path $repoRoot "artifacts\companion\windows\publish\$Runtime"
}

$projectPath = Join-Path $windowsRoot "src\KhaosBoxCompanion.csproj"
$publishedExePath = Join-Path $PublishDir "KhaosBoxCompanion.exe"
$installedExePath = Join-Path $InstallDir "KhaosBoxCompanion.exe"
$oldInstallDir = Join-Path $env:LOCALAPPDATA "KhaosBox\KhaosBoxExplorer"
$oldSoftwareRegistryPath = "HKCU:\Software\KhaosBox\KhaosBoxExplorer"
$newSoftwareRegistryPath = "HKCU:\Software\KhaosBox\Companion"

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

$publishedPdbPath = Join-Path $PublishDir "KhaosBoxCompanion.pdb"
$installedPdbPath = Join-Path $InstallDir "KhaosBoxCompanion.pdb"

if (Test-Path -LiteralPath $publishedPdbPath) {
  Copy-Item -LiteralPath $publishedPdbPath -Destination $installedPdbPath -Force
}

$protocolKey = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey("Software\Classes\kbe")
$protocolKey.SetValue("", "URL:KhaosBox Companion Protocol")
$protocolKey.SetValue("URL Protocol", "")

$defaultIconKey = $protocolKey.CreateSubKey("DefaultIcon")
$defaultIconKey.SetValue("", "`"$installedExePath`"")
$defaultIconKey.Close()

$commandKey = $protocolKey.CreateSubKey("shell\open\command")
$commandKey.SetValue("", "`"$installedExePath`" `"%1`"")
$commandKey.Close()
$protocolKey.Close()

$softwareKey = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey("Software\KhaosBox\Companion")
$softwareKey.SetValue("Installed", 1, [Microsoft.Win32.RegistryValueKind]::DWord)
$softwareKey.SetValue("InstallPath", $InstallDir)
$softwareKey.Close()

if (Test-Path -LiteralPath $oldSoftwareRegistryPath) {
  Remove-Item -LiteralPath $oldSoftwareRegistryPath -Recurse -Force
}

if ((Test-Path -LiteralPath $oldInstallDir) -and ($oldInstallDir -ne $InstallDir)) {
  Remove-Item -LiteralPath $oldInstallDir -Recurse -Force
}

Write-Host "Installed KhaosBox Companion to $installedExePath"
Write-Host "Registered HKCU\Software\Classes\kbe"
Write-Host "Registered $newSoftwareRegistryPath"
