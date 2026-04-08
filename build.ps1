[CmdletBinding()]
param(
  [switch]$Clean,
  [switch]$RunChecks,
  [switch]$SkipExtension,
  [switch]$SkipCompanion,
  [switch]$PublishCompanion
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

  if (-not $SkipCompanion -or $RunChecks -or $PublishCompanion) {
    Assert-CommandAvailable -CommandName 'dotnet' -InstallHint 'Install the .NET SDK 9.x first.'
  }

  if ($Clean) {
    Invoke-Step -Title 'Cleaning generated output' -Action { npm run clean }
  }

  if ($RunChecks) {
    Invoke-Step -Title 'Running checks (tsc, architecture, ESLint, TS tests)' -Action { npm run check }

    if (-not $SkipCompanion) {
      Invoke-Step -Title 'Running Windows companion tests' -Action {
        dotnet test (Join-Path $PSScriptRoot 'companion/windows/tests/KhaosBoxCompanion.Tests.csproj')
      }
    }
  }

  if (-not $SkipExtension) {
    Invoke-Step -Title 'Building browser extension' -Action { npm run build }
  }

  if (-not $SkipCompanion) {
    if ($PublishCompanion) {
      Invoke-Step -Title 'Publishing Windows companion' -Action { npm run companion:windows:publish }
    } else {
      Invoke-Step -Title 'Building Windows companion' -Action { npm run companion:windows:build }
    }
  }

  Write-Host ""
  Write-Host "Build completed successfully." -ForegroundColor Green

  if (-not $SkipExtension) {
    Write-Host "Extension output: artifacts/extension/unpacked"
  }

  if (-not $SkipCompanion) {
    if ($PublishCompanion) {
      Write-Host "Companion publish output: artifacts/companion/windows/publish/win-x64"
    } else {
      Write-Host "Companion build output: artifacts/companion/windows/bin"
    }
  }
} finally {
  Pop-Location
}
