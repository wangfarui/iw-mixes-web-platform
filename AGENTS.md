# AGENTS.md - iw-mixes-web-platform Web 项目指南

## 项目定位

`iw-mixes-web-platform` 是 IW 系统当前唯一默认 Web 管理端迭代项目，面向桌面端管理和数据维护场景。用户说 `web项目`、`前端`、`管理端` 或 `后台页面` 时，默认进入本项目；如果用户同时说 `微信小程序`、`wx` 或 `小程序`，则应进入 `../iw-mixes-app-wx`。

当前覆盖餐食、菜品、记账记录、任务、积分、字典、账号、网站导航、AI 会话任务等模块，通过后端兼容入口访问 `../iw-mixes-server`。

Web 端开发重点是：清晰的路由、稳定的表格/表单/详情交互、类型一致、API 路径正确、和小程序端共享同一后端语义。

## 技术栈

- Vue 3。
- Vite 5。
- TypeScript。
- Vue Router 4。
- Pinia。
- Element Plus。
- Axios。
- `vite-svg-loader` 用于直接加载 SVG。
- `vuedraggable` 用于拖拽场景。

## 目录地图

- `src/main.ts`：应用入口。
- `src/App.vue`：根组件。
- `src/router/index.ts`：路由配置。
- `src/api`：后端 API 封装，每个业务域一个文件。
- `src/types`：接口入参、出参、业务类型定义。
- `src/stores`：Pinia 状态，如餐食、菜品、字典等。
- `src/views`：页面组件，按业务域组织。
- `src/views/*/components`：业务页面局部组件。
- `src/components`：跨业务公共组件，如 `SvgIcon.vue`。
- `src/services`：前端服务逻辑，如版本轮询。
- `src/assets`：全局样式、Logo、SVG 图标。
- `scripts`：本地开发辅助脚本。
- `public`：静态公开资源。
- `dist`、`node_modules`：构建产物和依赖目录，不要手工修改。

## 路由与页面地图

核心路由在 `src/router/index.ts`，`/` 下挂载 `HomeView` 子路由：

- `/meal`、`/meal/add`、`/meal/edit`、`/meal/detail`：点餐。
- `/dishes`、`/dishes/add`、`/dishes/edit`、`/dishes/detail`：菜品。
- `/bookkeeping`：记账记录。
- `/task/list`、`/task/records`：任务。
- `/points/records`：积分记录。
- `/dict`、`/dict/add`、`/dict/edit/:id`：字典管理。
- `/account`：账号管理。
- `/website/navigation`：网站导航。
- `/ai/session-task`：AI 会话任务。
- `/tools/**`：纯前端工具页，默认公开访问，不要求登录。
- `/login`：登录。

新增页面时优先沿用已有路由风格：列表页、添加页、编辑页、详情页拆开；复杂表格或表单放在同业务 `components` 目录。

## Web 工具页约定

轻量网站工具、开发者工具、文本处理工具、文件本地处理工具等默认落在 `/tools/**` 下，路由集中在 `src/router/tools.ts`。`/tools` 父路由默认 `meta.public: true`，因此大多数工具不需要登录；少数确实依赖用户账号、服务端数据或个人配置的工具，必须在子路由上显式设置 `meta.public: false` 并说明原因。

工具页默认是纯前端、本地优先能力：

- 不新增后端服务、数据库或服务端存储，除非用户明确要求。
- 不上传用户输入文本、文件内容或临时结果。
- 不默认保存历史；如需历史，必须由用户手动开启，并只写当前浏览器本地存储。
- 不接入会读取工具内容的统计、埋点或第三方在线 API。
- UI 打开即进入可用工作台，不做营销落地页。
- 复杂工具按 `src/views/<tool-domain>`、`src/types`、`src/utils/<tool-domain>`、`src/workers`、`scripts` 拆分。
- 大文本、大文件、CPU 密集计算优先使用 Web Worker，并提供取消或手动开始。
- 导出、复制、打印等能力在浏览器本地完成。

新增公开工具时，优先参考根目录 `skills/iw-web-tool-development`。

## API 与代理

请求封装在 `src/api/request.ts`：

