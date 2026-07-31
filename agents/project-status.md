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

## Context menu UX

Version 1.7.1 keeps the full 1.7.0 command set and organizes it with `contextMenuPage`.

- Item pages: `main`, `file`, `share`, `archive`, `apps`, `windows`.
- Background pages: `main`, `create`, `folder`, `tools`.
- Do not remove WinRAR, Power Send, external tool, destructive, or Windows Shell commands when refining the menu.
- Opening a context menu resets the page to `main`; child pages include an in-place back header.
- Windows Shell verbs continue loading when the item menu opens, matching the 1.7.0 behavior.
- User-facing group labels are Vietnamese.

Keep the existing Task Manager as fallback. F5/F6, internal drag/drop, batch rename, delete and Power Send still use Monkez services.

## Known limitations / next step

This is not the complete native Explorer context menu. A later phase may add an isolated native helper implementing `IShellFolder::GetUIObjectOf`, `IContextMenu`, `IContextMenu2` and `IContextMenu3`. Do not describe the current verb list as a byte-for-byte Explorer menu.

The machine used for this implementation has Windows PowerShell but no .NET SDK. Avoid adding a native/.NET build dependency unless setup/build scripts and packaging are updated together.

## Verification baseline

- `npm test`: 27 backend + 8 frontend tests passing.
- `npm run lint --prefix frontend`: passing.
- `npm run build:frontend`: passing.
- Live Windows check: listed 16 verbs for a `.txt` fixture and created a valid `.lnk` in a temporary test directory.
