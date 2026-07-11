# I18n Glossary

## Glossary Principles

English is the canonical key language. Japanese uses terms common in Japanese computing education, and Simplified Chinese uses common mainland Chinese computing terminology. One concept has one approved translation per context. Toolbar labels may use an approved compact form while explanatory prose uses the canonical full form; these alternatives are documented rather than improvised in components.

Technical identifiers and machine data remain unchanged. CASL II mnemonics, COMET II instruction names, `GR0-GR7`, `PR`, `SP`, `FR`, `MAR`, `MDR`, `IR`, hexadecimal addresses, machine words, source code, Generated CASL, labels, symbols, and raw Trace payloads are not translated. Missing locale resources fall back to English, and an empty string must never suppress that fallback.

## Application Actions

| Canonical English | Approved Japanese | Approved Simplified Chinese | Context / usage note |
| --- | --- | --- | --- |
| New | 新規 | 新建 | Compact toolbar label. |
| Open | 開く | 打开 | Compact toolbar label. |
| Save | 保存 | 保存 | Compact toolbar label. |
| Assemble | アセンブル | 汇编 | CASL build action; do not substitute a generic compile term. |
| Run | 実行 | 运行 | Continuous execution. |
| Step | ステップ実行; compact: ステップ | 单步执行; compact: 单步 | Toolbar uses the approved compact form. |
| Reset | リセット | 重置 | Restores execution state. |
| Stop | 停止 | 停止 | Manual execution stop, not pause. |
| Clear | クリア | 清除 | Clears the current output view. |
| Select | 選択 | 选择 | Selection command or instruction. |
| Go | 移動 | 转到 | Memory address navigation. |
| Read | 読み取り | 读取 | Memory read relation or filter. |
| Write | 書き込み | 写入 | Memory write relation or filter. |

## Execution States

| Canonical English | Approved Japanese | Approved Simplified Chinese | Context / usage note |
| --- | --- | --- | --- |
| Ready | 準備完了 | 就绪 | Ready to execute; not Finished. |
| Dirty | 変更あり | 已修改 | User-facing unsaved/changed source state, not an internal engineering label. |
| Not loaded | 未読み込み | 未加载 | No assembled program is loaded. |
| Running | 実行中 | 运行中 | Continuous execution is active. |
| Stopped | 停止 | 已停止 | Execution was stopped; not Paused. |
| Finished | 完了 | 已完成 | Program reached its finish state. |
| Error | エラー | 错误 | Error state. |
| Assembled | アセンブル済み | 已汇编 | Assembly completed successfully. |
| Paused | 一時停止 | 已暂停 | Reserved for a future pause state; do not use for Stop. |
| Max steps reached | 最大ステップ数到達 | 达到最大步数 | Execution safety limit. |
| Manual stop | 手動停止 | 手动停止 | Explicit user stop. |

## Main UI Areas

| Canonical English | Approved Japanese | Approved Simplified Chinese | Context / usage note |
| --- | --- | --- | --- |
| Source | ソース | 源码 | Panel title; source code itself is never translated. |
| Inspector | インスペクター | 检查器 | Context inspection panel. |
| Registers | レジスタ | 寄存器 | Panel title; register names remain unchanged. |
| Memory | メモリ | 内存 | Main memory view. |
| Source Map | ソースマップ | 源码映射 | Use this single translation consistently. |
| Trace | トレース | 跟踪 | Chinese must not mix 跟踪 and 追踪. |
| Output Log | 出力ログ | 输出日志 | Bottom dock tab. |
| Console | コンソール | 控制台 | Bottom dock tab. |
| Messages | メッセージ | 消息 | Bottom dock tab. |
| Generated CASL | 生成CASL | 生成的 CASL | Title only; generated source remains unchanged. |
| Machine Code | 機械語 | 机器码 | Panel/tab title. |
| Circuit Focus | 回路フォーカス | 电路聚焦 | Mode label. |
| Observation Mode | 観察モード | 观察模式 | Mode selector label. |
| CPU Flow | CPUフロー | CPU 流程 | Observation mode option. |
| Register / Stack | レジスタ / スタック | 寄存器 / 栈 | Observation mode option. |
| Code / Machine | コード / 機械語 | 代码 / 机器码 | Observation mode option. |

## Learning And Explanation Terms

