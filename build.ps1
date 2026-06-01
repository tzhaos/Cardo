[CmdletBinding()]
param(
  [switch]$Clean,
  [switch]$RunChecks,
  [switch]$SkipExtension,
  [switch]$SkipDesktop
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

  if ($Clean) {
    Invoke-Step -Title 'Cleaning generated output' -Action { npm run clean }
  }

  if ($RunChecks) {
    Invoke-Step -Title 'Running checks' -Action { npm run check }
  }

  if (-not $SkipExtension) {
    Invoke-Step -Title 'Building browser extension' -Action { npm run build }
  }

  if (-not $SkipDesktop) {
    Invoke-Step -Title 'Building Electron desktop' -Action { npm run desktop:build }
  }

  Write-Host ""
  Write-Host "Build completed successfully." -ForegroundColor Green

  if (-not $SkipExtension) {
    Write-Host "Extension output: artifacts/extension/unpacked"
  }

  if (-not $SkipDesktop) {
    Write-Host "Desktop output: artifacts/desktop"
  }
} finally {
  Pop-Location
}
