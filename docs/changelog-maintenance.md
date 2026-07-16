# Changelog Maintenance

## Canonical Registry

`src/content/releases.ts` is the only release-note content source. The application imports it directly for the offline Changelog dialog, while `scripts/generate-changelog.mjs` converts its English content into the repository-root `CHANGELOG.md`. Do not maintain a second release list in React, Markdown, GitHub Releases, Cloudflare, or another service.

The registry is compiled into both Web and Tauri frontend bundles. Reading release notes never requires GitHub, Cloudflare, a network request, an updater, analytics, or a persistence key.

## Version Source Of Truth

`package.json` is the canonical current version source. Vite places the same value in `BUILD_METADATA`; production metadata and deployment manifests consume that value. The current release must appear exactly once in the registry, and the UI Current badge compares each entry with `BUILD_METADATA.version` rather than assuming the first entry is current.

The present package version is `0.1.0`. Existing `v1.0-rcN` tags are a historical release-candidate namespace established before package-version unification. They remain valid historical entries but do not replace the current package version or imply a final `v1.0.0` release.

## Release Model

Channels are `stable`, `preview`, and `desktop-demo`. A channel describes that entry; it is not inferred from position, tag shape, deployment host, or locale. The current public Web deployment is a Preview.

Sections use this fixed order:

1. Added
2. Improved
3. Fixed
4. Security
5. Documentation
6. Known Issues

Empty sections are omitted. Every title, summary, and item must provide explicit `en`, `ja`, and `zh-CN` text. Versions, dates, commit hashes, tags, and technical names are not translated. Release identity never comes from localized text.

## Commit, Tag, And URL Policy

- A declared commit must be a full hexadecimal commit that exists in repository history.
- A declared tag must already exist. Do not reserve or invent future tags in the registry.
- Dates use `YYYY-MM-DD` and must be supported by actual commit or release documentation.
- The canonical repository URL is `https://github.com/LMstugx/stugx-casl`.
- The permanent public Web URL is `https://stugx-casl.pages.dev/`; immutable deployment-hash URLs are not release identities.
- URLs are fixed trusted HTTPS values and render with `noopener noreferrer`.

## Add A Release

1. Confirm the user-visible work is in the target branch.
2. Confirm the package version and release channel; do not invent a version or date.
3. Add one newest-first `ReleaseNote` to `src/content/releases.ts`.
4. Write all three locales for every user-visible field.
5. Use only the canonical section order and document honest known limitations.
6. Add a commit or tag only after it exists.
7. Run `pnpm changelog:generate`.
8. Run `pnpm changelog:verify`, unit tests, E2E, production build, and visual review.
9. Commit the registry and generated `CHANGELOG.md` together.

Manual edits to generated Markdown are rejected by `changelog:verify`. The production `prebuild` hook also verifies registry/Markdown agreement before the normal WASM-first build. If CI supplies `STUGX_BUILD_VERSION`, that exact version must already exist once in the registry or verification fails.

## UI Contract

The entry is a low-weight button inside Project Overview, not a Toolbar action. The App-owned dialog defaults the latest entry open, supports native keyboard expansion for older entries, traps focus, closes with Escape or backdrop, and restores focus to the trigger. Its large bounded body scroll avoids both page growth and a tiny scroll trap at 1280x720.

Release text renders as React text nodes. There is no runtime Markdown parser, HTML rendering, `dangerouslySetInnerHTML`, user input, read state, unread badge, update check, or automatic opening.

## Security And Privacy

Release notes are repository-authored static data. They do not read tokens, local files, source code, GitHub APIs, Cloudflare APIs, or storage. They create no request and no localStorage key. The registry must not contain local paths, private/WIP branch names, credentials, raw build environments, or unpublished feature claims.

## Known Limitations

- The registry does not implement automatic update discovery or a release feed.
- Historical RC versions use the preserved legacy tag format.
- The English generated Markdown is canonical for GitHub; localized release notes are available in the application.
- GitHub Release objects are optional publication artifacts and are not the data source.
