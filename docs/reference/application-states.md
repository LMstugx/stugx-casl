# Application States

- Audience: UI, store, and runtime maintainers
- Status: Canonical
- Last reviewed version: 0.1.0
- Classification: Canonical
- Related: [Frontend State Management](../developer/frontend-state-management.md), [COMET II VM](../developer/comet-vm.md)

The runtime state machine exposes:

| State | Meaning |
| --- | --- |
| `Idle` | No assembled program is active |
| `Dirty` | Source differs from the revision associated with current derived state |
| `Ready` | A program is assembled and ready to execute |
| `Running` | Run is actively executing |
| `WaitingInput` | An expanded `IN` service is waiting nonblockingly for one Console record |
| `Stopped` | Run was explicitly stopped |
| `Finished` | Program reached normal top-level completion |
| `Error` | Assembly or execution cannot continue |

Document Dirty state is revision-derived and separate from transient file operation state. Presentation selections and persisted UI preferences do not change the VM state.

Source replacement returns runtime-derived views to their unloaded defaults. Persistence hydration must not create a loaded VM, diagnostics, Generated CASL, or Dirty state.

Manual mutation returns a loaded `Stopped`, `Finished`, or `WaitingInput` machine to safe `Ready` state without executing. Full Clear returns the VM to `Idle` while preserving the document and its separate Dirty state.
