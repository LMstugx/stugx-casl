# Phase 14C: Circuit Focus And Compact Learning Text Localization

## 1. Scope

Phase 14C migrates short Circuit Focus and compact learning-panel labels to the typed `en | ja | zh-CN` resource boundary. It does not change locale normalization, persistence, English fallback, runtime behavior, emitted CASL, layout architecture, or execution semantics.

## 2. Migrated Circuit Focus Labels

Simulator headings, descriptive module labels, Current Instruction fields, Current Source Mapping fields, run-state labels, target labels, and compact circuit legend text use semantic `circuit.*` and `instruction.*` keys. Technical abbreviations such as `IR`, `PR`, `SP`, `MAR`, `MDR`, `FR`, `EAU`, `ALU`, and `GR0-GR7` remain unchanged.

## 3. Timeline And Learning Flow

`timeline.*` covers Fetch, Decode, Operand Read, Execute, Write Back, flow relations, and program-finish labels. Japanese uses `フェッチ / デコード / オペランド読出し / 実行 / 書込み`; Simplified Chinese uses `取指 / 译码 / 操作数读取 / 执行 / 写回`. Literal mnemonics such as `CALL` and `RET` remain technical data.

## 4. Signal Probe

Signal Probe titles, compact labels, Base/Index/Effective address relations, stack read/write notes, return-address fields, and runtime-unavailable boundaries use `signalProbe.*`. The existing label/value/note grid, three-primary-row compact behavior, natural details expansion, and technical node names remain unchanged.

## 5. Stack Preview And Call Stack

Stack Preview headings and read/write notes use `stackPreview.*`. Call Stack summary and detail field names use `callStack.*`, including Depth, Mode, Routine, Return, Stored at, Depth change, Program finish, Top-level finish, and Stack return. SP values, addresses, function labels, and return-address values remain verbatim.

## 6. Stack Frame Compact Labels

Stack Frame View badges, field names, slot kinds, current-lowering labels, future-storage labels, and selection-source labels use `stackFrame.*`. `Design preview` and `Not runtime state` remain explicit. Long design-only explanations, warnings, FramePlan architecture prose, and implementation notes continue to use English fallback and do not claim live stack-frame state.

## 7. Code And Machine Compact Labels

Code / Machine headings and explanation field names use `codeMachine.*` plus the existing shared table keys. C++ source, Generated CASL lines, machine words, opcode mnemonics, labels, addresses, and binary values are never translated.

## 8. Untranslated Technical Boundary

CASL/COMET mnemonics, register names, addresses, machine words, source code, Generated CASL content, identifiers, labels, raw Trace payloads, assembler/compiler diagnostics, Lessons, Demo Guide text, practice tasks, and FramePlan long explanations remain outside this phase.

## 9. Layout Findings

English, Japanese, and Simplified Chinese are checked at 1920x1080, 1440x900, and 1280x720. Compact labels use existing safe wrap, ellipsis/title, minimum-width, and table-density rules. Signal Probe columns, Stack Preview headings, Call Stack rows, Stack Frame badges, and Code / Machine tables retain their existing information architecture and do not introduce horizontal page overflow or tiny nested scroll regions.

## 10. Fallback Behavior

English remains the default and fallback locale. Every approved Phase 14C key is present and nonempty in all three resources. Deferred long content may continue to fall back to English. Missing keys still resolve safely without crashing the UI.

## 11. Tests

Resource tests enforce approved-key presence, nonempty values, matching interpolation placeholders, and no locale-specific component branches. Component and E2E tests verify Japanese/Chinese compact labels, accessible names, 1280px layout, persisted locale, and preservation of source, Generated CASL, machine words, VM/register/memory state, Trace payload, selected FramePlan slot, run state, and clean-wire behavior.

## 12. Remaining Deferred Content

Diagnostics need stable codes and parameterized `diagnostics.*` messages before localization. Lessons, Demo Guide content, practice tasks, Machine Code teaching prose, and FramePlan long explanations need separate editorial review. Plural rules and rich localized content are also deferred.

## 13. Phase 14D Recommendation

Phase 14D should define a diagnostics localization contract and inventory without translating raw current diagnostic sentences. It should keep execution semantics and technical payloads unchanged, and should not combine diagnostics work with full lesson-content localization.
