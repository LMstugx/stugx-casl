# Phase 18A.3 Versioned Changelog UI

## Scope

Phase 18A.3 adds a typed, offline release registry, deterministic repository Changelog generation, and an accessible EN/JA/zh-CN in-application Changelog. It adds no updater, network request, read tracking, persistence field, Toolbar pressure, parser/assembler/lowering/VM change, diagnostic change, Cloudflare header change, or Phase 14/15/16 baseline change.

## Version Audit

| Source | Result |
| --- | --- |
| `package.json` | Canonical current version `0.1.0` |
| Vite build metadata | Defaults to the package version |
| deployment manifest | Receives the production build version |
| Tauri config and Cargo package | `0.1.0`, aligned in current `master` |
| Git tags | Historical `v1.0-rcN` release-candidate namespace |
| previous `CHANGELOG.md` | Placeholder replaced by generated output |

The Desktop Demo commits are ancestors of current `master`, so the current Preview may truthfully mention the offline Tauri demo. It is not given a fabricated standalone release version or tag.

## Initial Registry

- `0.1.0`, dated 2026-07-17, Preview: public Cloudflare Pages WASM deployment, file lifecycle, safe persistence, diagnostics/localization, observation UI, offline desktop demo, security boundary, and known limitations.
- `v1.0-rc10`, dated 2026-07-11, Preview: actual tagged learning-visualization and clean-wire milestone.
- `v1.0-rc1`, dated 2026-07-10, Preview: actual first tagged CASL II / COMET II learning release-candidate milestone.

These entries consolidate user-visible milestones. Internal engineering phases are not presented as releases, and unsupported complete-C++ features are not claimed.

## Generation And Validation

`scripts/changelog-lib.mjs` loads the strongly typed registry with the local TypeScript compiler, validates version/date/channel/locale/section/commit/tag/URL contracts, and renders fixed-order English Markdown. `scripts/generate-changelog.mjs` writes `CHANGELOG.md`; `scripts/verify-changelog.mjs` compares exact deterministic output and accepts a test-only `--file` target for drift checks.

`pnpm changelog:generate` is the only supported update path. `pnpm changelog:verify` and the production `prebuild` gate fail on drift or an invalid registry.

## Application UI

Project Overview contains the localized `Changelog` / `変更履歴` / `更新日志` trigger. `ChangelogLauncher` isolates release UI localization from existing lesson-content boundaries. `ChangelogDialog` is rendered in a body portal so the compact Demo Guide overflow container cannot clip it.

The dialog uses build metadata for Current identity, defaults the newest release open, uses keyboard-operable native details for older releases, exposes semantic dates and safe external links, traps focus, closes on Escape/backdrop, and returns focus. A large bounded scroll body remains readable at 1280x720 without locking the application page.

## Web And Tauri Reuse

The component imports no Tauri API and uses no runtime fork. Vite packages the same registry in the Web and Tauri frontend. Tauri can display it offline; Web deployment uses the same content without API access. The four Phase 16 storage keys remain unchanged.

## Security And Privacy

- No GitHub or Cloudflare API call.
- No background version check, updater, analytics, or telemetry.
- No localStorage key or read state.
- No HTML/Markdown runtime injection.
- Release text is ordinary React text.
- Only fixed trusted HTTPS links are emitted with `noopener noreferrer`.
- No local path, private/WIP branch name, token, source text, diagnostic payload, or VM data is included.

## Visual And Regression Gate

The visual plan covers current releases in all three locales, multiple releases, known issues, long technical text, keyboard focus, and 1280x720 containment. Existing natural page scroll, bounded data scroll, locale layout, production WASM, clean-wire, file lifecycle, persistence, diagnostic, parser, lowering, and VM contracts remain regression gates.

## Known Limitations

- This is a local release history, not an update service.
- No unread state or notification is provided.
- Historical RC tags preserve their earlier version namespace.
- Public GitHub Markdown is English; the application carries all three locales.

## Final Result

Final quality gate: **PASS**. Registry/Markdown verification, 1,402 unit tests, 61 full E2E tests, 13 dedicated WASM E2E tests, production WASM build and static smoke, 65 CTest cases, stress checks, visual review/capture with manual inspection, and dependency audit passed. Deployed smoke is repeated after the Phase commit reaches Cloudflare Pages.

## Next Recommendation

Phase 18A.4 should consolidate audience-facing technical documentation around the canonical release registry, architecture boundaries, supported C++/CASL teaching scope, public Web usage, and unsigned desktop demo workflow without duplicating executable release data.
