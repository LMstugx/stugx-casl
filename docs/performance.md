# Performance Plan

This document defines performance goals and benchmark strategy. These numbers are targets, not hard Phase 1 gates.

## Current Goals

- Assemble 1000 CASL lines in under 100 ms on a typical desktop.
- Execute one `step` in under 1 ms.
- Resolve a visual path in under 1 ms.
- Generate a memory window without scanning or rendering 65536 rows.
- Render key SVG states without visible interaction lag.
- Run 10000 VM steps without freezing the UI thread in a future async/run mode.

## Benchmark Targets

Phase 1 records the benchmark plan and keeps small structural tests. Later benchmark suites should measure:

- Assemble 100 lines.
- Assemble 1000 lines.
- Average single-step time.
- SVG render time for Ready, LD, ADDA, ST, and Finished.
- MemoryWindow generation time.
- `visualPathResolver` time.

## Method

Frontend benchmarks can use Vitest micro benchmarks for pure functions and Playwright tracing for UI render behavior.

C++ benchmarks can use a small executable or a benchmark framework later. The first useful measurements should cover parser, assembler pass 1, assembler pass 2, VM step, and VM run with max step guards.

Visual benchmarks start with SVG DOM assertions. A later Playwright suite can export PNG screenshots under `artifacts/visual/` and compare against baselines with a pixel threshold.

## Hotspots To Watch

- Parser tokenization and repeated string allocation.
- Symbol table lookup and address-to-source lookup.
- Full memory cloning in frontend mock state.
- Rendering large memory tables.
- Recomputing SVG path data or SourceMap derived data in JSX.
- Long trace histories.

## Non-Goals

Do not optimize before measurement. Do not obscure parser, assembler, VM, or visual path logic for theoretical speed. The first priority is correctness, stable boundaries, and testable structure.
