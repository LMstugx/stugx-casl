# 教員向けデモ手順

- Audience: 授業担当者とデモ実施者
- Status: Review material
- Last reviewed version: 0.1.0
- Classification: Audit material
- Related: [Final Gate](../wcasl-replacement-final-gate.md), [Feedback Checklist](teacher-feedback-checklist-ja.md)

目安は 6 分です。公開 Web 版 <https://stugx-casl.pages.dev/> を使用します。

## 0:00-0:40 目的

「WCASL-II を置き換えること自体が目的ではなく、CASL II / COMET II の学習をより直感的にするための、ブラウザベースの学習補助ツールとして開発しています。」

Java 環境の準備が初学者の負担になる場合でも、ブラウザから最初の例題を実行できます。公式ツールではない独立実装であることを先に説明します。

## 0:40-1:30 基本実行

1. Built-in CASL example を選びます。
2. Assemble を実行します。
3. CASL Mode で Step Instruction を 1 回実行します。
4. Registers と Memory の変更を確認します。

## 1:30-2:40 COMET Mode

COMET Mode に切り替え、Fetch、Decode、Effective Address、Operand Read、Execute、Write Back、Flag Update、Complete を順に進めます。これはアニメーションではなく、実際の runtime microcycle です。Teaching Microarchitecture v1 は説明用モデルであり、唯一の物理実装を主張しません。

## 2:40-3:30 同時観察

Circuit を表示したまま Registers、Memory、Code / Machine を切り替えます。`LD` では Memory から register への path と値の変化、`ST` では register から Memory への path と対象 word を同時に示します。

## 3:30-4:15 Reverse

COMET Mode で Reverse Microstep、CASL Mode または COMET Mode で Reverse Instruction を実行します。Trace、Machine highlight、Source Mapping、Circuit、Register/Memory が同じ timeline に戻ることを示します。SVC/I/O や mutation の境界は越えません。

## 4:15-5:00 IN / OUT

短い IN/OUT 例を実行し、WaitingInput でブラウザが固まらないこと、入力後に長さと文字列が Memory に入り、OUT が plain text を表示することを示します。

## 5:00-5:45 Multi-program

MAIN と SUB の 2 module を個別に Assemble し、Main module を確認して Link Project を実行します。relocation table と module-aware Source Mapping を見せ、CALL と RET を Step します。proprietary WCASL project file は読み込みません。

## 5:45-6:00 依頼

「授業補助として使う場合に改善すべき点を教えていただきたいです。学生が理解しやすくなる教材を目指しています。」
