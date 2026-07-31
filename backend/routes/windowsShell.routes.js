const express = require('express');
const { sendPathError } = require('../security/pathGuard');

const createWindowsShellRouter = (windowsShellService) => {
  const router = express.Router();

  const handle = handler => async (req, res) => {
    try {
      res.json(await handler(req));
    } catch (err) {
      sendPathError(res, err);
    }
  };

  router.get('/capabilities', (req, res) => {
    res.json(windowsShellService.getCapabilities());
  });

  router.post('/clipboard', handle(req =>
    windowsShellService.setClipboard(req.body.paths, req.body.mode)
  ));

  router.get('/clipboard', handle(() =>
    windowsShellService.readClipboard()
  ));

  router.post('/paste', handle(req =>
    windowsShellService.paste(req.body.destination)
  ));

  router.get('/verbs', handle(req =>
    windowsShellService.listVerbs(req.query.path)
  ));

  router.post('/invoke-verb', handle(req =>
    windowsShellService.invokeVerb(req.body.path, req.body.verbId)
  ));

  router.post('/create-shortcut', handle(req =>
    windowsShellService.createShortcut(req.body.path, req.body.destination)
  ));

  return router;
};

module.exports = { createWindowsShellRouter };
