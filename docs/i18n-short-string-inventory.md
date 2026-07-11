# I18n Short UI String Inventory

This inventory tracks short UI strings only. Status values are `migrated`, `approved`, `pending`, `intentionally untranslated`, and `deferred-long-content`. Visual lengths and viewport risk are review targets, not fixed CSS widths.

## Toolbar

| Translation key | English source | Migration | Japanese | Chinese | Max visual length | Compact | Risk | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `toolbar.new` | New | migrated | approved | approved | 8 Latin / 6 CJK | yes | low | File action. |
| `toolbar.open` | Open | migrated | approved | approved | 8 / 6 | yes | low | File action; behavior remains unchanged. |
| `toolbar.save` | Save | migrated | approved | approved | 8 / 6 | yes | low | File action; behavior remains unchanged. |
| `toolbar.assemble` | Assemble | migrated | approved | approved | 12 / 8 | yes | medium | Primary action. |
| `toolbar.run` | Run | migrated | approved | approved | 8 / 6 | yes | low | Execution action. |
| `toolbar.step` | Step | migrated | approved | approved | 10 / 6 | yes | medium | Uses compact translation. |
| `toolbar.reset` | Reset | migrated | approved | approved | 10 / 6 | yes | low | Execution action. |
| `toolbar.stop` | Stop | migrated | approved | approved | 8 / 6 | yes | low | Execution action. |
| `toolbar.circuitFocus` | Circuit Focus | migrated | approved | approved | 18 / 10 | yes | high | Mode toggle. |

## Source Panel

| Translation key | English source | Migration | Japanese | Chinese | Max visual length | Compact | Risk | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `panel.source` | Source | migrated | approved | approved | 12 / 8 | no | low | Panel title. |
| demo selector values | Demo names | deferred-long-content | pending | pending | flexible | no | high | Demo descriptions and names are not migrated in 14B. |
| source code | User source | intentionally untranslated | n/a | n/a | code width | no | low | User/generated technical content. |

## Observation Mode

| Translation key | English source | Migration | Japanese | Chinese | Max visual length | Compact | Risk | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `observation.cpuFlow` | CPU Flow | migrated | approved | approved | 14 / 8 | yes | medium | Mode option. |
| `observation.registerStack` | Register / Stack | migrated | approved | approved | 22 / 12 | yes | high | Mode option. |
| `observation.codeMachine` | Code / Machine | migrated | approved | approved | 20 / 12 | yes | high | Mode option. |

## Inspector

| Translation key | English source | Migration | Japanese | Chinese | Max visual length | Compact | Risk | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `panel.inspector` | Inspector | migrated | approved | approved | 14 / 8 | no | low | Panel title. |
| `inspector.registers` | Registers | migrated | approved | approved | 14 / 8 | yes | medium | Tab. |
| `inspector.memory` | Memory | migrated | approved | approved | 12 / 8 | yes | low | Tab. |
| `inspector.sourceMap` | Source Map | migrated | approved | approved | 14 / 8 | yes | high | Tab. |
| `inspector.trace` | Trace | migrated | approved | approved | 12 / 8 | yes | low | Tab. |

## Output Dock

| Translation key | English source | Migration | Japanese | Chinese | Max visual length | Compact | Risk | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `tabs.outputLog` | Output Log | migrated | approved | approved | 14 / 8 | yes | medium | Dock tab. |
| `tabs.console` | Console | migrated | approved | approved | 12 / 8 | yes | medium | Dock tab. |
| `tabs.messages` | Messages | migrated | approved | approved | 12 / 8 | yes | medium | Dock tab. |
| `tabs.generatedCasl` | Generated CASL | migrated | approved | approved | 18 / 10 | yes | high | Dock tab; CASL lines unchanged. |
| `tabs.machineCode` | Machine Code | migrated | approved | approved | 16 / 8 | yes | high | Dock tab; words unchanged. |
| `common.clear` | Clear | migrated | approved | approved | 8 / 6 | yes | low | Low-priority dock action. |

## Circuit Focus

| Translation key | English source | Migration | Japanese | Chinese | Max visual length | Compact | Risk | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `toolbar.circuitFocus` | Circuit Focus | migrated | approved | approved | 18 / 10 | yes | high | Entry toggle. |
| Current Instruction | Current Instruction | pending | approved | approved | 22 / 12 | yes | high | Long teaching title deferred from resources. |
| circuit mnemonics | LD / ST / ADDA / ... | intentionally untranslated | n/a | n/a | technical | no | low | Machine terminology. |

## Memory Controls

| Translation key | English source | Migration | Japanese | Chinese | Max visual length | Compact | Risk | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `memory.start` | Start | migrated | approved | approved | 10 / 6 | yes | low | Address input label. |
| `memory.rows` | Rows | migrated | approved | approved | 8 / 6 | yes | low | Row-count label. |
| `memory.program` | Program | migrated | approved | approved | 12 / 8 | yes | medium | Jump control. |
| `common.read` | Read | migrated | approved | approved | 10 / 6 | yes | medium | Jump/filter relation. |
| `common.write` | Write | migrated | approved | approved | 10 / 6 | yes | medium | Jump/filter relation. |
| `common.go` | Go | migrated | approved | approved | 8 / 6 | yes | low | Address navigation. |

