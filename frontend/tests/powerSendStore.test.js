import assert from 'node:assert/strict';
import test from 'node:test';

import { usePowerSendStore } from '../src/stores/usePowerSendStore.js';

const resetStore = () => {
  usePowerSendStore.setState({
    transfers: [],
    connected: false,
    eventSource: null,
    panelOpen: false
  });
};

test('Power Send panel stays closed after the user hides an active transfer', () => {
  resetStore();
  const transfer = {
    id: 'receive-1',
    type: 'incoming',
    status: 'receiving',
    createdAt: new Date().toISOString(),
    processedBytes: 1
  };

  usePowerSendStore.getState().upsertTransfer(transfer);
  assert.equal(usePowerSendStore.getState().panelOpen, true);

  usePowerSendStore.getState().setPanelOpen(false);
  usePowerSendStore.getState().upsertTransfer({ ...transfer, processedBytes: 2 });

  assert.equal(usePowerSendStore.getState().panelOpen, false);
  resetStore();
});
