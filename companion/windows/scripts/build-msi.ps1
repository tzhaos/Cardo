[CmdletBinding()]
param(
  [string]$Configuration = "Release",
  [string]$Runtime = "win-x64",
  [string]$PublishDir = "",
  [string]$PackageRoot = "",
  [string]$MsiName = "KhaosBoxCompanion-win-x64.msi",
  [switch]$SkipPublish
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$windowsRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptRoot ".."))
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $windowsRoot "..\.."))

if ([string]::IsNullOrWhiteSpace($PublishDir)) {
  $PublishDir = Join-Path $repoRoot "artifacts\companion\windows\publish\$Runtime"
}

if ([string]::IsNullOrWhiteSpace($PackageRoot)) {
  $PackageRoot = Join-Path $repoRoot "artifacts\companion\windows\packages"
}

$projectPath = Join-Path $windowsRoot "src\KhaosBoxCompanion.csproj"
$installerProjectPath = Join-Path $windowsRoot "packaging\msi\KhaosBoxCompanion.Installer.wixproj"
$msiOutputPath = Join-Path $PackageRoot $MsiName
$legacyArtifacts = @(
  (Join-Path $PackageRoot "KhaosBoxExplorer-win-x64.msi"),
  (Join-Path $PackageRoot "KhaosBoxExplorer-win-x64"),
  (Join-Path $PackageRoot "KhaosBoxExplorer-win-x64.zip")
)
$cleanupTargets = @(
  $PublishDir,
  (Join-Path $repoRoot "artifacts\companion\windows\bin\KhaosBoxCompanion"),
  (Join-Path $repoRoot "artifacts\companion\windows\obj\KhaosBoxCompanion"),
  (Join-Path $repoRoot "artifacts\companion\windows\bin\KhaosBoxCompanion.Installer"),
  (Join-Path $repoRoot "artifacts\companion\windows\obj\KhaosBoxCompanion.Installer")
)

New-Item -ItemType Directory -Path $PackageRoot -Force | Out-Null

foreach ($artifact in $legacyArtifacts) {
  if (Test-Path -LiteralPath $artifact) {
    Remove-Item -LiteralPath $artifact -Recurse -Force
  }
}

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

$publishedExePath = Join-Path $PublishDir "KhaosBoxCompanion.exe"
if (-not (Test-Path -LiteralPath $publishedExePath)) {
  throw "Missing published executable at $publishedExePath"
}

dotnet build $installerProjectPath `
  -c $Configuration `
  -p:PublishDir=$PublishDir `
  -p:MsiOutputPath=$msiOutputPath

if ($LASTEXITCODE -ne 0) {
  throw "MSI build failed."
}

if (-not (Test-Path -LiteralPath $msiOutputPath)) {
  throw "MSI was not created at $msiOutputPath"
}

foreach ($target in $cleanupTargets) {
  if (Test-Path -LiteralPath $target) {
    Remove-Item -LiteralPath $target -Recurse -Force
  }
}

Write-Host "Created MSI at $msiOutputPath"
