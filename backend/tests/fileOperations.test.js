const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  createFolder,
  createFile,
  renameItem,
  copyItems,
  calculateFolderSize,
  previewBatchRename,
  applyBatchRename
} = require('../services/fileOperations');
const { OperationHistory } = require('../services/operationHistory');

test('file operations create, rename and calculate size', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'monkez-fileops-'));
  try {
    const folder = createFolder({ currentPath: root, name: 'docs' });
    assert.equal(fs.statSync(folder.path).isDirectory(), true);

    const file = createFile({ currentPath: folder.path, name: 'note.txt' });
    fs.writeFileSync(file.path, 'hello');

    renameItem({ currentPath: folder.path, oldName: 'note.txt', newName: 'renamed.txt' });
    assert.equal(fs.existsSync(path.join(folder.path, 'renamed.txt')), true);

    const size = calculateFolderSize(root);
    assert.equal(size.fileCount, 1);
    assert.equal(size.folderCount, 1);
    assert.equal(size.size, 5);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('copyItems avoids overwriting destination collisions', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'monkez-fileops-copy-'));
  const sourceDir = path.join(root, 'src');
  const destinationDir = path.join(root, 'dest');
  fs.mkdirSync(sourceDir);
  fs.mkdirSync(destinationDir);
  fs.writeFileSync(path.join(sourceDir, 'note.txt'), 'new');
  fs.writeFileSync(path.join(destinationDir, 'note.txt'), 'existing');

  try {
    const result = copyItems({
      sources: [path.join(sourceDir, 'note.txt')],
      destinationDir
    });

    assert.equal(result.statusCode, 200);
    assert.equal(fs.readFileSync(path.join(destinationDir, 'note.txt'), 'utf8'), 'existing');
    assert.equal(fs.readFileSync(path.join(destinationDir, 'note - Copy.txt'), 'utf8'), 'new');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('batch rename previews duplicate target conflicts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'monkez-batch-rename-'));
  const one = path.join(root, 'one.txt');
  const two = path.join(root, 'two.txt');
  fs.writeFileSync(one, '1');
  fs.writeFileSync(two, '2');

  try {
    const preview = previewBatchRename({
      currentPath: root,
      paths: [one, two],
      mode: 'pattern',
      pattern: 'same'
    });

    assert.equal(preview.length, 2);
    assert.equal(preview.every(item => item.conflict), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('batch rename records undo and redo history', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'monkez-batch-history-'));
  const original = path.join(root, 'note.txt');
  fs.writeFileSync(original, 'hello');
  const operationHistory = new OperationHistory();

  try {
    applyBatchRename({
      currentPath: root,
      paths: [original],
      mode: 'pattern',
      pattern: 'renamed'
    }, { operationHistory });

    const renamed = path.join(root, 'renamed.txt');
    assert.equal(fs.existsSync(renamed), true);

    operationHistory.undo();
    assert.equal(fs.existsSync(original), true);
    assert.equal(fs.existsSync(renamed), false);

    operationHistory.redo();
    assert.equal(fs.existsSync(renamed), true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
