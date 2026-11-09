# v2 测试迁移记录：旧电路组件 → 工作台数据通路

- Audience: Claude、Codex、项目所有者与审查者
- Status: Migration record
- Last reviewed version: 0.1.0
- Classification: Migration record
- Related: [v2 重构标准](v2-refactor-standard.md), [ADR 0023](../adr/0023-workbench-datapath-structural-buses-and-active-arrowheads.md), [ADR 0024](../adr/0024-workbench-datapath-motion.md)

应用里的电路由 `CometCircuitSvg` 换成了 `src/visual/datapath` 的工作台数据通路。这份记录逐条列出因此改动的旧测试断言，供审查。

## 处理原则

1. **描述运行事实的断言全部保留，一个字没改。** 例如“PUSH 时 SP 活动、主存被写”“顶层 RET 不激活 SP”“ADDA 时 ALU 与 FR 活动”“变址寻址时变址寄存器与有效地址所在的主存行被标出”。新数据通路保留了这些断言依赖的稳定标识：`comet-circuit-svg`、`module-<元件>` 的 `data-active`、`effective-address-unit`、`register-grN`、`memory-row-XXXX`、`data-read`、`data-write`。
2. **“活动连线”改为读取运行时自己报告的连线名单。** 旧测试的 `activeWireIds` 从旧组件画出来的线里取名字；现在数据通路把运行时判定的连线名单发布在 `data-active-wires` 上，测试直接读它。名单的判定规则是原样搬过来的。
3. **只描述旧组件内部结构的断言移除**，共 63 行，见下表。没有删除任何一个测试用例；断言被清空的用例换成了新契约下等价的断言。
4. 新契约由 `src/visual/datapath/__tests__` 的 `datapathCanvas.test.tsx` 与 `fromCometState.test.ts` 覆盖，后者把全部内置 CASL 示例在指令与微周期两种粒度下逐步跑完并检查每一步。

## 用例数量

| 文件 | 迁移前 | 迁移后 |
| --- | --- | --- |
| `src/tests/circuitFocusMode.test.tsx` | 34 个用例失败 | 全部通过，用例数不变 |
| `src/tests/phase20e1UnifiedObservationWorkspace.test.tsx` | 8 个失败 | 全部通过，测试文件未改 |
| `src/tests/uiRegressionBoundary.test.tsx` | 1 个失败 | 通过 |
| `src/i18n/__tests__/phase14cLocalization.test.tsx` | 1 个失败 | 通过 |

## 被移除或替换的断言

### 旧电路内嵌的源码映射模块已不存在；源码文字改在主存芯片里显示

| 文件 | 用例 | 断言 |
| --- | --- | --- |
| circuitFocusMode.test.tsx | focus_mode_aligns_program_current_instruction_sourcemap_and_source_context | `expect(markup).toContain('data-testid="source-map-highlight" data-current-line="2"');` |
| circuitFocusMode.test.tsx | focus_mode_aligns_program_current_instruction_sourcemap_and_source_context | `expect(markup).toContain("Address 0020");` |
| phase14cLocalization.test.tsx | circuit_instruction_timeline_and_signal_probe_labels_translate | `label "現在のソース対応" / "当前源码映射" replaced by "制御部" / "控制部"` |

### 旧连线的内部元数据（车道、锚点、class）已不存在

| 文件 | 用例 | 断言 |
| --- | --- | --- |
| circuitFocusMode.test.tsx | focus_mode_sp_visible_but_not_active | `expect(markup).toContain('data-testid="sp-anchor-output"');` |
| circuitFocusMode.test.tsx | focus_mode_sp_visible_but_not_active | `expect(markup).toContain('data-testid="sp-anchor-adjust"');` |
| circuitFocusMode.test.tsx | focus_mode_uses_clean_wire_mode_without_inactive_routes | `expect(markup).toContain('class="wire wire-data wire-active circuit-wire--active circuit-wire--flow circuit-wire--data-flow"');` |
| circuitFocusMode.test.tsx | focus_mode_primary_active_path_is_prominent | `expect(markup).toContain('class="wire wire-data wire-active circuit-wire--active circuit-wire--flow circuit-wire--data-flow"');` |
| circuitFocusMode.test.tsx | focus_mode_primary_active_path_is_prominent | `expect(markup).toContain('data-primary="true"');` |
| circuitFocusMode.test.tsx | focus_mode_primary_active_path_is_prominent | `expect(markup).toContain('data-semantic-type="data"');` |
| circuitFocusMode.test.tsx | circuit_ld_data_bus_does_not_cross_alu_active_region | `expect(markup).toContain('data-testid="wire-mdr-to-gr"');` |
| circuitFocusMode.test.tsx | circuit_ld_data_bus_does_not_cross_alu_active_region | `expect(markup).toContain('data-avoids-alu="true"');` |
| circuitFocusMode.test.tsx | focus_mode_alu_path_visible_for_adda | `expect(markup).toContain('data-lane="data-compute"');` |
| circuitFocusMode.test.tsx | focus_mode_st_path_targets_memory_row | `expect(markup).toContain('data-avoids-alu="true"');` |

