export type ReleaseChannel = "stable" | "preview" | "desktop-demo";

export type ReleaseSectionType = "added" | "improved" | "fixed" | "security" | "docs" | "known-issues";

export interface LocalizedReleaseText {
  en: string;
  ja: string;
  "zh-CN": string;
}

export interface ReleaseSection {
  type: ReleaseSectionType;
  items: readonly LocalizedReleaseText[];
}

export interface ReleaseNote {
  version: string;
  date: string;
  channel: ReleaseChannel;
  title: LocalizedReleaseText;
  summary: LocalizedReleaseText;
  sections: readonly ReleaseSection[];
  commit?: string;
  tag?: string;
  webUrl?: string;
}

export const RELEASE_CHANNELS = ["stable", "preview", "desktop-demo"] as const satisfies readonly ReleaseChannel[];

export const RELEASE_SECTION_ORDER = [
  "added",
  "improved",
  "fixed",
  "security",
  "docs",
  "known-issues"
] as const satisfies readonly ReleaseSectionType[];

export const CANONICAL_REPOSITORY_URL = "https://github.com/LMstugx/stugx-casl";
export const PUBLIC_WEB_URL = "https://stugx-casl.pages.dev/";

export const RELEASES: readonly ReleaseNote[] = [
  {
    version: "1.0.0",
    date: "2026-11-09",
    channel: "stable",
    title: {
      en: "The workbench",
      ja: "ワークベンチ",
      "zh-CN": "工作台"
    },
    summary: {
      en: "The interface is rebuilt as one workbench around a redrawn COMET II datapath. The C++ core and its behaviour are unchanged.",
      ja: "インターフェースを、描き直した COMET II データパスを中心とする一つのワークベンチとして作り直しました。C++ コアとその動作は変わりません。",
      "zh-CN": "界面重做为围绕全新 COMET II 数据通路的单一工作台。C++ 核心及其行为没有变化。"
    },
    sections: [
      {
        type: "added",
        items: [
          {
            en: "One workbench frame for every view: tool bar, source pane, datapath with the data beside it, output dock, and control bar. The page no longer scrolls; each region scrolls on its own.",
            ja: "すべてのビューに共通のワークベンチ枠：ツールバー、ソース欄、データパスとその横のデータ、出力ドック、コントロールバー。ページ全体はスクロールせず、各領域が個別にスクロールします。",
            "zh-CN": "所有视图共用一个工作台外壳：工具栏、代码栏、数据通路及其旁边的数据、输出面板和控制栏。整页不再滚动，各区域各自滚动。"
          },
          {
            en: "A redrawn datapath with real component shapes. Buses are always drawn, a path gets colour and an arrowhead only while the current step uses it, and a rewritten value keeps its previous value beside it.",
            ja: "部品の形を持つ新しいデータパス。バスは常に描かれ、経路は現在のステップが使う間だけ色と矢印が付き、書き換えられた値の横には直前の値が残ります。",
            "zh-CN": "重新绘制的数据通路，元件有各自的外形。总线始终画出，路径只在当前这一步用到时才着色并带箭头，被改写的值旁边保留原值。"
          },
          {
            en: "Step animation: after a forward step the control signal, the value travelling along its path, and a pulse where it lands play once. Reverse steps play nothing, and nothing moves when the system asks for reduced motion.",
            ja: "ステップのアニメーション：前進ステップの後に、制御信号、経路を移動する値、到着点のパルスを一度だけ再生します。逆方向のステップでは再生せず、システムが動きの軽減を求めている場合は何も動きません。",
            "zh-CN": "单步动画：正向执行一步后，依次播放一次控制信号、沿路径移动的数值和落点的闪烁。回退不播放；系统要求减少动态效果时没有任何运动。"
          },
          {
            en: "Breakpoints and Run to breakpoint. Click a line number, or press F9 in the editor. Breakpoints belong to the page session and are never stored.",
            ja: "ブレークポイントと「ブレークポイントまで実行」。行番号をクリックするか、エディタで F9 を押します。ブレークポイントはページのセッションに属し、保存されません。",
            "zh-CN": "断点与“运行到断点”。点击行号，或在编辑器里按 F9。断点只属于当前页面会话，不会被保存。"
          },
          {
            en: "Global shortcuts: Space to step, Shift+Space to reverse one instruction, F5 to run, F6 to stop, Ctrl+Enter to assemble, Ctrl+S to save. They never act inside the editor, a text field, or a dialog.",
            ja: "グローバルショートカット：Space でステップ、Shift+Space で 1 命令戻す、F5 で実行、F6 で停止、Ctrl+Enter でアセンブル、Ctrl+S で保存。エディタ、テキスト入力、ダイアログの中では働きません。",
            "zh-CN": "全局快捷键：空格单步、Shift+空格回退一条指令、F5 运行、F6 停止、Ctrl+Enter 汇编、Ctrl+S 保存。在编辑器、输入框和对话框内不生效。"
          },
          {
            en: "The output dock can be collapsed, and it opens the Console and focuses its field when the program waits for input.",
            ja: "出力ドックを折りたためるようになりました。プログラムが入力を待つと、ドックはコンソールを開いて入力欄にフォーカスします。",
            "zh-CN": "输出面板可以收起；程序等待输入时会自动打开控制台并聚焦输入框。"
          }
        ]
      },
      {
        type: "improved",
        items: [
          {
            en: "The source editor, its errors, and the project modules stay on screen in every view. The source pane can be hidden without losing the editor's text or undo history.",
            ja: "ソースエディタ、エラー一覧、プロジェクトモジュールがどのビューでも表示されます。ソース欄はエディタの内容や取り消し履歴を失わずに隠せます。",
            "zh-CN": "源码编辑器、错误列表和项目模块在所有视图里都保持可见。代码栏可以隐藏，编辑器的内容和撤销历史不会丢失。"
          },
          {
            en: "The datapath says in words what the run state means: not assembled, stale after an edit, waiting for input, finished, or stopped by an error. After a finished run the editor names the line that ran last.",
            ja: "データパスが実行状態の意味を言葉で示します：未アセンブル、編集後で古い、入力待ち、終了、エラーで停止。実行終了後、エディタは最後に実行した行を示します。",
            "zh-CN": "数据通路用文字说明运行状态的含义：尚未汇编、修改后已过期、等待输入、已结束、因错误停止。运行结束后，编辑器标出最后执行的那一行。"
          },
          {
            en: "In COMET Mode the phase track and the current phase sit directly under the datapath instead of above it.",
            ja: "COMET モードでは、フェーズトラックと現在のフェーズがデータパスの上ではなく直下に表示されます。",
            "zh-CN": "COMET 模式下，阶段轨道和当前阶段紧贴在数据通路下方，而不是在它上方。"
          },
          {
            en: "Layouts for 1180, 1280, 1440 and 1920 pixel windows in English, Japanese and Simplified Chinese: no page overflow, a single-row tool bar, and a datapath that is never narrower than 600 pixels.",
            ja: "1180、1280、1440、1920 ピクセル幅のウィンドウ向けレイアウト（英語・日本語・簡体字中国語）：ページのはみ出しなし、1 行のツールバー、データパスは 600 ピクセル未満になりません。",
            "zh-CN": "针对 1180、1280、1440、1920 像素宽度的布局（英语、日语、简体中文）：无整页溢出，工具栏保持一行，数据通路不窄于 600 像素。"
          }
        ]
      },
      {
        type: "fixed",
        items: [
          {
            en: "The debugger edit dialog no longer shows the previous target's draft for one frame. Opening FR right after editing SP could show OF as already checked.",
            ja: "デバッガの編集ダイアログが、直前の編集対象の下書きを 1 フレームだけ表示することがなくなりました。SP を編集した直後に FR を開くと、OF がチェック済みに見えることがありました。",
            "zh-CN": "调试器编辑对话框不再有一帧显示上一个编辑对象的草稿。此前在编辑 SP 之后立即打开 FR，OF 可能显示为已勾选。"
          }
        ]
      },
      {
        type: "known-issues",
        items: [
          {
            en: "In CASL Mode on a window less than about 800 pixels high, the lower part of the datapath is reached by scrolling its column. Hiding the source pane or collapsing the dock makes room for it.",
            ja: "高さが約 800 ピクセル未満のウィンドウで CASL モードを使うと、データパスの下部はその列をスクロールして表示します。ソース欄を隠すかドックを折りたたむと収まります。",
            "zh-CN": "在高度小于约 800 像素的窗口里使用 CASL 模式时，数据通路的下半部分需要在其栏内滚动才能看到；收起代码栏或输出面板可以腾出空间。"
          },
          {
            en: "Windows narrower than 1180 pixels are not supported and scroll horizontally, as before.",
            ja: "幅 1180 ピクセル未満のウィンドウは従来どおり対象外で、横スクロールになります。",
            "zh-CN": "宽度小于 1180 像素的窗口与之前一样不在支持范围内，会出现横向滚动。"
          }
        ]
      }
    ],
    webUrl: PUBLIC_WEB_URL
  },
  {
    version: "0.1.0",
    date: "2026-07-17",
    channel: "preview",
    title: {
      en: "Public Web preview",
      ja: "公開 Web プレビュー",
      "zh-CN": "公共 Web 预览版"
    },
    summary: {
      en: "The learning studio is available as a production WASM application on Cloudflare Pages, with the same release registry packaged for offline desktop use.",
      ja: "学習スタジオを Cloudflare Pages 上の production WASM アプリとして公開し、同じリリース履歴をオフラインのデスクトップ版にも同梱できるようにしました。",
      "zh-CN": "学习工作室已作为 production WASM 应用发布到 Cloudflare Pages，同一份发行记录也可离线打包到桌面版中。"
    },
    sections: [
      {
        type: "added",
        items: [
          {
            en: "A public Cloudflare Pages entry point with production WASM, security headers, cache rules, and remote smoke coverage.",
            ja: "production WASM、セキュリティヘッダー、キャッシュ規則、リモート smoke 検証を備えた Cloudflare Pages の公開入口。",
            "zh-CN": "提供使用 production WASM、安全响应头、缓存规则和远程 smoke 验证的 Cloudflare Pages 公共入口。"
          },
          {
            en: "New, Open, Save, Save As, Dirty guards, and revision-derived beforeunload behavior for one working document.",
            ja: "単一作業ドキュメント向けの New、Open、Save、Save As、Dirty guard、revision 由来の beforeunload 動作。",
            "zh-CN": "为单一工作文档提供 New、Open、Save、Save As、Dirty guard 和由 revision 推导的 beforeunload 行为。"
          },
          {
            en: "Independent safe persistence for locale, UI preferences, the last built-in example, and built-in lesson progress.",
            ja: "locale、UI 設定、最後に選択した組み込み例、組み込みレッスン進捗を相互に独立して安全に保存。",
            "zh-CN": "独立且安全地持久化 locale、UI 偏好、最后选择的内置示例和内置课程进度。"
          },
          {
            en: "An offline Tauri Windows demonstration build that reuses the React, Vite, Monaco, and WASM frontend without adding native filesystem permissions.",
            ja: "React、Vite、Monaco、WASM フロントエンドを再利用し、ネイティブ filesystem 権限を追加しないオフライン Tauri Windows デモ版。",
            "zh-CN": "复用 React、Vite、Monaco 和 WASM 前端且不增加原生文件系统权限的离线 Tauri Windows 演示版。"
          },
          {
            en: "A structured, multilingual Changelog generated from the same offline release registry used by the application.",
            ja: "アプリと同じオフライン release registry から生成される、構造化された多言語の変更履歴。",
            "zh-CN": "由应用使用的同一份离线 release registry 生成的结构化多语言更新日志。"
          },
          {
            en: "Binary64 double storage observation with four high-word-first COMET II words, runtime literal stores, four-word copy assignment, and a live Double Value Inspector.",
            ja: "上位ワード優先の 4 個の COMET II ワード、実行時リテラル格納、4 ワードのコピー代入、ライブ Double Value Inspector による binary64 double ストレージ観察。",
            "zh-CN": "通过高位 word 优先的 4 个 COMET II word、运行时字面量写入、4-word 复制赋值和实时 Double Value Inspector 观察 binary64 double 存储。"
          },
          {
            en: "CASL Mode covers all 28 official COMET II machine instructions, IN / OUT / RPUSH / RPOP macro expansion, WaitingInput, and symbol and literal tables.",
            ja: "CASL Mode は 28 個の公式 COMET II 機械命令すべてに加え、IN / OUT / RPUSH / RPOP のマクロ展開、WaitingInput、シンボル表とリテラル表を備えています。",
            "zh-CN": "CASL Mode 覆盖全部 28 条官方 COMET II 机器指令，并提供 IN / OUT / RPUSH / RPOP 宏展开、WaitingInput、符号表和字面量表。"
          },
          {
            en: "Debugger controls edit GR0-GR7, PR, SP, the three COMET II flags, individual memory words, and runtime machine words, with Full Clear and epoch-based mutation ownership.",
            ja: "Debugger controls で GR0-GR7、PR、SP、COMET II の 3 つのフラグ、個別のメモリワード、実行時の機械語ワードを編集でき、Full Clear と epoch ベースの mutation ownership を備えています。",
            "zh-CN": "Debugger controls 可编辑 GR0-GR7、PR、SP、COMET II 三个标志位、单个内存 word 和运行时机器 word，并提供 Full Clear 与基于 epoch 的 mutation ownership。"
          },
          {
            en: "COMET Mode executes real Fetch, Decode, Effective Address, Operand Read, Execute, Write Back, Flag Update, and Instruction Complete microcycles across all 28 machine instructions.",
            ja: "COMET Mode は 28 個すべての機械命令について、実際の Fetch、Decode、Effective Address、Operand Read、Execute、Write Back、Flag Update、Instruction Complete の microcycle を実行します。",
            "zh-CN": "COMET Mode 对全部 28 条机器指令执行真实的 Fetch、Decode、Effective Address、Operand Read、Execute、Write Back、Flag Update 和 Instruction Complete microcycle。"
          },
          {
            en: "COMET Mode can reverse one committed microcycle within the current history epoch through the same C++ Core, Mock, and WASM contract, with a bounded history of 1,000 entries.",
            ja: "COMET Mode では、同一の C++ Core、Mock、WASM 契約を通して、現在の history epoch 内で確定済み microcycle を 1 つ戻せます。履歴は最大 1,000 件です。",
            "zh-CN": "COMET Mode 可通过同一套 C++ Core、Mock 和 WASM 契约，在当前 history epoch 内回退一个已提交的 microcycle；历史记录最多保留 1,000 条。"
          },
          {
            en: "Reverse Instruction atomically restores the latest real machine instruction, including partial microcycles, Memory, Registers, OF / SF / ZF, Trace, Source Mapping, Machine highlighting, and Circuit state. Macro source lines reverse one expanded machine instruction at a time.",
            ja: "Reverse Instruction は、途中まで実行された microcycle を含む直近の実機械命令を原子的に戻し、Memory、Registers、OF / SF / ZF、Trace、Source Mapping、Machine の強調表示、Circuit 状態を復元します。macro の source line は、展開後の機械命令を 1 命令ずつ戻します。",
            "zh-CN": "Reverse Instruction 会原子回退最近一条真实机器指令，包括部分完成的 microcycle，并恢复 Memory、Registers、OF / SF / ZF、Trace、Source Mapping、Machine 高亮和 Circuit 状态。宏源码行每次回退一条展开后的机器指令。"
          },
          {
            en: "The deterministic Multi-program Linker assembles independent CASL modules, selects an explicit main module, exports START program labels, applies auditable address relocations, and executes cross-module CALL / RET in one linked COMET II image.",
            ja: "決定的な Multi-program Linker は、独立した CASL module を個別に assemble し、明示的な main module を選択し、START program label を export し、監査可能な address relocation を適用して、単一の linked COMET II image 上で module 間 CALL / RET を実行します。",
            "zh-CN": "确定性的 Multi-program Linker 会独立汇编各 CASL module、显式选择 main module、导出 START program label、应用可审计的地址重定位，并在同一个 linked COMET II image 中执行跨模块 CALL / RET。"
          }
        ]
      },
      {
        type: "improved",
        items: [
          {
            en: "EN, JA, and zh-CN presentation for application controls and structured diagnostics, while technical identities remain locale-independent.",
            ja: "アプリ操作と構造化 diagnostics を EN、JA、zh-CN で表示しつつ、技術的 identity は locale から独立。",
            "zh-CN": "应用控件和结构化 diagnostics 支持 EN、JA、zh-CN，同时技术 identity 与 locale 保持独立。"
          },
          {
            en: "The teacher-feedback-driven Unified Observation Workspace keeps the live Circuit visible while Registers, Memory, Stack, Code / Machine, Source Mapping, Trace, Console, or Inspector data is selected. CASL / COMET execution mode is independent from observation data.",
            ja: "教師フィードバックに基づく Unified Observation Workspace では、Registers、Memory、Stack、Code / Machine、Source Mapping、Trace、Console、Inspector のデータを選択しても、live Circuit が表示され続けます。CASL / COMET execution mode と observation data は独立しています。",
            "zh-CN": "基于教师反馈的 Unified Observation Workspace 在选择 Registers、Memory、Stack、Code / Machine、Source Mapping、Trace、Console 或 Inspector 数据时仍持续显示实时 Circuit。CASL / COMET execution mode 与 observation data 相互独立。"
          },
          {
            en: "Show Both, Focus Circuit, Focus Data, and session-only Follow Execution coordinate Circuit and data highlighting. The 1180 / 1280 layouts stack the panes safely, while 1440 / 1920 use readable side-by-side panes.",
            ja: "Show Both、Focus Circuit、Focus Data、session-only の Follow Execution により、Circuit とデータの強調表示を連動させます。1180 / 1280 では pane を安全に縦配置し、1440 / 1920 では読みやすい横並びにします。",
            "zh-CN": "Show Both、Focus Circuit、Focus Data 和仅限当前会话的 Follow Execution 会联动 Circuit 与数据高亮。1180 / 1280 使用安全的上下布局，1440 / 1920 使用清晰的双栏布局。"
          },
          {
            en: "The WCASL-compatible workflow offers hexadecimal, signed decimal, unsigned decimal, and binary displays plus explicit assembled, zero-DS, and FFFF-DS reload modes.",
            ja: "WCASL 互換ワークフローでは、16 進、符号付き 10 進、符号なし 10 進、2 進表示と、assembled、zero-DS、FFFF-DS の明示的な reload mode を利用できます。",
            "zh-CN": "WCASL 兼容工作流提供十六进制、有符号十进制、无符号十进制和二进制显示，以及明确的 assembled、zero-DS 和 FFFF-DS reload mode。"
          },
          {
            en: "The COMET II flag register is modeled as the official OF, SF, and ZF bits only; shift instructions write the shifted-out bit to OF and no CF is exposed.",
            ja: "COMET II のフラグレジスタは公式の OF、SF、ZF の 3 ビットだけで構成され、shift 命令は押し出されたビットを OF に書き込み、CF は公開しません。",
            "zh-CN": "COMET II 标志寄存器严格建模为官方 OF、SF、ZF 三位；移位指令把移出的 bit 写入 OF，且不公开 CF。"
          },
          {
            en: "Source, machine word, microcycle trace, and clean active circuit flow stay aligned through stugx.CASL Teaching Microarchitecture v1, an explanatory model rather than a claim about a unique physical implementation.",
            ja: "source、machine word、microcycle trace、clean active circuit flow は stugx.CASL Teaching Microarchitecture v1 で対応付けられます。これは説明用モデルであり、唯一の物理実装を主張するものではありません。",
            "zh-CN": "source、machine word、microcycle trace 与 clean active circuit flow 通过 stugx.CASL Teaching Microarchitecture v1 保持对应；这是解释模型，不代表唯一的物理实现。"
          },
          {
            en: "Reverse Microstep atomically restores VM state, Trace, Source Mapping, Machine Code highlighting, and Circuit flow, while refusing to cross debugger mutation, Reset, Reload, Full Clear, SVC, or input/output boundaries.",
            ja: "Reverse Microstep は VM 状態、Trace、Source Mapping、Machine Code の強調表示、Circuit flow を原子的に復元し、debugger mutation、Reset、Reload、Full Clear、SVC、入出力の境界を越えません。",
            "zh-CN": "Reverse Microstep 会原子恢复 VM 状态、Trace、Source Mapping、Machine Code 高亮和 Circuit flow，并拒绝跨越 debugger mutation、Reset、Reload、Full Clear、SVC 或输入输出边界。"
          },
          {
            en: "Project and Module identities, relocation and placement tables, module-aware Machine Code / Trace / Source Mapping, and hard relink history barriers keep linked execution auditable without changing single-file behavior.",
            ja: "Project / Module identity、relocation / placement table、module 対応の Machine Code / Trace / Source Mapping、relink 時の強制 history barrier により、単一ファイル動作を変更せず linked execution を監査できます。",
            "zh-CN": "Project / Module identity、重定位与放置表、带 module 上下文的 Machine Code / Trace / Source Mapping，以及 relink 的硬 history barrier，使链接执行可审计，同时不改变单文件行为。"
          }
        ]
      },
      {
        type: "security",
        items: [
          {
            en: "Production builds require the WASM backend, omit public source maps, and never silently substitute the Mock backend.",
            ja: "production build は WASM backend を必須とし、公開 source map を含めず、Mock backend へ暗黙に切り替えません。",
            "zh-CN": "production 构建强制使用 WASM backend，不包含公开 source map，也不会静默切换到 Mock backend。"
          }
        ]
      },
      {
        type: "known-issues",
        items: [
          {
            en: "The C++ path is a teaching subset, not a complete C++ compiler; arrays, pointers, classes, templates, recursion, and the full standard library are outside the current scope.",
            ja: "C++ 経路は学習用 subset であり完全な C++ compiler ではありません。arrays、pointers、classes、templates、recursion、完全な standard library は現在の範囲外です。",
            "zh-CN": "C++ 路径是教学子集，并非完整 C++ compiler；arrays、pointers、classes、templates、recursion 和完整标准库不在当前范围内。"
          },
          {
            en: "The Windows demo is unsigned and still uses the browser file adapter boundary; native Tauri file dialogs and updates are deferred.",
            ja: "Windows デモは未署名で、引き続き browser file adapter 境界を使用します。Tauri ネイティブ file dialog と update は延期されています。",
            "zh-CN": "Windows 演示版尚未签名，并继续使用浏览器文件适配器边界；Tauri 原生文件对话框和更新功能仍被延后。"
          },
          {
            en: "Double support is limited to local storage, finite literals, and copy assignment; arithmetic, comparison, conversion, parameters, returns, and arrays remain unsupported.",
            ja: "double 対応はローカルストレージ、有限リテラル、コピー代入に限定されます。算術、比較、変換、引数、戻り値、配列は未対応です。",
            "zh-CN": "double 支持仅限局部存储、有限字面量和复制赋值；算术、比较、转换、参数、返回值和数组仍不受支持。"
          },
          {
            en: "Reverse history is limited to the current history epoch and 1,000 retained microcycles. Redo, Reverse Run, Reverse Macro, cross-SVC, cross-I/O, mutation, Reload, Reset, or Full Clear rollback, and a complete time-travel debugger are not supported.",
            ja: "Reverse history は現在の history epoch と保持済み 1,000 microcycle に限定されます。Redo、Reverse Run、Reverse Macro、SVC、入出力、mutation、Reload、Reset、Full Clear をまたぐ回退、完全な time-travel debugger は未対応です。",
            "zh-CN": "Reverse history 仅限当前 history epoch 和保留的 1,000 个 microcycle。不支持 Redo、Reverse Run、Reverse Macro、跨 SVC、输入输出、mutation、Reload、Reset 或 Full Clear 回退，也不提供完整的 time-travel debugger。"
          },
          {
            en: "The linker does not read a proprietary WCASL project format, persist project sessions, scan directories, perform dynamic linking, accept C/C++ object files, or concatenate source files.",
            ja: "Linker は proprietary WCASL project format の読込、project session の永続化、directory scan、dynamic linking、C/C++ object file の取込、source file の連結を行いません。",
            "zh-CN": "Linker 不读取 proprietary WCASL project format，不持久化 project session，不扫描目录，不执行 dynamic linking，不接受 C/C++ object file，也不拼接 source file。"
          }
        ]
      }
    ],
    commit: "de1b28d6440f9a791772488443cb03d4703b73a9",
    webUrl: PUBLIC_WEB_URL
  },
  {
    version: "v1.0-rc10",
    date: "2026-07-11",
    channel: "preview",
    title: {
      en: "Learning visualization release candidate",
      ja: "学習可視化リリース候補",
      "zh-CN": "学习可视化候选版本"
    },
    summary: {
      en: "The release-candidate UI connected execution state to focused circuit, memory, trace, and learning views while preserving a compact teaching workspace.",
      ja: "実行状態を circuit、memory、trace、learning view に結び付けながら、コンパクトな学習 workspace を維持したリリース候補です。",
      "zh-CN": "该候选版本将执行状态与 circuit、memory、trace 和 learning view 关联，同时保持紧凑的教学 workspace。"
    },
    sections: [
      {
        type: "improved",
        items: [
          {
            en: "Clean active-flow-only circuit wires without arrows, circular markers, or inactive ghost paths.",
            ja: "arrows、circular markers、inactive ghost paths を使わない active-flow-only の clean circuit wires。",
            "zh-CN": "仅显示 active flow 的 clean circuit wires，不使用 arrows、circular markers 或 inactive ghost paths。"
          },
          {
            en: "Bounded long-data views and natural page scrolling for memory, trace, machine code, and learning content.",
            ja: "memory、trace、machine code、learning content の長い表示を bounded view と自然なページスクロールに整理。",
            "zh-CN": "为 memory、trace、machine code 和 learning content 提供有界长列表视图与自然页面滚动。"
          }
        ]
      },
      {
        type: "known-issues",
        items: [
          {
            en: "This tag is a historical release candidate, not a final stable release.",
            ja: "この tag は過去のリリース候補であり、最終 stable release ではありません。",
            "zh-CN": "该 tag 是历史候选版本，并非最终 stable release。"
          }
        ]
      }
    ],
    commit: "4f49e94033e5d9e00f015cdbd8bc328d20d8ed64",
    tag: "v1.0-rc10"
  },
  {
    version: "v1.0-rc1",
    date: "2026-07-10",
    channel: "preview",
    title: {
      en: "CASL II / COMET II learning release candidate",
      ja: "CASL II / COMET II 学習リリース候補",
      "zh-CN": "CASL II / COMET II 学习候选版本"
    },
    summary: {
      en: "The first formal release-candidate checkpoint packaged the learning-focused CASL II, COMET II, C++ subset, examples, and WASM execution path.",
      ja: "最初の正式なリリース候補 checkpoint として、学習向け CASL II、COMET II、C++ subset、examples、WASM execution path をまとめました。",
      "zh-CN": "首个正式候选版本 checkpoint 汇集了面向学习的 CASL II、COMET II、C++ subset、examples 和 WASM execution path。"
    },
    sections: [
      {
        type: "added",
        items: [
          {
            en: "CASL II assembly, COMET II execution, guided examples, and a C++ teaching subset lowered to Generated CASL.",
            ja: "CASL II assembly、COMET II execution、guided examples、Generated CASL へ lowering する C++ teaching subset。",
            "zh-CN": "CASL II assembly、COMET II execution、guided examples，以及 lowering 到 Generated CASL 的 C++ teaching subset。"
          },
          {
            en: "A production WASM adapter with a separate Mock backend retained for development and tests.",
            ja: "production WASM adapter と、development/test 専用に分離された Mock backend。",
            "zh-CN": "production WASM adapter，以及仅保留给开发和测试的独立 Mock backend。"
          }
        ]
      },
      {
        type: "known-issues",
        items: [
          {
            en: "The supported CASL II and C++ surfaces were intentionally limited to the documented teaching scope.",
            ja: "対応する CASL II と C++ の範囲は、文書化された学習用途に意図的に限定されています。",
            "zh-CN": "支持的 CASL II 和 C++ 范围被有意限制在已记录的教学用途内。"
          }
        ]
      }
    ],
    commit: "18eecb625327789561705cd8b8ba26cc0fb3edcf",
    tag: "v1.0-rc1"
  }
] as const;
