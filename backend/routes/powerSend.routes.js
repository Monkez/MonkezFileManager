const express = require('express');
const { sendPathError } = require('../security/pathGuard');

const createPowerSendRouter = (powerSendService) => {
  const router = express.Router();

  router.get('/transfers', (req, res) => {
    res.json(powerSendService.list());
  });

  router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const unsubscribe = powerSendService.subscribe(res);
    req.on('close', unsubscribe);
  });

  router.post('/offers', async (req, res) => {
    try {
      const transfer = await powerSendService.createOffer(req.body || {});
      res.status(201).json(transfer);
    } catch (err) {
      sendPathError(res, err);
    }
  });

  router.post('/receive', (req, res) => {
    try {
      const transfer = powerSendService.receive(req.body || {});
      res.status(202).json(transfer);
    } catch (err) {
      sendPathError(res, err);
    }
  });

  router.post('/:id/cancel', (req, res) => {
    const transfer = powerSendService.cancel(req.params.id);
    if (!transfer) {
      return res.status(404).json({ error: 'Power Send transfer not found' });
    }
    return res.json(transfer);
  });

  router.delete('/:id', (req, res) => {
    try {
      const removed = powerSendService.remove(req.params.id);
      if (!removed) {
        return res.status(404).json({ error: 'Power Send transfer not found' });
      }
      return res.status(204).end();
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  return router;
};

module.exports = { createPowerSendRouter };
