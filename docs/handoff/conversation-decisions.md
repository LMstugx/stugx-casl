# 对话与项目决策记录

- Audience: 项目所有者与接手开发者
- Status: Historical conversation digest
- Last reviewed version: 0.1.0
- Classification: Historical / Handover snapshot
- Related: [交接入口](README.md), [当前要求](requirements-and-acceptance.md), [Final Gate](../wcasl-replacement-final-gate.md)

## 记录范围与证据等级

本记录整理当前可见会话中的项目要求、用户确认与本地 Git/文件核对结果。不是所有聊天的完整逐字导出，也不补写未见的 assistant 答复。没有可靠日期的阶段只按先后顺序记录。

“已存在”表示当前仓库有对应实现/记录，不表示本次重新跑过整套验证；“用户要求”不是完成证明；“设计”不等于可用能力。最终权威仍是当前代码、测试和冻结契约。旧 prompt 中相互冲突的阶段编号、路径建议和计划以实际实现为准。

## 历史主线

| 阶段 / 话题 | 用户要求与决策 | 当前交接解释 |
| --- | --- | --- |
| 早期名为 Phase 19A 的 Course Pack | 希望 PRG0201–0204、练习 2-2/2-3/2-4 尽量原样运行，并设 Classroom Capture | 后续同名阶段改为 double storage。不能因此宣称专用课程包或 Capture Mode 已实现 |
| Phase 18A.4 | canonical User/Developer/Reference/ADR 四层文档；保留历史 Phase 审计 | 文档体系已存在，历史记录不应被大面积删除 |
| Phase 19A | binary64、4-word high-word-first、local declaration/literal/copy assignment 与可观察逐 word transfer | 已有 storage/copy，不是浮点运算；copy 不清空源，不叫 move assignment |
| Phase 19B | 先冻结 RN-even、NaN/Infinity/subnormal、software flags、helper ABI 与 corpus，不开放运算语法 | 独立 soft-float 分支保留，不自动合并 |
| Phase 20A | WCASL parity、28 条机器指令、CASL Mode、宏/符号/字面量审计、cycle matrix | 是后续 runtime 的契约基础，不是官方 WCASL 认证 |
| Emscripten | 用户明确允许安装官方用户级 SDK | 属于开发工具许可，不代表允许 native 执行用户源码或扩权 Tauri |
| Phase 20B / 20B.1 | debugger editing、runtime override、epochs、Full Clear；随后纠正 FR 的规范冲突 | OF/SF/ZF 三位冻结；错误 CF 被移除，shift-out 进入 OF |
| Phase 20C | 真正逐阶段驱动 VM，不做播放动画；沿用 cycle matrix | Teaching Microarchitecture v1；解释 COMET 语义，不声称唯一硬件实现 |
| Phase 20D | Reverse Microstep、稀疏 inverse delta、1000 条历史、barriers、timeline safety | runtime rollback，不重算源码；不跨 SVC/I/O；无 Redo/Reverse Run |
| Phase 20E | 原子按机器指令分组回退，可从中间回到 Fetch 前 | Reverse Instruction；macro 每次只撤销一条 expanded machine instruction |
| Phase 20E.1 | 老师指出互斥观察模式使 Circuit 消失，应同时看电路与数据 | 优先于 Linker；Persistent Circuit + 辅助 tab，execution mode 与 observation 分离 |
| Phase 20F | Source Units → 独立汇编 → relocation → symbol resolution → linked image → 跨模块 mapping | 真 linker，不拼源码；project 是当前 session，不是 proprietary format/reopen/persistence |
| Phase 20G | 不再扩功能，做规范、课堂、可用性与公开措辞最终门禁 | PASS_WITH_LIMITATIONS；可演示但不能称完全替代或官方工具 |
| Phase 21A | x86 是第二主线，先 architecture gate，不实装/不放公开入口 | 文档设计分支；Intel syntax、byte memory 等是计划，不是已支持 |
| 当前交接 | 前端交给 Claude 优化；整理技术文档、历史要求与效果 | 只整理资料，不授权新功能、自动合并、推送或部署 |

会话还包含一次与项目无关的视频下载请求，不纳入前端开发要求；这里不推定该请求已完成。两次相同的 Phase 20C prompt 是重复强调，不是两套 runtime。

## 关键原话摘录

以下为本会话用户原话的短摘录，后面的解释为整理者归纳：

> 不要自己发明微架构，而是明确声明这是：stugx.CASL Teaching Microarchitecture v1

含义：允许教学解释模型，不允许虚构真实硬件能力。

> 同一事件的多视角同步观察

