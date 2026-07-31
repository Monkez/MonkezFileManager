const requestJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Windows Shell operation failed');
  }
  return data;
};

const jsonPost = body => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

export const setWindowsShellClipboard = (paths, mode) =>
  requestJson('/api/windows-shell/clipboard', jsonPost({ paths, mode }));

export const readWindowsShellClipboard = () =>
  requestJson('/api/windows-shell/clipboard');

export const pasteWithWindowsShell = destination =>
  requestJson('/api/windows-shell/paste', jsonPost({ destination }));

export const getWindowsShellVerbs = targetPath =>
  requestJson(`/api/windows-shell/verbs?path=${encodeURIComponent(targetPath)}`);

export const invokeWindowsShellVerb = (targetPath, verbId) =>
  requestJson('/api/windows-shell/invoke-verb', jsonPost({
    path: targetPath,
    verbId
  }));

export const invokeWindowsCanonicalVerb = (targetPath, verb) =>
  requestJson('/api/windows-shell/invoke-canonical-verb', jsonPost({
    path: targetPath,
    verb
  }));

export const createWindowsShortcut = (targetPath, destination) =>
  requestJson('/api/windows-shell/create-shortcut', jsonPost({
    path: targetPath,
    destination
  }));
