# Phase 5G Main Memory Viewer

Phase 5G separates the two memory displays:

- Circuit Memory is a compact execution view inside the COMET II diagram. It stays focused on the current instruction neighborhood.
- Inspector Memory is the detailed debugging viewer. It can inspect a wider range without rendering all 65536 memory words.

## Range Controls

The Inspector Memory tab defaults to the current program start address and 64 rows. The user can set:

- Start address: four-digit hexadecimal, such as `0020`.
- Row count: `32`, `64`, `128`, or `256`.

The viewer generates a bounded memory window from `CometState.memory`, `SourceMap`, and step trace fields. It does not use fixed `A/B/C` labels or a fixed `0020..002A` range.

## Jump Controls

The Memory tab supports quick jumps to:

- Program start
- PR
- MAR
- Last read address
- Last write address

Read and write jumps are disabled until the runtime has a corresponding address.

## Highlight Rules

Memory rows use distinct markers:

- PR: blue row marker
- MAR: bordered address marker
- Last read: green row marker
- Last write: red row marker
- Labels: shown in the Label column from the current SourceMap
- Changed values: use the existing changed row flash

The row count is capped at 256 so the UI does not create a 65536-row DOM table. A future phase can replace this bounded window with a virtualized list if full-memory browsing becomes necessary.
