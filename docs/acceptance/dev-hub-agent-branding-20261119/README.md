# Dev Hub Agent 安装名称统一验收

日期：2026-11-19。最终范围以用户最新纠正为准：本机 Agent 的安装相关名称整体统一为 Dev Hub；包括 macOS 和 Windows 的应用、安装目录、运行文件、配置、自启、协议、下载、升级与卸载。原先保留旧安装路径的方案已废止。

实施完成；自动检查及真实 macOS 运行文件验证通过。浏览器和跨系统完整安装验收的缺口见下表。

## 最终名称

| 项目 | 当前名称 |
| --- | --- |
| 展示名称 / Windows 已安装应用 | `Dev Hub Agent` |
| Agent 版本 / 协议 | `2.0.4` / `2` |
| macOS 应用 | `~/Applications/dev-hub-agent.app` |
| macOS Bundle ID / LaunchAgent | `com.devhub.agent` / `com.devhub.agent.plist` |
| 包内及安装后的主运行文件 | `dev-hub-agent` / `dev-hub-agent.exe` |
| Windows 安装目录 | `%LOCALAPPDATA%\dev-hub-agent` |
| 配置与 Skills 状态目录 | 用户配置目录下的 `dev-hub-agent/` |
| 默认启动协议 | `dev-hub-agent://` |
| 新版下载及更新目录 | `/downloads/dev-hub-agent/` |
| 安装包 | `dev-hub-agent-darwin-{arm64,amd64}.zip`、`dev-hub-agent-windows-{amd64,arm64}.exe` |

## 实现与兼容

- Web 的设置描述、安装与卸载教程、命令、下载地址全部使用新名称。发布检查会拒绝教程残留旧 Agent 安装名称。
- 更新 Agent Go 模块、配置读取、应用元数据、启动项、协议注册、迁移、更新临时文件、安装与卸载脚本，以及打包脚本，重新编译四个平台完整产物。运行程序已改变，不能继续按上一轮“仅外层改名、运行程序不变”的说明交付。
- 兼容两个历史版本：读取旧配置与端口环境变量、迁移 Skills 设备与工作区状态、保留自启偏好。浏览器也能读取两代旧端口偏好。
- 更新器从旧安装路径启动新运行文件后会迁移到新路径。新进程脱离旧启动会话；健康检查必须匹配 `dev-hub-agent` 和当前版本，避免把旧服务的 HTTP 200 误认为迁移成功。
- 新实例健康后清理旧启动项、旧安装目录及旧 Windows 卸载项；Windows 安装和升级迁移均生成新目录中的 `uninstall.exe`，应用列表与直接运行卸载程序都进入卸载流程。安装失败时保留旧安装并尝试恢复。旧配置原文件保留以支持恢复；旧协议作为隐藏兼容别名指向新应用。
- 两个历史 Web 下载目录仅保留更新清单和跳转页，文件地址都指向新目录，不再提供旧名安装产物。
- Agent 源目录仍位于联合工作区辅助目录 `zg-workbench-agent/`，这不是安装路径。该目录及 `context` 不在 Web Git 仓库中，修改保留在本地。Web 仓库包含编译后的发布产物及相关前端修改。
- 没有修改 Java 后端或微信小程序，生产部署与升级本机 Agent 是独立操作。

## 验证结果

| 编号 | 结果 | 操作与观察 |
| --- | --- | --- |
| AC-01 | 通过 | Go 全包 `go test ./...`；覆盖两个历史目录识别、配置和 Skills 数据迁移、自启元数据、当前健康身份及版本、Mac 应用元数据和卸载脚本、Windows 注册命令，以及已有 K8s、AI、Skills、更新逻辑。测试使用临时目录和注册命令记录器，没有改写 HOME 或真实注册表。 |
| AC-02 | 通过 | 原始回归信号：旧 `zg-workbench-agent.app` 不被识别为历史安装，`TestIsLegacyPath` 失败；修改后通过。新增源码发布目录误识别检查，避免运行本地构建产物时意外触发迁移。 |
| AC-03 | 通过 | 执行真实 `scripts/build-release.sh`，交叉编译 macOS ARM/Intel 和 Windows x64/ARM64。`file` 确认 Mach-O 和 PE 的目标架构。 |
| AC-04 | 通过 | `npm run check:zg-workbench-agent`：四平台运行文件 SHA-256、两个 macOS ZIP 的主文件与脚本、教程 chmod 对象、Windows 安装载荷与 runtime、两个历史更新清单文件地址全部一致。 |
| AC-05 | 通过 | `npm run type-check`。 |
| AC-06 | 通过 | `npm run build`，包含 Agent 发布检查、现有更新资格测试和发布说明检查；构建存在原有 NODE_ENV、第三方 eval 和 chunk 大小提示。 |
| AC-07 | 通过 | 真实下载解析函数覆盖四个平台；使用本地 Vite 下载新入口及两个历史清单中的全部文件，逐一比较最终产物 SHA-256，状态均为 HTTP 200。详情见 [http-results.json](./http-results.json)。 |
| AC-08 | 通过 | 将最终 macOS ZIP 的真实程序解到临时目录，用显式配置和独立端口启动，返回 `dev-hub-agent / 2.0.4 / protocol 2`，随包 Skills CLI 成功安装到临时目录，更新检查读取真实新清单并返回当前已最新。运行文件 SHA-256 与最终清单一致。详情见 [runtime-results.json](./runtime-results.json)。 |
| AC-09 | 通过 | `bash -n`、Go 格式检查和 Web `git diff --check`。设置页教程源码中不存在两个历史安装名称。 |
| AC-10 | 受阻 | 之前已尝试 Chrome 调试工具、内置浏览器及本地 Chrome 自动化，均无法连接或启动（SIGABRT / EPERM）；当前未将静态或 HTTP 校验冒充页面视觉和点击验收，无截图。 |
| AC-11 | 未执行 | 未在 Windows 实机执行完整安装、注册表、自更新或卸载；未替换用户 macOS 当前安装，也未对用户真实 LaunchAgent、LaunchServices 和配置执行端到端迁移。使用单元测试、产物校验和隔离运行验证，不宣称这些操作已实机通过。 |

## 发布与残留

前端发布脚本通过同一检查器直接校验构建目录中的新版安装包、运行文件和两个历史清单，避免继续检查已迁移的旧路径。

发布 Web 前端时需包含新的 `public/downloads/dev-hub-agent/` 和两个历史入口清单/跳转页。用户的已安装 Agent 需要升级或重新安装到 2.0.4，才能切换本地应用名称和目录。无需发布 `iw-core`、`iw-external` 或小程序。

原有未提交文档及其它会话文件保持原样；验证程序、临时文件和 Vite 服务已清理/停止，未写业务数据，未重启后端。
