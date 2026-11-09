# stugx.CASL v2 重构标准：单一 C++ 核心 + 工作台界面

- Audience: Claude（前端与设计）、Codex（C++ 核心与桥接）、项目所有者
- Status: Refactor standard, draft 1
- Last reviewed version: 1.0.0
- Classification: Refactor standard
- Related: [前端交接入口](../handoff/claude-start-here.md), [技术交接](../handoff/technical-handover.md), [验收清单](../handoff/requirements-and-acceptance.md), [Core Bridge Contract](../core-bridge-contract.md), [Microcycle Runtime Contract](../comet-microcycle-runtime-contract.md), [History Barrier Contract](../debugger-history-barrier-contract.md)

这份文档是 v2 重构的唯一标准。Claude 与 Codex 分别负责前端与后端，两边都以本文为准；本文与代码不一致时，先改本文再改代码。凡是本文没有写的接口、文件或行为，默认不做。

---

## 0. 一句话目标

**一套 C++ 核心（编成 WASM）同时服务 Web 与 Tauri；前端只做呈现与交互；界面换成“工作台版”（第二版）。** 不再有任何 TypeScript 实现的汇编器、链接器、虚拟机或微周期逻辑。

### 0.1 现状诊断（事实，截至 commit c579c21）

| 事实 | 位置 | 问题 |
| --- | --- | --- |
| C++ 核心已完整：解析、汇编、链接、VM、微周期、反向执行、历史屏障 | `cpp-core/` 约 6.5k 行 | 无问题，是权威实现 |
| TypeScript 里有一整套重复实现 | `src/core/mockCaslCore.ts` 2953 行、`src/linker/caslLinker.ts` 356 行、`src/core/microcycle.ts`、`reverseMicrocycle.ts`、`reverseInstruction.ts`、`instructionEncoding.ts` | 两个轮子；`src` 下共 54 个文件引用 mock，其中 38 个是 `src/tests` 里的测试 |
| 开发与测试默认用 mock，生产才用 WASM | `vite.config.ts` 第 57 行；`scripts/build-production.ps1`、`build-cloudflare-pages.sh`、`build-tauri-frontend.ps1` 强制 `VITE_CORE_BACKEND=wasm` | 开发时看到的不是真核心；测试绿灯不等于核心正确 |
| 每次 step 返回全量 JSON：寄存器 + 最多 256 行 memoryWindow + 全部 sourceRows + 诊断，带换行缩进 | `cpp-core/wasm/wasm_bridge.cpp` `dumpStateJson` | 一步几 KB 到几十 KB；sourceRows 每步重发但从不变化 |
| JSON 用 `ostringstream` 手写拼接 | 同上，约 900 行 | 转义分散、容易漏字段、难维护 |
| 前端有 650 行把 DTO 再推导成 UI 状态 | `src/core/coreStateAdapter.ts` | 推导里含指令语义（哪些指令读内存、写寄存器），这是第三个轮子 |
| 跟踪面板的结构化记录由前端拼 | `src/core/coreStateAdapter.ts` 的 `traceFromDto`（含前后值、宏分组） | 核心自己的 `trace_` 只是 `"LD"`、`"MICRO:fetch"` 这样的短字符串，没有对外导出，也不够跟踪面板用；结构化跟踪目前只存在于 TS |
| WASM 产物不进 git，WASM 测试在产物缺失时静默跳过 | `.gitignore` 第 15 行；`src/tests/wasmCoreAdapter.test.ts` 的 `describe.skip` | 没装 Emscripten 的机器上，真核心的测试一条都不跑 |
| WASM 桥是单全局实例 `g_runtime` | `wasm_bridge.cpp` | 可以接受，但要写明 |

### 0.2 不变量（沿用交接文件，重构不得触碰）

1. 解析/汇编/宏展开/链接/VM 语义、opcode 编码、FR 只有 OF/SF/ZF。
2. 指令步与微周期步、Reverse Microstep / Reverse Instruction 的事务、epoch、barrier、1000 条容量。
3. 文档生命周期（Dirty、New/Open/Save/Save As）、诊断 code/producer/range。
4. 四个存储 key：`stugx.casl.locale`、`stugx.casl.preferences.v1`、`stugx.casl.startup-selection.v1`、`stugx.casl.lesson-progress.v1`。不新增 network、telemetry、storage key。
5. 不实现 x86、double 运算、Redo、Reverse Run、Reverse Macro、项目持久化、云功能。
6. 不删测试、不放宽门禁换绿灯。历史冻结测试要改时，先在 PR 里说明原因并保留语义保护。

### 0.3 已决定的六项（与既有契约或范围冲突之处）

项目所有者于 2026-11-09 确认“按建议全部定”。其中第 1、4、5、6 项文档原先只列了两种走向，下表的结论是 Claude 按所有者此前的设计取向补全的，所有者可随时逐项改判；改判时同步更新本表与 7.4 记录。

| # | 项 | 冲突的契约 | 决定（2026-11-09） |
| --- | --- | --- | --- |
| 1 | 总线常显为浅灰 + 分叉圆点 + 箭头 | [Circuit Visual Contract](../circuit-visual-contract.md) 第 8 节 Arrowless Wire Rules，交接的 clean-wire | **批准，有限定**：总线常显（浅灰、细线）；分叉处画圆点；箭头**只画在当前活动路径上**，空闲总线不带箭头。已落为 [ADR 0023](../adr/0023-workbench-datapath-structural-buses-and-active-arrowheads.md)；Circuit Visual Contract 第 8 节分成 8.1（工作台数据通路，新规则）与 8.2（旧 `CometCircuitSvg`，原规则不变，直到被替换）。“只有真实活动路径才高亮”的原则不变 |
| 2 | “回到读入 0006 的那一步”这类多步回退 | 禁止 Reverse Run | **不做**。只保留“回退一个微周期 / 回退一条指令”，各调用一次既有事务 |
| 3 | 新增动画 | 不加假动画 | **同日改判：批准加动效**，规则见 [ADR 0024](../adr/0024-workbench-datapath-motion.md)。每一步按“控制信号 → 数值沿路径移动 → 被改写的值闪一下”播放一次，之后活动路径上保留低对比度的流动。动效只表现视图模型里已有的内容，不增加信息；回退不播放动效、不倒放；“减少动态效果”与静态截图模式下全部关闭。旧电路组件原有的流动效果不变（`circuitFlowAnimation.test.ts` 继续通过） |
| 4 | 断点、运行到断点、主存自由输入地址、自动播放速度 | 交接要求“不继续增加业务功能”；现有代码里没有这些 | **前三项批准，自动播放速度不进 v2**。断点是前端临时状态，不持久化、不进偏好设置、不改 Dirty；运行到断点复用现有 20 步批循环，在每步后比较 `current.instructionAddress`；自由输入地址只移动主存窗口。自动播放会引入一种定时驱动的新执行方式，与 Stop、所有权校验的交互需要单独设计，留到 v2 之后 |
| 5 | 全局快捷键（空格、F5 等） | [Keyboard and Accessibility](../reference/keyboard-accessibility.md) 目前没有全局执行快捷键 | **批准**。先在该文档登记键位表再实现；焦点在 Monaco 或任何输入框内时全局快捷键不生效 |
| 6 | 删除 mock 后，所有开发机与 CI 都必须能构建 WASM | 现在没装 Emscripten 也能开发和跑测试 | **批准**，这是“核心全部用 C++”的直接代价。Phase 2 增加 `scripts/ensure-wasm.mjs`：产物缺失或比 `cpp-core/` 旧时自动构建，构建不了就让测试失败而不是跳过；emsdk 版本沿用 `build-cloudflare-pages.sh` 里固定的版本 |

---

## 1. 架构总则：少接口、多用途

### 1.1 单一引擎

- `cpp-core/` 是唯一执行权威。Web 与 Tauri 加载同一个 `public/wasm/stugx_casl_core.{js,wasm}`；Tauri 没有也不新增 Rust 命令。
- 删除 TypeScript 的汇编器、链接器、VM、微周期计划、反向逻辑、指令解码（见第 5 节删除清单）。开发、测试、生产三个环境只剩 WASM 一个后端。
- `CoreAdapter` 接口保留，但实现只剩 `WasmCoreAdapter`。`coreBridge.ts` 的事务队列（`callCoreTransaction`）保留，它是前端串行化核心调用的唯一入口。

### 1.2 接口数量冻结，每个接口服务多个视图

现有 20 个导出里，16 个是写操作，另外 4 个是 `create` / `destroy` / `get_state` / `get_last_error`；这 20 个不增不减。读操作新增 5 个，覆盖全部视图：

| 读接口 | 谁用 | 何时调 |
| --- | --- | --- |
| `get_program` | 代码栏、映射、机器码、主存标号、模块列表 | 只在 `programRevision` 变化时调一次 |
| `get_snapshot`（或写操作返回的 snapshot） | 电路、寄存器、FR、微周期药丸、按钮可用性、状态栏 | 每个写操作后得到一次，不单独再调 |
| `get_memory(start, count)` | 主存面板、栈面板、全景 | 窗口移动或 snapshot 报告该窗口内有变化时 |
| `get_history(from, max)` | 值的来历、时间轴、“原 xxxx” | 用户打开相应面板时按页拉 |
| `get_trace(from, max)` | 跟踪面板（结构化记录，需在核心新建，见 2.3） | 面板可见且 `traceCount` 变化时增量拉 |

禁止为单个面板新增专用导出。新需求先问“能不能从这 5 个里拼出来”。

### 1.3 前端禁止推导执行语义

- 前端不得从源码或 opcode 推算寄存器、内存、标志、有效地址、读写地址。这些只能来自 snapshot / history。
- 前端允许做的派生：十六进制格式化、分组、过滤、排序、标号映射、布局。全部是纯函数并 memo。
- 架构测试（见 7.3）保证：`src/components`、`src/visual`、`src/store` 不得 import `instructionEncoding`、`mockCaslCore`、`caslLinker`。