- Axios 默认 `Content-Type: application/json;charset=utf-8`。
- 非生产环境 `baseURL` 为空，走 Vite dev server proxy。
- 生产环境 `baseURL` 是 `//api.itwray.com`。
- token 存在 `window.sessionStorage.iwtoken`，请求 header 为 `iwtoken`。
- 响应 `code == 200` 成功，`code == 401` 清 token 并跳转 `/login`，其他 code 用 Element Plus message 提示。

Vite proxy 在 `vite.config.ts`：

- `/auth-service` -> `http://localhost:18000`
- `/eat-service` -> `http://localhost:18000`
- `/bookkeeping-service` -> `http://localhost:18000`
- `/points-service` -> `http://localhost:18000`
- `/external-service` -> `http://localhost:18000`

本地 `18000` 由 `iw-mixes-server` 的 `iw-core` dev profile 兼容旧入口前缀。生产环境由 Nginx 转发到 `iw-core` 或 `iw-external`；Web 端 API 路径仍保留 `/auth-service`、`/bookkeeping-service`、`/eat-service`、`/points-service`、`/external-service` 前缀。

API 文件按业务域组织：

- `src/api/login.ts`
- `src/api/bookkeeping.ts`
- `src/api/dishes.ts`
- `src/api/meal.ts`
- `src/api/points.ts`
- `src/api/taskList.ts`
- `src/api/dict.ts`
- `src/api/applicationAccount.ts`
- `src/api/websiteNavigation.ts`
- `src/api/aiTask.ts`
- `src/api/menus.ts`

新增 API 时，同步新增或复用 `src/types` 中的 DTO/VO 类型，调用路径必须包含网关前缀，如 `/bookkeeping-service/bookkeeping/records/page`。

## 本地 AI 会话接口

`vite.config.ts` 注册了开发期本地接口：

- `GET /api/local/claude-sessions`
- `GET /api/local/codex-sessions`

它们由 Vite middleware 读取本机 Claude/Codex 会话草稿，不是后端 `iw-mixes-server` API。修改 AI 会话页面时，要区分这类本地开发接口和真实后端兼容入口。

## 页面开发流程

新增 Web 业务页面：

1. 在 `src/types` 定义或补齐请求/响应类型。
2. 在 `src/api` 新增接口函数，路径带后端网关前缀。
3. 在 `src/views/<domain>` 新增页面；若有复杂表格/表单，放入 `src/views/<domain>/components`。
4. 在 `src/router/index.ts` 注册路由。
5. 如果首页菜单需要入口，检查 `HomeView`、`src/api/menus.ts` 或相关菜单数据来源。
6. 涉及缓存状态、跨页面共享状态时再加 Pinia store，避免把临时表单状态放入全局。
7. 调整后运行类型检查和构建。

## UI 与代码风格

- 管理端以 Element Plus 的表格、表单、弹窗、分页、消息提示为主，保持安静、清晰、可扫描。
- 列表页通常包含查询区、表格区、分页和操作列。
- 表单页或弹窗要显式处理加载、提交中、失败恢复和返回。
- SVG 图标优先走已有 `SvgIcon.vue` 和 `src/assets/icons`。
- 业务局部组件只服务当前模块时放在 `views/<domain>/components`，跨模块复用才放到 `src/components`。
- TypeScript 类型不要散落在页面里；可复用的 DTO/VO 放到 `src/types`。
- 不要绕过 `src/api/request.ts` 直接创建新的 Axios 实例，除非本地开发接口有明确理由。

## 常用命令

在 `iw-mixes-web-platform` 目录执行：

```bash
npm run dev
npm run type-check
npm run build
npm run preview
```

`npm run build-check` 会组合类型检查和生产构建，适合较完整的提交前验证。

## AI 开发约定

- 先读本文件，再读根目录 `../AGENTS.md` 了解跨项目关系。
- 不要修改 `dist/`、`node_modules/`、`.vite/` 等构建产物和缓存。
- 不要把 `前端` 误解成旧 uni-app 项目；单独说 `前端` 默认就是本 Web 项目，涉及微信小程序时才去 `../iw-mixes-app-wx`。
- API 路径变更必须同步后端 Controller 和小程序端可能的调用。
- 调整公共请求封装会影响所有页面，要优先做全局回归思考。
- 页面新增字段时，同步检查 `src/types`、表格列、表单项、详情显示、API 入参出参。
- 复杂 UI 改动完成后，优先用 `npm run type-check` 和 `npm run build` 验证。