| Canonical English | Approved Japanese | Approved Simplified Chinese | Context / usage note |
| --- | --- | --- | --- |
| Current Instruction | 現在の命令 | 当前指令 | Panel title may use the shorter Instruction where space is constrained. |
| Current Source Mapping | 現在のソース対応 | 当前源码映射 | Explanatory title. |
| Step Timeline | ステップタイムライン | 单步时间线 | Teaching panel title. |
| Signal Probe | 信号プローブ | 信号探针 | Teaching panel title. |
| Stack Preview | スタックプレビュー | 栈预览 | Live stack memory preview. |
| Call Stack | コールスタック | 调用栈 | Call-depth teaching view. |
| Stack Frame View | スタックフレーム表示 | 栈帧视图 | Design-preview panel. |
| Frame Slot | フレームスロット | 帧槽位 | Design-only metadata slot. |
| Design preview | 設計プレビュー | 设计预览 | Must be paired with Not runtime state where needed. |
| Not runtime state | 実行時状態ではない | 非运行时状态 | Approved compact badge; explanatory prose may use a full sentence. |
| Current lowering | 現在の変換方式 | 当前转换方式 | Current static-label/register strategy. |
| Future frame slot | 将来のフレームスロット | 未来帧槽位 | Future design, not a live value. |
| Related Frame Symbols | 関連フレームシンボル | 相关帧符号 | Compact source relation list. |

## Machine Concepts

| Canonical English | Approved Japanese | Approved Simplified Chinese | Context / usage note |
| --- | --- | --- | --- |
| Register | レジスタ | 寄存器 | Generic concept; names such as GR1 remain unchanged. |
| Memory | メモリ | 内存 | Generic concept. |
| Stack | スタック | 栈 | Generic concept. |
| Instruction | 命令 | 指令 | CASL mnemonic remains unchanged. |
| Operand | オペランド | 操作数 | Instruction operand. |
| Address | アドレス | 地址 | Hexadecimal value remains unchanged. |
| Value | 値 | 值 | Table heading. |
| Label | ラベル | 标签 | Symbol spelling remains unchanged. |
| Opcode | オペコード | 操作码 | Opcode value remains unchanged. |
| Machine word | 機械語ワード | 机器字 | Explanatory prose. |
| Control flow | 制御フロー | 控制流 | Teaching explanation. |
| Effective address | 実効アドレス | 有效地址 | EAU concept; `EA` may remain as the compact technical label. |
| Index register | インデックスレジスタ | 变址寄存器 | Register name remains unchanged. |
| Return address | 戻りアドレス | 返回地址 | CALL/RET concept. |
| Function argument | 関数引数 | 函数参数 | GR1-GR3 names remain unchanged. |
| Return value | 戻り値 | 返回值 | GR0 name remains unchanged. |

## Status And Relation Terms

| Canonical English | Approved Japanese | Approved Simplified Chinese | Context / usage note |
| --- | --- | --- | --- |
| Selected | 選択済み | 已选择 | Navigation/selection state, not active execution. |
| Active | アクティブ | 活动 | Execution relation; use supporting borders/labels as well as color. |
| Changed | 変更済み | 已更改 | Changed value state, not an error. |
| Read | 読み取り | 读取 | Memory operation. |
| Write | 書き込み | 写入 | Memory operation. |
| Target | 対象 | 目标 | Address/row target. |
| Current | 現在 | 当前 | Current row/value. |
| Previous | 前 | 上一项 | Compact table heading. |
| Next | 次 | 下一项 | Compact table heading. |
| Source | ソース | 源码 | Table heading; content remains unchanged. |
| Mapping | 対応 | 映射 | Source/CASL relation. |
| Meaning | 意味 | 含义 | Explanation column. |
| Details | 詳細 | 详情 | Details control or heading. |
| Compact | コンパクト | 紧凑 | Compact-view control. |
| No output | 出力なし | 无输出 | Empty state. |
| No diagnostics | 診断なし | 无诊断 | Empty state; diagnostic bodies remain deferred. |

## Short-Form And Context Rules

- Toolbar labels use approved compact forms, notably `Step`: ステップ / 单步.
- Panel titles use short noun phrases. Explanatory prose may use a fuller grammatical form.
- `Generated CASL`, `Machine Code`, `Source Map`, and `Trace` use the approved panel-title forms above everywhere.
- Long teaching explanations, diagnostics, Lessons, Demo descriptions, and FramePlan prose are deferred. Their eventual translations may use full forms, but must not introduce competing terminology.
- Empty strings are invalid translations. Partial Japanese and Chinese resources rely on English fallback until a term is reviewed.

## Phase 14C Circuit And Learning Terms