---

## 2. 后端要求（C++ 核心与桥接）— Codex 负责

### 2.1 文件与边界

| 路径 | 职责 | v2 动作 |
| --- | --- | --- |
| `cpp-core/include/*.hpp`、`cpp-core/src/*.cpp` | 解析、汇编、链接、VM、历史 | **语义不变**。只允许加只读查询方法 |
| `cpp-core/include/JsonWriter.hpp`（新） | 紧凑 JSON 输出，RAII，统一转义 | 新增，替换 `wasm_bridge.cpp` 里全部手写拼接 |
| `cpp-core/src/Snapshot.cpp`、`include/Snapshot.hpp`（新） | 从 `CometState` + `AssembleOutput` 生成 ProgramDto / SnapshotDto / 变更集 | 新增；`core_dump` 与 WASM 桥共用，保证 native 与 WASM 输出一致 |
| `cpp-core/wasm/wasm_bridge.cpp` | C ABI | 保留 20 个导出，新增 6 个；瘦身到只做参数校验与调用 |
| `cpp-core/tools/core_dump.cpp` | golden 场景输出 | 新增 snapshot / program / history 场景 |
| `cpp-core/tests/CoreSmokeTest.cpp` | C++ 单测 | 新增第 2.7 节的用例 |
| `src/core/wasmLoader.ts` | cwrap 绑定 | 新增 6 个绑定；导出名列表是**唯一**定义处之一 |
| `src/core/wasmCoreAdapter.ts` | `CoreAdapter` 实现 | legacy 实现保留到 Phase 2；新增 `WasmCoreAdapterV2`（见 2.3 过渡方式） |
| `src/core/coreAdapter.ts`、`src/core/coreDto.ts` | 契约类型 | v2 类型；Codex 产出，Claude 只消费 |
| `scripts/verify-wasm-exports.mjs`（新） | 校验 CMake `EXPORTED_FUNCTIONS` == `wasmLoader.ts` 绑定名 | 新增，接入 `prebuild` |

### 2.2 C ABI v2

既有 20 个导出**签名与返回格式不变**（golden 继续通过）：

```cpp
const char* stugx_casl_create();
void        stugx_casl_destroy();
const char* stugx_casl_assemble(const char* sourceText);
const char* stugx_casl_assemble_module(const char* moduleId, const char* sourceUnitId,
                                       const char* moduleAssemblyId, const char* displayName,
                                       const char* source);
const char* stugx_casl_project_begin(const char* projectId, const char* linkId,
                                     std::uint32_t linkRevision, const char* mainModuleId);
const char* stugx_casl_project_add_module(const char* moduleId, const char* sourceUnitId,
                                          const char* moduleAssemblyId, const char* displayName,
                                          const char* source);
const char* stugx_casl_project_link();
const char* stugx_casl_step();
const char* stugx_casl_micro_step();
const char* stugx_casl_reverse_microstep(int historyEpoch, int timelineRevision);
const char* stugx_casl_reverse_instruction(int historyEpoch, int timelineRevision);
const char* stugx_casl_run_microcycles(int maxMicrosteps);
const char* stugx_casl_reset();
const char* stugx_casl_reload(int mode);            // 0 assembled, 1 zero, 2 ffff
const char* stugx_casl_run(int maxSteps);
const char* stugx_casl_get_state();
const char* stugx_casl_enqueue_input(const char* encodedWords, int endOfFile);
const char* stugx_casl_mutate(int kind, int target, int value); // kind: 0 GR, 1 PR, 2 SP, 3 FR, 4 memory
const char* stugx_casl_full_clear();
const char* stugx_casl_get_last_error();
```

新增 6 个导出：

```cpp
// 返回 {"ok":true}。profile: 0 = legacy（写操作返回全量 state，默认，golden 用）
//                       1 = snapshot（写操作返回 {ok, snapshot, appendedConsoleRecords, diagnostics}）
const char* stugx_casl_set_response_profile(int profile);

// 静态程序镜像，只在 programRevision 变化时拉。见 2.3 ProgramDto
const char* stugx_casl_get_program();

// 轻量运行时快照，不含 memoryWindow / sourceRows。见 2.3 SnapshotDto
const char* stugx_casl_get_snapshot();

// 任意窗口。约束：0 <= start <= 0xFFFF，1 <= count <= 1024，start + count <= 0x10000
// 越界返回 {"ok":false,"diagnostics":[...]}，不截断不抛出
const char* stugx_casl_get_memory(int start, int count);

// 只读导出已保留的微周期历史。fromSequence 为 0 表示从最早保留项开始；maxEntries <= 200
// 调用前后 VM 状态与历史必须逐位相同（2.7 B05）
const char* stugx_casl_get_history(int fromSequence, int maxEntries);

// 增量 trace。fromIndex 为当前时间线内的绝对下标；maxEntries <= 500
const char* stugx_casl_get_trace(int fromIndex, int maxEntries);
```

各导出在两种 profile 下的返回体（legacy 一列是现状，逐个对照 `wasm_bridge.cpp` 核实过）：

| 导出 | legacy（现状，不变） | snapshot profile |
| --- | --- | --- |
| `assemble`、`step`、`micro_step` | `{ok, state, diagnostics}` | `{ok, snapshot, appendedConsoleRecords, diagnostics}` |
| `run`、`run_microcycles`、`reset`、`reload`、`enqueue_input`、`full_clear` | 裸 `state` | `{ok, snapshot, appendedConsoleRecords, diagnostics}`，`ok` = 无 error 级诊断 |
| `reverse_microstep` | `{status, reversedEntryId, previousPhase, restoredPhase, historyEpoch, timelineRevision, availability, state}` | 同左，`state` 换成 `snapshot`，加 `appendedConsoleRecords` |
| `reverse_instruction` | `{status, reversedInstructionId, reversedMicrostepCount, machineAddress, mnemonic, restoredPhase, historyEpoch, timelineRevision, availability, state}` | 同上 |
| `mutate` | `{status, previousWord, nextWord, reason?, state}` | 同上 |
| `project_link` | `{ok, link, state, diagnostics}` | 同上 |
| `assemble_module`、`project_begin`、`project_add_module`、`get_last_error`、`destroy` | 不含 `state` | 不变 |
| `get_state` | 全量 `state` | **始终全量**，不受 profile 影响（B03、B05 靠它做对照） |
| `create` | 裸 `state` | 始终返回 legacy 裸 `state`，并把 profile **复位为 0** |

- 等价原则：同一次调用，snapshot 里的每个字段都等于 legacy `state` 里对应字段的值。legacy 返回合成 Error 状态的场合（例如“No program loaded”），`snapshot.runState` 同样是 `Error`。
- legacy 有一处不一致：`reverse_microstep` / `reverse_instruction` 在未加载程序时返回裸 `state` 而不是反向结果信封。legacy 保持原样；snapshot profile 下统一返回信封，`status` 为 `unavailable`，`availability.reason` 为 `runtime-not-loaded`。
- profile 是每个 WASM 模块实例的全局状态。`loadWasmModule()` 每次调用都新建实例，所以 legacy 适配器与 v2 适配器各用各的实例，互不影响；同一个实例上不得混用两种 profile。

规则：

- 所有导出 `noexcept` 语义：内部 `try/catch`，异常转成 `diagnostics` + `get_last_error`，永不跨 ABI 抛出。
- `CometVm` 允许新增的只读访问器仅限：历史条目的 `const` 视图、结构化跟踪的 `const` 视图。不新增任何会改状态的公开方法。
- 返回的 `const char*` 指向桥内部缓冲，下一次调用即失效；TS 侧立即复制（现有 `readCString` 已如此）。
- 单实例：`create` 幂等（重复调用重建），`destroy` 后任何调用返回 `runtime-not-loaded` 诊断。
- CMake `-sEXPORTED_FUNCTIONS` 列表与 `wasmLoader.ts` 绑定名必须一致，由 `verify-wasm-exports.mjs` 校验。

### 2.3 DTO v2（`src/core/coreDto.ts` 新增类型，旧类型保留给 legacy profile）

