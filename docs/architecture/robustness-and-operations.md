# Cardo 运维与稳健性

本机 Runtime 的发现、启停、日志、更新与恢复。架构协议细节见 [local-runtime-multi-client.md](./local-runtime-multi-client.md)。

| Field | Value |
| --- | --- |
| Status | Active |
| Date | 2026-07-13 |

---

## 1. 数据目录与关键文件

Path SoT：`src/runtime/paths.ts` → `resolveCardoDataPaths()`。

| 文件 / 目录 | 用途 |
| --- | --- |
| `cardo.sqlite` | 权威业务库（唯一写者：Runtime） |
| `runtime.lock` | 排他锁；含 pid、status、baseUrl（ready 时）；无 token |
| `discovery.json` | 唯一 secrets 文件：baseUrl、token、schemaVersion、revision… |
| `runtime.log` | Runtime 进程日志 |
| `themes/` | 用户 Theme Pack 落盘目录（非 SQLite） |

默认数据根：

| OS | 路径 |
| --- | --- |
| Windows | `%APPDATA%/cardo` |
| macOS | `~/Library/Application Support/cardo` |
| Linux | `${XDG_CONFIG_HOME:-~/.config}/cardo` |

覆盖：环境变量 `CARDO_DATA_DIR`（绝对目录）。

Desktop 另有 Electron `userData` 下壳层日志（如 Main 进程 log）；业务库仍走 Path SoT，不拆第二业务库。

---

## 2. Lock 与 discovery

### 2.1 职责分离

| 文件 | 含 token？ | 用途 |
| --- | --- | --- |
| `runtime.lock` | 否 | 排他；健康探测辅助 |
| `discovery.json` | 是 | Client / CLI / NM 发现 endpoint 与认证 |

Discovery 写入时尽量收紧权限（POSIX `0600`；Windows 尽力）。

### 2.2 启动协议

```text
1. 写 lock status=starting（尚无 probeable baseUrl）
2. open SQLite + applyMigrations
3. listen 127.0.0.1:动态端口
4. 更新 lock status=ready + baseUrl/port
5. 写 discovery.json（token + schemaVersion + revision 快照）
6. lifetimeMode=auto 且尚无 client → 启动 grace（默认 15s）
```

避免「半启动」被其他进程用假 baseUrl 误判为可 attach。

### 2.3 冲突解析

第二进程启动 Runtime 时：

1. 读 lock / discovery
2. `GET {baseUrl}/v1/health`
3. health ok → 不得抢锁；CLI 打印 endpoint；Desktop 走 attach（若 schema 与 UI 兼容）
4. pid 已死且 health 失败 → 清理陈旧 lock/discovery 后重试
5. pid 活但 health 连续失败 → 优先 health 判陈旧（Windows PID 复用场景勿只信 pid）

startup grace：`status=starting` 且 pid 存活时，短时间（实现常量，约 30s）不视为可偷锁。

### 2.4 兼容性门闩

共享逻辑：`src/core/runtimeCompatibility.ts` 的 `assertRuntimeCompatible`。

- `schemaVersion` 必须等于当前 `DATABASE_SCHEMA_VERSION`（过旧与过新均拒绝）
- Desktop / `cardo open` 通常还要求 Runtime 提供 `/app` UI
- Extension 经 NM 拿到 schemaVersion 后同样做 equality 校验（UI 由扩展页自带，不强制 `/app`）

不兼容时：Desktop 可 authenticated shutdown 后 spawn 新 Runtime；CLI/Extension 应提示 `cardo stop` + 升级/重建。

---

## 3. 启停命令

| 动作 | 命令 / 行为 |
| --- | --- |
| 前台常驻 | `cardo serve`（`lifetimeMode=foreground`；零 client 不自动停） |
| 日常打开 Web | `cardo open` / `cardo`（必要时 spawn detached `auto` Runtime） |
| 查看状态 | `cardo status`（health + diagnostics） |
| 强制停止 | `cardo stop` → `POST /v1/shutdown`（Bearer process token）；失败再信号 pid |
| 构建前清实例 | `npm run cardo:stop`（脚本停 Runtime/Desktop/CLI 本机实例） |

Desktop：

- 已有兼容 Runtime → attach，退出不杀该 Runtime
- 无 Runtime → spawn detached `runtime-child`（`startedBy=desktop`, `auto`）
- 关窗不停止他人 client 仍在用的 Runtime；auto 模式靠 last-client + grace 退出

Grace：默认 `clientGraceMs = 15_000`。Idle：非 streaming client 默认 60s 无 touch 后 unregister。

---

## 4. 日志位置

| 来源 | 典型位置 |
| --- | --- |
| Runtime | `{dataDir}/runtime.log` |
| Desktop Main | Electron userData 下壳日志（实现侧 `logs/main.log` 等） |
| Native host | host 诊断写入（实现侧 diagnostic 文件；不含业务库内容） |
| CLI 前台 | 终端 stdout/stderr；daemon-child 追加 runtime.log |

原则：

- 默认不打印用户 workspace 内容 payload
- 不把 process token / oneTimeCode 写入可分享日志
- 排查顺序：`cardo status` → `runtime.log` → discovery 是否残留 → `cardo stop` 后重试

---

## 5. 更新通道（Desktop）

安装通道检测：`src/desktop/update/installChannel.ts`。

