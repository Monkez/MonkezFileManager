import { create } from 'zustand';

const terminalStatuses = new Set(['completed', 'failed', 'canceled']);
const dismissedTaskIds = new Set();

const sortTasks = (tasks) => [...tasks].sort((a, b) => {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
});

export const useTaskStore = create((set, get) => ({
  tasks: [],
  connected: false,
  eventSource: null,

  setTasks: (tasks) => set({
    tasks: sortTasks(tasks.filter(task => !dismissedTaskIds.has(task.id)))
  }),

  upsertTask: (task) => {
    if (dismissedTaskIds.has(task.id)) return;

    const previous = get().tasks.find(item => item.id === task.id);
    const becameTerminal = task && terminalStatuses.has(task.status)
      && (!previous || previous.status !== task.status);

    set(state => {
      const existing = state.tasks.find(item => item.id === task.id);
      const tasks = existing
        ? state.tasks.map(item => item.id === task.id ? task : item)
        : [task, ...state.tasks];
      return { tasks: sortTasks(tasks) };
    });

    if (becameTerminal && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refresh-all-panes'));
    }
  },

  loadTasks: async () => {
    const response = await fetch('/api/tasks');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load tasks');
    }
    get().setTasks(data);
  },

  connectTaskEvents: () => {
    if (get().eventSource || typeof EventSource === 'undefined') return;

    const eventSource = new EventSource('/api/tasks/events');
    eventSource.onopen = () => set({ connected: true });
    eventSource.onerror = () => set({ connected: false });
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'snapshot') {
          get().setTasks(payload.tasks || []);
        } else if (payload.type === 'task' && payload.task) {
          get().upsertTask(payload.task);
        }
      } catch (err) {
        console.error('Failed to parse task event:', err);
      }
    };

    set({ eventSource });
  },

  disconnectTaskEvents: () => {
    const eventSource = get().eventSource;
    if (eventSource) {
      eventSource.close();
    }
    set({ eventSource: null, connected: false });
  },

  cancelTask: async (taskId) => {
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/cancel`, {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to cancel task');
    }
    get().upsertTask(data);
  },

  pauseTask: async (taskId) => {
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/pause`, {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to pause task');
    }
    get().upsertTask(data);
  },

  resumeTask: async (taskId) => {
    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}/resume`, {
      method: 'POST'
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to resume task');
    }
    get().upsertTask(data);
  },

  dismissTask: async (taskId) => {
    dismissedTaskIds.add(taskId);
    const forgetTimer = setTimeout(() => dismissedTaskIds.delete(taskId), 30000);
    forgetTimer.unref?.();
    set(state => ({
      tasks: state.tasks.filter(task => task.id !== taskId)
    }));

    const response = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: 'DELETE'
    });
    if (!response.ok && response.status !== 404) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to dismiss task');
    }
  }
}));