```ts
export type RunStateDto = "Idle" | "Dirty" | "Ready" | "Running" | "WaitingInput" | "Finished" | "Error";
export type MicrocyclePhaseDto =
  | "none" | "fetch" | "decode" | "effective-address" | "operand-read"
  | "execute" | "write-back" | "flag-update" | "complete";

export type ProgramSourceRowDto = Omit<SourceRowDto, "isCurrent">;   // SourceRowDto 为既有类型

export interface ProgramDto {
  programRevision: number;            // assemble / link / fullClear 时 +1
  entryPoint: number;
  sourceRows: ProgramSourceRowDto[];   // 等于现有 SourceRowDto 去掉 isCurrent
  instructions: ProgramInstructionDto[];
  symbols: { name: string; address: number; moduleId?: string }[];
  modules?: { moduleId: string; displayName: string; baseAddress: number; wordCount: number }[];
}

export interface ProgramInstructionDto {
  address: number; line: number; size: 1 | 2;
  op: string;                          // opcodeName
  r: number; x: number | null; adr: number | null;
  sourceRegister: number | null; operandLabel: string | null;
  moduleId?: string; sourceMappingId?: string;
}

export interface SnapshotDto {
  programRevision: number;
  runState: RunStateDto;
  stepCount: number;
  pr: number; sp: number; callDepth: number;
  ir0: number; ir1: number | null; mar: number; mdr: number;
  gr: [number, number, number, number, number, number, number, number];
  fr: { of: boolean; sf: boolean; zf: boolean };
  historyEpoch: number; timelineRevision: number;
  reverseAvailability: ReverseAvailabilityDto;               // 既有类型
  reverseInstructionAvailability: ReverseInstructionAvailabilityDto; // 既有类型
  history: { retainedEntries: number; capacity: number; floorSequence: number | null; droppedEntryCount: number };
  microcycle: {
    granularity: "instruction" | "microcycle";
    phases: MicrocyclePhaseDto[];          // 当前指令的阶段计划（来自 VM 的 MicrocycleContext.phases），无指令时为空；前端据此画药丸
    phase: MicrocyclePhaseDto; instructionAddress: number | null; instructionKind: string | null;
    sourceLine: number | null; index: number; total: number; instructionComplete: boolean;
    historySequence: number; detail: string;
  };
  current: { instructionAddress: number | null; sourceLineIndex: number | null; instructionText: string | null };
  last: {
    instructionKind: string | null;
    memoryReadAddress: number | null; memoryWriteAddress: number | null; registerWriteIndex: number | null;
    baseAddress: number | null; indexRegister: number | null; indexValue: number | null; effectiveAddress: number | null;
  };
  changes: {                               // 本次写操作造成的差异；get_snapshot 单独调用时为空
    registers: { name: "GR0"|"GR1"|"GR2"|"GR3"|"GR4"|"GR5"|"GR6"|"GR7"|"PR"|"SP"|"MAR"|"MDR"|"IR"|"FR"; before: number; after: number }[];
    memory: { address: number; before: number; after: number }[];  // 最多 256 条
    memoryTruncated: boolean;
  };
  console: { recordCount: number };        // 归零表示输出已清空
  traceCount: number;
  project?: { projectId: string; linkId: string; linkRevision: number };
}

export interface SnapshotResultDto {
  ok: boolean;
  snapshot: SnapshotDto;
  appendedConsoleRecords: number[][];      // 本次操作新产生的 OUT 记录（字码数组）
  diagnostics: DiagnosticDto[];
}

export interface MemoryRangeDto { ok: boolean; start: number; count: number; words: number[]; diagnostics: DiagnosticDto[] }

export interface HistoryEntryDto {
  sequence: number; historyEpoch: number; phase: MicrocyclePhaseDto;
  instructionId: number; instructionAddress: number; instructionKind: string | null;
  sourceLine: number | null; moduleId?: string;
  startsAtFetch: boolean; endsAtInstructionComplete: boolean;
  before: HistoryStateDto; after: HistoryStateDto;
  memoryChanges: { address: number; before: number; after: number }[];
}
export interface HistoryStateDto { pr: number; sp: number; ir: number; mar: number; mdr: number; gr: number[]; fr: { of: boolean; sf: boolean; zf: boolean } }
export interface HistoryPageDto { ok: boolean; entries: HistoryEntryDto[]; floorSequence: number | null; nextSequence: number | null; diagnostics: DiagnosticDto[] }

// 字段与现有 TraceEvent（src/core/types.ts）一一对应，跟踪面板不改显示逻辑
export interface TraceEntryDto {
  kind: "instruction" | "microcycle" | "debugger-register-edit" | "debugger-memory-edit" | "debugger-full-clear";
  eventId: string; index: number; address: number; instruction: string; detail: string;
  source?: string; pr?: number;
  changedRegister?: string; changedRegisterValueBefore?: number; changedRegisterValueAfter?: number;
  changedMemoryAddress?: number; changedMemoryValueBefore?: number; changedMemoryValueAfter?: number;
  stackPointerValueBefore?: number; stackPointerValueAfter?: number;
  callDepthBefore?: number; callDepthAfter?: number; returnAddress?: number; stackAddress?: number;
  baseAddress?: number; indexRegister?: number; indexValue?: number; effectiveAddress?: number;
  runState?: RunStateDto;
  macroGroup?: "IN" | "OUT" | "RPUSH" | "RPOP"; macroStepIndex?: number; macroStepCount?: number;
  moduleId?: string; sourceMappingId?: string;
}
export interface TracePageDto { ok: boolean; entries: TraceEntryDto[]; total: number; diagnostics: DiagnosticDto[] }

// 写操作在 snapshot profile 下的返回体：把既有结果类型里的 state 换成 snapshot
export type WithSnapshot<T extends { state: CometStateDto }> =
  Omit<T, "state"> & { snapshot: SnapshotDto; appendedConsoleRecords: number[][] };
```

**过渡方式**：Phase 0 不改现有 `CoreAdapter`（旧界面继续用它跑 legacy profile），而是在 `src/core/coreAdapter.ts` 里新增 `CoreAdapterV2`，由同一文件族里的 `WasmCoreAdapterV2` 实现（自己的 WASM 实例，初始化时调用一次 `setResponseProfile("snapshot")`）。Phase 1b 把 store 切到 `CoreAdapterV2`；Phase 2 删除旧 `CoreAdapter` 并把 `CoreAdapterV2` 改名为 `CoreAdapter`。全部方法必选，不再有 `?:`，因为只有一个实现。

```ts
export interface CoreAdapterV2 {
  // 写操作（经 coreBridge 的事务队列串行化）
  assemble(sourceText: string): Promise<SnapshotResultDto>;
  assembleModule(input: ProjectLinkModuleInput): Promise<ModuleAssemblyResult>;   // 不含 state，返回体不变
  linkProject(request: ProjectLinkRequest): Promise<WithSnapshot<LinkProjectResultDto>>;
  step(): Promise<SnapshotResultDto>;
  microStep(): Promise<SnapshotResultDto>;
  run(maxSteps: number): Promise<SnapshotResultDto>;
  runMicrocycles(maxMicrosteps: number): Promise<SnapshotResultDto>;
  reverseMicrostep(historyEpoch: number, timelineRevision: number): Promise<WithSnapshot<ReverseMicrostepResultDto>>;
  reverseInstruction(historyEpoch: number, timelineRevision: number): Promise<WithSnapshot<ReverseInstructionResultDto>>;
  reset(): Promise<SnapshotResultDto>;
  reload(mode: ReloadInitializationMode): Promise<SnapshotResultDto>;
  enqueueInput(text: string, endOfFile?: boolean): Promise<SnapshotResultDto>;
  mutateDebuggerState(request: DebuggerMutationRequest): Promise<WithSnapshot<CoreDebuggerMutationResult>>;
  fullClear(): Promise<SnapshotResultDto>;
  // 读操作（不进事务队列，不改变任何状态）
  getProgram(): Promise<ProgramDto>;
  getSnapshot(): Promise<SnapshotDto>;
  readMemory(start: number, count: number): Promise<MemoryRangeDto>;
  getHistory(fromSequence: number, maxEntries: number): Promise<HistoryPageDto>;
  getTrace(fromIndex: number, maxEntries: number): Promise<TracePageDto>;
}
```

字段来源规则：

- `changes.registers` 由桥在写操作前后对比 `CometState` 得到（14 个寄存器，O(1)）。
- `changes.memory` **不改 VM 的任何写路径**，全部复用已有信息：
  - `step` / `micro_step` / `run` / `run_microcycles`：`step()` 内部就是循环 `stepMicrocycle()`，每个微周期的历史条目已经带 `memoryChanges`（稀疏写增量）。桥记下操作前的 `microcycleSequence`，操作后把新增条目的 `memoryChanges` 按地址合并（同一地址取最早的 before、最晚的 after）。超过 256 条或历史被容量截断时置 `memoryTruncated`。
  - `reverse_*`：被回退条目的 `memoryChanges` 反向（before/after 互换）。
  - `mutate` 写内存：桥已知 `previousWord` / `nextWord`，直接给一条。
  - `assemble` / `project_link` / `reset` / `reload` / `full_clear`：`memory` 为空且 `memoryTruncated = true`，含义是“整段内存可能变了”，前端据此重取当前可见窗口。
- 结构化跟踪是 Phase 0 里工作量最大的一项，因为它现在只存在于 TS。做法：在核心里按历史条目与调试器事件生成 `TraceEntryDto`；迁移期间以现有的 `traceFromDto` 作对照，同一程序同一操作序列下两者逐字段相等，才允许在 Phase 2 删除 TS 版本。核心现有的 `trace_` 短字符串继续只服务历史回滚，不对外。
- `microcycle.phases` 直接导出 VM 已有的阶段计划；前端不得再持有一份指令到阶段的表（`comet-instruction-cycle-matrix-v1.json` 仍只用于测试比对）。
- `console.recordCount` = `state.consoleOutput.size()`；`appendedConsoleRecords` = 本次操作新增的记录。
- `traceCount` = 当前 `trace_` 大小；反向执行后会变小，前端据此截断。
- `history.floorSequence` 对应既有 `floorEntryId`。

### 2.4 JSON 生成

- 新增 `JsonWriter`：`object()`/`array()` 返回 RAII 作用域对象，`key(name)`、`value(...)` 重载 `bool/int/uint64/string_view/std::optional`。输出紧凑，无换行无缩进。转义只在 `JsonWriter::escape` 一处。
- `wasm_bridge.cpp` 与 `core_dump.cpp` 全部改用 `JsonWriter`；legacy 全量 state 的字段集合与顺序保持不变（golden 比较解析后的对象，不比较空白；Codex 在迁移 PR 里用 `coreDumpParity.test.ts` 证明）。
- 不引入第三方 JSON 库。

### 2.5 性能预算

| 指标 | 目标 | 测法 |
| --- | --- | --- |
| snapshot profile 下一次 `step` 返回体 | 典型 ≤ 2 KB，上限 8 KB（含 256 条 memory 变更） | `wasmCoreAdapter.test.ts` 新增断言 |
| `step` + 序列化（WASM，Release） | < 1 ms | `wasmLifecycleStress.test.ts` 量 1000 步 |
| `run(10000)` 指令步 | < 200 ms | 同上 |
| `get_program` 1000 行程序 | < 20 ms；只在 `programRevision` 变化时调用 | 单测 |
| `get_memory(…, 1024)` | < 0.5 ms | 单测 |
| `get_history(0, 200)` | < 5 ms，调用前后状态逐位相同 | 单测 B05 |

### 2.6 构建与工具链

