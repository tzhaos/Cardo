[CmdletBinding()]
param(
  [switch]$Clean,
  [switch]$RunChecks,
  [switch]$SkipExtension
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-CommandAvailable {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CommandName,
    [Parameter(Mandatory = $true)]
    [string]$InstallHint
  )

  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "Required command '$CommandName' was not found. $InstallHint"
  }
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Title,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "==> $Title" -ForegroundColor Cyan
  & $Action

  if ($LASTEXITCODE -ne 0) {
    throw "Step failed: $Title"
  }
}

Push-Location $PSScriptRoot

try {
  Assert-CommandAvailable -CommandName 'npm' -InstallHint 'Install Node.js and npm first.'
  Assert-CommandAvailable -CommandName 'dotnet' -InstallHint 'Install the .NET SDK 9.x first.'

  if ($Clean) {
    Invoke-Step -Title 'Cleaning generated output' -Action { npm run clean }
  }

  if ($RunChecks) {
    Invoke-Step -Title 'Running lint' -Action { npm run lint }
    Invoke-Step -Title 'Running full test suite' -Action { npm test }
  }

  if (-not $SkipExtension) {
    Invoke-Step -Title 'Building browser extension' -Action { npm run build }
  }

  Invoke-Step -Title 'Packaging Windows companion MSI' -Action { npm run companion:windows:msi }

  Write-Host ""
  Write-Host "Package completed successfully." -ForegroundColor Green

  if (-not $SkipExtension) {
    Write-Host "Extension output: artifacts/extension/unpacked"
  }

  Write-Host "MSI output: artifacts/companion/windows/packages/KhaosBoxCompanion-win-x64.msi"
} finally {
  Pop-Location
}
