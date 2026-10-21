# 工作台需求原型：实施与验证

日期：2026-10-21。状态：代码实施完成，自动检查和模拟页面验证通过；真实数据库迁移及真实绑定态联调未执行。交付方式：按本次授权创建本地提交，未推送。

## 行为和范围

- Web + 后端 `iw-external`；小程序无改动。仅 `REQUIREMENT` 事项维护 `prototypeUrl`，可空、最多 255 个字符，只接受完整 HTTP/HTTPS 链接。
- 编辑表单位于描述上方；字段省略时保留，空字符串清空。快捷输入通过独立本地接口保存，成功后跳转，失败保留草稿；浏览器拦截弹出页时提供手动链接。
- 按迭代事项保存，不写 CODING。实体通用更新不包含原型字段，CODING 回拉不能覆盖它。
- 保留原有迭代成员权限。菜单仅对需求显示，沿用原有 `canEdit` 操作区权限。

## 主要改动文件

Web：`src/views/zhaogang/iteration/components/IterationIssueEditorDialog.vue`、新增 `IterationPrototypeLinkDialog.vue` 和 `iterationPrototypeLink.ts`、`ZhaogangIterationDetailView.vue`、`src/api/zhaogangIteration.ts`、`src/types/zhaogangIteration.ts` 及迭代专项脚本。

后端：`ZhaogangIterationController.java`、`iteration/TeamIterationModels.java`、`TeamIterationModule.java`、`DefaultTeamIterationModule.java`、`TeamIterationRepository.java`、`MybatisTeamIterationRepository.java`、`entity/TeamIterationEntities.java`、初始化及增量 SQL、迭代模块测试和新增 `IterationPrototypePersistenceTest.java`。

辅助资料：联合工作区 `context` 下产品规则、技术参考、运行与验证三个文档同步更新。原有记账、字典等未提交修改保留原状。

## 实际验证

| 编号 | 场景 | 结果与证据边界 |
| --- | --- | --- |
| AC-01 | 后端编译及目标回归 | 72 项通过，`BUILD SUCCESS`；含原有迭代测试与本次字段、权限、校验测试。见 [日志](backend-test-summary.txt) |
| AC-02 | 前后端长度与格式 | 255 接受、256 拒绝；空值、非 HTTP(S)、缺失域名、空格、畸形转义、无效端口均覆盖；清空允许，快捷输入不能为空 |
| AC-03 | 数据归属及更新 SQL | 快捷保存不调用 CODING；读取正常或失败都返回本地原型。实际 MyBatis 生成的 `updateById` SQL 不含 `prototype_url`；编辑清空使用显式带迭代与事项条件的更新。无真实数据库连接 |
| AC-04 | 编辑页面 | 实际 Vue 页面 + 模拟 API：字段在描述上方、非法链接禁用保存、有效值保存及回显、清空保存均通过。见 [截图](screenshots/editor.png) |
| AC-05 | 快捷输入 | 实际 Vue 页面 + 模拟 API：无链接时弹窗，保存失败保留草稿且不持久化；重试成功，仅提交原型字段。见 [截图](screenshots/quick-input.png)、[请求记录](mock-ui-evidence.json) |
| AC-06 | 跳转及菜单范围 | 本地目标服务器收到快捷保存后的 `/quick` 请求和已有链接的 `/existing` 请求；任务行菜单只有原有操作，无需求原型入口。页面来自 IAB，约 531px 宽 |
| AC-07 | Web 专项、类型、构建 | `npm run test:zhaogang-iteration`、`npm run type-check`、`npm run build` 通过；构建仍有既有大分包提示 |
| AC-08 | 真实数据库及 CODING 绑定态 | 未执行；未迁移或重启真实服务，未修改真实事项。上述模拟及 SQL 生成检查不能替代此项 |
| AC-09 | 弹出页被拦截的手动链接 | 已实现，未在浏览器人工拦截状态下操作验证 |

Maven 使用 Java 17、`/usr/local/maven/apache-maven-3.8.6/bin/mvn`、显式 `-Dmaven.repo.local=/usr/local/maven/repository` 与临时最小 `-s` settings，未依赖用户 `~/.m2/settings.xml`；环境及项目 `.mvn` 未发现冲突仓库设置。

```bash
/usr/local/maven/apache-maven-3.8.6/bin/mvn -s /tmp/iw-prototype-maven-settings.xml \
  -Dmaven.repo.local=/usr/local/maven/repository \
  -pl iw-packaging-parent/iw-external -am \
  -Dtest=DefaultTeamIterationModuleTest,IterationPrototypePersistenceTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

## 部署前迁移

脚本：[iw-external-migrate-20261021-requirement-prototype.sql](../../../../iw-mixes-server/iw-packaging-parent/iw-external/scripts/iw-external-migrate-20261021-requirement-prototype.sql)。本次仅提供脚本，尚未执行。

1. 在明确的目标环境确认表存在、`prototype_url` 尚不存在，按环境约定备份表结构。
2. 新版后端启动前执行脚本一次；该脚本不声明重复执行幂等。若字段已存在，停止并核对其定义，勿继续重复 ALTER。
3. 使用 `SHOW COLUMNS FROM external_zhaogang_iteration_issue LIKE 'prototype_url';` 确认类型为 `varchar(255)` 且允许 NULL，再部署对应后端与 Web。
4. 若需回退应用，可保留新增可空列；不要直接删除已保存原型链接。

所有浏览器数据来自本次隔离模拟服务，无真实业务测试数据残留。本次临时 5179/5180 模拟服务及验证页面已关闭。截图与请求记录仅含合成事项和本地测试链接。
