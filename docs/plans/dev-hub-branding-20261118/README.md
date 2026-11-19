# Dev Hub 命名与图标设计

2026-11-18。主项目为 `iw-mixes-web-platform`。用户已确认名称、副标题和同步改名范围，并指定沿用浏览器标签页的猫咪图标。

## 1. 展示方案

| 位置 | 展示 |
| --- | --- |
| `/login` 的公开入口卡片 | **Dev Hub**，说明沿用「发布、迭代与工时协作」，无障碍名称改为「进入 Dev Hub」 |
| `/zhaogang` 及子页面的左上角 | **Dev Hub**，副标题 **CODING 助手 · 研发协作** |
| `/zhaogang` 及子页面的浏览器标签页 | **Dev Hub · CODING 助手** |
| 首次进入的绑定区 | 标题为 **绑定 CODING 账号**，继续引导用户提供 CODING 个人访问令牌 |

使用现有猫咪图标 `/zhaogang-cat.svg`。页头沿用 38 px 图标占位，登录卡片沿用 34 px，浏览器标签页使用同款图标并按 16 px 检查辨识度。标题和图标与右侧版本、头像共同进行窄屏检查。

[交互预览](preview.html)中的 Dev Hub 卡片可跳至页头示意。[桌面截图](preview.png)中的账号和版本为示例。

## 2. 影响范围

| 位置 | 更名前 | 改名方案 |
| --- | --- | --- |
| [登录页](../../../src/views/Login.vue#L73) | 「找钢工作台」及公文包图标 | 更新卡片标题、无障碍名称与图标，沿用 `/zhaogang` 目标 |
| [Dev Hub 外壳](../../../src/views/zhaogang/ZhaogangWorkbench.vue#L2) | 蓝底「找钢」、旧产品名、旧副标题 | 更新页头品牌，覆盖会话加载、未绑定和已绑定状态 |
| [浏览器标题和图标](../../../src/main.ts#L54)、[路由显示元数据](../../../src/router/zhaogang.ts#L3) | `/zhaogang` 路由族使用「找钢工作台」及猫图标 | 用同一组品牌文案与图标。路由切回 IW 或工具箱时按现有分支恢复各自标题及图标 |
| [绑定提示](../../../src/views/zhaogang/ZhaogangWorkbench.vue#L31)、[偏好设置](../../../src/views/zhaogang/ZhaogangWorkbench.vue#L353) | 「连接你的 CODING 工作台」「找钢工作台」「工作台偏好」 | 绑定区点明 CODING 账号和个人令牌，正文用 Dev Hub，设置标题用「使用偏好」 |
| [日历](../../../src/views/zhaogang/calendar/ZhaogangCalendarView.vue#L5)、[接口兜底报错](../../../src/api/zhaogang.ts#L69) | 「找钢日历」「找钢工作台服务暂不可用」 | 改为「工作日历」「Dev Hub 服务暂不可用，请稍后重试」 |
| [K8s 连接说明](../../../src/views/zhaogang/service/ZhaogangServiceView.vue#L79)、[Agent 设置](../../../src/views/zhaogang/settings/ZhaogangAgentSettings.vue#L536)、[Agent 教程](../../../src/views/zhaogang/settings/ZhaogangAgentGuideView.vue#L7)、[Skills 授权](../../../src/views/zhaogang/settings/ZhaogangSkillsAuthorization.vue#L11) | 显示旧产品名或以「工作台」指代产品 | 更新用户可见说明、授权文字和复制提示词中的产品称呼 |
| 团队、迭代、工时和代码页面 | 「工作台团队」区别于 CODING 团队，「工作台」标签标记本地事项 | 有歧义时用「Dev Hub 团队」和「本地事项」，其余用短称「团队」「事项」 |
| [版本记录](../../../public/zhaogang-release-notes.json#L413)、项目维护文档 | 历史发布项和现行说明均可能提到旧名称 | 发布时追加一条更名记录，历史版本条目作为当时的记录。维护文档的现行页面名称跟随 Dev Hub |

路由身份 `/zhaogang`、后端前缀 `/external-service/api/zhaogang`、现有团队邀请链接、CODING 会话与缓存键均按既有契约复用。本机 Agent 的 `zg-workbench-agent` 是已有安装、更新与唤起标识。用户同意同步更新已识别的旧称。Web 负责页面、设置和错误兜底，后端 `iw-external` 负责相应的 Swagger 标签、错误提示和通知品牌文案。微信小程序扫描未发现「找钢工作台」入口。

## 3. 实施和验收

先复核 [BASELINE.json](BASELINE.json) 和当前工作区。设计核查时 Web 在 `dev`，已有无关未跟踪文件。优先通过小范围的共享品牌资源复用图标和标题。移动端页头、浏览器标签页和登录快捷入口均使用同一个图标形状。

| 编号 | 操作 | 预期 |
| --- | --- | --- |
| AC-01 | 未登录 IW，打开 `/login`，点击 Dev Hub 或用键盘激活 | 卡片显示 Dev Hub 和新图标，正常进入 `/zhaogang` |
| AC-02 | 未绑定和已绑定 CODING 时分别打开 `/zhaogang`，并打开一个 Dev Hub 子页面 | 页头两层文案及图标一致，浏览器标签为「Dev Hub · CODING 助手」，绑定区或账号区按当前状态出现 |
| AC-03 | 从 Dev Hub 切到 `/login` 和 `/tools`，再返回 Dev Hub | 两边的浏览器标题和图标随路由正确切换 |
| AC-04 | 用桌面和约 375 px 窄屏查看页头与入口，检查相关设置提示 | 副标题和右侧账号区互不遮挡，入口可以辨识，后续提示使用新称呼 |

正式自验包括 `npm run type-check`、`npm run build` 和本地浏览器验证。首次绑定可用隔离浏览器验证。已绑定状态优先复用已有本地会话或非写入夹具。验收结果记录在 [本地自验](../../acceptance/dev-hub-branding-20261118/README.md)。

## 4. 接续提示词

> 使用 $iw-feature-handoff，读取 `/Users/wangfarui/workspaces/wfr/iw-mixes_ai/iw-mixes-web-platform/docs/plans/dev-hub-branding-20261118/README.md`。先检查两级 AGENTS.md、当前工作区和 BASELINE.json，按我确认的文案、图标和改动范围实施，沿用现有路由及 CODING 绑定流程。执行 AC-01 至 AC-04 及 Web 类型检查和构建，记录真实本地验证结果。若用户只授权 Web 改名，以 Web 交付为准。
