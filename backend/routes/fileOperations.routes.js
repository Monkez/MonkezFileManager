const express = require('express');
const { sendPathError } = require('../security/pathGuard');
const {
  createFolder,
  createFile,
  renameItem,
  deleteItems,
  copyItems,
  moveItems,
  calculateFolderSize,
  previewBatchRename,
  applyBatchRename
} = require('../services/fileOperations');

const createFileOperationsRouter = ({ operationHistory } = {}) => {
  const router = express.Router();

  router.post('/mkdir', (req, res) => {
    try {
      res.json(createFolder(req.body, { operationHistory }));
    } catch (err) {
      sendPathError(res, err);
    }
  });

  router.post('/mkfile', (req, res) => {
    try {
      res.json(createFile(req.body, { operationHistory }));
    } catch (err) {
      sendPathError(res, err);
    }
  });

  router.post('/rename', (req, res) => {
    try {
      res.json(renameItem(req.body, { operationHistory }));
    } catch (err) {
      sendPathError(res, err);
    }
  });

  router.post('/delete', async (req, res) => {
    try {
      const result = await deleteItems(req.body.paths);
      res.status(result.statusCode).json(result.body);
    } catch (err) {
      sendPathError(res, err);
    }
  });

  router.post('/delete-permanent', async (req, res) => {
    try {
      const result = await deleteItems(req.body.paths, { permanent: true });
      res.status(result.statusCode).json(result.body);
    } catch (err) {
      sendPathError(res, err);
    }
  });

  router.post('/copy', (req, res) => {
    try {
      const result = copyItems(req.body, { operationHistory });
      res.status(result.statusCode).json(result.body);
    } catch (err) {
      sendPathError(res, err);
    }
  });

  router.post('/move', (req, res) => {
    try {
      const result = moveItems(req.body, { operationHistory });
      res.status(result.statusCode).json(result.body);
    } catch (err) {
      sendPathError(res, err);
    }
  });

  router.get('/foldersize', (req, res) => {
    try {
      res.json(calculateFolderSize(req.query.path));
    } catch (err) {
      sendPathError(res, err);
    }
  });

  router.post('/batch-rename/preview', (req, res) => {
    try {
      res.json({ items: previewBatchRename(req.body) });
    } catch (err) {
      sendPathError(res, err);
    }
  });

  router.post('/batch-rename/apply', (req, res) => {
    try {
      res.json(applyBatchRename(req.body, { operationHistory }));
    } catch (err) {
      res.status(err.statusCode || 500).json({
        error: err.message,
        conflicts: err.conflicts || []
      });
    }
  });

  return router;
};

module.exports = { createFileOperationsRouter };
