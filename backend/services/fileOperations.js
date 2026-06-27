const fs = require('fs');
const path = require('path');
const {
  normalizeInputPath,
  resolveChildPath,
  validatePathArray
} = require('../security/pathGuard');

const getDestinationForPolicy = (destinationDir, baseName, conflictPolicy = 'keep-both') => {
  let candidate = path.join(destinationDir, baseName);
  if (!fs.existsSync(candidate)) return { action: 'write', path: candidate };

  if (conflictPolicy === 'skip') {
    return { action: 'skip', path: candidate };
  }

  if (conflictPolicy === 'replace') {
    return { action: 'replace', path: candidate };
  }

  if (conflictPolicy === 'error') {
    const err = new Error(`Destination already exists: ${candidate}`);
    err.statusCode = 409;
    throw err;
  }

  const parsed = path.parse(baseName);
  let index = 1;
  do {
    const suffix = index === 1 ? ' - Copy' : ` - Copy ${index}`;
    candidate = path.join(destinationDir, `${parsed.name}${suffix}${parsed.ext}`);
    index += 1;
  } while (fs.existsSync(candidate));

  return { action: 'write', path: candidate };
};

const getAvailableDestination = (destinationDir, baseName) => {
  return getDestinationForPolicy(destinationDir, baseName, 'keep-both').path;
};

const removeDestinationForReplace = (targetPath) => {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
};

const moveItem = (src, dest) => {
  const srcDrive = path.parse(src).root;
  const destDrive = path.parse(dest).root;

  if (srcDrive.toLowerCase() === destDrive.toLowerCase()) {
    fs.renameSync(src, dest);
  } else {
    fs.cpSync(src, dest, { recursive: true, force: false, errorOnExist: true });
    fs.rmSync(src, { recursive: true, force: true });
  }
};

const createFolder = ({ currentPath, name }, { operationHistory } = {}) => {
  const targetPath = resolveChildPath(currentPath, name);
  if (fs.existsSync(targetPath)) {
    const err = new Error('Folder already exists');
    err.statusCode = 400;
    throw err;
  }
  fs.mkdirSync(targetPath);
  operationHistory?.push({
    label: `Create folder ${name}`,
    undo: [{ action: 'remove', path: targetPath }],
    redo: [{ action: 'mkdir', path: targetPath }]
  });
  return { success: true, path: targetPath };
};

const createFile = ({ currentPath, name }, { operationHistory } = {}) => {
  const targetPath = resolveChildPath(currentPath, name);
  if (fs.existsSync(targetPath)) {
    const err = new Error('File already exists');
    err.statusCode = 400;
    throw err;
  }
  fs.writeFileSync(targetPath, '');
  operationHistory?.push({
    label: `Create file ${name}`,
    undo: [{ action: 'remove', path: targetPath }],
    redo: [{ action: 'writeFile', path: targetPath, content: '' }]
  });
  return { success: true, path: targetPath };
};

const renameItem = ({ currentPath, oldName, newName }, { operationHistory } = {}) => {
  const oldPath = resolveChildPath(currentPath, oldName);
  const newPath = resolveChildPath(currentPath, newName);

  if (!fs.existsSync(oldPath)) {
    const err = new Error('Source file/folder does not exist');
    err.statusCode = 404;
    throw err;
  }
  if (fs.existsSync(newPath)) {
    const err = new Error('Destination already exists');
    err.statusCode = 400;
    throw err;
  }

  fs.renameSync(oldPath, newPath);
  operationHistory?.push({
    label: `Rename ${oldName} to ${newName}`,
    undo: [{ action: 'rename', from: newPath, to: oldPath }],
    redo: [{ action: 'rename', from: oldPath, to: newPath }]
  });
  return { success: true };
};

const deleteItems = async (paths, { permanent = false } = {}) => {
  const safePaths = validatePathArray(paths);
  const errors = [];
  const isElectron = process.versions.electron !== undefined;

  for (const itemPath of safePaths) {
    try {
      if (permanent || !isElectron) {
        fs.rmSync(itemPath, { recursive: true, force: true });
      } else {
        const { shell } = require('electron');
        await shell.trashItem(itemPath);
      }
    } catch (err) {
      errors.push({ path: itemPath, error: err.message });
    }
  }

  return errors.length > 0
    ? { statusCode: 207, body: { success: false, errors } }
    : { statusCode: 200, body: { success: true } };
};

const copyItems = ({ sources, destinationDir, conflictPolicy = 'keep-both' }, { operationHistory } = {}) => {
  const safeSources = validatePathArray(sources);
  const safeDestinationDir = normalizeInputPath(destinationDir, {
    mustExist: true,
    directory: true
  });

  const errors = [];
  const created = [];
  for (const src of safeSources) {
    try {
      const dest = getDestinationForPolicy(safeDestinationDir, path.basename(src), conflictPolicy);
      if (dest.action === 'skip') continue;
      if (dest.action === 'replace') removeDestinationForReplace(dest.path);
      fs.cpSync(src, dest.path, { recursive: true, force: false, errorOnExist: true });
      created.push({ from: src, to: dest.path });
    } catch (err) {
      errors.push({ source: src, error: err.message });
    }
  }

  if (created.length > 0) {
    operationHistory?.push({
      label: `Copy ${created.length} item(s)`,
      undo: created.slice().reverse().map(item => ({ action: 'remove', path: item.to })),
      redo: created.map(item => ({ action: 'copy', from: item.from, to: item.to }))
    });
  }

  return errors.length > 0
    ? { statusCode: 207, body: { success: false, errors } }
    : { statusCode: 200, body: { success: true } };
};