- `CMAKE_CXX_STANDARD 20` 不变。native 构建加 `-Wall -Wextra -Wpedantic -Werror`；emcc 构建加 `-Wall -Wextra -Werror`。
- 新增 `.clang-format`（基于 LLVM，4 空格，120 列）并对 `cpp-core/` 全量格式化一次，作为独立 PR，不混入逻辑改动。
- native 测试在 CI 里额外跑一遍 `-fsanitize=address,undefined`。
- RAII 规则沿用 `architecture.md`：无 `new/delete`、无 `malloc`、`std::array` 持有内存。

### 2.7 后端验收 B01–B10

| ID | 内容 | 通过条件 |
| --- | --- | --- |
| B01 | legacy profile 不变 | `tests/golden/*.json` 全部通过；`core_dump` 与 WASM 输出解析后相等 |
| B02 | 导出一致 | `verify-wasm-exports.mjs` 通过；CMake 列表 == wasmLoader 绑定 == 本文 2.2 |
| B03 | snapshot 等价 | 任意状态下 `get_snapshot` 的每个字段与 `get_state` 对应字段相等（写一张映射表测试） |
| B04 | 边界 | `get_memory` 对 start/count 越界、`get_history`/`get_trace` 对负数、超限全部返回 `ok:false` + 诊断，无崩溃 |
| B05 | 只读 | `get_program`/`get_snapshot`/`get_memory`/`get_history`/`get_trace` 调用前后，`get_state` 文本逐字节相同 |
| B06 | 反向一致 | Reverse Microstep / Instruction 后 `traceCount`、`changes`、`history` 与 legacy 行为一致 |
| B07 | ABI 不抛出 | 对每个导出传 `nullptr` / 非法枚举 / 极大值，进程不终止，返回诊断 |
| B08 | 性能 | 2.5 节全部达标 |
| B09 | 内存安全 | ASan/UBSan 下 `CoreSmokeTest` 全绿 |
| B10 | 单一引擎 | `grep -r "mockCaslCore\|MockCoreAdapter\|caslLinker" src` 为 0；`pnpm test` 在 WASM 下全绿 |
| B11 | 跟踪对照 | 全部内置示例 + 调试器修改 + 两种回退的操作序列下，`get_trace` 的条目与现有 `traceFromDto` 的结果逐字段相等 |
| B12 | profile 隔离 | 两个 WASM 实例分别跑 legacy 与 snapshot，互不影响；`create` 后 profile 为 0 |

---

## 3. 前端要求（工作台版细节）— Claude 负责

设计稿：Design 画布 “stugx.CASL 六种界面方向” 中的 **2 · 工作台版** 与 **2b · 四种状态**；元件样式以画布 “stugx.CASL 原创概念” 中的 **电路元件样式** 板为准。以下文字是对设计稿的规范化。

### 3.1 布局

```text
┌ 顶栏 44px ───────────────────────────────────────────────────────────────┐
│ 品牌 │ 新建 打开 保存 另存为 │ 文件标签 │ 汇编 运行 停止 单步 重置▾ │ 指令|微周期 │ 周期 n/N │ 当前指令 │ 语言 主题 帮助 │
├ 代码栏 300 ─┬ 数据通路 flex ───────────────────────────┬ 右栏 320 ──────┤
│ CASL|C++    │ 标题 + 微周期药丸 + 同时显示|只看电路|只看数据 + 跟随 │ 寄存器（常显） │
│ 模块 ▾ 链接 │ 电路 SVG（viewBox 960×470，min-width 600）  │ 主存|栈|跟踪|映射│
│ 代码行      │ 一句话说明                               │ 跳到 / 跟随 MAR │
├ 底部面板 132px：输出 | 控制台输入 | 消息 | 生成的 CASL | 机器码  ──── 清空 收起 ┤
├ 底栏 40px：⏮ 回退一个微周期 回退一条指令 [下一个微周期 空格] 运行到断点 │ 核心状态 历史 n/1000 断点 剩余 ┤
```

| 宽度 | 布局 |
| --- | --- |
| ≥ 1440 | 三栏：代码栏 300，右栏 340（观察工作区与 CASL 视图为 400） |
| 1280–1439 | 三栏：代码栏 260，右栏 300（观察工作区与 CASL 视图为 340） |
| 1180–1279 | 三栏：代码栏 232，右栏 280（观察工作区与 CASL 视图为 320）。代码栏不自动变抽屉，用顶栏第一个按钮手动收起（见 3.8） |
| < 1180 | 不在 v1.0 范围，沿用既有的 1180 最小宽度（整页横向滚动），与上线前一致 |

- 电路所在面板永远挂载一次，切换右栏标签、底部标签、语言、布局都不重建它（A02、A13）。
- “只看电路”把右栏与底部收起但保留恢复按钮；“只看数据”把电路缩成同一组件的紧凑版（同一 SVG，不同 class），不是截图。

### 3.2 现有功能 → v2 位置（完整性对照表）

| 现有功能（组件） | v2 位置 | 数据来源 |
| --- | --- | --- |
| 新建/打开/保存/另存为、Dirty guard（App.tsx、documents/） | 顶栏图标按钮 + 文件标签上的圆点（绿 = 已汇编一致，琥珀 = 已修改） | 不变 |
| 汇编（Toolbar） | 顶栏；Dirty 时变主要按钮，其余执行按钮停用 | `assemble` → `programRevision` |
| 运行/停止/单步/重置（Toolbar） | 顶栏；重置下拉含 重置 / 重载为汇编值 / 重载为 0 / 重载为 FFFF / 完全清除 | `run` 批 20 步保留；`reload(mode)`；`fullClear` |
| 指令 / 微周期粒度（CaslCompatibilityMode、CometMicrocyclePanel） | 顶栏分段按钮；数据通路标题处按 `phases` 逐个画药丸（取出 / 解读 / 地址 / 读操作数 / 执行 / 写回 / 标志 / 完成，只画该指令有的），当前阶段高亮并显示 `index/total` | `snapshot.microcycle.phases`、`phase`、`index`、`total` |
| Reverse Microstep / Reverse Instruction（ReverseInstructionControl） | 底栏按钮。“回退一个微周期”只在微周期粒度出现；“回退一条指令”两种粒度都有。不可用时按钮保留并显示原因文字；回退成功后焦点留在按钮上 | `reverseAvailability.reason`、`reverseInstructionAvailability.reason` |
| 寄存器（RegisterPanel） | 右栏常显；黄底 + “原 xxxx” 表示本步改写；铅笔进入编辑 | `snapshot.gr/pr/sp/mar/mdr/fr` + `changes.registers` |
| 调试器修改（DebuggerDialogs） | 寄存器行铅笔 / 主存行双击 → 内联输入框，回车提交 | `mutateDebuggerState` |
| 主存（MemoryPanel） | 右栏标签“主存”；R/W 字母 + 底色；保留现有五个跳转按钮（程序起点 / PR / MAR / 上次读 / 上次写）与跟随执行；新增一个地址输入框，只移动窗口 | `readMemory` + `program.symbols` + `changes.memory` + `last.*` |
| 栈 | 右栏标签“栈”：SP 起向高地址列出，标出返回地址与保存的寄存器 | `readMemory(sp, n)` + `snapshot.callDepth` |
| 跟踪（TracePanel） | 右栏标签“跟踪” | `getTrace` |
| 源码映射 / 机器码（SourceMapPanel、machineCodeRows） | 右栏“映射”；底部“机器码” | `program.sourceRows` / `program.instructions` |
| 输出 / 控制台输入 / 消息（OutputPanel） | 底部面板标签；输入框只在 WaitingInput 时启用并聚焦 | `appendedConsoleRecords`、`runState`、`diagnostics` |
| 多模块（ProjectModulesPanel） | 代码栏“模块”下拉 + 链接按钮；下拉里标出“正在执行” | `program.modules` + `snapshot.project` |
| C++ 子集（SourceEditor cpp、generatedCaslRows、framePlanView、DoubleValueInspector） | 代码栏 CASL/C++ 分段；底部“生成的 CASL”“double 查看”标签；电路不变 | 转译器输出进 `assemble`；double 值从 `readMemory` 取 |
| 课程与演示（LearningFlowPanel、DemoGuidePanel、startupSelection） | 顶栏“帮助与课程”打开右侧抽屉；抽屉盖在右栏上，不改布局 | 不变（lesson-progress key） |
| 更新日志（ChangelogDialog） | 帮助抽屉底部链接 | 不变 |
| 状态栏（StatusBar） | 底栏右侧：核心状态、历史 n/1000、断点数、本圈剩余 | `coreBackendInfo` + snapshot |
| 语言 / 主题 | 顶栏语言下拉；主题按钮沿用现状（禁用占位，深色主题不在 v2 范围） | `stugx.casl.locale` |
| 断点、运行到断点（**新增，0.3 第 4 项已批准**） | 代码栏点行号切换断点；底栏“运行到断点”。断点只存在于当前页面会话，汇编或换文件后清空 | 前端临时状态；运行到断点 = 现有 run 批循环，每步后比较 `current.instructionAddress` |
| 自动播放速度 | **不进 v2**（0.3 第 4 项） | — |

稳定标识不变。右栏与底部标签继续使用 `src/observation/workspace.ts` 与 `src/preferences/types.ts` 里已有的 id，只改摆放位置：

| 既有 id | v2 位置 |
| --- | --- |
| `registers` | 右栏上半，常显（不再是标签） |
| `memory`、`stack`、`trace`、`source-mapping`、`inspector` | 右栏下半的五个标签：主存 / 栈 / 跟踪 / 映射 / 查看器（含 binary64 查看） |
| `code-machine` | 底部“机器码”与“生成的 CASL” |
| `console` | 底部“输出”与“控制台输入” |
| `show-both`、`circuit-focus`、`data-focus` | 同时显示 / 只看电路 / 只看数据 |
| 底部 `output`、`console`、`messages`、`generated-casl`、`machine-code` | 原样 |

`stugx.casl.preferences.v1` 的字段与取值不增不改。已保存的 Inspector 标签为 `registers` 时，v2 打开“主存”标签；其余取值照旧映射。

### 3.3 运行状态 → 界面