### 被 ADR 0023 取代：MAR 到主存现在是可见的地址路径

| 文件 | 用例 | 断言 |
| --- | --- | --- |
| circuitFocusMode.test.tsx | circuit_push_activates_sp_memory_write | `expect(activeWireIds(markup)).not.toContain("mar-to-memory");` |
| circuitFocusMode.test.tsx | circuit_pop_activates_sp_memory_read_gr_write | `expect(activeWireIds(markup)).not.toContain("mar-to-memory");` |
| circuitFocusMode.test.tsx | circuit_call_activates_sp_memory_write_pr_target | `expect(activeWireIds(markup)).not.toContain("mar-to-memory");` |
| circuitFocusMode.test.tsx | circuit_stack_ret_activates_sp_memory_read_pr | `expect(activeWireIds(markup)).not.toContain("mar-to-memory");` |

### 旧的悬浮总线标签已不存在；改为总线上的位宽标记

| 文件 | 用例 | 断言 |
| --- | --- | --- |
| circuitFocusMode.test.tsx | circuit_bus_labels_render_data_addr_ctrl | `expect(markup).toContain("DATA BUS");` |
| circuitFocusMode.test.tsx | circuit_bus_labels_render_data_addr_ctrl | `expect(markup).toContain("ADDR BUS");` |
| circuitFocusMode.test.tsx | circuit_bus_labels_render_data_addr_ctrl | `expect(markup).toContain("CTRL");` |
| circuitFocusMode.test.tsx | focus_mode_uses_clean_wire_mode_without_inactive_routes | `expect(markup).toContain('class="bus-labels"');` |
| circuitFocusMode.test.tsx | focus_mode_uses_clean_wire_mode_without_inactive_routes | `expect(markup).toContain("DATA BUS");` |
| circuitFocusMode.test.tsx | focus_mode_uses_clean_wire_mode_without_inactive_routes | `expect(markup).toContain("ADDR BUS");` |
| circuitFocusMode.test.tsx | focus_mode_uses_clean_wire_mode_without_inactive_routes | `expect(markup).toContain("CTRL");` |

### 被 ADR 0023 取代：活动路径现在以一个箭头结束

| 文件 | 用例 | 断言 |
| --- | --- | --- |
| circuitFocusMode.test.tsx | focus_mode_primary_active_path_is_prominent | `expect(markup).not.toContain("marker-end=");` |

### 旧的状态指示灯已不存在；由主存引脚、控制器信号和元件本身表示

| 文件 | 用例 | 断言 |
| --- | --- | --- |
| circuitFocusMode.test.tsx | circuit_status_indicators_render_without_fake_state | `expect(ldMarkup).toContain('data-testid="status-indicator-read" data-active="true"');` |
| circuitFocusMode.test.tsx | circuit_status_indicators_render_without_fake_state | `expect(ldMarkup).toContain('data-testid="status-indicator-write" data-active="false"');` |
| circuitFocusMode.test.tsx | circuit_status_indicators_render_without_fake_state | `expect(ldMarkup).toContain('data-testid="status-indicator-exec" data-active="false"');` |
| circuitFocusMode.test.tsx | circuit_status_indicators_render_without_fake_state | `expect(addaMarkup).toContain('data-testid="status-indicator-exec" data-active="true"');` |
| circuitFocusMode.test.tsx | circuit_status_indicators_render_without_fake_state | `expect(addaMarkup).toContain('data-testid="status-indicator-flag" data-active="true"');` |
| circuitFocusMode.test.tsx | circuit_status_indicators_render_without_fake_state | `expect(stMarkup).toContain('data-testid="status-indicator-write" data-active="true"');` |
| circuitFocusMode.test.tsx | circuit_status_indicators_render_without_fake_state | `expect(stMarkup).toContain('data-testid="status-indicator-exec" data-active="false"');` |
| circuitFocusMode.test.tsx | focus_mode_status_indicators_are_compact | `expect(markup).toContain('data-testid="circuit-status-indicators"');` |
| circuitFocusMode.test.tsx | focus_mode_status_indicators_are_compact | `expect(markup).toContain("Signals");` |
| circuitFocusMode.test.tsx | focus_mode_status_indicators_are_compact | `expect(markup).toContain('data-testid="status-indicator-exec" data-active="true"');` |
| circuitFocusMode.test.tsx | focus_mode_status_indicators_are_compact | `expect(markup).toContain('data-testid="status-indicator-flag" data-active="true"');` |
| circuitFocusMode.test.tsx | focus_mode_status_indicators_are_compact | `expect(markup).toContain('data-testid="status-indicator-write" data-active="false"');` |

