const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { TaskManager } = require('../services/taskManager');

const waitForTask = async (manager, id) => {
  for (let i = 0; i < 100; i += 1) {
    const task = manager.get(id);
    if (['completed', 'failed', 'canceled'].includes(task.status)) {
      return task;
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('Task did not finish in time');
};

test('TaskManager copies a file and reports completion', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'monkez-task-'));
  const sourceDir = path.join(root, 'source');
  const destinationDir = path.join(root, 'destination');
  fs.mkdirSync(sourceDir);
  fs.mkdirSync(destinationDir);
  fs.writeFileSync(path.join(sourceDir, 'hello.txt'), 'hello');

  try {
    const manager = new TaskManager();
    const task = manager.createFileTask('copy', {
      sources: [path.join(sourceDir, 'hello.txt')],
      destinationDir
    });

    const finished = await waitForTask(manager, task.id);
    assert.equal(finished.status, 'completed');
    assert.equal(finished.percent, 100);
    assert.equal(fs.readFileSync(path.join(destinationDir, 'hello.txt'), 'utf8'), 'hello');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('TaskManager renames colliding copies instead of overwriting', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'monkez-task-collision-'));
  const sourceDir = path.join(root, 'source');
  const destinationDir = path.join(root, 'destination');
  fs.mkdirSync(sourceDir);
  fs.mkdirSync(destinationDir);
  fs.writeFileSync(path.join(sourceDir, 'hello.txt'), 'new');
  fs.writeFileSync(path.join(destinationDir, 'hello.txt'), 'existing');

  try {
    const manager = new TaskManager();
    const task = manager.createFileTask('copy', {
      sources: [path.join(sourceDir, 'hello.txt')],
      destinationDir
    });

    const finished = await waitForTask(manager, task.id);
    assert.equal(finished.status, 'completed');
    assert.equal(fs.readFileSync(path.join(destinationDir, 'hello.txt'), 'utf8'), 'existing');
    assert.equal(fs.readFileSync(path.join(destinationDir, 'hello - Copy.txt'), 'utf8'), 'new');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
