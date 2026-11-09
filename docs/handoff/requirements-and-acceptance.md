# 用户要求、目标效果与验收清单

- Audience: Claude、设计与前端开发、项目所有者
- Status: Handover snapshot
- Last reviewed version: 0.1.0
- Classification: Handover snapshot
- Related: [技术交接](technical-handover.md), [决策记录](conversation-decisions.md), [老师演示脚本](../demo/teacher-demo-script-ja.md)

## 最重要的目标

不是重新做一个漂亮的模拟器外壳，而是让学生看懂**同一真实事件的多个同步视角**。老师指出，原来查看 Registers、Memory、Machine Code 或 Trace 时 Circuit 消失，会切断数据路径与结果之间的联系。Phase 20E.1 已建立同时观察结构，前端优化必须保留并改善它。

核心示例：

- 执行 `LD`：Circuit 显示当前真实 Memory 到寄存器的数据路径；旁边 GR2 清楚显示 `0000 → 0061`。这是一项展示目标，具体数值取实际程序，不可硬编码。
- 执行 `ST`：Circuit 的 Memory write path 激活；对应 Memory row 显示例如 `0037 → 0061`。必须是同一地址、同一 DTO。
- Reverse 后：Circuit、寄存器、Memory、Trace 和映射一起恢复，不反向播放动画、不继续标记为 forward write。

## 优先级

| 优先级 | 目标 | 不可接受的结果 |
| --- | --- | --- |
| P0 | 不丢源码、不改执行语义、不中断 Reverse/barrier | 美化时重建 VM、丢 Dirty、取消 ownership 校验 |
| P0 | Circuit 与主要数据同时可读 | 切数据 tab 后电路消失，或只剩不可读缩略图 |
| P1 | 1180/1280 小屏、三语言、键盘可用 | 横向整页溢出、按钮被遮挡、多层 tiny scroll trap |
| P1 | 操作层级与状态清楚 | CASL/COMET 和 Registers/Trace 混在同一互斥模式里 |
| P2 | 字体、间距、视觉密度与一致性 | 装饰卡片挤占实际学习区域 |

## 布局与控制

1. 默认 Show Both。1440×900、1920×1080 使用可读双栏；1180×700、1280×720 优先上下布局，不能硬挤两栏。
2. Circuit 是主要教学视图，辅助数据一次显示一个主 tab。不要恢复旧式全屏铺满所有面板。
3. CASL/COMET 是 execution granularity；Registers/Memory/Stack/Code/Source Mapping/Trace/Console/Inspector 是 observation selection，两者独立。
4. Focus Circuit 可折叠数据但留恢复入口；Focus Data 保留同组件的 live compact Circuit，不能用静态截图或另建 mini-runtime。
5. workspace 局部控件放 workspace header；不把所有新按钮堆到全局 Toolbar。
6. 不引入大型 UI dependency 或必须拖动才能使用的分栏。若后续改 split，键盘、min/max 与 listener 清理必须完整。
7. 切换 tab/layout/locale 不 Assemble、不 Run、不 Reset、不清 Trace、不改 Dirty 或 Reverse availability。

## 数据联动

| 事件 | Circuit | 数据视图 |
| --- | --- | --- |
| Fetch / Decode | PR、Memory、IR、decoder 的真实 active path | 当前 machine word 与 source mapping |
| GR 写入 | 当前寄存器路径 | 相同 GR、previous/current、changed 标记 |
| Memory read/write | 当前 Memory/MAR/MDR 路径 | 同一地址，read/write/changed 区分 |
| PUSH/POP/CALL/RET | SP 与 Memory 的真实路径 | 相应 stack word、SP、调用上下文 |
| Flag update | ALU/result 到 FR | OF/SF/ZF，不出现 CF |
| debugger edit | 实际 mutation state | manual-edit，不伪装执行写入 |
| Reverse | 恢复后的真实阶段 | restored-by-reverse，并撤销相应 Trace |

值使用等宽与 tabular 数字，技术 symbol/register/address 不翻译。read、written、selected、active、manual-edit、restored 不能只依靠颜色。数据变化不可导致行高或按钮跳动。

