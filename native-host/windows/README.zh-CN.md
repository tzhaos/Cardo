# KhaosBoxExplorer 处理器

这个目录包含 Windows 侧的 `kbe:` 协议处理器源码和 MSI 构建脚本。

## 功能

- 接收 `kbe:` URI
- 解析盘符路径、UNC 路径和嵌套的 `file://` URI
- 文件夹交给 Windows 资源管理器打开
- 文件交给系统默认关联程序打开

## 支持的 URI 形式

- `kbe:C:\Work\Specs.pdf`
- `kbe:V:/Shared/Chinese Folder`
- `kbe://server/share/Docs`
- `kbe:file:///C:/Work/Specs.pdf`
- `kbe:file://server/share/Docs`

## 构建 MSI

```powershell
npm run native-host:msi
```

构建完成后会生成：

- `native-host/windows/release/KhaosBoxExplorer-win-x64.msi`

这个 MSI 会把 `KhaosBoxExplorer.exe` 安装到 `%LOCALAPPDATA%\KhaosBox\KhaosBoxExplorer\`，注册 `HKCU\Software\Classes\kbe`，并出现在 Windows 的卸载列表中。

脚本在构建成功后会自动清理 publish、`bin/`、`obj/`、`installer/bin/`、`installer/obj/` 等中间目录，只保留最终的 `.msi`。

## 调试 URI 解析

```powershell
dotnet run --project .\native-host\windows\KhaosBoxExplorer.csproj -- --resolve "kbe://server/share/Docs"
```