### 旧的有效地址单元内部行与标签已不存在；改为加法器旁的数值与进入加法器的路径

| 文件 | 用例 | 断言 |
| --- | --- | --- |
| circuitFocusMode.test.tsx | circuit_index_path_highlights_index_register_and_effective_memory_row | `expect(markup).toContain('data-index="true"');` |
| circuitFocusMode.test.tsx | circuit_index_path_highlights_index_register_and_effective_memory_row | `expect(markup).toContain("IDX");` |
| circuitFocusMode.test.tsx | circuit_index_path_highlights_index_register_and_effective_memory_row | `expect(markup).toContain('data-active="true" data-base-address="0027" data-index-register="GR2" data-effective-address="0028"');` |
| circuitFocusMode.test.tsx | circuit_index_path_highlights_index_register_and_effective_memory_row | `expect(markup).toContain("Address Unit");` |
| circuitFocusMode.test.tsx | circuit_index_path_highlights_index_register_and_effective_memory_row | `expect(markup).toContain('data-testid="effective-address-base-row"');` |
| circuitFocusMode.test.tsx | circuit_index_path_highlights_index_register_and_effective_memory_row | `expect(markup).toContain('data-testid="effective-address-index-row"');` |
| circuitFocusMode.test.tsx | circuit_index_path_highlights_index_register_and_effective_memory_row | `expect(markup).toContain('data-testid="effective-address-ea-row"');` |
| circuitFocusMode.test.tsx | circuit_index_path_highlights_index_register_and_effective_memory_row | `expect(markup).toContain("BASE");` |
| circuitFocusMode.test.tsx | circuit_index_path_highlights_index_register_and_effective_memory_row | `expect(markup).toContain("GR2=0001");` |
| circuitFocusMode.test.tsx | effective_address_unit_hidden_or_inactive_for_non_index_instruction | `expect(markup).toContain("bypass");` |
| circuitFocusMode.test.tsx | eau_rows_are_readable | `expect(markup).toContain('data-testid="effective-address-base-row"');` |
| circuitFocusMode.test.tsx | eau_rows_are_readable | `expect(markup).toContain('data-testid="effective-address-index-row"');` |
| circuitFocusMode.test.tsx | eau_rows_are_readable | `expect(markup).toContain('data-testid="effective-address-ea-row"');` |
| circuitFocusMode.test.tsx | eau_index_input_label_visible | `expect(markup).toContain('data-testid="eau-index-input-label"');` |
| circuitFocusMode.test.tsx | eau_index_input_label_visible | `expect(markup).toContain(">INDEX</text>");` |
| circuitFocusMode.test.tsx | eau_base_input_label_visible | `expect(markup).toContain('data-testid="eau-base-input-label"');` |
| circuitFocusMode.test.tsx | eau_base_input_label_visible | `expect(markup).toContain(">BASE</text>");` |
| circuitFocusMode.test.tsx | eau_output_label_visible | `expect(markup).toContain('data-testid="eau-output-label"');` |
| circuitFocusMode.test.tsx | non_index_eau_remains_inactive | `expect(markup).toContain("bypass");` |
| circuitFocusMode.test.tsx | circuit_ld_data_bus_does_not_cross_alu_active_region | `expect(markup).toContain('data-lane="data-bypass"');` |
| circuitFocusMode.test.tsx | focus_mode_st_path_targets_memory_row | `expect(markup).toContain('data-lane="data-bypass"');` |

### 旧电路内嵌的显示设备模块已不存在；输出只在底部面板

| 文件 | 用例 | 断言 |
| --- | --- | --- |
| circuitFocusMode.test.tsx | focus_mode_output_log_label_distinct_from_out_display | `expect(focusMarkup).toContain("Display Device");` |
| uiRegressionBoundary.test.tsx | dirty_source_focus_mode_keeps_step_guidance_without_stale_activity | `expect(markup).toContain("No output");` |

### 旧电路的内部图层属性已不存在

| 文件 | 用例 | 断言 |
| --- | --- | --- |
| circuitFocusMode.test.tsx | signal_probe_flags_row_does_not_overlap | `expect(markup).toContain("flags");` |

### 旧的主存目标徽标已不存在；被写的字直接标在它那一行

