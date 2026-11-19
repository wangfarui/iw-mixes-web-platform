# 胖猫云工作台构建 Skill 统一入口验收

日期 2026-11-19。覆盖 Web 入口及生产共享 Skills 首发。

| 验收项 | 环境 | 结果 |
| --- | --- | --- |
| AC-01 Agent 授权入口 | 本地 Web、模拟会话和接口 | 通过。下载区已移除，生成令牌和 Skills 授权设备入口可见。点击 Skill 链接后用 `pangmaoyun-workbench-build` 搜索。 |
| AC-02 Skills 目录与详情 | 本地 Web、模拟接口 | 通过。列表和卡片进入同一详情，返回后保留搜索条件，普通搜索及清空正常。详情可获取 ZIP 和带版本、SHA-256 的安装提示，并返回 Agent 授权。其他 Skill 详情无构建授权提示。 |
| AC-03 原包兼容 | 本地 `v1.0.0` ZIP | 通过。现有后端 `SkillPackage.inspect` 接受原包，包内清单及 SHA-256 核验通过，入口脚本可执行，包内 26 项测试通过。 |
| AC-04 共享目录发布 | 生产 Dev Hub | 通过。同名条目为空，使用已授权会话完成预览并发布 `1.0.0`。目录检索唯一命中，版本详情和客户端下载的 ZIP 均与原包 SHA-256 一致。 |

- `npm run type-check`、`npm run build`、`npm run test:zhaogang-agent-skill-package` 通过。
- 生产条目 [胖猫云工作台构建](https://web.itwray.com/zhaogang/skills/303c61b0-5edc-4c1d-8598-689f2f9d4395)。首发使用现有共享 Skills 流程。
- 原包 SHA-256 `4f10aedaafd7ec3128b54fd82992fad53ddd120f5ce12369393d4f8ecaade67b`。
- Web 入口改动待部署。验收未生成构建令牌、执行真实 CLI 安装或触发构建。
