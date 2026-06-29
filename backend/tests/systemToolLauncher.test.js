const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const path = require('node:path');
const test = require('node:test');

const {
  getSystemToolLaunchSpec,
  launchSystemTool
} = require('../services/systemToolLauncher');

test('Device Manager uses absolute System32 MMC paths', () => {
  const [command, args] = getSystemToolLaunchSpec('device-manager', {
    SystemRoot: 'D:\\Windows'
  });

  assert.equal(command, path.join('D:\\Windows', 'System32', 'mmc.exe'));
  assert.deepEqual(args, [
    path.join('D:\\Windows', 'System32', 'devmgmt.msc')
  ]);
});

test('system tool launcher rejects asynchronous spawn errors', async () => {
  const expectedError = Object.assign(new Error('spawn mmc.exe EACCES'), {
    code: 'EACCES'
  });

  const spawnImpl = () => {
    const child = new EventEmitter();
    child.unref = () => {};
    process.nextTick(() => child.emit('error', expectedError));
    return child;
  };

  await assert.rejects(
    launchSystemTool('device-manager', {
      env: { SystemRoot: 'C:\\Windows' },
      spawnImpl
    }),
    err => err === expectedError
  );
});
