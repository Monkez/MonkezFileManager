const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { normalizeInputPath, validatePathArray } = require('../security/pathGuard');

const TERMINAL_STATES = new Set(['completed', 'failed', 'canceled']);

const makeTaskId = () => `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

const samePath = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

class TaskManager {
  constructor({ operationHistory } = {}) {
    this.tasks = new Map();
    this.subscribers = new Set();
    this.operationHistory = operationHistory;
  }

  list() {
    return Array.from(this.tasks.values()).map(task => this.serialize(task));
  }

  get(id) {
    const task = this.tasks.get(id);
    return task ? this.serialize(task) : null;
  }

  createFileTask(type, payload) {
    if (!['copy', 'move'].includes(type)) {
      throw new Error(`Unsupported task type: ${type}`);
    }

    const sources = validatePathArray(payload.sources);
    const destinationDir = normalizeInputPath(payload.destinationDir, {
      mustExist: true,
      directory: true
    });

    const task = {
      id: makeTaskId(),
      type,
      status: 'queued',
      sources,
      destinationDir,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      totalBytes: 0,
      processedBytes: 0,
      totalItems: 0,
      processedItems: 0,
      currentPath: '',
      speedBps: 0,
      etaSeconds: null,
      conflictPolicy: payload.conflictPolicy || 'keep-both',
      errors: [],
      canceled: false,
      paused: false,
      historyEntries: []
    };

    this.tasks.set(task.id, task);
    this.emit(task);
    setImmediate(() => this.runFileTask(task.id));
    return this.serialize(task);
  }

  cancel(id) {
    const task = this.tasks.get(id);
    if (!task) return null;
    if (!TERMINAL_STATES.has(task.status)) {
      task.canceled = true;
      task.status = 'canceling';
      this.emit(task);
    }
    return this.serialize(task);
  }

  pause(id) {
    const task = this.tasks.get(id);
    if (!task) return null;
    if (task.status === 'running') {
      task.paused = true;
      task.status = 'paused';
      this.emit(task);
    }
    return this.serialize(task);
  }

  resume(id) {
    const task = this.tasks.get(id);
    if (!task) return null;
    if (task.status === 'paused') {
      task.paused = false;
      task.status = 'running';
      this.emit(task);
    }
    return this.serialize(task);
  }

  subscribe(res) {
    this.subscribers.add(res);
    res.write(`data: ${JSON.stringify({ type: 'snapshot', tasks: this.list() })}\n\n`);
    return () => {
      this.subscribers.delete(res);
    };
  }

  serialize(task) {
    const percent = task.totalBytes > 0
      ? Math.min(100, Math.round((task.processedBytes / task.totalBytes) * 100))
      : task.status === 'completed' ? 100 : 0;

    return {
      id: task.id,
      type: task.type,
      status: task.status,
      sources: task.sources,
      destinationDir: task.destinationDir,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      finishedAt: task.finishedAt,
      totalBytes: task.totalBytes,
      processedBytes: task.processedBytes,
      totalItems: task.totalItems,
      processedItems: task.processedItems,
      currentPath: task.currentPath,
      speedBps: task.speedBps,
      etaSeconds: task.etaSeconds,
      conflictPolicy: task.conflictPolicy,
      errors: task.errors,
      percent
    };
  }

  emit(task) {
    const payload = JSON.stringify({ type: 'task', task: this.serialize(task) });
    for (const res of this.subscribers) {
      try {
        res.write(`data: ${payload}\n\n`);
      } catch (err) {
        this.subscribers.delete(res);
      }
    }
  }

  async runFileTask(id) {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = 'running';
    task.startedAt = new Date().toISOString();
    this.emit(task);

    try {
      const plans = [];
      for (const source of task.sources) {
        this.throwIfCanceled(task);
        const destination = this.pickDestination(task.destinationDir, path.basename(source), task.conflictPolicy);
        if (!destination) continue;
        const plan = await this.planCopy(source, destination);
        plans.push({ source, destination, entries: plan.entries });
        task.totalBytes += plan.totalBytes;
        task.totalItems += plan.entries.length;
      }
      this.emit(task);

      for (const plan of plans) {
        this.throwIfCanceled(task);
        if (task.conflictPolicy === 'replace' && fs.existsSync(plan.destination)) {
          await fs.promises.rm(plan.destination, { recursive: true, force: true });
        }
        await this.copyPlannedEntries(task, plan.entries);
        if (task.type === 'move') {
          await fs.promises.rm(plan.source, { recursive: true, force: true });
        }
        task.historyEntries.push({ from: plan.source, to: plan.destination });
      }

      task.status = 'completed';
      task.finishedAt = new Date().toISOString();
      task.processedBytes = task.totalBytes;
      this.recordHistory(task);
      this.emit(task);
    } catch (err) {
      task.finishedAt = new Date().toISOString();
      task.status = task.canceled ? 'canceled' : 'failed';
      if (!task.canceled) {
        task.errors.push({ message: err.message, path: task.currentPath });
      }
      this.emit(task);
    }
  }

  throwIfCanceled(task) {
    if (task.canceled) {
      throw new Error('Task canceled');
    }
  }

  pickDestination(destinationDir, baseName, conflictPolicy = 'keep-both') {
    let candidate = path.join(destinationDir, baseName);
    if (!fs.existsSync(candidate)) return candidate;

    if (conflictPolicy === 'skip') return null;
    if (conflictPolicy === 'replace') return candidate;
    if (conflictPolicy === 'error') {
      throw new Error(`Destination already exists: ${candidate}`);
    }

    const parsed = path.parse(baseName);
    let index = 1;
    do {
      const suffix = index === 1 ? ' - Copy' : ` - Copy ${index}`;
      candidate = path.join(destinationDir, `${parsed.name}${suffix}${parsed.ext}`);
      index += 1;
    } while (fs.existsSync(candidate));

    return candidate;
  }

  async planCopy(source, destination) {
    const entries = [];
    let totalBytes = 0;

    const walk = async (src, dest) => {
      const stats = await fs.promises.stat(src);
      if (stats.isDirectory()) {
        entries.push({ type: 'directory', source: src, destination: dest, bytes: 0 });
        const children = await fs.promises.readdir(src);
        for (const child of children) {
          await walk(path.join(src, child), path.join(dest, child));
        }
      } else {
        entries.push({ type: 'file', source: src, destination: dest, bytes: stats.size });
        totalBytes += stats.size;
      }
    };

    await walk(source, destination);
    return { entries, totalBytes };
  }

  async copyPlannedEntries(task, entries) {
    for (const entry of entries) {
      this.throwIfCanceled(task);
      await this.waitIfPaused(task);
      this.throwIfCanceled(task);
      task.currentPath = entry.source;

      if (entry.type === 'directory') {
        await fs.promises.mkdir(entry.destination, { recursive: true });
      } else {
        await fs.promises.mkdir(path.dirname(entry.destination), { recursive: true });
        if (samePath(entry.source, entry.destination)) {
          throw new Error(`Source and destination are the same: ${entry.source}`);
        }
        if (task.conflictPolicy === 'replace' && fs.existsSync(entry.destination)) {
          await fs.promises.rm(entry.destination, { recursive: true, force: true });
        }
        await fs.promises.copyFile(entry.source, entry.destination, fs.constants.COPYFILE_EXCL);
        task.processedBytes += entry.bytes;
      }

      task.processedItems += 1;
      this.updateThroughput(task);
      this.emit(task);
    }
  }

  async waitIfPaused(task) {
    while (task.paused && !task.canceled) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  updateThroughput(task) {
    if (!task.startedAt) return;
    const elapsedSeconds = Math.max(1, (Date.now() - new Date(task.startedAt).getTime()) / 1000);
    task.speedBps = Math.round(task.processedBytes / elapsedSeconds);
    const remainingBytes = Math.max(0, task.totalBytes - task.processedBytes);
    task.etaSeconds = task.speedBps > 0 ? Math.ceil(remainingBytes / task.speedBps) : null;
  }

  recordHistory(task) {
    if (!this.operationHistory || task.historyEntries.length === 0) return;

    if (task.type === 'copy') {
      this.operationHistory.push({
        label: `Copy ${task.historyEntries.length} item(s)`,
        undo: task.historyEntries.slice().reverse().map(item => ({ action: 'remove', path: item.to })),
        redo: task.historyEntries.map(item => ({ action: 'copy', from: item.from, to: item.to }))
      });
    } else if (task.type === 'move') {
      this.operationHistory.push({
        label: `Move ${task.historyEntries.length} item(s)`,
        undo: task.historyEntries.slice().reverse().map(item => ({ action: 'rename', from: item.to, to: item.from })),
        redo: task.historyEntries.map(item => ({ action: 'rename', from: item.from, to: item.to }))
      });
    }
  }
}

module.exports = { TaskManager };
