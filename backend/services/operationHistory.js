const fs = require('fs');
const path = require('path');

class OperationHistory {
  constructor(limit = 100) {
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
  }

  list() {
    return {
      undo: this.undoStack.map(this.serializeEntry),
      redo: this.redoStack.map(this.serializeEntry)
    };
  }

  push(entry) {
    this.undoStack.push({
      ...entry,
      id: `op_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString()
    });
    if (this.undoStack.length > this.limit) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo() {
    const entry = this.undoStack.pop();
    if (!entry) {
      const err = new Error('Nothing to undo');
      err.statusCode = 404;
      throw err;
    }
    this.executeSteps(entry.undo);
    this.redoStack.push(entry);
    return this.serializeEntry(entry);
  }

  redo() {
    const entry = this.redoStack.pop();
    if (!entry) {
      const err = new Error('Nothing to redo');
      err.statusCode = 404;
      throw err;
    }
    this.executeSteps(entry.redo);
    this.undoStack.push(entry);
    return this.serializeEntry(entry);
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  serializeEntry(entry) {
    return {
      id: entry.id,
      label: entry.label,
      createdAt: entry.createdAt,
      undoable: Array.isArray(entry.undo) && entry.undo.length > 0,
      redoable: Array.isArray(entry.redo) && entry.redo.length > 0
    };
  }

  executeSteps(steps = []) {
    for (const step of steps) {
      if (step.action === 'rename') {
        if (fs.existsSync(step.from)) {
          fs.renameSync(step.from, step.to);
        }
      } else if (step.action === 'remove') {
        if (fs.existsSync(step.path)) {
          fs.rmSync(step.path, { recursive: true, force: true });
        }
      } else if (step.action === 'copy') {
        fs.mkdirSync(path.dirname(step.to), { recursive: true });
        fs.cpSync(step.from, step.to, { recursive: true, force: false, errorOnExist: true });
      } else if (step.action === 'mkdir') {
        fs.mkdirSync(step.path, { recursive: true });
      } else if (step.action === 'writeFile') {
        fs.mkdirSync(path.dirname(step.path), { recursive: true });
        fs.writeFileSync(step.path, step.content || '');
      }
    }
  }
}

module.exports = { OperationHistory };