| Channel | 含义 | 更新形态 |
| --- | --- | --- |
| `setup` | NSIS / 安装到 Programs 等 | 下载 Setup 安装包并执行 |
| `portable` | portable 分发或用户可写目录侧车 | 替换 portable 可执行文件 |
| `dev` | unpackaged / `npm run desktop:start` | 不走生产更新流 |

更新源：GitHub 上非 draft、非 prerelease 的 latest stable Release。CI 日常 artifact 不是更新源。

### 5.1 Checksum 策略

1. Release 必须附带 `SHA256SUMS`（或等价资产名）。
2. 选中安装包资产后，在 SUMS 中必须有对应文件名条目。
3. 下载后校验 SHA-256；失败则拒绝安装（`checksum_mismatch` / `missing_checksum`）。
4. 安装前再次 re-verify 本地文件。
5. 无 checksum 元数据的 Release：应用内更新拒绝下载。

版本 SoT：`package.json` `version`；安装包版本与此对齐。发版流程见 [overview.md](./overview.md) §6 与 `AGENTS.md`。

---

## 6. 常见故障与恢复

### 6.1 Runtime 起不来 / Desktop 空白

1. 读错误框或终端：是否提示 schema 不匹配、无 `/app`、锁冲突。
2. `cardo status`：是否 half-dead discovery。
3. `cardo stop`（或 `npm run cardo:stop`）。
4. 确认构建：`npm run build:all` 或至少 `desktop:build` / `cardo:build`（含 web-runtime）。
5. 重开 Desktop 或 `cardo open`。
6. 仍失败：查看 `{dataDir}/runtime.log`。

### 6.2 schema_mismatch

客户端与运行中 Runtime 的 `schemaVersion` 不一致（必须等于 `DATABASE_SCHEMA_VERSION`，当前为 9）。

```text
cardo stop
# 升级/重建所有表面到同一版本
npm run build:all   # 开发机
# 或安装匹配的 Desktop / CLI 发布包
cardo open
```

迁移只 forward。库版本高于二进制 → fail hard（需升级客户端，不能「降级读」）。

### 6.3 陈旧 lock

症状：声称 Runtime 在跑但 health 失败；或 PID 已复用。

```text
cardo stop
# 若 stop 无效且确认无 cardo 进程：
# 手动删除 {dataDir}/runtime.lock 与 discovery.json（确认无存活 Runtime）
```

优先让 authenticated shutdown 与 stop 脚本清理；避免在健康 Runtime 运行时手删文件。

### 6.4 Extension 找不到 Runtime

1. Runtime 是否在跑：`cardo status` 或 Desktop 已打开。
2. Native Host 是否注册：`npm run native-host:install` 或 Desktop 安装注册。
3. 扩展页错误码：`native_host_missing` / `runtime_unavailable` / `schema_mismatch`。
4. 按引导启动 Cardo 并重开扩展页。

### 6.5 多 client 不同步

1. 各表面是否连同一 baseUrl（同一 discovery）。
2. events 流是否 reconnecting（UI 连接横幅）。
3. 是否忽略 self-echo 后未用 command.ok 的 scopes apply（开发态问题）。
4. `GET /v1/diagnostics` 看 clientCount、queueDepth、revision。

### 6.6 数据库打不开

- 确认只有一个 Runtime 写者。
- 磁盘权限 / 杀毒锁定。
- 损坏时：停止 Runtime，备份 `cardo.sqlite`，再考虑从 export 恢复（无自动云同步）。

---

## 7. 威胁模型（同 OS 用户）

| 威胁 | 缓解 | 不宣称 |
| --- | --- | --- |
| 局域网远程直连 | 仅 bind `127.0.0.1` | — |
| 恶意网页读库 | 无浏览器直连 SQLite；CORS 不 reflect 任意 Origin | — |
| 无 token 扫端口 | 业务 API / events 需 Bearer | — |
| URL 泄 token | 禁长效 token in URL；bootstrap 用短 TTL one-time code | — |
| SSE 无法带 header | 使用 fetch stream + Authorization | — |
| discovery 文件被同用户读 | POSIX 0600；lock 不含 token | 同用户恶意进程已可读本机文件时无法绝对防护 |
| 已盗 process token | shutdown / 全 API 可用 | 同 OS 用户已获 token 不宣称可防 |
| 跨用户 | 系统用户隔离 + 数据目录 ACL | 管理员/elevated 攻击超出 v1 范围 |
| 供应链更新 | Release SHA-256 强制校验 | 用户强制装未校验包超出应用内更新路径 |

总体：Cardo 保护的是「浏览器页面与无凭证访客」边界，以及单写者数据完整性；不是多用户机密计算平台。

---

## 8. 诊断字段速查

`GET /v1/diagnostics`（需 Bearer）：

```text
revision, schemaVersion, dbPath, pid, startedBy, lifetimeMode, baseUrl
clientCount, clients[], queueDepth, lastMutationAt, uptimeMs
corsRejectedCount, authFailCount, graceActive
```

`GET /v1/health`（无 auth）：

```text
ok, pid, port, startedBy, lifetimeMode
```

---

## 9. 运维检查清单

```text
[ ] 数据目录符合 Path SoT；CARDO_DATA_DIR 若设置则各表面一致
[ ] 任意时刻至多一个 Runtime 写 cardo.sqlite
[ ] Desktop / CLI / Extension 版本与 schemaVersion 对齐
[ ] 扩展已注册 Native Host
[ ] 发版含 SHA256SUMS；应用内更新拒绝无校验包
[ ] 故障时优先 cardo stop + runtime.log，而非手改库结构
[ ] 合并前 npm run build:all（会先停本机实例）
```
