# Dev Hub 工时日期联动与利用率验收

日期：2026-11-20（北京时间）。状态：实施完成；本地自动化与隔离浏览器验收通过，真实 CODING 联调未执行。

用户在本会话确认：个人和团队全部图表及统计共用工时记录日期，取消月份翻页；进入或切换个人模式默认本月，团队模式默认本周；排行榜及缺勤仅统计所选范围内截至昨天的日期；成员选择仅影响趋势、顶部汇总及明细。随后确认新增工时利用率作为排行榜默认维度，分母扣除个人请假，按两位小数判断并列，零工作日不排名。

## 实施范围

- Web `dev`，基线 `cb2d7cf`；后端 `main`，基线 `062b3df`。进入实施时两仓库均无未提交改动，验收阶段本次改动尚未提交。
- [页面编排](../../../src/views/zhaogang/components/worklog/WorklogDashboard.vue)：统一日期、模式默认范围、成员选择、加载/失败/超限状态及迟到响应隔离。
- [趋势图](../../../src/views/zhaogang/components/worklog/WorklogTrendChart.vue)、[排行榜](../../../src/views/zhaogang/components/worklog/WorklogRanking.vue)、[缺勤弹窗](../../../src/views/zhaogang/components/worklog/WorklogAbsenceDialog.vue)：使用实际日期范围，移除图表上方的独立日期行及对应留白，同一年月横轴仅显示日、跨年月显示月日，排行榜及缺勤显示有效统计区间，无有效日期时明确提示。
- [API 封装](../../../src/api/zhaogang.ts)、[类型](../../../src/types/zhaogang.ts)：新增日期范围报表。
- [后端报表入口](../../../../iw-mixes-server/iw-packaging-parent/iw-external/src/main/java/com/itwray/iw/external/zhaogang/worklog/DefaultWorklogModule.java)、[聚合](../../../../iw-mixes-server/iw-packaging-parent/iw-external/src/main/java/com/itwray/iw/external/zhaogang/worklog/WorklogQueryService.java)：跨月合并日历、请假，以一次完整成员取数生成图表/排行榜/缺勤，沿用凭证隔离、部分失败、登记日归属、删除过滤与后台查验。
- Controller、WorklogModule、WorklogModels、WorklogViewCache 同步接入新报表；原月度接口保持兼容。`Summary` 新增 `workdayCount` 和可空 `utilizationRate`，利用率直接使用未取整总工时计算，缓存前缀升为 v8，避免旧快照缺少新字段。Web 默认维度切换为 `UTILIZATION_RATE`，保留原有三个维度；新旧报表契约需要同时部署。
- 联合工作区的 [产品规则](../../../../context/devhub-product-knowledge.md)、[技术参考](../../../../context/devhub-technical-reference.md) 已同步。

新增 `GET /external-service/api/zhaogang/worklogs/report?from=&to=&scope=&workbenchTeamId=&refresh=`。起止日均计入，最多 31 天；响应 `{from,toExclusive,rankingToExclusive,statistics,ranking,absences}`。图表覆盖完整所选范围，排行和缺勤截止边界为 `max(from,min(toExclusive,today))`。三份结果共享取数和缓存，键隔离完整起止日、当天、所有覆盖月份的日历版本、成员、凭证、请假和删除版本。

## 验证结果

| 编号 | 验证内容 | 结果 |
| --- | --- | --- |
| BE-01 | 工时相关测试及 Controller，共 69 项，含新增日期报表及 MockMvc 路由测试 | 通过，0 失败/错误/跳过 |
| BE-02 | 跨月日历、跨月请假、缓存复用与任一月份日历版本变化、强制刷新 | 通过 |
| BE-03 | 完整图表包含当天，排行榜总工时/加班工时/加班天数及缺勤排除当天和未来 | 通过 |
| BE-04 | 历史完整区间、仅当天/未来、成员凭证缺失、31 天及非法边界 | 通过 |
| BE-05 | 利用率按`实际登记工时 ÷（工作天数 × 8）× 100`，扣除请假、识别调休、包含休息日登记工时；最终 HALF_UP 两位、允许超过 100%、区分零工时与零工作日 | 通过 |
| WEB-01 | `npm run type-check` | 通过 |
| WEB-02 | `npm run build`（含既有 prebuild 检查） | 通过；保留既有大包体积提示 |
| AC-01 | 个人默认本月、无月份翻页及顶部独立日期行、单月横轴仅显示日、完整范围汇总不随已加载 10 条明细缩小 | 通过 |
| AC-02 | 团队默认本周 | 通过 |
| AC-03 | 排行与缺勤展示截至昨天的共同有效区间，人数后问号悬停展示口径说明、移除独立说明行 | 通过 |
| AC-04 | 成员筛选联动趋势/明细，排行榜保持全团队 | 通过 |
| AC-05 | 上周快捷范围与跨月自定义范围，图表横轴逐日准确 | 通过 |
| AC-06 | 仅当天及未来时排行/缺勤无有效统计日期 | 通过 |
| AC-07 | 超过 31 天停止图表及明细请求，并标明上次成功范围 | 通过 |
| AC-08 | 切换个人/团队重置默认范围，迟到报表响应不能覆盖当前模式 | 通过 |
| AC-09 | 报表失败后手动刷新恢复，历史单月也仅显示日 | 通过 |
| AC-10 | 1440px 桌面、390px 窄屏、无页面横向溢出、无 JS 运行错误 | 通过 |
| UR-01 | 默认利用率，冠军及成员列表固定两位小数和百分号 | 通过 |
| UR-02 | 利用率、总工时、加班工时、加班天数四个维度可切换 | 通过 |
| UR-03 | 相同两位百分比并列第一 | 通过 |
| UR-04 | 超过 100% 正常展示；零工时显示 0.00%，零工作日显示 —、无排名，包括所有成员都无工作日的情况 | 通过 |

