import { create } from 'zustand';

const terminalStatuses = new Set(['completed', 'failed', 'canceled']);

const sortTransfers = (transfers) => [...transfers].sort((a, b) => {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
});

export const usePowerSendStore = create((set, get) => ({
  transfers: [],
  connected: false,
  eventSource: null,
  panelOpen: false,

  setPanelOpen: (panelOpen) => set({ panelOpen }),

  setTransfers: (transfers) => set({ transfers: sortTransfers(transfers) }),

  upsertTransfer: (transfer) => {
    const previous = get().transfers.find(item => item.id === transfer.id);
    const becameTerminal = terminalStatuses.has(transfer.status)
      && (!previous || previous.status !== transfer.status);

    set(state => {
      const exists = state.transfers.some(item => item.id === transfer.id);
      const transfers = exists
        ? state.transfers.map(item => item.id === transfer.id ? transfer : item)
        : [transfer, ...state.transfers];
      return {
        transfers: sortTransfers(transfers),
        // Only auto-open for a newly-created active transfer. Progress events for
        // an existing transfer must not undo an explicit close from the user.
        panelOpen: state.panelOpen || (!exists && !terminalStatuses.has(transfer.status))
      };
    });

    if (becameTerminal && transfer.type === 'incoming' && transfer.status === 'completed') {
      window.dispatchEvent(new CustomEvent('refresh-all-panes'));
    }
  },

  connectEvents: () => {
    if (get().eventSource || typeof EventSource === 'undefined') return;
    const eventSource = new EventSource('/api/power-send/events');
    eventSource.onopen = () => set({ connected: true });
    eventSource.onerror = () => set({ connected: false });
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'snapshot') {
          get().setTransfers(payload.transfers || []);
        } else if (payload.type === 'transfer' && payload.transfer) {
          get().upsertTransfer(payload.transfer);
        }
      } catch (err) {
        console.error('Failed to parse Power Send event:', err);
      }
    };
    set({ eventSource });
  },

  disconnectEvents: () => {
    get().eventSource?.close();
    set({ eventSource: null, connected: false });
  },

  createOffer: async ({ paths, code }) => {
    const response = await fetch('/api/power-send/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths, code })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Không thể tạo Network Send');
    get().upsertTransfer(data);
    set({ panelOpen: true });
    return data;
  },

  receive: async ({ code, destinationDir }) => {
    const response = await fetch('/api/power-send/receive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, destinationDir })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Không thể bắt đầu Network Receive');
    get().upsertTransfer(data);
    set({ panelOpen: true });
    return data;
  },

  cancelTransfer: async (id) => {
    const response = await fetch(`/api/power-send/${encodeURIComponent(id)}/cancel`, {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Không thể dừng truyền file');
    get().upsertTransfer(data);
  },

  removeTransfer: async (id) => {
    const response = await fetch(`/api/power-send/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Không thể xóa mục truyền file');
    }
    set(state => ({
      transfers: state.transfers.filter(transfer => transfer.id !== id)
    }));
  }
}));
