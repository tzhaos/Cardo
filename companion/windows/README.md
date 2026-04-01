# KhaosBox Companion for Windows

This folder contains the Windows companion app that handles `kbe:` links sent by the KhaosBox browser extension.

## What it does

- accepts `kbe:` URIs from KhaosBox
- normalizes drive-letter paths, UNC paths, and nested `file://` URIs
- opens folders in Windows File Explorer
- opens files with their associated desktop application

## Repository layout

- `src/` contains the .NET application source
- `scripts/` contains install, uninstall, and MSI build scripts
- `packaging/msi/` contains the WiX installer project
- `tests/` contains parser contract tests

## Supported URI shapes

- `kbe:C:\Work\Specs.pdf`
- `kbe:V:/Shared/Chinese Folder`
- `kbe://server/share/Docs`
- `kbe:file:///C:/Work/Specs.pdf`
- `kbe:file://server/share/Docs`

## Build

```powershell
npm run companion:windows:build
```

## Publish

```powershell
npm run companion:windows:publish
```

The published executable is written to:

- `artifacts/companion/windows/publish/win-x64/KhaosBoxCompanion.exe`

## Install for the current user

```powershell
npm run companion:windows:install
```

This command:

- publishes `companion/windows/src/KhaosBoxCompanion.csproj`
- installs `KhaosBoxCompanion.exe` into `%LOCALAPPDATA%\KhaosBox\Companion\`
- registers `HKCU\Software\Classes\kbe`
- cleans legacy `KhaosBoxExplorer` install and registry artifacts

If you already published the executable and only want to refresh the registration:

```powershell
powershell -ExecutionPolicy Bypass -File .\companion\windows\scripts\install.ps1 -SkipPublish
```

## Uninstall

```powershell
npm run companion:windows:uninstall
```

To keep the installed executable and only remove the registration:

```powershell
powershell -ExecutionPolicy Bypass -File .\companion\windows\scripts\uninstall.ps1 -KeepFiles
```

## Build an MSI installer

```powershell
npm run companion:windows:msi
```

This creates:

- `artifacts/companion/windows/packages/KhaosBoxCompanion-win-x64.msi`

The MSI installs the companion into `%LOCALAPPDATA%\KhaosBox\Companion\`, registers `HKCU\Software\Classes\kbe`, and adds a standard Windows uninstall entry.

## Run the parser tests

```powershell
dotnet test .\companion\windows\tests\KhaosBoxCompanion.Tests.csproj
```

## Debug URI parsing

```powershell
dotnet run --project .\companion\windows\src\KhaosBoxCompanion.csproj -- --resolve "kbe://server/share/Docs"
```

That prints the normalized Windows path without launching Explorer or another application.