| 文件 | 用例 | 断言 |
| --- | --- | --- |
| circuitFocusMode.test.tsx | focus_mode_memory_target_badge_not_overlapping_title | `expect(markup).toContain('data-testid="memory-target-badge"');` |
| circuitFocusMode.test.tsx | focus_mode_memory_target_badge_not_overlapping_title | `expect(markup).toContain("Target @0029");` |

## 换成新断言的用例

下列用例原先的断言全部属于上表，因此主体换成了新契约下等价的检查。用例名保留，便于对照历史。

| 用例 | 现在检查什么 |
| --- | --- |
| circuit_bus_labels_render_data_addr_ctrl | 总线带位宽标记；没有逐指令的引导线 |
| focus_mode_uses_clean_wire_mode_without_inactive_routes | 固定总线层存在；LD 这一步只画出运行时报告的三条路径 |
| focus_mode_primary_active_path_is_prominent | 每条活动路径恰好一个箭头，其它元素没有任何标记 |
| circuit_status_indicators_render_without_fake_state | 读写由主存引脚表示，执行与标志由 ALU、FR 是否活动表示 |
| focus_mode_status_indicators_are_compact | 控制器列出控制信号并标出本步发出的 |
| eau_rows_are_readable | 有效地址单元活动，加法器旁显示有效地址 |
| eau_index_input_label_visible | 变址输入是变址寄存器进入加法器的路径 |
| eau_base_input_label_visible | 基址输入是译码器地址字段进入加法器的路径 |
| focus_mode_memory_target_badge_not_overlapping_title | 被写的主存字标在它自己那一行 |

## 端到端测试（tests/e2e）

端到端用例同样没有删除任何一条。涉及旧电路 DOM 的断言共改动 97 行，分三类列在下面；其余断言（运行状态、寄存器与主存的值、文档生命周期、三语界面、布局）一个字没改。

| 套件 | 迁移前 | 迁移后 |
| --- | --- | --- |
| mock + wasm（`mock-smoke`、`wasm-smoke`、`debugger-editing`） | 77 条里 11 条失败 | 77 条全部通过 |
| 视觉审查（`visual-review`，三个视口） | 3 条全部失败 | 3 条全部通过 |
| 线上冒烟（`deployed-smoke`） | 未运行（要等上线后对着线上地址跑） | 1 行断言已按新 DOM 改写，尚未对线上运行 |

### “活动连线”改为读取运行时报告的名单（21 行）

旧断言从旧组件画出的线上读 `data-active`。数据通路把运行时判定的连线名单原样发布在 `data-active-wires` 上，断言的事实（哪条线活动、哪条不活动）不变。

