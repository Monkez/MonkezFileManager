const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { WindowsShellService } = require('../services/windowsShellService');

const makeSpawn = (inspect) => (command, args, options) => {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => {};

  process.nextTick(() => {
    inspect({ command, args, options });
    child.stdout.end('{"success":true}\n');
    child.emit('close', 0);
  });
  return child;
};

test('reports Windows-only experimental capabilities', () => {
  const windowsService = new WindowsShellService({ platform: 'win32' });
  const linuxService = new WindowsShellService({ platform: 'linux' });

  assert.equal(windowsService.getCapabilities().available, true);
  assert.equal(windowsService.getCapabilities().experimental, true);
  assert.equal(linuxService.getCapabilities().available, false);
});

test('passes shell requests through a temporary JSON file without command interpolation', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'monkez-shell-test-'));
  const target = path.join(tempDir, 'name with spaces & symbols.txt');
  fs.writeFileSync(target, 'test');
  let capturedRequest;

  try {
    const service = new WindowsShellService({
      platform: 'win32',
      tempDir,
      spawnImpl: makeSpawn(({ command, args, options }) => {
        assert.equal(command, 'powershell.exe');
        assert.ok(args.includes('-EncodedCommand'));
        assert.equal(args.includes(target), false);
        capturedRequest = JSON.parse(
          fs.readFileSync(options.env.MONKEZ_SHELL_REQUEST, 'utf8')
        );
      })
    });

    await service.setClipboard([target], 'cut');
    assert.deepEqual(capturedRequest, {
      operation: 'setClipboard',
      paths: [path.resolve(target)],
      mode: 'cut'
    });

    const leftovers = fs.readdirSync(tempDir)
      .filter(name => name.startsWith('monkez-shell-') && name.endsWith('.json'));
    assert.deepEqual(leftovers, []);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('rejects unsupported platforms and invalid clipboard modes', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'monkez-shell-test-'));
  const target = path.join(tempDir, 'file.txt');
  fs.writeFileSync(target, 'test');

  try {
    const unsupported = new WindowsShellService({ platform: 'linux' });
    await assert.rejects(unsupported.readClipboard(), /only available on Windows/);

    const service = new WindowsShellService({ platform: 'win32' });
    assert.throws(
      () => service.setClipboard([target], 'invalid'),
      /Clipboard mode must be copy or cut/
    );
    assert.throws(
      () => service.invokeVerb(target, -1),
      /valid Shell verb ID/
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
