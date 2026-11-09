# 给 Claude 的前端优化交接指令

- Audience: Claude 与项目所有者
- Status: Handover task brief
- Last reviewed version: 0.1.0
- Classification: Handover snapshot
- Related: [技术地图](technical-handover.md), [效果与验收](requirements-and-acceptance.md), [验证要求](validation-and-delivery.md)

下面是本次前端优化的完整启动说明。它不授权推送、部署或修改已有基线 tag。

## 任务

请接手 stugx.CASL 的前端可用性与视觉优化。先检查现有实现与交接文档，再提出小范围方案并执行获准范围内的前端调整。不要重建应用，不要用静态 demo 替换真实模拟器，不要继续增加业务功能。

网站：[stugx-casl.pages.dev](https://stugx-casl.pages.dev/)。仓库：[LMstugx/stugx-casl](https://github.com/LMstugx/stugx-casl)。本机 localhost 只用于开发，不能给老师当公开网址。

项目是独立、非官方、WCASL-compatible CASL II / COMET II 学习辅助工具。CASL Final Gate 为 PASS_WITH_LIMITATIONS。不要宣传官方、完全替代、专有项目格式完全兼容。

## 先确认基线

交接整理时，CASL 稳定基线是 tag `wcasl-replacement-final-gate-phase20g`，commit `37c223013386cfd7638d8dbc97b5a654db278db3`。当前本地快照是 `phase21a-x86-architecture-gate` / `c579c21b9d671c66cdb7d4fd2db9fefdeafbd534`，其中 x86 只有设计，尚未上线。

先输出 branch、HEAD、status、相关 ancestry，再确定前端工作基线。不要把 x86 设计提交直接当成公开 master。不要自动切换或清理存在用户修改的工作区。使用独立 frontend feature branch，禁止 force push、移动旧 tag、删除 Phase 19B、自动合并部署。

如果使用源码 ZIP，它没有 `.git`；请明确这一限制，不伪造 tag 或跳过依赖 Git 的检查后宣称全部 PASS。正式改代码优先正常 clone。

## 用户最想看到的效果

同一真实执行事件，Circuit 与数据同时可见：例如左侧/上方 Memory→GR2 的真实路径，右侧/下方 GR2 的 previous/current；ST 显示同一 Memory 地址的写入变化。Reverse 后两边与 Trace/Mapping 一起恢复。

保持 Persistent Circuit + Auxiliary Observation，而不是回到互斥整页模式。CASL/COMET execution mode 与 Registers/Memory/Stack/Code/Trace 等 observation tab 必须分离。1440/1920 双栏，1180/1280 安全上下布局；Circuit 不能小到不可读。

优化重点：信息层级、间距、对齐、密度、滚动、控件分组、变化标记、键盘操作、三语言标签。保留 Show Both / Focus Circuit / Focus Data 和 Follow Execution。不要添加营销首页或挤占工作区的装饰。

## 不允许改变

- parser/assembler/lowering、opcode、VM semantics、macro expansion、C++/double 语义。
- COMET FR 的 OF/SF/ZF 三位契约；不能加 CF 或 FPU。
- Instruction/Microcycle Step 与 Reverse 的 transaction、ownership、epoch、barrier、capacity。
- source Dirty、New/Open/Save/Save As、module lifecycle、diagnostic identity、既有 persistence contract。
- 同一 Core/DTO 的 Web/WASM/Tauri parity；不能新建 UI 侧 runtime 或从 source 计算“当前值”。
- clean-wire：不恢复 arrows/circles/ghost inactive wires；不加假的执行路径或动画。
- 不实现 x86、double arithmetic、Redo、Reverse Run、Reverse Macro、项目持久化、云功能或新 native 能力。

不得新增 network/telemetry/storage key，不能因为 locale/tab/layout 切换而 Assemble/Run/Reset/Link。不要以删测试、禁用门禁或放宽安全检查换取绿灯。

## 阅读顺序与文件入口

先读交接目录的 requirements、technical-handover、validation；再读现有 observation linking、reverse、document/persistence contracts。

优先检查 `src/styles/tokens.css`、`src/styles/app.css`、`src/components/CircuitFocusLayout.tsx`、`CaslCompatibilityMode.tsx`、`PersistentCircuitPane.tsx` 与 `src/visual/CometCircuitSvg.tsx`。注意 `App.tsx` 同时管理文件和项目生命周期，不是可随意整体替换的布局文件。

## 工作与交付

1. 先给出当前 UI 问题及代码依据，标明改动范围、风险与不动的契约。
2. 以小步、可审查修改实现，不整体换框架、不大规模改 state/core。
3. 三语言一起验证，技术值不翻译；使用现有图标与 design tokens。
4. 跑相关单测、E2E、真实 WASM、响应式 screenshot 和交付前完整门禁，见验证文档。
5. 特别处理历史 phase freeze tests 与“任何 UI 修改”冲突的问题：先报告原因，设计保留语义保护的可审查更新，不删除测试或乱改 baseline。
6. 报告修改文件、前后差异、每项验收结果、实际运行命令、失败/未运行项和已知限制。
7. 截图与构建产物只放 ignored artifacts；不提交 dist、target、coverage、安装包、凭据或本机绝对路径。
8. 完成后先交审查，不自动 push/merge/deploy，不更新正式 release entry 或 tag。

成功标准是原有教学流程更清楚、更稳定，而不是页面看起来不同。
