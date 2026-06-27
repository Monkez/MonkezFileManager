const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  PowerSendService,
  normalizeCode,
  safeRelativeParts
} = require('../services/powerSendService');

const waitForTerminal = async (service, id, timeoutMs = 5000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const transfer = service.transfers.get(id);
    if (['completed', 'failed', 'canceled'].includes(transfer?.status)) {
      return transfer;
    }
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error('Timed out waiting for Power Send transfer');
};

test('Power Send validates codes and received relative paths', () => {
  assert.equal(normalizeCode('  TEST-123  '), 'TEST-123');
  assert.deepEqual(safeRelativeParts('folder/sub/file.txt'), ['folder', 'sub', 'file.txt']);
  assert.throws(() => safeRelativeParts('../secret.txt'), /Unsafe path/);
  assert.throws(() => normalizeCode('   '), /required/);
});

test('Power Send transfers multiple files and folders over loopback HTTP', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'monkez-powersend-'));
  const sourceDir = path.join(root, 'source-folder');
  const alternateDir = path.join(root, 'alternate');
  const destinationDir = path.join(root, 'received');
  const looseFile = path.join(root, 'loose.txt');
  fs.mkdirSync(path.join(sourceDir, 'nested'), { recursive: true });
  fs.mkdirSync(alternateDir);
  fs.mkdirSync(destinationDir);
  fs.writeFileSync(path.join(sourceDir, 'nested', 'inside.txt'), 'inside');
  fs.writeFileSync(looseFile, 'loose');
  fs.writeFileSync(path.join(alternateDir, 'loose.txt'), 'alternate');

  const service = new PowerSendService();
  service.ensureStarted = async () => service.startTransferServer();

  try {
    const offer = await service.createOffer({
      paths: [sourceDir, looseFile, path.join(alternateDir, 'loose.txt')],
      code: 'LAN-TEST'
    });
    const rawOffer = service.transfers.get(offer.id);

    service.discover = async () => ({
      address: '127.0.0.1',
      port: service.transferPort,
      token: rawOffer.accessToken,
      offerId: rawOffer.id,
      machineName: 'Loopback Test'
    });

    const incoming = service.receive({
      code: 'LAN-TEST',
      destinationDir
    });
    const completed = await waitForTerminal(service, incoming.id);

    assert.equal(completed.status, 'completed', completed.error);
    assert.equal(fs.readFileSync(path.join(destinationDir, 'loose.txt'), 'utf8'), 'loose');
    assert.equal(fs.readFileSync(path.join(destinationDir, 'loose - Copy.txt'), 'utf8'), 'alternate');
    assert.equal(
      fs.readFileSync(path.join(destinationDir, 'source-folder', 'nested', 'inside.txt'), 'utf8'),
      'inside'
    );
    assert.equal(service.transfers.get(offer.id).status, 'completed');
  } finally {
    if (service.transferServer) {
      await new Promise(resolve => service.transferServer.close(resolve));
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Power Send merges additional sources that use the same code', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'monkez-powersend-merge-'));
  const first = path.join(root, 'first.txt');
  const second = path.join(root, 'second.txt');
  fs.writeFileSync(first, 'first');
  fs.writeFileSync(second, 'second');

  const service = new PowerSendService();
  service.ensureStarted = async () => {};
  service.transferPort = 12345;

  try {
    const original = await service.createOffer({ paths: [first], code: 'MERGE' });
    const merged = await service.createOffer({ paths: [second], code: 'MERGE' });

    assert.equal(merged.id, original.id);
    assert.equal(merged.sources.length, 2);
    assert.equal(merged.totalItems, 2);
    assert.equal(merged.totalBytes, 11);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