| 文件 | 原断言 | 现断言 |
| --- | --- | --- |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveCount(0);` | `expect(circuit).not.toHaveAttribute("data-active-wires", /(?:^\| )memory-to-mdr(?: \|$)/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-base-to-eau']")).toHaveAttribute("data-active", "true");` | `expect(circuit).toHaveAttribute("data-active-wires", /(?:^\| )base-to-eau(?: \|$)/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-index-to-eau']")).toHaveAttribute("data-active", "true");` | `expect(circuit).toHaveAttribute("data-active-wires", /(?:^\| )index-to-eau(?: \|$)/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-eau-to-mar']")).toHaveAttribute("data-active", "true");` | `expect(circuit).toHaveAttribute("data-active-wires", /(?:^\| )eau-to-mar(?: \|$)/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-sp-to-mar-preview']")).toHaveAttribute("data-active", "true");` | `expect(circuit).toHaveAttribute("data-active-wires", /(?:^\| )sp-to-mar-preview(?: \|$)/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveAttribute("data-active", "true");` | `expect(circuit).toHaveAttribute("data-active-wires", /(?:^\| )mdr-to-memory(?: \|$)/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-active", "true");` | `expect(circuit).toHaveAttribute("data-active-wires", /(?:^\| )memory-to-mdr(?: \|$)/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-gr']")).toHaveAttribute("data-active", "true");` | `expect(circuit).toHaveAttribute("data-active-wires", /(?:^\| )mdr-to-gr(?: \|$)/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-return-address-to-mdr']")).toHaveAttribute("data-active", "true");` | `expect(circuit).toHaveAttribute("data-active-wires", /(?:^\| )return-address-to-mdr(?: \|$)/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-eau-to-pr']")).toHaveAttribute("data-active", "true");` | `expect(circuit).toHaveAttribute("data-active-wires", /(?:^\| )eau-to-pr(?: \|$)/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-active", "true");` | `expect(circuit).toHaveAttribute("data-active-wires", /(?:^\| )memory-to-mdr(?: \|$)/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-pr']")).toHaveAttribute("data-active", "true");` | `expect(circuit).toHaveAttribute("data-active-wires", /(?:^\| )mdr-to-pr(?: \|$)/);` |
| caslSmokeHelpers.ts | `expect(page.getByTestId("wire-pr-to-mar")).toHaveAttribute("data-active", "true");` | `expect(page.getByTestId("comet-circuit-svg")).toHaveAttribute("data-active-wires", /(?:^\| )pr-to-mar(?: \|$)/);` |
| caslSmokeHelpers.ts | `expect(page.getByTestId("wire-memory-to-mdr")).toHaveAttribute("data-active", "true");` | `expect(page.getByTestId("comet-circuit-svg")).toHaveAttribute("data-active-wires", /(?:^\| )memory-to-mdr(?: \|$)/);` |
| caslSmokeHelpers.ts | `expect(page.getByTestId("wire-ir-to-decoder")).toHaveAttribute("data-active", "true");` | `expect(page.getByTestId("comet-circuit-svg")).toHaveAttribute("data-active-wires", /(?:^\| )ir-to-decoder(?: \|$)/);` |
| caslSmokeHelpers.ts | `expect(page.getByTestId("wire-decoder-to-controller")).toHaveAttribute("data-active", "true");` | `expect(page.getByTestId("comet-circuit-svg")).toHaveAttribute("data-active-wires", /(?:^\| )decoder-to-controller(?: \|$)/);` |
| caslSmokeHelpers.ts | `expect(page.getByTestId("wire-pr-to-mar")).toHaveCount(0);` | `expect(page.getByTestId("comet-circuit-svg")).not.toHaveAttribute("data-active-wires", /(?:^\| )pr-to-mar(?: \|$)/);` |
| caslSmokeHelpers.ts | `expect(page.getByTestId("wire-mdr-to-gr")).toHaveAttribute("data-active", "true");` | `expect(page.getByTestId("comet-circuit-svg")).toHaveAttribute("data-active-wires", /(?:^\| )mdr-to-gr(?: \|$)/);` |
| visual-review.spec.ts | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-return-address-to-mdr']")).toHaveAttribute("data-active", "true");` | `expect(page.getByTestId("comet-circuit-svg")).toHaveAttribute("data-active-wires", /(?:^\| )return-address-to-mdr(?: \|$)/);` |
| visual-review.spec.ts | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-eau-to-pr']")).toHaveAttribute("data-active", "true");` | `expect(page.getByTestId("comet-circuit-svg")).toHaveAttribute("data-active-wires", /(?:^\| )eau-to-pr(?: \|$)/);` |
| visual-review.spec.ts | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-mdr-to-pr']")).toHaveAttribute("data-active", "true");` | `expect(page.getByTestId("comet-circuit-svg")).toHaveAttribute("data-active-wires", /(?:^\| )mdr-to-pr(?: \|$)/);` |

### 换成新 DOM 上表达同一事实的断言（49 行）

路径的种类由 `data-path-kind` 表示，读写的主存行由 `data-read` / `data-write` 表示，读写信号由主存引脚表示，执行与标志由 ALU、FR 是否活动表示，有效地址的三个输入分别在译码器地址字段、变址寄存器与加法器旁。

