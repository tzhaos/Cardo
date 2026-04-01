[CmdletBinding()]
param(
  [string]$InstallDir = $(Join-Path $env:LOCALAPPDATA "KhaosBox\Companion"),
  [switch]$KeepFiles
)

$ErrorActionPreference = "Stop"
$protocolRegistryPath = "HKCU:\Software\Classes\kbe"
$companionRegistryPath = "HKCU:\Software\KhaosBox\Companion"
$legacyRegistryPath = "HKCU:\Software\KhaosBox\KhaosBoxExplorer"
$legacyInstallDir = Join-Path $env:LOCALAPPDATA "KhaosBox\KhaosBoxExplorer"

if (Test-Path -LiteralPath $protocolRegistryPath) {
  Remove-Item -LiteralPath $protocolRegistryPath -Recurse -Force
  Write-Host "Removed HKCU\Software\Classes\kbe"
}
else {
  Write-Host "No kbe protocol registration was found for the current user."
}

foreach ($softwareRegistryPath in @($companionRegistryPath, $legacyRegistryPath)) {
  if (Test-Path -LiteralPath $softwareRegistryPath) {
    Remove-Item -LiteralPath $softwareRegistryPath -Recurse -Force
    Write-Host "Removed $softwareRegistryPath"
  }
}

if (-not $KeepFiles) {
  foreach ($candidateInstallDir in @($InstallDir, $legacyInstallDir)) {
    if (Test-Path -LiteralPath $candidateInstallDir) {
      Remove-Item -LiteralPath $candidateInstallDir -Recurse -Force
      Write-Host "Removed installed files from $candidateInstallDir"
    }
  }
}
