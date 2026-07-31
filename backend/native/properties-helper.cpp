#include <windows.h>
#include <shellapi.h>
#include <shlobj.h>
#include <shobjidl.h>

#include <cwchar>

namespace {
constexpr UINT kFirstCommandId = 1;
constexpr UINT kLastCommandId = 0x7fff;
constexpr DWORD kDialogStartTimeoutMs = 5000;

bool g_sawWindow = false;
DWORD g_startedAt = 0;

BOOL CALLBACK FindVisibleProcessWindow(HWND window, LPARAM state) {
  DWORD processId = 0;
  GetWindowThreadProcessId(window, &processId);
  if (processId == GetCurrentProcessId() && IsWindowVisible(window)) {
    *reinterpret_cast<bool*>(state) = true;
    return FALSE;
  }
  return TRUE;
}

VOID CALLBACK MonitorPropertySheet(HWND, UINT, UINT_PTR, DWORD) {
  bool hasWindow = false;
  EnumWindows(FindVisibleProcessWindow, reinterpret_cast<LPARAM>(&hasWindow));
  g_sawWindow = g_sawWindow || hasWindow;

  const bool startTimedOut = GetTickCount() - g_startedAt > kDialogStartTimeoutMs;
  if ((g_sawWindow && !hasWindow) || (!g_sawWindow && startTimedOut)) {
    PostQuitMessage(0);
  }
}

HRESULT InvokePropertiesFromContextMenu(const wchar_t* targetPath) {
  PIDLIST_ABSOLUTE absoluteItem = nullptr;
  HRESULT result = SHParseDisplayName(targetPath, nullptr, &absoluteItem, 0, nullptr);
  if (FAILED(result)) return result;

  IShellFolder* parentFolder = nullptr;
  PCUITEMID_CHILD childItem = nullptr;
  result = SHBindToParent(absoluteItem, IID_PPV_ARGS(&parentFolder), &childItem);
  if (FAILED(result)) {
    CoTaskMemFree(absoluteItem);
    return result;
  }

  IContextMenu* contextMenu = nullptr;
  result = parentFolder->GetUIObjectOf(
      nullptr, 1, &childItem, IID_IContextMenu, nullptr,
      reinterpret_cast<void**>(&contextMenu));
  if (FAILED(result)) {
    parentFolder->Release();
    CoTaskMemFree(absoluteItem);
    return result;
  }

  HMENU menu = CreatePopupMenu();
  if (!menu) {
    contextMenu->Release();
    parentFolder->Release();
    CoTaskMemFree(absoluteItem);
    return HRESULT_FROM_WIN32(GetLastError());
  }

  const HRESULT queryResult = contextMenu->QueryContextMenu(
      menu, 0, kFirstCommandId, kLastCommandId, CMF_NORMAL);
  result = queryResult;
  if (SUCCEEDED(queryResult)) {
    const UINT commandCount = HRESULT_CODE(queryResult);
    UINT propertiesOffset = UINT_MAX;

    for (UINT offset = 0; offset < commandCount; ++offset) {
      wchar_t canonicalVerb[128]{};
      const HRESULT verbResult = contextMenu->GetCommandString(
          offset, GCS_VERBW, nullptr,
          reinterpret_cast<char*>(canonicalVerb), sizeof(canonicalVerb));
      if (SUCCEEDED(verbResult) && _wcsicmp(canonicalVerb, L"properties") == 0) {
        propertiesOffset = offset;
        break;
      }
    }

    if (propertiesOffset == UINT_MAX) {
      result = HRESULT_FROM_WIN32(ERROR_NOT_FOUND);
    } else {
      CMINVOKECOMMANDINFOEX command{};
      command.cbSize = sizeof(command);
      command.fMask = CMIC_MASK_UNICODE | CMIC_MASK_ASYNCOK;
      command.lpVerb = MAKEINTRESOURCEA(propertiesOffset);
      command.lpVerbW = MAKEINTRESOURCEW(propertiesOffset);
      command.nShow = SW_SHOWNORMAL;
      result = contextMenu->InvokeCommand(
          reinterpret_cast<LPCMINVOKECOMMANDINFO>(&command));
    }
  }

  DestroyMenu(menu);
  contextMenu->Release();
  parentFolder->Release();
  CoTaskMemFree(absoluteItem);
  return result;
}
}  // namespace

int WINAPI wWinMain(HINSTANCE, HINSTANCE, PWSTR, int) {
  int argumentCount = 0;
  LPWSTR* arguments = CommandLineToArgvW(GetCommandLineW(), &argumentCount);
  if (!arguments || argumentCount != 2) {
    if (arguments) LocalFree(arguments);
    return ERROR_INVALID_PARAMETER;
  }

  const HRESULT oleResult = OleInitialize(nullptr);
  if (FAILED(oleResult)) {
    LocalFree(arguments);
    return static_cast<int>(HRESULT_CODE(oleResult));
  }

  const HRESULT invokeResult = InvokePropertiesFromContextMenu(arguments[1]);
  LocalFree(arguments);
  if (FAILED(invokeResult)) {
    OleUninitialize();
    return static_cast<int>(HRESULT_CODE(invokeResult));
  }

  g_startedAt = GetTickCount();
  SetTimer(nullptr, 1, 100, MonitorPropertySheet);

  MSG message;
  while (GetMessageW(&message, nullptr, 0, 0) > 0) {
    TranslateMessage(&message);
    DispatchMessageW(&message);
  }

  KillTimer(nullptr, 1);
  OleUninitialize();
  return ERROR_SUCCESS;
}