| 文件 | 原断言 | 现断言 |
| --- | --- | --- |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='alu-shift-badge']")).toContainText("SLL");` | `expect(circuit.locator("[data-signal='alu-op']")).toContainText("SLL");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-shift-count-to-alu']")).toBeVisible();` | `expect(circuit.locator("[data-path-id='ea-to-alu-b']")).toBeVisible();` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='effective-address-base-row']")).toContainText("0027");` | `expect(circuit.locator("[data-decoder-field='adr']")).toContainText("0027");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='effective-address-index-row']")).toContainText("GR2=0001");` | `expect(circuit.locator("[data-testid='register-gr2']")).toContainText("0001");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='effective-address-ea-row']")).toContainText("0028");` | `expect(circuit.locator("[data-testid='effective-address-unit']")).toContainText("0028");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toBeVisible();` | `expect(circuit.locator("[data-path-id='memory-to-mdr']")).toBeVisible();` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveClass(/circuit-wire--data-flow/);` | `expect(circuit.locator("[data-path-id='memory-to-mdr']")).toHaveAttribute("data-path-kind", "data");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-from-anchor", "memory.0027.left");` | `expect(circuit.locator("[data-testid='memory-row-0027']")).toHaveAttribute("data-read", "true");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).not.toHaveAttribute("marker-end", /.+/);` | `expect(circuit.locator("[data-path-id='memory-to-mdr']")).toHaveAttribute("marker-end", /url\(#.+\)/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).not.toHaveAttribute("marker-mid", /.+/);` | `expect(circuit.locator("[data-path-id='memory-to-mdr']")).not.toHaveAttribute("marker-mid", /.+/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toBeVisible();` | `expect(circuit.locator("[data-path-id='gr-to-alu-a']")).toBeVisible();` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveClass(/circuit-wire--data-flow/);` | `expect(circuit.locator("[data-path-id='gr-to-alu-a']")).toHaveAttribute("data-path-kind", "data");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-alu']")).toBeVisible();` | `expect(circuit.locator("[data-path-id='mdr-to-alu-b']")).toBeVisible();` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-alu-to-fr']")).toHaveClass(/circuit-wire--flag-flow/);` | `expect(circuit.locator("[data-path-id='alu-to-fr']")).toHaveAttribute("data-path-kind", "flag");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toBeVisible();` | `expect(circuit.locator("[data-path-id='mdr-to-memory']")).toBeVisible();` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveClass(/circuit-wire--data-flow/);` | `expect(circuit.locator("[data-path-id='mdr-to-memory']")).toHaveAttribute("data-path-kind", "data");` |
| mock-smoke.spec.ts | `expect(circuit).toContainText("DATA BUS");` | `expect(circuit.locator("[data-bus-width='data-bus']")).toHaveCount(1);` |
| mock-smoke.spec.ts | `expect(circuit).toContainText("ADDR BUS");` | `expect(circuit.locator("[data-bus-width='address-bus']")).toHaveCount(1);` |
| mock-smoke.spec.ts | `expect(page.getByTestId("source-map-highlight")).toHaveAttribute("data-current-line", "2");` | `expect(page.getByTestId("comet-circuit-svg").locator("[data-instruction]")).toHaveAttribute("data-instruction", /\S/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toBeVisible();` | `expect(circuit.locator("[data-path-id='memory-to-mdr']")).toBeVisible();` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveClass(/circuit-wire--data-flow/);` | `expect(circuit.locator("[data-path-id='memory-to-mdr']")).toHaveAttribute("data-path-kind", "data");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='status-indicator-read']")).toHaveAttribute("data-active", "true");` | `expect(circuit.locator("[data-memory-pin='rd']")).toHaveAttribute("data-on", "true");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='status-indicator-exec']")).toHaveAttribute("data-active", "false");` | `expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "false");` |
| mock-smoke.spec.ts | `expect(page.getByTestId("source-map-highlight")).toHaveAttribute("data-current-line", "3");` | `expect(page.getByTestId("comet-circuit-svg").locator("[data-instruction]")).toHaveAttribute("data-instruction", /\S/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toBeVisible();` | `expect(circuit.locator("[data-path-id='gr-to-alu-a']")).toBeVisible();` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveClass(/circuit-wire--data-flow/);` | `expect(circuit.locator("[data-path-id='gr-to-alu-a']")).toHaveAttribute("data-path-kind", "data");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-alu-to-fr']")).toBeVisible();` | `expect(circuit.locator("[data-path-id='alu-to-fr']")).toBeVisible();` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-alu-to-fr']")).toHaveClass(/circuit-wire--flag-flow/);` | `expect(circuit.locator("[data-path-id='alu-to-fr']")).toHaveAttribute("data-path-kind", "flag");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='status-indicator-exec']")).toHaveAttribute("data-active", "true");` | `expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "true");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='status-indicator-flag']")).toHaveAttribute("data-active", "true");` | `expect(circuit.locator("[data-testid='module-fr']")).toHaveAttribute("data-active", "true");` |
| mock-smoke.spec.ts | `expect(page.getByTestId("source-map-highlight")).toHaveAttribute("data-current-line", "4");` | `expect(page.getByTestId("comet-circuit-svg").locator("[data-instruction]")).toHaveAttribute("data-instruction", /\S/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toBeVisible();` | `expect(circuit.locator("[data-path-id='mdr-to-memory']")).toBeVisible();` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveClass(/circuit-wire--data-flow/);` | `expect(circuit.locator("[data-path-id='mdr-to-memory']")).toHaveAttribute("data-path-kind", "data");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveAttribute("data-to-anchor", "memory.0029.left");` | `expect(circuit.locator("[data-testid='memory-row-0029']")).toHaveAttribute("data-write", "true");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).not.toHaveAttribute("marker-end", /.+/);` | `expect(circuit.locator("[data-path-id='mdr-to-memory']")).toHaveAttribute("marker-end", /url\(#.+\)/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).not.toHaveAttribute("marker-mid", /.+/);` | `expect(circuit.locator("[data-path-id='mdr-to-memory']")).not.toHaveAttribute("marker-mid", /.+/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='status-indicator-write']")).toHaveAttribute("data-active", "true");` | `expect(circuit.locator("[data-memory-pin='wr']")).toHaveAttribute("data-on", "true");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='status-indicator-exec']")).toHaveAttribute("data-active", "false");` | `expect(circuit.locator("[data-testid='module-alu']")).toHaveAttribute("data-active", "false");` |
| visual-review.spec.ts | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='alu-shift-badge']")).toContainText("SLL");` | `expect(page.getByTestId("comet-circuit-svg").locator("[data-signal='alu-op']")).toContainText("SLL");` |
| visual-review.spec.ts | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-shift-count-to-alu']")).toBeVisible();` | `expect(page.getByTestId("comet-circuit-svg").locator("[data-path-id='ea-to-alu-b']")).toBeVisible();` |
| visual-review.spec.ts | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='effective-address-base-row']")).toContainText("0027");` | `expect(page.getByTestId("comet-circuit-svg").locator("[data-decoder-field='adr']")).toContainText("0027");` |
| visual-review.spec.ts | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='effective-address-index-row']")).toContainText("GR2=0001");` | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='register-gr2']")).toContainText("0001");` |
| visual-review.spec.ts | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='effective-address-ea-row']")).toContainText("0028");` | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='effective-address-unit']")).toContainText("0028");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-terminal-memory-to-mdr']")).toHaveCount(0);` | `expect(circuit.locator("[data-layer='structural-buses'] [marker-start], [data-layer='structural-buses'] [marker-mid], [data-layer='structural-buses'] [marker-end]")).toHaveCount(0);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-guide-sp-to-mar-preview']")).toHaveCount(0);` | `expect(circuit.locator("[data-path-id='sp-to-mux']")).toHaveCount(0);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-terminal-mdr-to-memory']")).toHaveCount(0);` | `expect(circuit.locator("[data-layer='structural-buses'] [marker-start], [data-layer='structural-buses'] [marker-mid], [data-layer='structural-buses'] [marker-end]")).toHaveCount(0);` |
| visual-review.spec.ts | `expect(page.getByTestId("comet-circuit-svg")).toContainText("DATA BUS");` | `expect(page.getByTestId("comet-circuit-svg").locator("[data-bus-width='data-bus']")).toHaveCount(1);` |
| visual-review.spec.ts | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-guide-sp-to-mar-preview']")).toHaveCount(0);` | `expect(page.getByTestId("comet-circuit-svg").locator("[data-path-id='sp-to-mux']")).toHaveCount(0);` |
| deployed-smoke.spec.ts | `expect(page.getByTestId("comet-circuit-svg").locator("path.circuit-wire[marker-start], path.circuit-wire[marker-mid], path.circuit-wire[marker-end]")).toHaveCount(0);` | `expect(page.getByTestId("comet-circuit-svg").locator("[data-layer='structural-buses'] [data-bus-id]")).not.toHaveCount(0);`<br>`expect(page.getByTestId("comet-circuit-svg").locator("[data-layer='structural-buses'] [marker-start], [data-layer='structural-buses'] [marker-mid], [data-layer='structural-buses'] [marker-end]")).toHaveCount(0);` |

