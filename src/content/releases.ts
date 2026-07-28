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
            en: "CPU Flow, Register / Stack, and Code / Machine observation modes with responsive natural scrolling and clean active-flow-only wires.",
            ja: "CPU Flow、Register / Stack、Code / Machine の observation mode、responsive な自然スクロール、active-flow-only の clean-wire 表示。",
            "zh-CN": "CPU Flow、Register / Stack、Code / Machine 三种 observation mode，以及响应式自然滚动和仅显示 active flow 的 clean-wire。"
          },
          {
            en: "The WCASL-compatible workflow offers hexadecimal, signed decimal, unsigned decimal, and binary displays plus explicit assembled, zero-DS, and FFFF-DS reload modes.",
            ja: "WCASL 互換ワークフローでは、16 進、符号付き 10 進、符号なし 10 進、2 進表示と、assembled、zero-DS、FFFF-DS の明示的な reload mode を利用できます。",
            "zh-CN": "WCASL 兼容工作流提供十六进制、有符号十进制、无符号十进制和二进制显示，以及明确的 assembled、zero-DS 和 FFFF-DS reload mode。"
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
          }
        ]
      }
    ],
    commit: "ed3af7880b1fa6bb010d85497ccd485f1c873f2c",
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
