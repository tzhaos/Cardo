[CmdletBinding()]
param(
  [string]$InstallDir = $(Join-Path $env:LOCALAPPDATA "KhaosBox\KhaosBoxExplorer"),
  [switch]$KeepFiles
)

$ErrorActionPreference = "Stop"
$protocolRegistryPath = "HKCU:\Software\Classes\kbe"

if (Test-Path -LiteralPath $protocolRegistryPath) {
  Remove-Item -LiteralPath $protocolRegistryPath -Recurse -Force
  Write-Host "Removed HKCU\Software\Classes\kbe"
}
else {
  Write-Host "No kbe protocol registration was found for the current user."
}

if (-not $KeepFiles -and (Test-Path -LiteralPath $InstallDir)) {
  Remove-Item -LiteralPath $InstallDir -Recurse -Force
  Write-Host "Removed installed files from $InstallDir"
}
