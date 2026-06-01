[CmdletBinding()]
param(
  [switch]$Clean,
  [switch]$RunChecks,
  [switch]$SkipExtension,
  [switch]$SkipDesktop
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$buildScriptPath = Join-Path $PSScriptRoot 'build.ps1'

if (-not (Test-Path -LiteralPath $buildScriptPath)) {
  throw "Unable to find build.ps1 at $buildScriptPath"
}

$forwardedParameters = @{}

if ($Clean) {
  $forwardedParameters.Clean = $true
}

if ($RunChecks) {
  $forwardedParameters.RunChecks = $true
}

if ($SkipExtension) {
  $forwardedParameters.SkipExtension = $true
}

if ($SkipDesktop) {
  $forwardedParameters.SkipDesktop = $true
}

& $buildScriptPath @forwardedParameters