| Canonical English | Approved Japanese | Approved Simplified Chinese | Compact label | Context / usage note |
| --- | --- | --- | --- | --- |
| Fetch | フェッチ | 取指 | same | Pipeline stage, not a CASL mnemonic. |
| Decode | デコード | 译码 | same | Pipeline stage. |
| Operand Read | オペランド読出し | 操作数读取 | same | Pipeline stage. |
| Execute | 実行 | 执行 | same | Pipeline stage. |
| Write Back | 書込み | 写回 | same | Pipeline stage. |
| Effective Address | 実効アドレス | 有效地址 | EA remains technical | EAU explanation. |
| Current Source Mapping | 現在のソース対応 | 当前源码映射 | same | Source/CASL/machine relation panel. |
| Signal Probe | 信号プローブ | 信号探针 | same | Read-only learning panel. |
| Stack Preview | スタックプレビュー | 栈预览 | same | Live stack memory preview. |
| Call Stack | コールスタック | 调用栈 | same | Call-depth teaching view. |
| Stack Frame View | スタックフレーム表示 | 栈帧视图 | same | Design-preview panel only. |
| Design preview | 設計プレビュー | 设计预览 | same | Must remain paired with the runtime-state boundary. |
| Not runtime state | 実行時状態ではない | 非运行时状态 | same | Compact badge; never implies live frame slots. |
| Current lowering | 現在の変換方式 | 当前转换方式 | 現在の変換 / 当前转换 | Static-label/register strategy. |
| Future storage | 将来の格納先 | 未来存储 | same | Future FramePlan relation. |
| Program finish | プログラム終了 | 程序结束 | same | Program terminal flow. |
| Top-level finish | トップレベル終了 | 顶层结束 | same | Top-level RET mode. |
| Runtime state | 実行時状態 | 运行时状态 | same | State label; values remain technical. |
| Selection source | 選択元 | 选择来源 | same | Origin of a UI-only FramePlan selection. |
| Source Editor | ソースエディタ | 源码编辑器 | same | Selection-source value; source content remains unchanged. |
| Source Context | ソースコンテキスト | 源码上下文 | same | Selection-source value and compact panel title. |
| Control Flow Target | 制御フロー対象 | 控制流目标 | same | Machine-code explanation heading. |
| Edge Kind | エッジ種別 | 边类型 | same | Control-flow relation heading. |

`CALL`, `RET`, `FETCH`, `READ`, `WRITE`, `EXEC`, and `FLAG` remain unchanged when they are literal machine mnemonics or technical identifiers. The translated forms above apply only to explanatory labels and pipeline/status UI.

## Terms That Remain Untranslated

`LD`, `ST`, `ADDA`, `CALL`, `RET`, and all other CASL II mnemonics; COMET II instruction names; `GR0-GR7`, `PR`, `SP`, `FR`, `MAR`, `MDR`, `IR`, `EAU`, and `ALU`; hexadecimal addresses; machine words; source code; Generated CASL lines; identifiers, labels, and symbol names; and raw Trace technical payloads remain unchanged in every locale.

## Phase 14D Diagnostic Terms

| Canonical English | Approved Japanese | Approved Simplified Chinese | Context / usage note |
| --- | --- | --- | --- |
| Diagnostic | 診断 | 诊断 | Structured compiler/assembler/VM report. |
| Error | エラー | 错误 | Severity; not a normal execution state. |
| Warning | 警告 | 警告 | Severity. |
| Information | 情報 | 信息 | Informational severity. |
| Unknown symbol | 未定義のシンボル | 未定义符号 | Symbol spelling remains verbatim. |
| Duplicate label | 重複したラベル | 重复标签 | Label spelling remains verbatim. |
| Invalid register | 無効なレジスタ | 无效寄存器 | Register token remains verbatim. |
| Invalid operand | 無効なオペランド | 无效操作数 | Operand token remains verbatim. |
| Expected | 期待値 | 预期值 | Prefer named count/value parameters. |
| Actual | 実際の値 | 实际值 | Prefer named count/value parameters. |
| Missing | 不足 | 缺少 | Diagnostic phrase, not an empty-state label. |
| Unsupported | 未対応 | 不支持 | Feature/subset boundary. |
| Out of range | 範囲外 | 超出范围 | Address/literal boundary. |
| Source location | ソース位置 | 源码位置 | Separate from translated message. |
| Line | 行 | 行 | User-visible values remain 1-based. |
| Column | 列 | 列 | Only shown when producer supplies it. |
| Step limit | ステップ上限 | 步数上限 | Execution guard. |
| Stack underflow | スタックアンダーフロー | 栈下溢 | Reserved; not currently emitted as a user diagnostic. |
| Stack overflow | スタックオーバーフロー | 栈溢出 | Reserved; not currently emitted as a user diagnostic. |
| Invalid memory access | 無効なメモリアクセス | 无效内存访问 | Address remains verbatim. |
| Argument count | 引数の数 | 参数数量 | Use `expectedCount` and `actualCount`. |
| Recursion | 再帰 | 递归 | Currently unsupported in the C++ subset. |
