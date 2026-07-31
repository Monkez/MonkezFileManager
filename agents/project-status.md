# Project Status

Last updated: 2026-07-31

## Current release

- Version: `1.7.2`
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

Version 1.7.2 keeps the full command set needed by the app and uses a hybrid direct/grouped layout with `contextMenuPage`.

- Item pages: `main`, `file`, `share`, `archive`, `apps`.
- Background pages: `main`, `create`, `folder`, `tools`.
- Do not remove WinRAR, Power Send, external tool, or destructive commands when refining the menu.
- Opening a context menu resets the page to `main`; child pages include an in-place back header.
- Do not expose the generic Windows Shell verb group in the context menu.
- User-facing group labels are Vietnamese.
- The top command strip must keep this order: Open, Copy, Paste, Cut, Delete.
- Rename, reveal in Explorer, Power Send, contextual bookmark, and Properties remain on the main page.
- Compression commands are direct main-page items immediately before Properties and use the WinRAR icon when available.
- Properties is the final main-page item and launches the bundled Win32 helper. The helper obtains the item's native `IContextMenu`, resolves its canonical `properties` command, and invokes that exact command on an STA thread.

Keep the existing Task Manager as fallback. F5/F6, internal drag/drop, batch rename, delete and Power Send still use Monkez services.

## Known limitations / next step

This is not the complete native Explorer context menu. A later phase may add an isolated native helper implementing `IShellFolder::GetUIObjectOf`, `IContextMenu`, `IContextMenu2` and `IContextMenu3`. Do not describe the current verb list as a byte-for-byte Explorer menu.

The native helper executable is bundled. `build-native.bat` rebuilds it when Visual Studio 2022 C++ Build Tools are available and otherwise reuses the bundled binary, so packaging does not add a mandatory compiler dependency.

## Verification baseline

- `npm test`: 28 backend + 8 frontend tests passing.
- `npm run lint --prefix frontend`: passing.
- `npm run build:frontend`: passing.
- Live Windows check: listed 16 verbs for a `.txt` fixture and created a valid `.lnk` in a temporary test directory.
- Live Windows checks: the bundled native helper opened the real Explorer Properties dialog for a packaged `.exe`; a WinRAR `.rar` Properties dialog remained open beyond the startup timeout and closed only on user action.
