# iw-mixes-web-platform

Iw Mixes项目-Web管理平台

## deploy流程
1. npm run build
2. ./push-nginx-origin.sh

## AI 会话本地启动器

线上 AI 会话任务页通过本机启动器打开 macOS Terminal。启动器只监听
`127.0.0.1:17321`，只接受以下浏览器来源：

- `https://web.itwray.com`
- `http://127.0.0.1:5173`
- `http://localhost:5173`

首次使用：

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