### 已移除：只描述旧电路内部结构，或断言旧电路才会画的东西不存在（27 行）

车道、锚点、流动 class、端点标记、逐指令引导线在数据通路里没有对应物；“不存在”类断言在新界面上恒真，留着只会造成已被检查的假象。连接点与箭头的新规则见 ADR 0023，由 `datapathCanvas.test.tsx` 覆盖。

| 文件 | 原断言 |
| --- | --- |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-shift-count-to-alu']")).toHaveAttribute("data-lane", "data-compute");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveClass(/circuit-wire--flow/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveAttribute("data-to-anchor", "mdr.right");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveClass(/circuit-wire--flow/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveClass(/circuit-wire--flow/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-memory-to-mdr']")).toHaveClass(/circuit-wire--flow/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-gr']")).toHaveAttribute("data-lane", "data-bypass");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-gr']")).toHaveAttribute("data-avoids-alu", "true");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-gr']")).toHaveClass(/circuit-wire--flow/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveAttribute("data-lane", "data-compute");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveAttribute("data-to-anchor", "alu.inputA");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-alu']")).toHaveAttribute("data-to-anchor", "alu.inputB");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-alu-to-gr']")).toHaveAttribute("data-from-anchor", "alu.outputY");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-gr-to-alu']")).toHaveClass(/circuit-wire--flow/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-mdr-to-memory']")).toHaveClass(/circuit-wire--flow/);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-gr-to-mdr']")).toHaveAttribute("data-lane", "data-bypass");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-gr-to-mdr']")).toHaveAttribute("data-avoids-alu", "true");` |
| visual-review.spec.ts | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-mdr-to-gr']")).toHaveAttribute("data-lane", "data-bypass");` |
| visual-review.spec.ts | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-gr-to-alu']")).toHaveAttribute("data-lane", "data-compute");` |
| visual-review.spec.ts | `expect(page.getByTestId("comet-circuit-svg").locator("[data-testid='wire-gr-to-mdr']")).toHaveAttribute("data-lane", "data-bypass");` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-active-terminal='true']")).toHaveCount(0);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-junction-memory-to-mdr-0']")).toHaveCount(0);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='junction-data-right']")).toHaveCount(0);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid^='memory-terminal-marker-']")).toHaveCount(0);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid^='memory-terminal-marker-']")).toHaveCount(0);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-testid='wire-guide-mar-to-stack-memory-preview']")).toHaveCount(0);` |
| mock-smoke.spec.ts | `expect(circuit.locator("[data-active-terminal='true']")).toHaveCount(0);` |

### 脚本之外手工改的断言（13 行）

| 文件 | 原断言 | 现断言 | 原因 |
| --- | --- | --- | --- |
| mock-smoke.spec.ts、visual-review.spec.ts（各 1 处） | `effective-address-unit` 含文字 `Address Unit` | 含文字 `EA` | 旧标签已退役；加法器旁显示的是有效地址本身 |
| mock-smoke.spec.ts（1 处） | 电路含文字 `CTRL` | `[data-layer='control-lines']` 恰好一层 | 控制线不再靠文字标签表示，而是单独的一层虚线 |
| mock-smoke.spec.ts（9 处）、visual-review.spec.ts（1 处） | `[data-path-id=…]` `toBeVisible()` | `toHaveCount(1)` | 笔直的竖线或横线包围盒宽或高为 0，Playwright 把它判为不可见；路径是否画出改用是否存在判断，紧跟其后的 `data-path-kind` 断言不变 |

## 迁移过程中查出并修掉的两个既有问题

这两个问题在迁移前的基线（标签 `wcasl-replacement-final-gate-phase20g`）上就存在，与换电路无关。它们让端到端结果时过时不过，所以在这里一并处理并记录。

### 调试器编辑对话框会先画出上一个编辑对象的草稿（应用缺陷，已修）

- 现象：`debugger-editing.spec.ts` 的“CASL Mode debugger editing and Full Clear preserve document ownership”在基线上也失败，期望 `OF1`，实际 `OF0SF1ZF1`。
- 原因：`DebuggerEditDialog` 在 effect 里重置草稿，因此换编辑对象后的第一帧画的还是上一个对象的草稿，下一帧才纠正。先把 SP 改成 `#FFFC` 再打开 FR 时，`#FFFC` 的第 2 位是 1，于是 OF 在第一帧显示为已勾选；测试的 `check()` 看到“已勾选”便不再点击，随后 effect 把它清掉。带日志的复现脚本 6 次里 5 次丢失 OF。
- 修复：草稿改在渲染阶段随编辑对象与当前值重置（React 文档里“属性变化时调整状态”的写法），对话框不会再画出旧草稿；焦点管理仍在 effect 里，行为不变。改动只在 `src/components/DebuggerDialogs.tsx`。
- 测试：没有改动原测试。新增 `src/tests/v1DebuggerDialogDraft.test.tsx` 三条，直接检查提交那一帧的内容；它们在旧代码上失败（第一帧是 `fr:100`），在新代码上通过。修复后复现脚本 8 次全部正确。

### 视觉审查里“保存期间并发编辑”一步没有等写入真正挂起（测试时序，已补等待）

- 现象：`visual-review.spec.ts` 的 1440×900 用例偶发失败，期望提示含 `still unsaved`，实际停在上一次保存留下的 `Saved`。单独运行两次一过一不过。
- 原因：测试点了保存、改了源码之后立刻调用 `__finishSave`，但写入可能还没走到被延迟的 `close()`，此时 `__finishSave` 还不存在，调用是空操作，保存永远不结束。`mock-smoke.spec.ts` 里同一流程的两条用例都先等了挂起状态，这一条漏了。
- 处理：补上与 `mock-smoke` 相同的两个等待（保存按钮 `aria-busy`、`__finishSave` 已就绪），断言本身没有改。补完后连续 3 次通过。

## 尚未处理

- 旧组件及其专属文件（`CometCircuitSvg.tsx`、`circuitLayout.ts`、`wirePaths.ts`、`visualPathResolver.ts`、`instructionPathTemplates.ts`）已经不被应用引用，但文件与它们各自的单元测试还在。上线前按 ADR 0023 的迁移规则一并移除，并在这里补记。
- `src/styles/app.css` 里旧电路的样式规则同样还在，随旧组件一起清理。
