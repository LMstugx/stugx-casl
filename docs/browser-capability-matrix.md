# Browser Capability Matrix

| Capability | Class | Behavior |
| --- | --- | --- |
| WebAssembly and ES modules | required | Safe application failure with Reload; no Mock fallback or code diagnostic. |
| TextDecoder fatal UTF-8 | optional with validated fallback | Open retains strict invalid-encoding policy. |
| File input and File/Blob APIs | required for related file action | Unsupported action is presented outside code diagnostics. |
| File System Access API | optional | Confirmed write when secure; otherwise download-copy Save As. |
| localStorage | optional | Four independent domains use safe defaults. |
| beforeunload | optional platform behavior | Revision-derived Dirty protection when supported. |
| secure context | optional enhancer | Required only for File System Access writes. |
| reduced-motion | optional accessibility preference | Existing CSS disables nonessential wire animation. |

Detection is local, side-effect free, unpersisted, and untransmitted. It does not fingerprint, mutate source, set Dirty, create diagnostics, or alter storage keys.
