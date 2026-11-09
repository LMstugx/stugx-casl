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

## 尚未处理

- 旧组件及其专属文件（`CometCircuitSvg.tsx`、`circuitLayout.ts`、`wirePaths.ts`、`visualPathResolver.ts`、`instructionPathTemplates.ts`）已经不被应用引用，但文件与它们各自的单元测试还在。上线前按 ADR 0023 的迁移规则一并移除，并在这里补记。
- `src/styles/app.css` 里旧电路的样式规则同样还在，随旧组件一起清理。
