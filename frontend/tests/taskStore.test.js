import assert from 'node:assert/strict';
import test from 'node:test';

import { useTaskStore } from '../src/stores/useTaskStore.js';

test('dismissTask removes a completed task and calls the delete API', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, status: 204 };
  };

  useTaskStore.setState({
    tasks: [{ id: 'task-done', status: 'completed', errors: [] }]
  });

  try {
    await useTaskStore.getState().dismissTask('task-done');
    assert.deepEqual(useTaskStore.getState().tasks, []);
    useTaskStore.getState().setTasks([{ id: 'task-done', status: 'completed', errors: [] }]);
    assert.deepEqual(useTaskStore.getState().tasks, []);
    assert.deepEqual(requests, [{
      url: '/api/tasks/task-done',
      options: { method: 'DELETE' }
    }]);
  } finally {
    globalThis.fetch = originalFetch;
    useTaskStore.setState({ tasks: [] });
  }
});
