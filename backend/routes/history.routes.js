const express = require('express');

const createHistoryRouter = (operationHistory) => {
  const router = express.Router();

  router.get('/history', (req, res) => {
    res.json(operationHistory.list());
  });

  router.post('/undo', (req, res) => {
    try {
      res.json({ success: true, operation: operationHistory.undo() });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  router.post('/redo', (req, res) => {
    try {
      res.json({ success: true, operation: operationHistory.redo() });
    } catch (err) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  return router;
};

module.exports = { createHistoryRouter };