| runState | 顶栏按钮 | 电路 | 其它 |
| --- | --- | --- | --- |
| Idle | 仅 汇编 可用 | 空电路，中央一句“汇编后开始” | — |
| Dirty | 汇编为主要按钮；运行/单步/重置停用 | 保留上一次结果，整体 `opacity .55`，覆盖提示“源码已修改，汇编后更新” | 数据区上方横幅标明“上一次汇编的结果”；消息标签显示错误数 |
| Ready | 全部可用 | 取出前状态：PR→MAR 路径 | — |
| Running | 停止可用，其余停用 | 每批 20 步刷新一次 | 运行到断点时命中即停，状态栏写明停在哪个地址 |
| WaitingInput | 全部停用（Stop 只在 Running 时可用，见 3.8） | 停在 SVC 阶段，电路上写“等待控制台输入” | 底部面板自动切到控制台，输入框启用并聚焦；提交后焦点回到原处。机器状态显示“等待输入”，回退按钮旁写明不能回退的原因 |
| Finished | 重置为主要按钮；回退可用 | 无活动路径；顶部一句“程序已结束” | 编辑器里最后执行的那一行标绿，并在行尾写“最后执行” |
| Error | 重置为主要按钮 | 无活动路径 | 消息标签高亮，错误可跳行 |

### 3.4 元件视觉规范

以“电路元件样式”板为准，这里只写约束：

- 寄存器：圆角 6 的器件体 + 引脚小矩形 + 名称 + 位宽 + 值窗。值窗三态：空闲 `--cv-win`、使用中 `--cv-win-hot`、刚改写 `--cv-win-chg`（琥珀）并在右上角写“原 xxxx”。
- ALU：V 形缺口多边形，中央圆形运算徽章显示当前运算符；A/B/Y/F 标注。EA 加法器：带“+”的圆。选择器：梯形，三个输入 PR/SP/EA。
- FR：三个独立位格 OF/SF/ZF，为 1 时亮起并加粗数字。
- 译码器：四个字段窗（OP/r/x/adr）+ 含义行 + 字段名行。控制器：控制信号药丸，发出的为紫色。
- 主存：芯片外形，左侧 ADR/RD/WR/DATA 引脚；内部表 地址/值/标号/源码；读行标 R，写行标 W。
- 连线：总线 `--cv-bus` 1.6px；活动路径 2.8px，地址 `--cv-path-addr`、数据 `--cv-path-data`、标志 `--cv-path-flag`；控制线虚线，发出时实线紫色。总线常显、分叉处画圆点、箭头只画在活动路径上（0.3 第 1 项，须先有 ADR）。
- 所有状态都有非颜色标记：R/W 字母、“原 xxxx”、药丸文字、位格数字加粗。
- 动效（ADR 0024）：画布有 `motion` 与 `stepKey` 两个属性。容器在**正向**执行一步后传 `motion="play"` 和新的 `stepKey`（用 `timelineRevision`），回退、重置、汇编后传 `motion="none"`。活动路径在视图模型里可带 `value`（路径上走的那个字）和 `stage`（同一步内的先后），两者与路径本身一样来自 snapshot，不得由前端推算。时长用 `--cv-motion-*` token。

Token 映射写进 `src/styles/tokens.css`，新增前缀 `--cv-*`，不改动既有 token 的值：

```css
--cv-bus: #cbd5e1;  --cv-path-addr: #1d4ed8;  --cv-path-data: #c2410c;  --cv-path-flag: #a16207;
--cv-ctl: #c4b5fd;  --cv-ctl-on: #7c3aed;     --cv-win: #eef2f7;        --cv-win-hot: #e6eeff;
--cv-win-chg: #fff1c7; --cv-win-chg-border: #c48a1a; --cv-body-stroke: #475569; --cv-body-on: #1d4ed8;
```

以上是节选，完整清单与取值以 `src/styles/tokens.css` 的 “Workbench datapath” 一段为准。`src/styles/datapath.css` 不允许出现写死的颜色，由测试守住。

应用目前没有深色主题：工具栏的主题按钮是禁用的占位，代码里没有任何主题切换机制。所以 v2 只做浅色。`--cv-*` 全部走 token，将来加深色主题时只需重定义这些 token。

### 3.5 交互与可访问性

- 键盘：全部控件可 Tab 到达，有可见焦点；标签列表沿用现有的横向方向键导航。
- 全局快捷键（0.3 第 5 项已批准，先登记进 keyboard-accessibility.md 再实现）：空格 下一步（当前粒度）、Shift+空格 回退一条指令、F5 运行、F6 停止、Ctrl+Enter 汇编、Ctrl+S 保存。焦点在 Monaco、输入框、下拉框或对话框内时全部不生效；每个快捷键在对应按钮的 tooltip 里写出。
- 所有图标按钮有 `aria-label` 与 tooltip；禁用按钮保留并通过 `aria-describedby` 给出原因。
- `aria-live="polite"` 只播报 runState 变化与错误，不随每个微周期播报。
- 切换右栏/底部标签、语言、布局、主题 **不得** 调用任何核心写操作（A08、F07）。
- 三语言（en/ja/zh-CN）同步维护；寄存器名、地址、十六进制、指令助记符不翻译。
- 数值等宽 + tabular-nums；值变化不改变行高。

### 3.6 性能

- 一次写操作 = 一次核心调用 + 一次 React 提交。snapshot 解析后直接进 store，不再经过 650 行推导层。
- 主存面板只渲染窗口（默认 48 行），滚动按需 `readMemory`。永不渲染 65536 行。
- 电路 SVG 结构静态，每步只切换 `class`/`data-active`；路径几何来自 `instructionPathTemplates`（展示配置，允许保留）。
- 右栏非活动标签不渲染内容（保留状态）。
- 目标：snapshot 到达 → 绘制完成 < 16 ms（1440×900，Chrome）。

### 3.8 v1.0 实际落地与本节设计稿的差异

3.1 到 3.3 写于实现之前。v1.0 按方案 A 落地时，下列各项的做法与原文不同。功能都在，位置或形式不同；每一项都写明原因。这张表由 Claude 填写，待项目所有者复核。

| 原文 | v1.0 实际 | 原因 |
| --- | --- | --- |
| 三种视图合并成一个界面 | 三种视图（现代工作区 / CASL / COMET）保留，成为同一外壳里的三个预设，切换按钮在顶栏 | CASL 视图是替代 WCASL-II 的主体，COMET 视图承载微周期；两者各有数百条既有测试。合并等于重写这些面板，不属于“只换界面、核心不动”的方案 A |
| 顶栏有“指令 / 微周期”分段按钮 | 粒度随视图：COMET 视图为微周期，其余为指令 | 沿用既有的视图与粒度绑定，不改变执行入口的行为 |
| 微周期药丸在数据通路标题处 | 使用既有的 COMET 阶段轨道，紧贴在数据通路正下方 | 同一份阶段信息不画两遍；阶段轨道自带当前阶段、微步序号和机器字 |
| 回退按钮在底栏 | 回退微步、回退指令留在 COMET 微周期面板和 CASL 命令带里 | 两个按钮各带一行不可用原因和焦点管理，三种语言下放不进 40px 的底栏。底栏放：下一步（按粒度）、运行到断点、断点数、历史数、机器状态 |
| 重置是下拉（含三种重载和完全清除） | 重置在顶栏；三种重载与完全清除在 CASL 命令带 | 沿用既有控件与其确认对话框 |
| 右栏上半常显寄存器 | 全部寄存器常显在数据通路里（带“原值”标记）；右栏保留“寄存器”标签作表格视图 | 数据通路已经常显每个寄存器，右栏再放一份会挤掉主存和跟踪 |
| 调试器修改改为内联输入 | 沿用编辑对话框 | 对话框带程序字确认、SP 警告和格式校验，改内联需要重做这些交互 |
| 课程与演示在“帮助”抽屉 | 在代码栏里，编辑器下方 | 没有新增抽屉；内容与进度存储不变 |
| 1180–1279 代码栏自动变抽屉 | 不自动收起，三栏变窄；数据通路仍不低于 600px | 自动收起会让窄窗口打开时看不到编辑器，首次流程变差；手动收起一键可达 |
| < 1180 上下布局 | 未做 | A11 与 F03 的范围是 1180 到 1920 |
| WaitingInput 时“停止可用” | 不可用 | 原表有误。既有状态机里 Stop 只在 Running 时生效，这是不变量，不能为了对上表格去改 |
| Finished 的提示在电路中央 | 在电路顶部 | 中央会挡住最终的寄存器数值 |
| Dirty 时寄存器、主存各标“上一次” | 数据区上方一条横幅：“下方数据是上一次汇编的结果” | 一句话标注整个数据区，比每个面板各标一次清楚 |
| 旧电路文件随新元件重画后删除 | 旧电路的五个文件与它们自己的测试暂时保留，应用不再引用，也不进产物 | 这些文件有 84 条专属测试，删除要逐条列出替代覆盖，放到 v1.1 |
| Phase 1 的开发预览页 | 已删除 | 应用本身就是工作台了 |

另外，0.3 第 4 项批准的“自由输入主存地址”没有新增控件：检查器的主存标签和 CASL 视图本来就各有一个地址输入框，已满足。

### 3.7 前端验收 F01–F12（与交接 A01–A14 一并执行）

