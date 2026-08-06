# iw-mixes-web-platform

Iw Mixes项目-Web管理平台

## deploy流程
1. npm run build
2. ./push-nginx-origin.sh

## AI 会话本地启动器

线上 AI 会话任务页通过本机启动器在 iTerm2 中打开会话。启动器只监听
`127.0.0.1:17321`，只接受以下浏览器来源：

- `https://web.itwray.com`
- `http://127.0.0.1:5173`
- `http://localhost:5173`

首次使用：

请先安装并确保可以正常启动 iTerm2。启动器通过 iTerm2 的 Bundle ID
`com.googlecode.iterm2` 打开临时 `.command` 文件；启动脚本会在运行 AI CLI 前通过
OSC 0 控制序列，将 Session Name 设置为 AI 会话任务名称。启动 Codex 会话时还会使用
一次性的 `tui.terminal_title=[]` 配置覆盖，防止 Codex TUI 再将名称改回项目目录名；
该配置不会写入用户全局的 `~/.codex/config.toml`。

```bash
npm run ai-launcher:install
```

安装命令会注册当前用户的 macOS LaunchAgent，并输出配对令牌。在
`https://web.itwray.com/ai/session-task` 的“本机启动器”对话框中输入该令牌即可完成配对。

常用命令：

```bash
npm run ai-launcher:status
npm run ai-launcher:pair
npm run ai-launcher:uninstall
```

本机需要预先安装 Node.js 和对应的 AI CLI。当前支持 Codex、Claude Code 和 Gemini CLI；
`modelProvider` 只会作为 Codex 的 `-c model_provider=<value>` 参数传入。
