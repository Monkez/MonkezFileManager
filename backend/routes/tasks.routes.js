const express = require('express');

const createTasksRouter = (taskManager) => {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.json(taskManager.list());
  });

  router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const unsubscribe = taskManager.subscribe(res);
    req.on('close', unsubscribe);
  });

  router.get('/:id', (req, res) => {
    const task = taskManager.get(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  });

  router.post('/copy', (req, res) => {
    try {
      const task = taskManager.createFileTask('copy', req.body);
      res.status(202).json(task);
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: err.message });
    }
  });

  router.post('/move', (req, res) => {
    try {
      const task = taskManager.createFileTask('move', req.body);
      res.status(202).json(task);
    } catch (err) {
      res.status(err.statusCode || 400).json({ error: err.message });
    }
  });

  router.post('/:id/cancel', (req, res) => {
    const task = taskManager.cancel(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  });

  return router;
};

module.exports = { createTasksRouter };