后端使用 Java 17、Maven 3.8.6、显式临时最小 settings 与 `/usr/local/maven/repository`：

```sh
/usr/local/maven/apache-maven-3.8.6/bin/mvn \
  -s /tmp/devhub-maven-settings.xml -Dmaven.repo.local=/usr/local/maven/repository \
  -pl iw-packaging-parent/iw-external -am \
  '-Dtest=*Worklog*Test,ZhaogangControllerTest' -Dsurefire.failIfNoSpecifiedTests=false test
```

浏览器运行实际开发页面 `http://127.0.0.1:5198/zhaogang/worklogs`，固定北京时间为 2026-11-20，全部 Dev Hub API 由 [browser-check.mjs](./browser-check.mjs) 拦截为合成响应；实际点击模式、日期、成员、排行及缺勤控件。浏览器为复用 Chrome 的独立无痕上下文，完成后关闭该上下文，不更改既有登录态。

脚本要求 Node.js 20+ 与 Playwright；默认自行启动 Chromium，可通过 `PLAYWRIGHT_MODULE`/`CHROMIUM_PATH` 指定已安装位置，或通过 `WORKLOG_CDP_URL` 复用现有浏览器并新建隔离上下文，`WORKLOG_BASE_URL` 可替换本地服务地址。

[浏览器输出](./browser-result.txt)；截图已打开检查：[个人日期范围](./personal-range.png)、[团队排行榜](./team-ranking.png)、[窄屏排行榜](./narrow-ranking.png)。

## 验证边界与交付状态

- 后端取数与聚合使用模拟 CODING；Controller 使用 MockMvc；缓存测试使用模拟 Redis 的字符串存储及真实 Jackson 序列化。共 10 组日期回归及 4 组利用率场景；浏览器验证与后端测试独立，不能视为真实 CODING 端到端通过。
- 未启动或重启后端，未连接真实 PAT，未执行数据库迁移或业务数据写入；无测试业务数据残留。
- 验收阶段未提交、推送或发布；后续按用户明确授权交付。上线时需同时交付后端新增接口与 Web；生产及真实 CODING 联调未执行。

## v2.1.0 版本整理

- 当前版本：`2.1.0`，新身份 `zg-2026-11-20-01`，清单中的预计发布时间为北京时间 `2026-11-20T15:05:45+08:00`，尚未实际部署。
- 清单仅追加本会话已完成的日期联动及工时利用率两项用户可见变化，历史 50 条记录保留；全局 package.json 版本号未调整。
- 本次版本整理已通过 `npm run test:zhaogang-release-notes`、`npm run check:zhaogang-release-notes`、`npm run type-check`、`npm run build`。
- 浏览器以匿名真实入口打开 `/zhaogang`，确认 390×844 无横向溢出、无 JS 运行错误，实际静态清单提供 `2.1.0 / zg-2026-11-20-01`；[公开入口截图](./v210-public-entry.png) 已打开检查。
- 已完成契约/静态验证，未完成真实绑定态验收：本地后端处于停止状态，当前版本标签、未读红点、打开即已读、刷新持久化和已读接口失败等真实绑定场景未执行，未模拟已读接口响应。
- 本次版本元数据调整没有再修改后端，沿用本会话已通过的 69 项后端测试及 14 组隔离浏览器功能场景；没有重复运行未变化的后端测试。
- 交付时应同时部署 Web 及本会话的 iw-external 日期报表和利用率字段，当前迭代无新增数据库迁移；版本整理阶段未提交、推送、触发构建或发布生产。