const moveItems = ({ sources, destinationDir, conflictPolicy = 'keep-both' }, { operationHistory } = {}) => {
  const safeSources = validatePathArray(sources);
  const safeDestinationDir = normalizeInputPath(destinationDir, {
    mustExist: true,
    directory: true
  });

  const errors = [];
  const moved = [];
  for (const src of safeSources) {
    try {
      const dest = getDestinationForPolicy(safeDestinationDir, path.basename(src), conflictPolicy);
      if (dest.action === 'skip') continue;
      if (dest.action === 'replace') removeDestinationForReplace(dest.path);
      moveItem(src, dest.path);
      moved.push({ from: src, to: dest.path });
    } catch (err) {
      errors.push({ source: src, error: err.message });
    }
  }

  if (moved.length > 0) {
    operationHistory?.push({
      label: `Move ${moved.length} item(s)`,
      undo: moved.slice().reverse().map(item => ({ action: 'rename', from: item.to, to: item.from })),
      redo: moved.map(item => ({ action: 'rename', from: item.from, to: item.to }))
    });
  }

  return errors.length > 0
    ? { statusCode: 207, body: { success: false, errors } }
    : { statusCode: 200, body: { success: true } };
};

const previewBatchRename = ({ currentPath, paths, mode = 'pattern', pattern = '{name}-{index}', find = '', replace = '', startIndex = 1 }) => {
  const baseDir = normalizeInputPath(currentPath, { mustExist: true, directory: true });
  const safePaths = validatePathArray(paths);

  const preview = safePaths.map((itemPath, idx) => {
    const parsed = path.parse(itemPath);
    let nextBaseName = parsed.name;

    if (mode === 'replace') {
      if (!find) {
        const err = new Error('Find text is required for replace mode');
        err.statusCode = 400;
        throw err;
      }
      nextBaseName = parsed.name.split(find).join(replace);
    } else if (mode === 'lowercase') {
      nextBaseName = parsed.name.toLowerCase();
    } else if (mode === 'uppercase') {
      nextBaseName = parsed.name.toUpperCase();
    } else {
      nextBaseName = pattern
        .replace(/\{name\}/g, parsed.name)
        .replace(/\{ext\}/g, parsed.ext.replace(/^\./, ''))
        .replace(/\{index\}/g, String(startIndex + idx).padStart(2, '0'));
    }

    const newName = `${nextBaseName}${parsed.ext}`;
    return {
      oldPath: itemPath,
      oldName: path.basename(itemPath),
      newName,
      newPath: path.join(baseDir, newName),
      conflict: fs.existsSync(path.join(baseDir, newName)) && path.resolve(itemPath) !== path.resolve(path.join(baseDir, newName))
    };
  });

  const targetCounts = new Map();
  for (const item of preview) {
    const key = path.resolve(item.newPath).toLowerCase();
    targetCounts.set(key, (targetCounts.get(key) || 0) + 1);
  }

  return preview.map(item => ({
    ...item,
    conflict: item.conflict || targetCounts.get(path.resolve(item.newPath).toLowerCase()) > 1
  }));
};

const applyBatchRename = (payload, { operationHistory } = {}) => {
  const preview = previewBatchRename(payload);
  const conflicts = preview.filter(item => item.conflict);
  if (conflicts.length > 0) {
    const err = new Error('One or more renamed files would overwrite existing items');
    err.statusCode = 409;
    err.conflicts = conflicts;
    throw err;
  }

  const renamed = [];
  for (const item of preview) {
    if (item.oldPath === item.newPath || item.oldName === item.newName) continue;
    fs.renameSync(item.oldPath, item.newPath);
    renamed.push(item);
  }

  if (renamed.length > 0) {
    operationHistory?.push({
      label: `Batch rename ${renamed.length} item(s)`,
      undo: renamed.slice().reverse().map(item => ({ action: 'rename', from: item.newPath, to: item.oldPath })),
      redo: renamed.map(item => ({ action: 'rename', from: item.oldPath, to: item.newPath }))
    });
  }

  return { success: true, renamed };
};

const calculateFolderSize = (targetPath) => {
  const safeTargetPath = normalizeInputPath(targetPath, { mustExist: true, directory: true });
  let totalSize = 0;
  let fileCount = 0;
  let folderCount = 0;

  const calculate = (dir) => {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          folderCount += 1;
          calculate(fullPath);
        } else {
          fileCount += 1;
          const stats = fs.statSync(fullPath);
          totalSize += stats.size;
        }
      }
    } catch {
      // Ignore unreadable files/folders so one denied child does not fail the whole calculation.
    }
  };

  calculate(safeTargetPath);

  return {
    path: safeTargetPath,
    size: totalSize,
    fileCount,
    folderCount
  };
};

module.exports = {
  getAvailableDestination,
  getDestinationForPolicy,
  moveItem,
  createFolder,
  createFile,
  renameItem,
  deleteItems,
  copyItems,
  moveItems,
  calculateFolderSize,
  previewBatchRename,
  applyBatchRename
};
