# stugx.CASL 前端交接包

- Audience: 项目所有者、Claude 与后续前端维护者
- Status: Handover snapshot，不替代现有 canonical contracts
- Last reviewed version: 0.1.0
- Classification: Handover snapshot
- Related: [技术交接](technical-handover.md), [需求与验收](requirements-and-acceptance.md), [项目文档](../README.md)

整理日期：2026-10-28（Asia/Tokyo）。本次任务是资料整理与前端交接，不是新功能开发、合并或部署。

## 地址

- 给老师和 Claude 查看：[公开网站](https://stugx-casl.pages.dev/)。
- 源码：[LMstugx/stugx-casl](https://github.com/LMstugx/stugx-casl)。
- `127.0.0.1` 仅为开发者本机地址，不能作为老师演示链接。

## 从哪里开始

| 文档 | 用途 |
| --- | --- |
| [Claude 开始指令](claude-start-here.md) | 可以直接交给 Claude 的任务边界与工作顺序 |
| [技术交接](technical-handover.md) | 架构、真实文件入口、数据流、禁止修改的契约 |
| [需求与验收](requirements-and-acceptance.md) | 用户期望、课堂场景、响应式与三语言验收 |
| [对话与决策记录](conversation-decisions.md) | 历史要求、决策演变、被替代的路线、仍未实现的内容 |
| [验证与交付](validation-and-delivery.md) | 本地运行、测试、已知验证陷阱、提交与发布边界 |

推荐先读开始指令和需求，再根据技术交接逐项进入源码。不要从历史 Phase 提示词直接重建应用。

## 当前基线，必须区分

以下是本次读取本地 Git 得到的快照，不等同于重新验证当前远端部署：

| 对象 | 状态 |
| --- | --- |
| 本地工作分支 | `phase21a-x86-architecture-gate` |
| 本地 HEAD | `c579c21b9d671c66cdb7d4fd2db9fefdeafbd534` |
| 本地 master / 缓存 origin/master | `37c223013386cfd7638d8dbc97b5a654db278db3` |
| CASL Final Gate tag | `wcasl-replacement-final-gate-phase20g`，指向 `37c223013386cfd7638d8dbc97b5a654db278db3` |
| Phase 19B 独立分支 | `phase19b-soft-float-semantics`，`6a8f1ee46aaaf5472dc169a0dd81051cbff0b879` |
| 应用版本 | `0.1.0` |
| 整理开始前工作树 | clean |

Phase 21A 是 x86 设计门禁，不是可用 x86 模式；不能把设计稿当成已上线能力。Phase 19B 仍为独立软件浮点设计分支，不自动合并。后续真正开发时先重新核对 Git 和远端状态。

## 交接范围

保留现有目录，不搬动源码，不删除历史 Phase 文档。新增交接索引解释哪些文件需要读、哪些只能作为审计证据。导出的源码包来自上述 HEAD，另叠加本次交接文档，不包含 `.git`、依赖安装目录、构建产物、安装包或账户凭据。

源码 ZIP 用于交接和审阅；其中没有 Git 历史，不能据此宣称依赖 Git tags 的全部测试通过。正式改代码优先使用正常 Git clone，并在明确的基线上开独立前端分支。尚未推送的本地设计提交不保证可以从 GitHub 拉取。

对话记录是本会话可见项目要求及可读附件的整理，不是整个账户所有聊天的逐字导出；没有补写不存在的答复、审查或教师反馈。旧提示词是历史材料，不能覆盖当前需求。

## 产品定位

独立、非官方、WCASL-compatible 的 CASL II / COMET II 浏览器学习辅助工具。Final Gate 为 **PASS_WITH_LIMITATIONS**，不是 WCASL 完全替代、官方认证或专有项目格式兼容声明。

当前交接目标只有一个：让已有、真实的执行与观察能力更清楚、更易用。不要借前端优化扩展 x86、浮点运算、Redo、Reverse Run、项目持久化或新运行时。
