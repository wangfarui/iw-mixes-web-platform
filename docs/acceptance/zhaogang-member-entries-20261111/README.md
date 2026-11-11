# 团队指定成员提交明细验收

2026-11-11。用户确认增加团队指定成员提交明细、仓库与提交说明组合筛选、时间/新增/删除/文件数单列排序，并删除“我的代码”现存提示文案。实现及本地验证已完成。

## 行为与实现

团队成员汇总和趋势图下方增加分页明细，每页 20 条。仓库选项来自该成员在所选日期内的全部提交，不会因关键词或仓库筛选缩减。筛选只影响明细，变化后回到第一页。默认时间倒序，四列支持表头排序图标切换升降序，同时仅保留一个排序列；全部匹配结果先排序再分页，未统计指标始终置底，相同值按提交时间、仓库和 SHA 稳定排序。

切换成员、团队或日期后，清空明细筛选、回到第一页并恢复时间倒序。汇总与明细独立加载、报错；明细失败支持原条件重试，请求序号和卸载处理防止迟到响应覆盖当前成员。针对联调观察到的旧后端忽略团队/成员参数的问题，前端校验响应必须含仓库选项及条目仓库 ID；旧响应直接报错，不展示其中的本人提交。该最终兼容检查已通过类型及构建检查，未单独执行浏览器复验。明细条目及分支展开以仓库 ID + SHA 区分。

后端沿用团队成员权限和当前开发角色限制，使用现有 Git 身份归属规则；读取缓存前校验团队及目标成员，缓存区分成员、筛选、分页、排序以及现有身份/扫描版本。未改数据库结构或统计口径。

## 改动文件

Web：

- [CodeStatsSelectedMemberPanel.vue](../../../src/views/zhaogang/code/components/CodeStatsSelectedMemberPanel.vue)：成员明细、筛选和分页状态、独立加载/失败重试、切换重置及迟到响应保护。
- [CodeCommitTable.vue](../../../src/views/zhaogang/code/components/CodeCommitTable.vue)：可选仓库筛选和单列排序、复合行键；仅团队面板开启筛选与排序。
- [zhaogangCodeStats.ts](../../../src/types/zhaogangCodeStats.ts)：扩展查询、排序类型及响应仓库选项和仓库 ID。
- [ZhaogangCodeMineView.vue](../../../src/views/zhaogang/code/ZhaogangCodeMineView.vue)：删除用户指定文案及对应样式。

后端（均位于 `iw-packaging-parent/iw-external/src/`）：

- `main/java/com/itwray/iw/external/zhaogang/ZhaogangCodeStatsController.java`：扩展 `/external-service/api/zhaogang/code-stats/entries` 查询参数，排序字段/方向限定为枚举。
- `main/java/com/itwray/iw/external/zhaogang/codestats/CodeStatsModels.java`：排序枚举、条目仓库 ID、响应仓库选项。
- `main/java/com/itwray/iw/external/zhaogang/codestats/CodeStatsModule.java`：扩展模块契约。
- `main/java/com/itwray/iw/external/zhaogang/codestats/DefaultCodeStatsModule.java`：团队范围解析、目标成员校验及缓存隔离。
- `main/java/com/itwray/iw/external/zhaogang/codestats/CodeStatsQueryService.java`：按成员归属查询、仓库选项、组合筛选、全结果排序和分页。
- `test/java/com/itwray/iw/external/zhaogang/codestats/CodeStatsQueryServiceTest.java`、`CodeStatsEntriesModuleTest.java`：查询行为、缓存及权限边界回归。
- `test/java/com/itwray/iw/external/zhaogang/ZhaogangCodeStatsControllerTest.java`：个人旧请求默认值、团队参数绑定及非法排序拒绝。

同步更新联合工作区 `context/zhaogang-workbench-product-knowledge.md` 和 `context/zhaogang-workbench-technical-reference.md` 的产品及接口规则。

## 验证结果