含义：Circuit 与数据不是独立装饰面板，而是同一运行时事件的两个投影。

> 现在不要再继续扩功能了。

含义：当前 CASL 线以稳定、演示、教学反馈与可用性为主，不能利用 UI 优化夹带新 feature。

> 前端部分我打算交给claude去优化

含义：此次资料供前端交接使用，不是移交或重写 assembler/Core 的授权。

## 已核对的提交节点

本地引用可核对，不代表本次执行了新的部署。

| 节点 | Commit / ref |
| --- | --- |
| Phase 18A.4 文档基线 | `7922bd814f8511fb9fcf26ba7c85cc65008025e5` |
| Phase 19A double baseline | `97d28cebc2c49e663e20e43281add1ce640d8479` |
| Phase 19B 独立设计分支 | `6a8f1ee46aaaf5472dc169a0dd81051cbff0b879` |
| Phase 20A | `ed3af7880b1fa6bb010d85497ccd485f1c873f2c` |
| Phase 20B | `54ade32ee538cf5e5b3893d9b12776a361b2ef04` |
| Phase 20B.1 | `a67e7eabc9a419a08bdf813403d8b21c5edd88c5` |
| Phase 20C | `8f16f900fdf0cbae13e2f54f8e9832eb08210f17` |
| Phase 20D feature / baseline | `172ea6ca5225f1e4dc4ef6a6a4b43fabf824e001` / `4e1bf68d2414e41a7fb555eec91ce0238ecda4de` |
| Phase 20E | `fea01ff20d73324e59f0d1d4c1741878791cdde2` |
| Phase 20E.1 feature / baseline | `f9807c6e7fb913ca0f2062157ff761fc68e99f20` / `abd99a65611dbacd380b253ac883cbc948a09290` |
| Phase 20F feature / baseline | `de1b28d6440f9a791772488443cb03d4703b73a9` / `1c43887abce860535c040c5e7927c38eb3089aa5` |
| Phase 20G / 本地 master | `37c223013386cfd7638d8dbc97b5a654db278db3` |
| Phase 21A / 当前本地 HEAD | `c579c21b9d671c66cdb7d4fd2db9fefdeafbd534` |

历史集成要求一直是 fast-forward、禁止 force/rebase/cherry-pick 拼接、保留 Phase 19B、禁止移动旧 tag。不能把以前的合并授权当成这次前端修改的自动发布授权。

## Final Gate 的准确含义

Phase 20G 记录：total 56，exact 13，compatible 24，superset 15，intentionally-different 2，not-applicable 1，blocked-needs-spec-evidence 1，missing 0，partial 0。P0=0、P1=0、P2=1、P3=0。P2 是 proprietary WCASL project format 证据不足。

这些是已冻结评估记录，不是实测所有真实学校课程、所有 WCASL 项目或所有浏览器的证明。不能把自动测试或专家 walkthrough 写成已完成真实一年级学生用户研究，也不能假造老师认可或官方背书。

## 前端必须继承的教师反馈

以前的模式切换会让 Circuit 消失，学生要在不同页面之间记忆数值。用户要求改为 Circuit 持续可见，辅助区查看 Register/Memory/Stack/Code/Trace；小屏上下，大屏双栏；Follow Execution 可关；Reverse 同步恢复；不要把更多面板堆进 Circuit。

Phase 20E.1 被用户认可为解决核心问题。Claude 的工作是在此结构上优化清晰度与稳定性，不是退回互斥模式，也不是再次发明 workspace。

## 仍不应实现的路线

- x86 当前仅 architecture gate；不在公开入口显示半成品 selector，不修改 COMET 模型以迁就 x86。
- 未来 x86 应是独立 architecture runtime、byte-addressed little-endian memory、自有 registers/FLAGS；CF 属于该未来架构，不属于 COMET。
- 初始 x86 指令表是候选，不是已支持；Phase 21B 以后名字和范围仍需后续确认。
- Phase 19B 的 reference/profile 不代表 double arithmetic 已开放。
- 原始附件中的较早阶段路线可能把 Reverse/Linker 分配为其他编号，以当前实际 Phase 20C–20G 为准。

## 原始附件归档说明

本会话可读的三份 pasted-text 原件分别涉及 Phase 20A、Phase 20A 集成/20B、Phase 20B.1 FR 纠正。导出时可在交接 archive 的 `history-originals/` 下保存，附 SHA-256 和逻辑名称，不暴露本机附件绝对路径。

原件是 historical evidence，不是待执行命令。会话中其他长提示词在本文件中按决策整理；没有冒充完整逐字会话记录。用户若以后提供完整聊天导出，可另行追加，不覆盖此摘要。