| ID | 内容 | 通过条件 |
| --- | --- | --- |
| F01 | 功能完整 | 3.2 表中每一行在 v2 里可操作，E2E 覆盖 |
| F02 | 状态矩阵 | 3.3 表中 7 个状态的按钮可用性与提示与表一致 |
| F03 | 四种宽度 | 1180/1280/1440/1920 × 三语言无横向整页溢出，电路可读 |
| F04 | 电路常驻 | 切任意标签/语言/布局，电路 DOM 节点身份不变 |
| F05 | 无语义推导 | 架构测试：components/visual/store 不 import 已删除模块 |
| F06 | 变化标记 | 每个“刚改写”都有颜色之外的标记 |
| F07 | 无副作用切换 | 切换标签/语言/布局期间 coreBridge 写操作调用数为 0 |
| F08 | 等待输入 | WaitingInput 时输入框启用并聚焦；提交后停用 |
| F09 | 回退说明 | 每个不可回退原因都有三语言文案 |
| F10 | 性能 | 3.6 目标达成；100 微步 + 反复切标签 observer 数不增长 |
| F11 | 键盘 | 全部控件可 Tab 到达且焦点可见；3.5 的快捷键全部可用，在 Monaco 与输入框内不触发 |
| F13 | 断点 | 设断点、运行到断点、命中即停、Stop 可随时打断；断点不写入任何存储，不改变 Dirty 与回退可用性 |
| F14 | 连线 ADR | ADR 与改写后的 Circuit Visual Contract 第 8 节已合入；空闲总线无箭头，箭头只出现在活动路径 |
| F15 | 动效 | 正向一步播放一次“信号 → 移动 → 闪烁”；回退不播放；去掉全部动效后画面信息不变；“减少动态效果”与静态截图模式下无任何运动、无残留元素；连续快速单步不卡顿、不堆积 |
| F12 | 可主题化 | 数据通路样式不含写死的颜色，全部引用 `--cv-*`；浅色下文字对比度 ≥ 4.5:1。深色主题不在 v2 范围 |

---

## 4. 删除与保留清单（不造轮子）

| 删除（Phase 2） | 替代 |
| --- | --- |
| `src/core/mockCaslCore.ts`、`mockCoreAdapter.ts` | WASM |
| `src/linker/caslLinker.ts` | C++ `Linker` 经 `linkProject` |
| `src/core/microcycle.ts` 中的阶段计划；`reverseMicrocycle.ts`、`reverseInstruction.ts` 中的逻辑 | 核心；文件只保留 DTO 类型并并入 `coreDto.ts` |
| `src/core/instructionEncoding.ts` 的解码 | `program.instructions` |
| `src/core/coreStateAdapter.ts` 的语义推导部分 | snapshot 直用；剩余纯格式化并入 `selectors.ts` |
| `coreStateAdapter.ts` 的 `traceFromDto` | `getTrace`；必须先通过 B11 对照才能删 |
| `tests/e2e/mock-smoke.spec.ts`、`coreBridge.ts` 的 `mock` 分支、`vite.config.ts` 的 mock 默认 | 开发也用 WASM：`pnpm dev` / `pnpm test` 先跑 `scripts/ensure-wasm.mjs`（0.3 第 6 项已批准） |

| 保留 | 原因 |
| --- | --- |
| `coreAdapter.ts`、`coreBridge.ts`、`wasmLoader.ts`、`wasmCoreAdapter.ts` | 唯一桥 |
| `coreDto.ts`（扩 v2） | 唯一契约 |
| `debuggerMutation.ts` 的输入校验 | 前端输入校验，不是语义 |
| `linker/types.ts`、`projectSession.ts` | 模块所有权与会话，不是链接算法 |
| `documents/`、`preferences/`、`i18n/`、`lessonProgress/`、`startupSelection/` | 不变量 |
| `src/transpiler/` | 见第 6 节 Phase 3 |
| `visual/instructionPathTemplates.ts`、`circuitLayout.ts`、`wirePaths.ts` | 展示配置，随新元件重画 |

测试迁移：38 个依赖 mock 的测试改为通过 `wasmLoader` 在 Node 里加载 WASM（`wasmCoreAdapter.test.ts` 已示范）。产物由 `scripts/ensure-wasm.mjs` 保证存在且不比 `cpp-core/` 旧；现有的 `describe.skip` 改为硬失败，缺产物时测试报错而不是跳过。历史冻结测试（`uiRegressionBoundary`、`phase20*`）凡与 v2 布局冲突的，保留其语义断言、更新其选择器，并在 PR 描述里逐条列出。

**已触发的一个冻结测试（待所有者批准迁移）。** `phase20gFinalGate.test.ts` 的 `no_new_network_request` 名字是查网络，实现却是 `git diff multi-program-linker-baseline-phase20f -- src` 不得有任何非测试文件变化，所以 `src` 里只要改一个文件它就失败。Phase 1 改了 `src`，它现在是红的，Phase 1 没有动它。建议的迁移分两步，两步都不删除、不跳过这条测试：

1. 历史审计固定到已冻结的提交范围：把比较改成 `multi-program-linker-baseline-phase20f..wcasl-replacement-final-gate-phase20g`。它继续证明“Phase 20G 这个阶段没有改生产代码”，而且永远成立。
2. 真正要守的行为另立检查：`src/tests/v2WorkbenchBoundary.test.ts` 里的 “production source makes no network request” 已经加上，它直接扫描全部非测试源码，不允许出现 `fetch(`、`XMLHttpRequest`、`WebSocket`、`EventSource`、`sendBeacon`。当前结果是零命中，无需白名单。

`phase21aX86ArchitectureGate.test.ts` 的 `x86_does_not_modify_comet_runtime` 是同一类问题，针对 `cpp-core/src`，Codex 在 Phase 0 会碰到，按同样方式处理。

本机另有一个与重构无关的现象：`core.autocrlf=true` 时 `public/_headers` 检出为 CRLF，`cloudflarePagesContract.test.ts` 会因此失败；把该文件恢复为 LF 后通过。

---

## 5. 分工：Claude 与 Codex

### 5.1 文件所有权（同一阶段内两边不碰对方文件）

| 负责人 | 目录 / 文件 |
| --- | --- |
| **Codex** | `cpp-core/**`、`scripts/build-wasm.ps1`、`scripts/verify-wasm-exports.mjs`、`scripts/ensure-wasm.mjs`、`src/core/coreAdapter.ts`、`src/core/coreDto.ts`、`src/core/coreBridge.ts`、`src/core/wasmLoader.ts`、`src/core/wasmCoreAdapter.ts`、`src/tests/wasm*.test.ts`、`src/tests/core*.test.ts`、`tests/golden/**`、`tests/e2e/wasm-smoke.spec.ts`、第 4 节删除清单的执行与测试迁移、`docs/core-bridge-contract.md`、`docs/developer/wasm-bridge.md`、`docs/developer/comet-vm.md`、`vite.config.ts` 后端选择 |
| **Claude** | `src/components/**`、`src/visual/**`、`src/styles/**`、`src/store/useAppStore.tsx`、`src/App.tsx`、`src/observation/**`、`src/i18n/**`、`src/core/selectors.ts`、`src/tests/*Ui*.test.tsx`、`tests/e2e/debugger-editing.spec.ts`、`tests/e2e/visual-review.spec.ts`、`docs/user/**`、`docs/circuit-visual-contract.md`、`docs/reference/keyboard-accessibility.md`、`docs/adr/**`（0.3 第 1、5 项的 ADR 与登记） |
| **共同（先改文档再改代码）** | 本文、`src/core/coreDto.ts` 的字段语义（Codex 写、Claude 评审）、`docs/README.md` |

### 5.2 顺序与依赖

```text
Phase 0  Codex   JsonWriter + Snapshot + 结构化跟踪 + 6 个导出 + CoreAdapterV2 + B01–B09、B11、B12   ← 其他一切的前提
Phase 1  Claude  连线 ADR + 快捷键登记（先）→ 元件 SVG 库 + 工作台布局壳 + token（不依赖数据）   ← 与 Phase 0 并行
Phase 1b Claude  接 snapshot/program/memory/history/trace，状态矩阵，F01–F12           ← 需要 Phase 0
Phase 2  Codex   删除 TS 核心与旧 CoreAdapter（V2 改名），测试迁移到 WASM，dev 默认 WASM，B10   ← 需要 Phase 1b 通过
Phase 3  Codex   （需批准）src/transpiler 移植到 cpp-core，golden = 10 个 cpp 示例的生成 CASL 逐字节一致
```

- Phase 1 不写临时适配层：Claude 先做不需要数据的部分，等 Phase 0 合并后再接数据。
- 每个 Phase 一个分支：`refactor/v2-core-phase0`、`refactor/v2-ui-phase1`……从 `wcasl-replacement-final-gate-phase20g` 切出，不碰 `phase21a-x86-architecture-gate`。
- 不 push、不 merge、不部署、不动 tag；完成后交项目所有者审查。

### 5.3 交接检查单（每个 PR 描述必含）

1. 改了哪些文件；是否全部在自己的所有权范围内。
2. 对照本文哪一节；若改了契约，本文对应小节的 diff。
3. 实际运行的命令与结果（见 6.2 矩阵），失败项与未运行项如实列出。
4. 历史冻结测试的处理说明。
5. 已知限制。

---

## 6. 代码质量门禁

### 6.1 C++

- 编译零警告（2.6 节 flags），`clang-format` 零 diff。
- 无 `new/delete/malloc`、无裸指针所有权、无 `using namespace std`、无跨 ABI 异常。
- 每个新导出至少 3 个单测：正常、边界、非法输入。
- 新增代码不得改变 `tests/golden` 任何一个文件。

### 6.2 命令矩阵（交付前全部运行）

```text
cmake -S cpp-core -B cpp-core/build && cmake --build cpp-core/build && ctest --test-dir cpp-core/build
pnpm build:wasm
pnpm docs:verify
pnpm casl:parity:verify
node scripts/verify-wasm-exports.mjs
pnpm test            （Phase 2 后在 WASM 下运行）
pnpm test:wasm
pnpm test:e2e:wasm
pnpm build:production
pnpm tauri:verify    （有 Rust 工具链时）
```

### 6.3 架构测试（Vitest，Phase 1b 起）

- `src/components`、`src/visual`、`src/store` 不得 import `src/core/instructionEncoding`、`mockCaslCore`、`mockCoreAdapter`、`src/linker/caslLinker`。
- 只有 `src/core/wasmCoreAdapter.ts` 可以 import `wasmLoader.ts`。
- 只有 `src/store/useAppStore.tsx` 可以 import `coreBridge.ts`。
- 切换标签/语言/布局的测试中，`coreBridge` 的写操作 spy 调用次数为 0。

