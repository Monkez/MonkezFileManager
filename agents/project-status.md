# Project Status

Last updated: 2026-07-31

## Current release

- Version: `1.7.1`
- Windows-first Electron + React + local Express backend.
- The working tree contained pre-existing startup/performance/layout edits before the Windows Shell experiment. Preserve those edits.

## Windows Shell experiment

- Backend service: `backend/services/windowsShellService.js`
- Backend routes: `backend/routes/windowsShell.routes.js`
- Frontend client: `frontend/src/utils/windowsShellApi.js`
- User setting key: `monkez_shell_first_mode`; defaults to `true`.

The bridge starts Windows PowerShell 5 in STA mode with an encoded, constant script. Request data is passed through a random UTF-8 JSON file in the OS temp directory, never interpolated into the PowerShell command. The temporary request is removed in `finally`.

Implemented operations:

- file-drop clipboard with `Preferred DropEffect` for copy/cut;
- Shell `paste` verb on a destination folder;
- list and invoke item verbs through `Shell.Application`;
- create `.lnk` through `WScript.Shell`.
- invoke a small allowlist of canonical verbs; currently `properties`.

## Context menu UX

The context menu is a three-page in-place flyout controlled by `contextMenuPage`:

- `main`: frequent/contextual commands only;
- `more`: secondary and potentially destructive commands;
- `apps` or `windows`: external tools and lazily loaded Shell verbs.

Do not restore all Shell verbs or hard-coded WinRAR actions to the main menu. Windows verbs must load only after the user opens **Các tùy chọn Windows**. Single-item-only commands are hidden for multi-selection. User-facing menu labels are Vietnamese.

Keep the existing Task Manager as fallback. F5/F6, internal drag/drop, batch rename, delete and Power Send still use Monkez services.

## Known limitations / next step

This is not the complete native Explorer context menu. A later phase may add an isolated native helper implementing `IShellFolder::GetUIObjectOf`, `IContextMenu`, `IContextMenu2` and `IContextMenu3`. Do not describe the current verb list as a byte-for-byte Explorer menu.

The machine used for this implementation has Windows PowerShell but no .NET SDK. Avoid adding a native/.NET build dependency unless setup/build scripts and packaging are updated together.

## Verification baseline

- `npm test`: 27 backend + 8 frontend tests passing.
- `npm run lint --prefix frontend`: passing.
- `npm run build:frontend`: passing.
- Live Windows check: listed 16 verbs for a `.txt` fixture and created a valid `.lnk` in a temporary test directory.
