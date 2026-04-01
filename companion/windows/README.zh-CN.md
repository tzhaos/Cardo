# KhaosBox Windows Companion

这个目录包含处理 `kbe:` 链接的 Windows Companion 应用。

## 它负责什么

- 接收来自 KhaosBox 插件的 `kbe:` URI
- 规范化盘符路径、UNC 路径和嵌套的 `file://` URI
- 用 Windows 资源管理器打开文件夹
- 用系统默认关联应用打开文件

## 目录结构

- `src/`：.NET 应用源码
- `scripts/`：安装、卸载和 MSI 构建脚本
- `packaging/msi/`：WiX 安装包工程
- `tests/`：协议解析测试

## 支持的 URI 形态

- `kbe:C:\Work\Specs.pdf`
- `kbe:V:/Shared/Chinese Folder`
- `kbe://server/share/Docs`
- `kbe:file:///C:/Work/Specs.pdf`
- `kbe:file://server/share/Docs`

## 构建

```powershell
npm run companion:windows:build
```

## 发布

```powershell
npm run companion:windows:publish
```

发布产物位于：

- `artifacts/companion/windows/publish/win-x64/KhaosBoxCompanion.exe`

## 为当前用户安装

```powershell
npm run companion:windows:install
```

这个命令会：

- 发布 `companion/windows/src/KhaosBoxCompanion.csproj`
- 将 `KhaosBoxCompanion.exe` 安装到 `%LOCALAPPDATA%\KhaosBox\Companion\`
- 注册 `HKCU\Software\Classes\kbe`
- 顺手清理旧的 `KhaosBoxExplorer` 安装和注册表痕迹

如果你已经发布过可执行文件，只想刷新注册：

```powershell
powershell -ExecutionPolicy Bypass -File .\companion\windows\scripts\install.ps1 -SkipPublish
```

## 卸载

```powershell
npm run companion:windows:uninstall
```

如果只想删除注册、保留文件：

```powershell
powershell -ExecutionPolicy Bypass -File .\companion\windows\scripts\uninstall.ps1 -KeepFiles
```

## 构建 MSI 安装包

```powershell
npm run companion:windows:msi
```

生成文件位于：

- `artifacts/companion/windows/packages/KhaosBoxCompanion-win-x64.msi`

该 MSI 会把 Companion 安装到 `%LOCALAPPDATA%\KhaosBox\Companion\`，注册 `HKCU\Software\Classes\kbe`，并在 Windows 卸载列表中显示标准条目。

## 运行解析测试

```powershell
dotnet test .\companion\windows\tests\KhaosBoxCompanion.Tests.csproj
```

## 调试 URI 解析

```powershell
dotnet run --project .\companion\windows\src\KhaosBoxCompanion.csproj -- --resolve "kbe://server/share/Docs"
```

这个命令只会输出规范化后的 Windows 路径，不会真的打开 Explorer 或其他应用。