### 6.4 完成定义

一个 Phase 完成 = 该 Phase 的验收 ID 全部通过 + 6.2 矩阵全绿 + 本文无待更新项 + 项目所有者审查通过。

---

## 7. 附录

### 7.1 snapshot profile 下 `step` 的返回示例（TBLSUM，LD GR3,TBL,GR1 的地址送出阶段）

```json
{"ok":true,"snapshot":{"programRevision":3,"runState":"Ready","stepCount":13,"pr":55,"sp":65532,"callDepth":1,"ir0":4145,"ir1":59,"mar":60,"mdr":7,"gr":[0,1,5,0,0,0,0,0],"fr":{"of":false,"sf":true,"zf":false},"historyEpoch":3,"timelineRevision":52,"reverseAvailability":{"available":true,"reason":"available","targetPhase":"effective-address"},"reverseInstructionAvailability":{"available":true,"reason":"available","instructionId":14,"machineAddress":53,"instructionKind":"LD","reversibleMicrosteps":4,"complete":false},"history":{"retainedEntries":52,"capacity":1000,"floorSequence":1,"droppedEntryCount":0},"microcycle":{"granularity":"microcycle","phases":["fetch","decode","effective-address","operand-read","execute","write-back","flag-update","complete"],"phase":"operand-read","instructionAddress":53,"instructionKind":"LD","sourceLine":12,"index":4,"total":8,"instructionComplete":false,"historySequence":52,"detail":"MDR <- M[003C] = 0007"},"current":{"instructionAddress":53,"sourceLineIndex":12,"instructionText":"LD GR3,TBL,GR1"},"last":{"instructionKind":"LD","memoryReadAddress":60,"memoryWriteAddress":null,"registerWriteIndex":null,"baseAddress":59,"indexRegister":1,"indexValue":1,"effectiveAddress":60},"changes":{"registers":[{"name":"MDR","before":59,"after":7}],"memory":[],"memoryTruncated":false},"console":{"recordCount":0},"traceCount":52},"appendedConsoleRecords":[],"diagnostics":[]}
```

### 7.2 术语

| 词 | 含义 |
| --- | --- |
| 快照 snapshot | 一次写操作后的轻量运行时状态，不含程序镜像与内存窗口 |
| 程序镜像 program | 汇编/链接产物的静态部分，按 `programRevision` 缓存 |
| 变更集 changes | 本次操作前后不同的寄存器与内存字，用于黄底与 R/W 标记 |
| 历史 history | 核心保留的 ≤ 1000 条微周期记录，只读导出 |
| legacy profile | 旧的全量 state 返回格式，仅供 golden 与迁移期使用 |

### 7.3 本文的修订规则

- 改 ABI / DTO：先改 2.2、2.3，再改代码，PR 里附本文 diff。
- 改布局 / 状态矩阵：先改 3.1–3.3，再改代码。
- 0.3 任何一项改判：改 0.3 的表，在 7.4 追加一行，并同步修改受影响的章节与契约文档。

### 7.5 进度记录

| 日期 | 阶段 | 完成 | 未完成 / 留给下一步 |
| --- | --- | --- | --- |
| 2026-11-09 | Phase 1b（Claude），同一分支，已本地提交 | 新数据通路替换旧电路并接上动效；应用改为工作台外壳（顶栏、常驻代码栏、工作区、可收起的输出面板、控制栏）；断点与运行到断点；全局快捷键；运行状态的文字提示；3.3 状态矩阵补齐；三语言 × 四种宽度 × 四个视图共 48 个组合实测无整页溢出、工具栏不换行、数据通路不低于 600px；端到端用例迁移到新 DOM 并逐条入账；修掉一个基线上就有的调试器对话框缺陷；版本升到 1.0.0 | 与 3.8 表所列相同；旧电路文件的删除、Phase 0（快照协议）与 Phase 2（删除 TS mock）归 v1.1 |
| 2026-11-09 | Phase 1（Claude），分支 `refactor/v2-ui-phase1`，已本地提交 | ADR 0023 与契约、键盘文档；`--cv-*` token；`src/visual/datapath`（十个元件、总线、控制线、活动路径、六个样例）；`src/components/workbench`（布局壳、阶段药丸）；三语言文案；开发预览页 `?preview=workbench`；新增 43 个测试 | 活动路径只覆盖取指、LD、ST、算术；跳转、栈、LAD 的路径在 1b 接数据时补。只看数据布局下数据通路靠横向滚动保持可读，专门的紧凑画法留到 1b。动效层已按 ADR 0024 接入，但“回退时不播放”要等 1b 接上真实执行才能在应用里验证。冻结测试 `no_new_network_request` 待批准迁移 |

### 7.4 决定记录

| 日期 | 决定 | 由谁 |
| --- | --- | --- |
| 2026-11-09 | 0.3 六项按建议确定：1 批准（箭头仅限活动路径，先写 ADR）；2 不做；3 不新增；4 批准断点、运行到断点、自由输入地址，自动播放速度不进 v2；5 批准；6 批准 | 项目所有者确认“按建议全部定”；第 1、4、5、6 项的具体走向由 Claude 补全，待所有者复核 |
| 2026-11-09 | 第 3 项改判：批准给新数据通路加动效，规则落为 ADR 0024 | 项目所有者（“想要更多动画”） |
| 2026-11-09 | v1.0 目标：实现重构后的 1.0 版，测试完毕后直接替换上线；范围选方案 A（新界面先上线，Phase 0 与 Phase 2 归 v1.1） | 项目所有者 |
| 2026-11-09 | 3.8 表里各项落地方式与原设计稿不同，含更正 3.3 中 WaitingInput 的“停止可用” | Claude 决定并记录，待项目所有者复核 |
| 2026-11-09 | 生产 CSS 预算由 180,000 提高到 200,000 字节，基线升为 v3（8.5 的“甲”）。清理旧样式后应把预算降回去 | 项目所有者（“提高预算到 200K”） |
| 2026-11-09 | 冻结测试 `focus_mode_works_at_1280x720` 里“整页滚动”的两条断言改为“所在栏滚动、整页不溢出”，因为外壳改为占满视口、各区域各自滚动（3.1） | Claude，依据 3.1；逐条记录在测试迁移记录里 |

---

## 8. v1.0 目标与上线门禁

项目所有者于 2026-11-09 设定：**实现重构后的 ver1.0，测试完毕后直接替换线上版本。** 本节把这句话变成可以逐条核对的门禁。门禁全部满足之前不上线；全部满足之后按 8.3 执行，不再逐项请示。

### 8.1 v1.0 的范围（两个方案，待所有者确认一个）

| | 方案 A：新界面先上线（建议） | 方案 B：完整标准一次上线 |
| --- | --- | --- |
| 内容 | Phase 1 + 1b：工作台界面替换旧界面，3.2 表里的功能全部可用，动效按 ADR 0024 | 方案 A 的全部，再加 Phase 0（快照协议、结构化跟踪进核心）与 Phase 2（删除 TS mock、测试全部迁到 WASM） |
| 线上核心 | 与现在相同：C++ 编成的 WASM。生产构建现在就强制用 WASM | 相同 |
| 仍留在 TS 的 | 只在开发和测试里用的 mock；跟踪面板的拼装；C++ 子集转译器 | 只剩 C++ 子集转译器（Phase 3） |
| 依赖 | 只依赖前端，Claude 可以独立做完 | C++ 侧必须先完成。标准里归 Codex；所有者也可以指定由 Claude 来做，本机已装 Emscripten |
| 风险 | 小：核心一行不动，只换界面 | 大：界面、协议、核心桥接、测试基座同时变 |
| 之后 | Phase 0 与 Phase 2 作为 v1.1 | 无 |

方案 A 于 2026-11-09 由项目所有者选定。实际的适配范围比上面原先设想的更窄：只有数据通路是新写的，它由 `src/visual/datapath/fromCometState.ts` 把现有的 `CometState` 投影成 `DatapathViewModel`；其余面板原样复用，继续直接读现有 store。这个适配文件只做字段对应、把运行时报告的连线名对到新路径上、以及前后两次状态的差分，不含任何指令语义。Phase 0 完成后只替换这个文件的输入类型，画布与外壳不用改。这一条取代 5.2 里“Phase 1 不写临时适配层”的说法。

### 8.2 上线门禁（全部为真才上线）

