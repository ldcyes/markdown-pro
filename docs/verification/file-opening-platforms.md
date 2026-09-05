# File-opening platform verification — 2026-09-05

Code under test: `184fe12c5e77534e20ac913ae82dd90029a99478` (PR #5).

## Scope and findings

The missing main-window event permissions are shared across Tauri platforms. Windows and Linux deliver subsequent files through the single-instance callback. macOS and iOS forward `RunEvent::Opened` through the same `markdown-pro://open-files` event. Granting listen/unlisten permissions without a platform restriction covers these event consumers.

The Android build currently has no native external-file event handler: the repository's `RunEvent::Opened` branch is restricted to macOS/iOS, and the locked Tauri 2.10.3 API does not expose this event on Android. Passing an Android capability test verifies the permission configuration only; it does not establish Android file-manager integration.

Native Android and iOS builds also exposed a separate existing error in this file-open code: it unconditionally initialized the desktop single-instance plugin and called desktop window methods. The fix limits the dependency, plugin initialization and window reveal operations to desktop targets while retaining event emission on iOS.

## Executed checks

- `npm run test:unit`: 69 passing tests, including permissions on all five Tauri platforms and Windows/Linux startup-argument versus macOS/iOS live-event fixtures. These are shared-code tests run under Node on Linux.
- Chromium 145 with the real React/ProseMirror editor and mocked native IPC: removing event permissions reproduces ignored open requests; restored permissions render A → B → A for Windows, Linux, macOS and iOS input routes. This is UI integration coverage, not native operating-system automation.
- Chromium File → Open, using actual file chooser uploads of two different Markdown files: both contents rendered correctly. The web flow does not depend on Tauri permissions.
- Rust formatting and dependency target metadata checked.
- Native builds: see the results below. Build success does not prove operating-system file associations, mobile document access or cold-start event delivery.

## Native build evidence

The [first build run](https://github.com/ldcyes/markdown-pro/actions/runs/33953140112) reproduced Android/iOS compiler errors E0425 and E0599 in the file-opening code. The [verification build](https://github.com/ldcyes/markdown-pro/actions/runs/33953409031) tests the desktop guards at the code revision above.

| Target | Verification build result |
| --- | --- |
| Web | Passed |
| Windows x64 | Passed; installer artifacts generated |
| macOS arm64 | Passed; DMG generated |
| Linux x64 | Passed; packages generated |
| iOS arm64 simulator | Rust compilation passed; Xcode linking failed |
| Android arm64 / x64 | Passed; APK artifacts generated |

The [iOS failure](https://github.com/ldcyes/markdown-pro/actions/runs/33953409031/job/101272266702) is now a toolchain/linker issue: missing Swift compatibility libraries and undefined `__swift_FORCE_LOAD_$_swiftCompatibility56` / `__swift_FORCE_LOAD_$_swiftCompatibilityConcurrency`. It is distinct from the fixed desktop-only Rust API errors. No successful iOS app package or native document-open test is claimed.

An isolated Windows executable was extracted from the first run's installer without installing it, but native UI observation was unavailable: the desktop tool failed to launch its app-server after retries. The test process was closed. Windows native double-click behavior therefore remains unverified in this session.

## Remaining native checks

On each desktop OS, install the platform build, open A.md, open B.md from the file manager, then reopen A.md. Check the active content and retained tabs. Separately check opening a file when the app is closed; macOS/iOS startup events are not buffered by the existing backend, so a cold-start delivery gap remains a concern outside this already-running-app fix.

On iOS, verify document handoff and read access using Files on a simulator or device. Android external document intents require a separate implementation/SDK compatibility change before that workflow can be considered supported.

References: [Tauri event permissions](https://v2.tauri.app/reference/acl/core-permissions/#event), [locked Tauri 2.10.3 RunEvent source](https://github.com/tauri-apps/tauri/blob/tauri-v2.10.3/crates/tauri/src/app.rs#L219), [single-instance desktop setup](https://v2.tauri.app/plugin/single-instance/).
