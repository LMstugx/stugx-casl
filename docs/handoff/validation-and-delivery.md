# 验证、风险与交付说明

- Audience: Claude、前端维护者与验收者
- Status: Handover snapshot
- Last reviewed version: 0.1.0
- Classification: Handover snapshot
- Related: [交接入口](README.md), [验收场景](requirements-and-acceptance.md), [Build reference](../reference/build-commands.md)

## 本次整理与后续开发的区别

本次只新增交接文档/索引、导出资料，不修改 production code，不重跑或宣称整个 Web/WASM/C++/Tauri 发布矩阵全部通过。本次文档、链接、打包检查的实际结果见导出目录的 `handoff-verification.json`。

历史 Phase 报告与之前的 PASS 不是 Claude 修改后的验证证据。新 UI 需要自己的 before/after screenshots、测试结果与未完成项记录。本次未重新 fetch 远端或跑 Cloudflare smoke，网站当前健康和部署 commit 需要发布时独立验证。

## 本地开发

在包含 package.json 的应用仓库根执行，遵循 lockfile：

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

纯 UI 开发可从现有 Mock 开始，但交付必须验证 WASM。WASM 需要 Emscripten，C++ tests 需要 CMake 与相应工具链，Tauri 需要 Rust 和 Windows 构建前提。参考 [WASM](../developer/wasm-bridge.md)、[Tauri](../developer/tauri-integration.md)、[build/test/release](../developer/build-test-release.md)。不得把 native 编译工具用于执行用户输入的 C++ 程序。

端口冲突时使用空闲端口，不停止不属于本任务的服务。当前 HEAD 的 Playwright 配置支持 `E2E_MOCK_PORT`、`E2E_WASM_PORT`、`E2E_VISUAL_PORT`；这些属于测试配置，不是应用 preference。例如确认端口空闲后设置 5273/5274/5275。不要误连旧版本 dev server。

## 推荐迭代检查

```powershell
pnpm docs:verify
pnpm changelog:verify
pnpm exec vitest run src/tests/phase20e1UnifiedObservationWorkspace.test.tsx src/tests/phase20eReverseInstruction.test.tsx src/tests/phase20dReverseMicrostep.test.tsx src/tests/phase20cMicrocycleUi.test.tsx
pnpm build:web
pnpm test:e2e
pnpm visual:review
git diff --check
```

若修改了 double/diagnostics/documents/项目 UI，加入相应测试，不能只跑 workspace。`build:web` 不是完整 production/WASM/Tauri 发布证明。

## 交付前完整矩阵

沿用历次集成要求。下面是需执行的清单，不是已经执行的记录：

```powershell
pnpm docs:verify
pnpm changelog:verify
pnpm test
pnpm build
pnpm test:e2e
pnpm build:wasm
pnpm test:wasm
pnpm test:e2e:wasm
pnpm visual:review
pnpm visual:capture
powershell -ExecutionPolicy Bypass -File scripts/validate-all.ps1
powershell -ExecutionPolicy Bypass -File scripts/stress-check.ps1
pnpm test:e2e:production
pnpm test:e2e:production:subpath
pnpm audit
cmake --build cpp-core/build
ctest --test-dir cpp-core/build -C Debug --output-on-failure
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
pnpm tauri:build
pnpm tauri:verify
git diff --check
git status --short
```

首次运行需按项目文档 configure CMake；不能因为没有 build 目录就伪造测试成功。测试数量会随维护变化，报告实际 counts，不复制旧数字。只有用户明确批准发布后才执行部署流程与远端验证，不在优化中途 push master。

## 两个必须先理解的历史冻结测试

| 文件 / test | 当前实现 | 对前端任务的影响 |
| --- | --- | --- |
| [phase20gFinalGate.test.ts](../../src/tests/phase20gFinalGate.test.ts) / `no_new_network_request` | 从 Phase 20F baseline 比较整个 src，拒绝非 src/tests 改动 | 名称看起来检查网络，实际会阻止任何 UI 修改 |
| [phase21aX86ArchitectureGate.test.ts](../../src/tests/phase21aX86ArchitectureGate.test.ts) / `x86_does_not_modify_comet_runtime` | 从 Phase 20G baseline 比较 cpp-core/src，拒绝非测试改动 | 在设计分支正确，但未来 UI 改动也会触发 |

不要直接删、skip、放宽成空检查，也不要移动旧 tag。先将“历史阶段没有改变 production”与“当前前端仍遵守 runtime/network/storage 契约”分开：历史审计可以固定比较已冻结 commit 范围；新的前端回归应对实际禁止行为、保护文件及运行结果建立检查。具体迁移需单独说明并审查，本次交接不改这些测试。

## 已发现的文档维护风险

- [frontend-state-management](../developer/frontend-state-management.md) 的旧描述含 reverse 未来化表述，不能覆盖已实现的 Phase 20D/20E 契约。
- [open-save-new](../user/open-save-new.md) 主要是单文档工作流；多模块需同时读 [multi-program-projects](../user/multi-program-projects.md) 和实际 project session。
- 历史 prompt 建议的 ADR 编号、组件名不一定是最终文件名。以目录实际文件为准，不创建第二套同义文档来“补齐”旧 prompt。
- docs:verify 按 canonical inventory 检查；本交接是快照，没有加入 canonical count，因此另做交接目录链接与内容检查。

这些是交接提示，不是此次顺带大范围清理旧文档的授权。

## 截图与安全检查

至少覆盖 EN/JA/zh-CN，1180×700、1280×720、1440×900、1920×1080，Registers/Memory/Stack/Code/Trace，Fetch/read/write/flags、两种 Reverse、barrier、Focus、Follow、跨模块 mapping。截图必须来自真实运行，不能只检查静态布局。

记录是否有整页横向溢出、Circuit remount、无界 Memory/Trace 列表、焦点丢失、observer 泄漏和 Run/Stop 卡顿。保留 clean-wire，检查 console errors 与第三方 network requests。

打包与提交分开：使用 tracked source 白名单，不打包 `.git`、node_modules、dist、target、build、coverage、artifacts、截图、环境文件、密钥、source maps 或安装包。文件名含 token/secret 不一定是凭据，内容与用途需人工确认；自动扫描不等于安全审计的绝对保证。

## Claude 的最终报告模板

- 工作基线、分支、修改文件与未改的受保护模块。
- 解决了哪些具体课堂/UI问题，附对应 A01–A14 验收结果。
- 每项实际测试命令、结果、失败原因、未运行原因。
- 三语言/四尺寸截图位置，禁止把 screenshots 纳入源码提交。
- runtime、source lifecycle、diagnostic、persistence、history 与 linked ownership 回归结果。
- phase freeze tests 若调整，单独给出旧保护如何保留。
- 已知限制、未验证的部署状态；是否建议进入审查，而非自行发布。

本次交接不会自动把文件发送到 Claude 或其他第三方；由用户选择交接内容。
