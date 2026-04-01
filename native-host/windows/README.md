# KhaosBoxExplorer Handler

This folder contains the Windows-side companion app that makes `kbe:` links work outside the browser.

## What it does

- accepts `kbe:` URIs from KhaosBox or other tools
- normalizes drive-letter paths, UNC paths, and nested `file://` URIs
- opens folders in Windows File Explorer
- opens files with their associated desktop application

## Supported URI shapes

- `kbe:C:\Work\Specs.pdf`
- `kbe:V:/Shared/Chinese Folder`
- `kbe://server/share/Docs`
- `kbe:file:///C:/Work/Specs.pdf`
- `kbe:file://server/share/Docs`

## Build

```powershell
dotnet build .\native-host\windows\KhaosBoxExplorer.csproj
```

## Publish

```powershell
dotnet publish .\native-host\windows\KhaosBoxExplorer.csproj `
  -c Release `
  -r win-x64 `
  --self-contained false `
  -p:PublishSingleFile=true `
  -o .\native-host\windows\build\win-x64
```

Or use the repo script:

```powershell
npm run native-host:publish
```

## Build an MSI installer

```powershell
npm run native-host:msi
```

This generates:

- `native-host/windows/release/KhaosBoxExplorer-win-x64.msi`

The MSI installs `KhaosBoxExplorer.exe` into `%LOCALAPPDATA%\KhaosBox\KhaosBoxExplorer\`, registers `HKCU\Software\Classes\kbe`, and can be uninstalled from Windows Apps & features. After a successful build, the script removes its intermediate publish and WiX output folders so only the final `.msi` remains under `release/`.

## Install for the current user

```powershell
npm run native-host:install
```

That script republishes the app, copies it into `%LOCALAPPDATA%\KhaosBox\KhaosBoxExplorer\`, and registers:

- `HKCU\Software\Classes\kbe`
- `HKCU\Software\Classes\kbe\shell\open\command`

If you already published the executable and only want to refresh the registry entry:

```powershell
powershell -ExecutionPolicy Bypass -File .\native-host\windows\install.ps1 -SkipPublish
```

## Uninstall

```powershell
npm run native-host:uninstall
```

To keep the installed executable and only remove the protocol registration:

```powershell
powershell -ExecutionPolicy Bypass -File .\native-host\windows\uninstall.ps1 -KeepFiles
```

## Debug URI parsing

The host exposes a small terminal mode for debugging URI normalization:

```powershell
dotnet run --project .\native-host\windows\KhaosBoxExplorer.csproj -- --resolve "kbe://server/share/Docs"
```

That prints the normalized Windows path without launching Explorer or another application.
