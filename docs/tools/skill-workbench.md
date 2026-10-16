# Skill 工作台

入口：`/tools/home` → Skill 工作台，或直接访问 `/tools/skills`，无需登录。

默认连接 IW 本机助手扫描，支持手动目录导入和工作台快照 JSON 导入。网页直接连接 `127.0.0.1`，扫描内容不经过 IW 后端。当前扫描范围、正文和结果只保留在页面内存；开启“记住我的工作台”才在当前浏览器保存来源、配对信息、别名、标签和备注，不保存文件正文。

## 安装本机助手

需要 Node.js 20 或更高版本，以及 Web 项目源码。安装或升级都使用同一命令；既有配对令牌保留。

macOS，在项目根目录执行：

```sh
npm run ai-launcher:install
npm run ai-launcher:pair
```

Windows，在项目根目录的 PowerShell 执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\aiLauncher.ps1 install
powershell -ExecutionPolicy Bypass -File .\scripts\aiLauncher.ps1 pair
```

Windows 将助手复制到当前用户的 `%USERPROFILE%\AppData\Local\IW AI Launcher`，启动进程并在当前用户 Startup 目录建立登录启动快捷方式，不需要管理员权限。`start`、`status`、`pair`、`uninstall` 使用同一个 PowerShell 入口。卸载只移除助手及其自启动，不修改任何 Skill。

Windows 支持 Skills 扫描和编辑器打开；原有 AI 会话 iTerm2 启动功能仍仅用于 macOS。

在网页“连接设置”中输入配对令牌，默认端口 `17321`。已安装旧版助手时需重新安装升级到 `1.5.3`。允许网页来源为 `https://web.itwray.com`、`http://localhost:5173`、`http://127.0.0.1:5173`；浏览器可能额外请求本地网络访问权限。页面公开访问并不意味着本机文件公开：Skill 接口始终检查配对令牌和浏览器来源。

## 扫描与导入

- 连接后发现并扫描用户目录下已有的 `.agents/skills`、`.codex/skills`、`.claude/skills`、`.cursor/skills`。
- 添加来源时可以点击“选择目录”，在网页中浏览本机目录，支持用户目录、上一级、隐藏目录和 Windows 盘符。确认后自动填入绝对路径及空白来源名称；取消保持原输入。目录由助手列出，仅读取目录名称，不读取文件内容。此操作需要助手 1.5.2。
- 添加来源无需选择扫描方式：选择项目目录时，只扫描当前项目的 `skills` 和上述四个工具目录，不查找子项目的 Skills。也可以直接选择 Skills 集合目录或带有 `SKILL.md` 的单个 Skill 目录。
- Skills 集合只检查直接子目录中的 `SKILL.md`；保留 `.system` 内置 Skills 分组支持，不递归查找普通子目录或隐藏备份目录。Skill 自身的 scripts、references 等文件仍完整读取。
- 左侧仅显示“全部 Skills”“全局 Skills”和各个“<项目名称> Skills”；同一项目的多个来源合并为一个分类。自动刷新和本地保存设置移至“连接设置”。已添加的来源通过左侧底部“来源管理”统一查看、搜索及移除；添加来源表单只保留新增操作。
- 跳过 Git、依赖和构建目录，最多 30 个来源、2000 个 Skills、25000 个条目、10 层目录；每个文件最多 512 KiB，内容总量最多 32 MiB。未读取文件有明确标记。
- 支持 Skill 目录软链接并聚合真实目录相同的入口；Skill 内指向包目录之外的软链接不读取。不进入子项目查找其他 Skills 目录。
- 来源扫描失败保留错误提示和其余来源结果。扫描可取消。已发现 Skills 来源的文件变化由助手监测，网页每 4 秒检查变化；新增尚未发现的项目 Skills 目录需手动刷新。
- 手动导入时选中包含 `SKILL.md` 的目录，范围和来源名可填写。浏览器导入只提供相对路径，不支持本机编辑器打开或自动变化监听。
- 原始文件不在网页内编辑、移动或删除。编辑器打开优先使用本机 VS Code CLI，失败时回退到系统文本编辑器。

Skills 以自适应卡片网格展示名称、三行描述、范围和工具标签，完整路径在详情中查看。首次加载不选中卡片、不打开详情；点击卡片打开右侧抽屉，保留说明预览、原文、文件结构、安装位置、个人备注及元信息。关闭抽屉保留分类、搜索、分页及网格滚动位置，每次打开默认显示说明预览。小屏幕详情使用全屏抽屉。列表按目录展示 Skills，移除收藏、同名/重复标记及差异比较功能。搜索覆盖说明正文、名称、描述、路径和个人标记。Markdown 预览净化 HTML，屏蔽远程图片和嵌入资源；脚本仅展示文本。

清单 JSON/CSV 不含正文；快照导出明确提示包含已读取正文和路径。导出在浏览器内生成。CSV 防止公式注入。快照导入按记录展示，不把旧路径视为本机访问授权。

## 目录选择运行方式

选择目录使用本机助手的 `POST /v1/skills/directories` 接口及网页选择窗口，不依赖操作系统原生窗口服务。macOS 后台进程在部分执行环境中无法连接 `com.apple.hiservices-xpcservice`，原生 `osascript choose folder` 会以退出码 69 失败；浏览目录可以在相同环境下正常工作。原生选择接口仅保留兼容，新页面不会调用它。

## 验证

```sh
npm run test:skill-workbench
npm run test:ai-launcher
npm run type-check
npm run build
```

测试覆盖 YAML、范围/目录标签、导入、完整文件包摘要、项目分类、非递归扫描边界、软链接边界、取消、配对/来源校验、Windows 安装路径及快捷方式生成。当前开发环境为 macOS，Windows 原生安装和用户登录自启动需要 Windows 环境验收。