## Status Badges

| Translation key | English source | Migration | Japanese | Chinese | Max visual length | Compact | Risk | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `status.ready` | Ready | migrated | approved | approved | 12 / 8 | yes | low | Not Finished. |
| `status.dirty` | Dirty | migrated | approved | approved | 12 / 8 | yes | medium | User-facing changed state. |
| `status.notLoaded` | Not loaded | migrated | approved | approved | 14 / 8 | yes | medium | No program loaded. |
| `status.running` | Running | migrated | approved | approved | 12 / 8 | yes | low | Active execution. |
| `status.stopped` | Stopped | migrated | approved | approved | 12 / 8 | yes | low | Not Paused. |
| `status.finished` | Finished | migrated | approved | approved | 12 / 8 | yes | low | Terminal state. |
| `status.error` | Error | migrated | approved | approved | 10 / 6 | yes | low | Error state. |

## Empty States

| Translation key | English source | Migration | Japanese | Chinese | Max visual length | Compact | Risk | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `empty.noOutput` | No output | migrated | approved | approved | 20 / 12 | no | low | Output panel. |
| `empty.noDiagnostics` | No diagnostics | migrated | approved | approved | 22 / 12 | no | Diagnostic body remains untranslated. |
| `empty.noMessages` | No messages | migrated | approved | approved | 20 / 12 | no | Messages panel. |
| `empty.noTraceEntries` | No trace entries | migrated | approved | approved | 22 / 12 | no | Raw entries remain unchanged. |
| `empty.noSourceMapping` | No source mapping | migrated | approved | approved | 24 / 12 | no | Source map panel. |
| `empty.selectRowDetails` | Select a row to inspect details | migrated | approved | approved | 38 / 20 | no | Safe wrap is allowed. |

## Details And Summary Controls

| Translation key | English source | Migration | Japanese | Chinese | Max visual length | Compact | Risk | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `common.details` | Details | migrated | approved | approved | 12 / 8 | yes | low | Details summary/heading. |
| `common.compact` | Compact | migrated | approved | approved | 12 / 8 | yes | low | Compact state. |
| `common.showMore` | Show more | migrated | approved | approved | 16 / 8 | yes | medium | Expand control. |
| `common.showLess` | Show less | migrated | approved | approved | 16 / 8 | yes | medium | Collapse control. |
| `common.showMoreCount` | +{count} more | migrated | approved | approved | 16 / 10 | yes | medium | Named interpolation only. |

## Stack And FramePlan Compact Labels

| Translation key | English source | Migration | Japanese | Chinese | Max visual length | Compact | Risk | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stack Preview | Stack Preview | pending | approved | approved | 20 / 10 | yes | medium | Short title; no live values translated. |
| Stack Frame View | Stack Frame View | deferred-long-content | approved | approved | 22 / 10 | yes | high | Long design-preview copy remains deferred. |
| Frame Slot | Frame Slot | pending | approved | approved | 16 / 8 | yes | medium | Design metadata. |
| FramePlan explanations | Design preview prose | deferred-long-content | pending | pending | flexible | no | high | Phase 14B excludes long copy. |

## Table Headings

| Translation key | English source | Migration | Japanese | Chinese | Max visual length | Compact | Risk | Context |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `table.name` | Name | migrated | approved | approved | 10 / 6 | yes | low | Technical cell content unchanged. |
| `table.value` | Value | migrated | approved | approved | 10 / 6 | yes | low | Mono values do not wrap. |
| `table.address` | Address | migrated | approved | approved | 12 / 6 | yes | medium | Hex values unchanged. |
| `table.label` | Label | migrated | approved | approved | 10 / 6 | yes | low | Symbol spelling unchanged. |
| `table.mark` | Mark | migrated | approved | approved | 10 / 6 | yes | low | Compact column. |
| `table.meaning` | Meaning | migrated | approved | approved | 12 / 6 | yes | medium | Explanation heading only. |
| `table.source` | Source | migrated | approved | approved | 12 / 6 | yes | medium | Source text unchanged. |
| `table.mapping` | Mapping | migrated | approved | approved | 12 / 6 | yes | medium | Mapping content unchanged. |
| `table.details` | Details | migrated | approved | approved | 12 / 6 | yes | low | Heading. |
| `table.current` | Current | migrated | approved | approved | 12 / 6 | yes | low | Relation heading. |
| `table.next` | Next | migrated | approved | approved | 10 / 6 | yes | low | Relation heading. |
| `table.previous` | Previous | migrated | approved | approved | 12 / 6 | yes | medium | Relation heading. |

## Deferred And Intentionally Untranslated Boundaries

Lessons, complete Demo Guide copy, assembler/compiler diagnostics, Machine Code explanations, and FramePlan long explanations are `deferred-long-content`. CASL mnemonics, register names, addresses, machine words, source code, Generated CASL, labels, symbols, and raw Trace payloads are `intentionally untranslated`.