1. 功能：F01、F02 通过，即 3.2 表逐项可操作，3.3 的状态矩阵与表一致。
2. 验收：交接文件的 A01–A14 与本文 F03–F15 通过。方案 B 另加 B01–B12。
3. 测试：6.2 的命令矩阵全部通过，单元测试 0 失败。冻结测试已按第 4 节批准的方案迁移，不是删除或跳过。
4. 构建：`build:production`、`test:e2e:production`、`test:e2e:production:subpath` 通过；有 Rust 工具链时 `tauri:verify` 通过。
5. 实看：三语言 × 1180 / 1280 / 1440 / 1920 四种宽度，无整页横向溢出、无遮挡。
6. 旧界面专属的测试已按 ADR 0023 的迁移规则处理，并在提交说明里逐条列出。
7. 版本与文档：`package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 同为 1.0.0；全部 canonical 文档的 `Last reviewed version` 同步（`verify-docs` 强制检查）；CHANGELOG 有 1.0.0 条目；用户文档描述的是新界面。
8. 工作树干净，全部改动已提交在重构分支上。

### 8.3 上线步骤（所有者已预先授权）

事实：`master` 现在就是线上版本，与 `wcasl-replacement-final-gate-phase20g` 是同一个提交。推送到 `origin`（LMstugx/stugx-casl）的 `master` 会触发 Cloudflare Pages 的生产部署。

1. 给当前 `master` 打回滚标签 `pre-v1.0-live`。
2. 把重构分支快进合并到 `master`。不能快进就停下来报告，不强推。
3. 推送 `master` 与标签到 `origin`。
4. 等 Cloudflare 构建完成，运行 `verify:deployed` 与 `test:e2e:deployed`。
5. 通过：打 `v1.0.0` 标签并报告。不通过：按 [Cloudflare Pages runbook](../cloudflare-pages-git-runbook.md) 在 Cloudflare 的部署历史里回滚到上一个成功部署，不改写 git 历史，然后报告。

### 8.4 不会做的事

- 门禁没有全绿就上线。
- 为了变绿而删测试、跳过测试或放宽断言。
- 强推、改写历史、移动旧 tag。
- 把 `phase21a-x86-architecture-gate` 上的 x86 设计提交带进 `master`。

### 8.5 门禁核对结果（2026-11-09，分支 `refactor/v2-ui-phase1`）

**结论：第 4 项不通过，没有上线。** 线上仍是 0.1.0，`master` 没有动，没有推送任何东西。

| # | 门禁 | 结果 | 依据 |
| --- | --- | --- | --- |
| 1 | 功能 F01、F02 | 通过，但落地方式与设计稿有差异 | 3.2 表里每一项都可操作；差异逐项列在 3.8，待所有者复核是否接受 |
| 2 | 验收 A01–A14、F03–F15 | 大部分通过，三项未验证 | 未验证：A14 里的 Tauri；F10 的性能数字（没有单独计量）；A12 的“Stop 响应及时”只有功能测试，没有计时 |
| 3 | 测试 | 通过，有一个偶发问题要说明 | 单元 1711 通过、0 失败；WASM 适配 26 通过；C++ 核心 91 通过；端到端（mock、wasm 各含工作台用例）89 条、视觉审查 3 条。多次整套运行里，“保存期间并发编辑”这一类用例偶发失败过 4 次，涉及三条用例，同一个根因；单独重复 48 次全部通过。见下 |
| 4 | 构建 | **不通过** | `build:production` 被体积预算拦下：生产 CSS 195,364 字节，预算 180,000，超出 15,364。其余预算都通过（初始 JS 3,085,410 / 3,150,000，全部 JS 3,337,416 / 3,400,000，WASM 196,144 / 300,000，总计 3,732,312 / 3,900,000）。构建产物本身可用：生产冒烟测试通过。`test:e2e:production:subpath` 与 `tauri:verify` 依赖构建通过，没有运行 |
| 5 | 实看 | 通过，有一处限制 | 三语言 × 1180 / 1280 / 1440 / 1920 × 四个视图共 48 个组合：无整页溢出，工具栏一行，数据通路不低于 600px。限制：CASL 视图在 700 和 720 高的窗口里，数据通路下方有 76 到 153px 要在它那一栏里滚动才能看到 |
| 6 | 旧界面专属测试 | 通过 | 逐条记录在 [测试迁移记录](v2-test-migration.md)。旧电路文件及其测试保留到 v1.1 |
| 7 | 版本与文档 | 通过 | 三处版本号为 1.0.0；89 个 canonical 文档通过 `verify-docs`；更新日志有 1.0.0；界面总览与键盘参考已改写 |
| 8 | 工作树 | 通过 | 全部改动已提交在重构分支上，未推送 |

#### 第 4 项为什么不能由 Claude 自己解决

`docs/production-size-budget.json` 是经过评审的硬预算。上一次提高它（Phase 20F，175,000 到 180,000）是随功能一起评审并升了基线版本的。v1.0 新增了数据通路与工作台两份样式，压缩后约 19KB；上线前的 CSS 是 176,679 字节，离预算只有 3KB 余量。

试过靠清理来补：把旧电路专用的样式全部删掉省约 6.5KB（压缩后），把所有不再有元素使用的类一起删掉省约 9KB，都不够 15.4KB。要回到 180,000 以内，得重整 `app.css` 里层层覆盖的旧布局规则，这是一次要配视觉回归的独立工作。

所以有两条路，都需要所有者决定：

- 甲：批准把 CSS 预算提高到 200,000 并把基线升到 v3，理由同 Phase 20F。之后重新跑第 4 项，通过即可按 8.3 上线。
- 乙：不动预算。先做 v1.1 里的清理（删除旧电路组件及其 84 条专属测试并逐条入账、重整旧布局样式），把 CSS 降回 180,000 以内，再上线。

#### 偶发失败的根因（既有问题，在冻结范围内，没有改）

三条用例守的是同一件事：保存还没完成时又改了源码，保存完成后文档仍应是“未保存”。实现里，保存完成时读的是上一次渲染留下的文档引用。如果编辑发生在保存完成前的同一小段时间里，React 还没来得及渲染，读到的就是旧文档，于是判成“已保存”。人手操作碰不到这个时间窗，自动化测试在机器高负载时偶尔碰到。

这属于文档生命周期，是不变量，Claude 没有改。建议的修法是保存完成时先让出一次事件循环再判断是否仍有未保存的修改；它只改时序，不改语义，但要所有者批准。

#### 另外发现并已修掉的两处

- 调试器编辑对话框会先画一帧上一个编辑对象的草稿。基线上就有，已修，有测试。
- 视觉审查脚本里一处没有等待写入挂起，已补等待，断言未改。

### 8.6 复核（2026-11-09，所有者决定提高 CSS 预算之后）

项目所有者选了 8.5 里的“甲”：CSS 预算提高到 200,000 字节，基线升为 v3。据此重新核对了 8.5 里不通过和未验证的各项。

| # | 门禁 | 结果 | 依据 |
| --- | --- | --- | --- |
| 1 | 功能 F01、F02 | 通过 | 与 8.5 相同。3.8 的差异仍待所有者复核，所有者已知情 |
| 2 | 验收 A01–A14、F03–F15 | 通过 | 8.5 里未验证的三项已补验，见下 |
| 3 | 测试 | 通过 | 类型检查通过；单元 1711 通过、0 失败；WASM 适配 26 通过；C++ 核心 91 通过；端到端（mock 与 wasm，含工作台用例）89 条全部通过。视觉审查 3 条里这一次 2 条通过，1 条撞上 8.5 记录的保存竞态；它不在 6.2 的命令矩阵里，根因与处理意见不变 |
| 4 | 构建 | 通过 | `build:production` 通过，CSS 195,364 / 200,000；`test:e2e:production` 与 `test:e2e:production:subpath` 通过；`tauri:build` 生成 1.0.0 安装包，`tauri:verify` 通过 |
| 5 | 实看 | 通过 | 与 8.5 相同 |
| 6 | 旧界面专属测试 | 通过 | 与 8.5 相同 |
| 7 | 版本与文档 | 通过 | 与 8.5 相同；预算变更写入了 `docs/production-build-contract.md` |
| 8 | 工作树 | 通过 | 全部提交 |

补验的三项，都在生产构建（WASM 核心）上量，1440×900，无头 Chromium：

- **F10 性能。** 从核心状态到达页面，到显示它的那一帧画完：指令单步中位数约 5ms，最大 12.3ms；微周期单步中位数 4.1ms，p95 6.9ms，最大 12.2ms。两轮共 600 个微步样本，没有一个达到 16ms。如果切换观察标签之后不等画面刷新就立刻单步，标签切换和单步会落在同一帧里，两者合计最多 17.9ms；这量的是两个操作，不是一步。
- **F10 / A13 不增长。** 300 个微步，每 5 步切一次观察标签、每 20 步切一次布局：存活的 ResizeObserver 始终 1 个、MutationObserver 始终 1 个；DOM 节点数 1064 → 1104 → 1100 → 1100；数据通路是同一个节点。主存只渲染窗口：检查器 64 行，数据通路 12 行。
- **A12 Stop 响应。** 无限循环运行中点击 Stop，到机器报告 Stopped：2.2 到 5.1ms（5 次）。
- **A14 Tauri。** 桌面演示版在本机完整构建并通过 `tauri:verify`。

3.6 里“状态直接进 store、不经过推导层”等几条是 Phase 0 之后的结构目标，方案 A 下不适用；这里核对的是其中可以量的那一条。

**结论：8.2 的八项全部为真，按 8.3 上线。**

上线后仍然留给所有者的两件事：复核 3.8 的差异；决定是否批准 8.5 里对保存竞态的修法。

### 8.7 上线记录

| 时间（UTC） | 事件 |
| --- | --- |
| 2026-11-09 08:12 | 给上线前的 `master`（37c2230，0.1.0）打标签 `pre-v1.0-live`；`master` 快进到 2095ed9（1.0.0）；推送 `master` 与该标签。没有强推，没有改写历史 |
| 2026-11-09 08:13 | Cloudflare Pages 对 2095ed9 的构建失败，距推送约 85 秒。线上没有变化：Cloudflare 继续提供上一次成功的部署（0.1.0），网站正常 |

对这次失败的排查，都在本机完成，因为构建日志要登录 Cloudflare 控制台才能看：

- 从 GitHub 重新克隆 `master` 到一个干净目录，按云端同样的入口执行 `pnpm install --frozen-lockfile` 与 `pnpm build`（含 `prebuild` 的文档、更新日志、兼容性三项校验）：全部通过。
- Linux 才会暴露的问题逐项查过：导入路径与文档链接的大小写、入库文件的换行符、构建所需但未入库的文件，都没有问题。
- 构建脚本要下载的三样东西都还在：固定版本的 CMake 压缩包、Emscripten SDK 的 6.0.2 标签及其二进制包、pnpm 11.7.0。

85 秒不够走完整个构建，失败发生在下载工具链或编译 WASM 这一段，这一段 1.0.0 没有改动过。所以先按偶发的云端问题处理：这一节的提交推送到 `master`，Cloudflare 会重新构建。如果再次失败，就需要所有者提供 Cloudflare 的构建日志，不再重试。

之前漏掉的一点：8.5 和 8.6 的构建核对是直接调用构建脚本做的，绕过了 `pnpm build` 的 `prebuild` 钩子，其中的更新日志校验当时没有运行。这次已在干净克隆里补跑并通过。
