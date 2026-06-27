const fs = require('fs');
const path = require('path');

const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
]);

const WINDOWS_INVALID_NAME_CHARS = /[<>:"/\\|?*\x00-\x1F]/;

class PathValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'PathValidationError';
    this.statusCode = statusCode;
  }
}

const normalizeInputPath = (inputPath, options = {}) => {
  const { mustExist = false, directory = false, file = false } = options;

  if (typeof inputPath !== 'string' || inputPath.trim() === '') {
    throw new PathValidationError('Path is required');
  }

  if (inputPath.includes('\0')) {
    throw new PathValidationError('Path contains invalid null byte');
  }

  const resolvedPath = path.resolve(inputPath);

  if (mustExist && !fs.existsSync(resolvedPath)) {
    throw new PathValidationError(`Path does not exist: ${resolvedPath}`, 404);
  }

  if ((directory || file) && fs.existsSync(resolvedPath)) {
    const stats = fs.statSync(resolvedPath);
    if (directory && !stats.isDirectory()) {
      throw new PathValidationError(`Path is not a directory: ${resolvedPath}`);
    }
    if (file && !stats.isFile()) {
      throw new PathValidationError(`Path is not a file: ${resolvedPath}`);
    }
  }

  return resolvedPath;
};

const validateEntryName = (name) => {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new PathValidationError('Name is required');
  }

  if (name !== name.trim()) {
    throw new PathValidationError('Name cannot start or end with whitespace');
  }

  if (name === '.' || name === '..' || name.includes('/') || name.includes('\\')) {
    throw new PathValidationError('Name cannot contain path separators or traversal segments');
  }

  if (process.platform === 'win32') {
    if (WINDOWS_INVALID_NAME_CHARS.test(name)) {
      throw new PathValidationError('Name contains invalid Windows characters');
    }
    if (/[. ]$/.test(name)) {
      throw new PathValidationError('Windows names cannot end with a dot or space');
    }

    const baseName = name.split('.')[0].toUpperCase();
    if (WINDOWS_RESERVED_NAMES.has(baseName)) {
      throw new PathValidationError('Name is reserved by Windows');
    }
  }

  return name;
};

const resolveChildPath = (parentPath, childName) => {
  const resolvedParent = normalizeInputPath(parentPath, { mustExist: true, directory: true });
  const safeName = validateEntryName(childName);
  const childPath = path.resolve(resolvedParent, safeName);

  const relative = path.relative(resolvedParent, childPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new PathValidationError('Resolved path escapes the parent directory');
  }

  return childPath;
};

const validatePathArray = (paths) => {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new PathValidationError('Paths must be a non-empty array');
  }
  return paths.map(item => normalizeInputPath(item, { mustExist: true }));
};

const sendPathError = (res, err) => {
  if (err instanceof PathValidationError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  return res.status(500).json({ error: err.message });
};

module.exports = {
  PathValidationError,
  normalizeInputPath,
  validateEntryName,
  resolveChildPath,
  validatePathArray,
  sendPathError
};