Follow Execution 是临时 UI 状态，不持久化、不改 Dirty。启用时只在目标离开视窗后确保可见，不能每步抢焦点；关闭时允许浏览其他地址，但 Circuit 仍显示当前执行。locale 切换保持该选择。

## 视觉与交互方向

用户明确的是“课堂清楚、同步、可读、稳定”，不是某种指定配色或照抄 WCASL 外观。Claude 可以提案，但需保留技术工具的安静、紧凑风格。

- 优先改密度、对齐、字号层级、焦点、状态与滚动，不能做营销首页代替可用工作区。
- 沿用现有 design tokens 和 lucide 图标；图标按钮有名称与 tooltip。
- 不用厚重嵌套卡片占空间，不加背景装饰、假硬件、假数据流或花哨执行动画。
- clean-wire 保持：无 arrows、circular markers、ghost inactive wires；仅真实 active path。
- 长 binary、label、错误详情和日文安全换行；不能缩成难以阅读的小字。
- 状态/错误/disabled reason 可访问；Reverse 后焦点稳定，aria-live 不随每个 microcycle 刷屏。
- 浏览器缩放与窄屏下保留清楚的展开/恢复入口，不隐藏核心 Step/Stop。

## 验收场景

以下是优化后需要重跑的验收，不是本交接宣称已经完成的新测试。

| ID | 操作 | 通过条件 |
| --- | --- | --- |
| A01 | 打开默认程序，显式 Assemble/Step | 首次流程清楚；不安装 Java，不要求账号 |
| A02 | 分别切 Registers、Memory、Stack、Code、Trace | Circuit 始终 live、可读且不 remount runtime |
| A03 | CASL Step 一条 LD/ST | 真正整指令完成；路径、地址、值变化对应 |
| A04 | COMET 连续推进 Fetch/Decode/EA/Read/WriteBack/Flags/Complete | 每步显示真实当前阶段，不是动画计时器 |
| A05 | Reverse Microstep 与 Reverse Instruction | 两观察区、Trace、Machine/Source mapping 一起恢复 |
| A06 | mutation、Reload、Reset、Full Clear、SVC/IN/OUT 后尝试 reverse | 保留明确 barrier reason，不能跨越副作用 |
| A07 | Follow off 浏览远处地址，再 Step；随后 Follow on | 不强制滚动、不抢焦点；恢复跟随正确 |
| A08 | Show Both / Focus Circuit / Focus Data | runtime、Dirty、Trace、history 不变，随时可恢复 |
| A09 | 跨 module CALL/RET 及 Reverse | 显示正确模块，不能用当前 editor tab 猜 mapping |
| A10 | 修改、打开、另存、取消 Dirty guard | 单文件与多模块 ownership 不丢失，Save 不自动 Link |
| A11 | EN/JA/zh-CN × 1180/1280/1440/1920 | 无整页横向溢出、遮挡或难用滚动陷阱 |
| A12 | 键盘巡航、重复 Reverse、Run/Stop | accessible name/reason 清楚，焦点稳定，Stop 响应及时 |
| A13 | 100 microsteps、反复切 tab、resize | Circuit 不因 tab 重建；Memory 不渲染 65536 行；observer 不增长 |
| A14 | Mock、WASM、production、Tauri | 相同数据与行为，不以 Mock 结果代替真实 Core |

## 对外定位与限制

可说：独立・非公式の WCASL-compatible CASL II / COMET II 学習補助ツール。

不能说：官方工具、WCASL 完全代替、专有 WCASL project 格式完全兼容、完整 C++/IEEE 支持。

保留限制：无 proprietary project format、project persistence、Redo、Reverse Run、Reverse Macro、dynamic linker、double arithmetic；x86 尚未实装。只因 UI 好看，不能提高 Final Gate 的认证措辞。

## 5～8 分钟演示目标

公开网站 → 简单 CASL Assemble/Step → Circuit 与 Register/Memory 同时观察 → COMET 阶段 → 两种 Reverse → IN/OUT → 跨模块 CALL/RET → 请老师反馈。不要增加演示前临时大功能。详细日文与中文脚本沿用 [demo 目录](../demo)。
