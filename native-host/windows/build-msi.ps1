[CmdletBinding()]
param(
  [string]$Configuration = "Release",
  [string]$Runtime = "win-x64",
  [string]$PublishDir = "",
  [string]$ReleaseRoot = "",
  [string]$MsiName = "KhaosBoxExplorer-win-x64.msi",
  [switch]$SkipPublish
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

if ([string]::IsNullOrWhiteSpace($PublishDir)) {
  $PublishDir = Join-Path $scriptRoot "build\win-x64"
}

if ([string]::IsNullOrWhiteSpace($ReleaseRoot)) {
  $ReleaseRoot = Join-Path $scriptRoot "release"
}

$installerProjectPath = Join-Path $scriptRoot "installer\KhaosBoxExplorer.Installer.wixproj"
$msiOutputPath = Join-Path $ReleaseRoot $MsiName
$legacyReleaseArtifacts = @(
  (Join-Path $ReleaseRoot "KhaosBoxExplorer-win-x64"),
  (Join-Path $ReleaseRoot "KhaosBoxExplorer-win-x64.zip")
)
$cleanupTargets = @(
  $PublishDir,
  (Join-Path $scriptRoot "bin"),
  (Join-Path $scriptRoot "obj"),
  (Join-Path $scriptRoot "installer\bin"),
  (Join-Path $scriptRoot "installer\obj")
)

New-Item -ItemType Directory -Path $ReleaseRoot -Force | Out-Null

foreach ($artifact in $legacyReleaseArtifacts) {
  if (Test-Path -LiteralPath $artifact) {
    Remove-Item -LiteralPath $artifact -Recurse -Force
  }
}

if (-not $SkipPublish) {
  dotnet publish (Join-Path $scriptRoot "KhaosBoxExplorer.csproj") `
    -c $Configuration `
    -r $Runtime `
    --self-contained false `
    -p:PublishSingleFile=true `
    -o $PublishDir

  if ($LASTEXITCODE -ne 0) {
    throw "dotnet publish failed."
  }
}

$publishedExePath = Join-Path $PublishDir "KhaosBoxExplorer.exe"
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

foreach ($container in @((Join-Path $scriptRoot "build"), (Join-Path $scriptRoot "installer"))) {
  if ((Test-Path -LiteralPath $container) -and
      -not (Get-ChildItem -LiteralPath $container -Force | Select-Object -First 1)) {
    Remove-Item -LiteralPath $container -Force
  }
}

Write-Host "Created MSI at $msiOutputPath"
