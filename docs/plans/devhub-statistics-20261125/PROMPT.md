# 新会话实施提示词

复制下面代码块发送到新会话：

```text
使用 $iw-feature-handoff，开始实施 Dev Hub「全员统计」并自行验证。

工作区：/Users/wangfarui/workspaces/wfr/iw-mixes_ai
主交接文档：/Users/wangfarui/workspaces/wfr/iw-mixes_ai/iw-mixes-web-platform/docs/plans/devhub-statistics-20261125/README.md
完整读取 README.md、QUERY_DESIGN.md、STORAGE_AND_REFRESH.md，并打开 assets/statistics-preview-v3.png。它们共同构成本次实施依据，BASELINE.json用于核查源码变化。

本次已确认：
1. 仅统计同一CODING团队下全部当前Dev Hub团队的成员并集，不受查看者加入团队的限制，不做个人/单团队切换或跨CODING选择。
2. 页面严格按第三版图实现“全员统计”、四张卡片、工时榜/代码榜和13列明细；提交行数=新增+删除，无活跃天数/所属团队列；异常悬停解释；保留已删除文案的简洁效果。
3. 采用现有镜像→后台成员每日汇总→常用范围预生成报表→单接口读快照。60秒是刷新窗口，不是结果存活TTL；过期先读仍适用旧结果，合并后台刷新；首次快速返回准备中；自定义从日汇总构建。禁止首次/过期/刷新/Redis故障时把原始表全量聚合放回HTTP请求。
4. 重用原工时日历/请假/加班、代码作者归属及仓库排除规则，跨团队去重；均值、样本资格、并列、较上期与过滤口径按方案执行。普通技术选择自主完成，不重问已确认设计。

先读当前联合工作区及Web/后端AGENTS.md、Dev Hub入口，分别核查Git状态，并运行handoff_check.py check对照BASELINE.json。兼容变化直接吸收；只在实质冲突时询问，不reset、不覆盖已有修改。仅修改Web和iw-external相关能力，小程序不涉及。

按依赖完成派生表DDL/迁移、持久刷新任务与幂等/租约/补偿、全局日汇总、原子快照发布、报表接口、Web菜单/路由/API/types/页面和必要文档。凭证撤销、成员排除、身份/工时删除等强失效必须阻止旧快照继续返回。更新失败保留仍合法旧报表，不能发布半成品。

允许本地开发、编译/行为测试、受控浏览器自验，以及在已核实的隔离本地MySQL测试库创建/清理本功能带唯一标识的夹具；确需用现有本地库时只维护本功能派生统计表，不改真实成员、角色、工时或其他业务记录，不调用CODING写接口制造测试数据。产出迁移脚本；生产执行、Git提交/推送和发布均未授权。

Maven固定使用/usr/local/maven/apache-maven-3.8.6/bin/mvn及-Dmaven.repo.local=/usr/local/maven/repository，先检查环境与.mvn冲突，用显式-s避开用户级settings；使用Java17。后端启停只能用iw-mixes-server/scripts/local-backend.sh，先读帮助/状态并确认实际运行本次代码。

完成方案AC-01至AC-23的适用验证：后端关键公式/去重/真实MySQL事务与任务恢复/权限、Web type-check与build、实际浏览器操作，特别验证首次准备中、超过60秒并发、刷新失败、重启/Redis丢失、自定义长区间及强失效。记录真实规模/耗时/SQL与运行版本，不以mock或静态图代替真实链路。自行修复范围内问题并复验。

证据保存到iw-mixes-web-platform/docs/acceptance/devhub-statistics-<日期>-<runId>/，逐项记录通过/失败/未执行/受阻及原因，最后说明修改、实际验证、性能数据、迁移执行情况、测试数据清理/残留和限制。缺少真实DevHub登录态时完成其他可执行验证并明确缺口，不能伪造会话或数据。不要停在计划或只完成代码；持续推进到可执行自验完成。
```