| 编号 | 结果 | 证据与边界 |
| --- | --- | --- |
| AC-01 | 通过 | `iw-external` 及依赖模块 `package`，395 项测试通过。涵盖成员归属、非开发/缺失/跨团队目标拒绝、本人范围不可冒用、缓存区分成员和筛选排序、四列八种排序、缺失值置底、分页前排序及大页码保护。随后新增 Controller 契约测试 4 项通过。均为自动化受控测试，未使用真实 CODING 凭证。 |
| AC-02 | 通过 | 最终 Web `npm run type-check`、`npm run build` 通过；构建保留已有体积警告。结果摘要见 [checks.txt](checks.txt)。 |
| AC-03 | 通过（UI 夹具） | 原生 Chrome 打开实际 `/zhaogang/code/team` 页面。默认成员甲 25 条，第一页 20 条。点击新增排序首条 +98；翻到第二页看到小值及缺失值置底；改为删除排序回到第一页，首条删除 65，再点击为升序首条 0；改为文件数排序首条 8。请求仅含当前一个排序字段。 |
| AC-04 | 通过（UI 夹具） | 仓库选择 inventory-service，再搜索 fix，得到 5 条；上方汇总仍为 25 条。查看记录确认筛选/排序没有额外请求成员汇总或团队图表。仓库选项保留该日期范围全部仓库。 |
| AC-05 | 通过（UI 夹具） | 在保留仓库和排序条件下搜索“请求失败”，出现错误和重试入口；重试保留原条件且成功返回无匹配空态。切换成员乙恢复全部仓库、空关键词、第一页及时间倒序，显示乙的 3 条；零提交成员显示 0 条与空态。 |
| AC-06 | 通过（UI 夹具） | 打开实际“我的代码”路由，指定提示文案已删除，原有明细保持展示；团队专用仓库筛选和排序未扩展到该页面。 |
| AC-07 | 未完成 | 新构建的真实登录态数据联调。现有 18006 端口进程无法被统一脚本识别，脚本拒绝重启；另用统一脚本在 18027 启动新包，但无法复用浏览器现有会话。没有伪造真实权限或将旧进程返回的本人明细计作通过。 |
| AC-08 | 未执行 | 窄屏、迟到请求的浏览器复现场景、真实多账号权限和上游 CODING 扫描。本次没有主动触发同步或外部构建。 |

UI 请求证据：[ui-requests.jsonl](ui-requests.jsonl)，自动断言摘要：[ui-request-checks.json](ui-request-checks.json)。它们仅包含隔离夹具路径与查询参数，不含 Cookie、PAT、认证头或真实业务数据。浏览器画面已在原生工具中观察；未保存截图文件。

## 复验与环境收尾

后端：Java 17；Maven `/usr/local/maven/apache-maven-3.8.6/bin/mvn`，显式 `-Dmaven.repo.local=/usr/local/maven/repository` 与临时最小 `-s` 配置。执行前已检查 Maven/Java 选项环境变量、项目 `.mvn` 和全局 settings，未发现冲突的本地仓库配置。

```bash
/usr/local/maven/apache-maven-3.8.6/bin/mvn \
  -s /private/tmp/iw-member-entries-maven-settings.xml \
  -Dmaven.repo.local=/usr/local/maven/repository \
  -pl iw-packaging-parent/iw-external -am package
```

UI 复验可先启动 [fixture-server.mjs](fixture-server.mjs)，再在 Web 仓库执行 `IW_LOCAL_ZHAOGANG_PROXY=http://127.0.0.1:18028 npm run dev -- --host 127.0.0.1 --port 5175 --strictPort`。夹具拒绝写请求且不转发到真实后端；它只用于验证交互，不替代真实后端验收。

本次启动的夹具和 Vite 已停止，18027 已无监听；验收标签页已关闭。保留用户原有 18006/18000 服务。验收过程未执行迁移或发布，也未清理用户既有业务数据。

## 排序取消状态修复

2026-11-11 根据用户反馈补齐三态排序：降序、升序、取消。取消时图标保持中立，查询恢复 `COMMIT_AT + DESC` 并回到第一页。原实现忽略空排序事件，已修正；通过实际组件事件处理函数复现失败后，验证四列取消状态、默认排序事件及父面板第一页重载均通过。Web 类型检查、生产构建和 `git diff --check` 通过；本次补丁未额外执行浏览器点击复验。
