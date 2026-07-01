const path = require('path');
const { spawn } = require('child_process');

const getSystemToolLaunchSpec = (tool, env = process.env) => {
  const windowsDir = env.SystemRoot || 'C:\\Windows';
  const system32 = path.join(windowsDir, 'System32');
  const mmc = path.join(system32, 'mmc.exe');

  switch (tool) {
    case 'control-panel':
      return ['control.exe', []];
    case 'settings':
      return ['explorer.exe', ['ms-settings:']];
    case 'add-remove-programs':
      return ['explorer.exe', ['ms-settings:appsfeatures']];
    case 'task-manager':
      return ['taskmgr.exe', []];
    case 'disk-management':
      return [mmc, [path.join(system32, 'diskmgmt.msc')]];
    case 'device-manager':
      // Launch through Control Panel instead of spawning mmc.exe directly.
      // Some Windows policies deny unsigned packaged apps from creating MMC
      // processes (EACCES), while control.exe remains the supported shell entry.
      return [path.join(system32, 'control.exe'), ['hdwwiz.cpl']];
    case 'registry-editor':
      return ['regedit.exe', []];
    case 'command-prompt':
      return ['cmd.exe', []];
    case 'powershell':
      return ['powershell.exe', []];
    case 'services':
      return [mmc, [path.join(system32, 'services.msc')]];
    case 'resource-monitor':
      return ['resmon.exe', []];
    default: {
      const err = new Error('Unknown system utility tool');
      err.statusCode = 400;
      throw err;
    }
  }
};

const launchSystemTool = (tool, { env = process.env, spawnImpl = spawn } = {}) => {
  const [command, args] = getSystemToolLaunchSpec(tool, env);

  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawnImpl(command, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
        shell: false
      });
    } catch (err) {
      reject(err);
      return;
    }

    let settled = false;
    const finish = (handler, value) => {
      if (settled) return;
      settled = true;
      handler(value);
    };

    child.once('error', err => finish(reject, err));
    child.once('spawn', () => {
      child.unref?.();
      finish(resolve);
    });
  });
};

module.exports = { getSystemToolLaunchSpec, launchSystemTool };
