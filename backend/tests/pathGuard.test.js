const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  PathValidationError,
  normalizeInputPath,
  resolveChildPath,
  validateEntryName,
  validatePathArray
} = require('../security/pathGuard');

test('normalizeInputPath resolves existing paths', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'monkez-path-'));
  try {
    assert.equal(normalizeInputPath(tempDir, { mustExist: true }), path.resolve(tempDir));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('validateEntryName rejects traversal and separators', () => {
  assert.throws(() => validateEntryName('..'), PathValidationError);
  assert.throws(() => validateEntryName('nested/file.txt'), PathValidationError);
  assert.throws(() => validateEntryName('nested\\file.txt'), PathValidationError);
});

test('resolveChildPath keeps child inside parent directory', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'monkez-child-'));
  try {
    const child = resolveChildPath(tempDir, 'note.txt');
    assert.equal(child, path.join(tempDir, 'note.txt'));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('validatePathArray requires existing paths', () => {
  assert.throws(() => validatePathArray([]), PathValidationError);
  assert.throws(() => validatePathArray([path.join(os.tmpdir(), 'missing-monkez-file')]), PathValidationError);
});
