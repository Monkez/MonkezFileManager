import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy as CopyIcon,
  ListChecks,
  Loader2,
  MoveRight,
  Pause,
  Play,
  Trash2,
  X,
  XCircle
} from 'lucide-react';
import { useTaskStore } from '../stores/useTaskStore';

const COMPLETED_TASK_RETENTION_MS = 8000;
const ACTIVE_STATUSES = new Set(['queued', 'running', 'paused', 'canceling']);

const statusLabels = {
  queued: 'Đang chờ',
  running: 'Đang xử lý',
  paused: 'Tạm dừng',
  canceling: 'Đang dừng',
  completed: 'Hoàn tất',
  failed: 'Có lỗi',
  canceled: 'Đã hủy'
};

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '--';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
};

const TaskStatusIcon = ({ status }) => {
  if (status === 'completed') return <CheckCircle2 size={13} />;
  if (status === 'failed') return <XCircle size={13} />;
  if (status === 'canceled') return <Ban size={13} />;
  return <Loader2 size={13} className="spinning" />;
};

const TaskRow = ({ task, cancelTask, pauseTask, resumeTask, dismissTask }) => {
  const canCancel = ['queued', 'running', 'paused'].includes(task.status);
  const canPause = task.status === 'running';
  const canResume = task.status === 'paused';
  const canDismiss = ['completed', 'failed', 'canceled'].includes(task.status);
  const isActive = ACTIVE_STATUSES.has(task.status);
  const hasError = task.errors.length > 0;
  const taskLabels = {
    copy: 'Sao chép',
    move: 'Di chuyển',
    delete: 'Đưa vào Thùng rác',
    'delete-permanent': 'Xóa vĩnh viễn'
  };
  const taskLabel = taskLabels[task.type] || task.type;
  const isDeleteTask = task.type === 'delete' || task.type === 'delete-permanent';

  return (
    <div
      className={`task-row task-row-${task.status} ${task.status === 'completed' && !hasError ? 'task-auto-dismiss' : ''}`}
    >
      <div className="task-row-main">
        <div className={`task-kind-icon ${task.type}`}>
          {isDeleteTask
            ? <Trash2 size={15} />
            : task.type === 'move' ? <MoveRight size={16} /> : <CopyIcon size={15} />}
        </div>

        <div className="task-row-text">
          <div className="task-title-line">
            <span className="task-title">{taskLabel} · {task.sources.length} mục</span>
            <span className={`task-status-badge ${task.status}`}>
              <TaskStatusIcon status={task.status} />
              {statusLabels[task.status] || task.status}
            </span>
          </div>
          <div className="task-metrics">
            {isDeleteTask ? (
              <span>{task.processedItems} / {task.totalItems} mục</span>
            ) : (
              <span>{formatBytes(task.processedBytes)} / {formatBytes(task.totalBytes)}</span>
            )}
            {task.speedBps > 0 && <span>{formatBytes(task.speedBps)}/s</span>}
            {isActive && task.speedBps > 0 && <span>ETA {formatDuration(task.etaSeconds)}</span>}
          </div>
        </div>

        <div className="task-row-actions">
          {canPause && (
            <button
              type="button"
              className="task-action-btn"
              title="Tạm dừng"
              onClick={() => pauseTask(task.id).catch(err => alert(err.message))}
            >
              <Pause size={13} />
            </button>
          )}
          {canResume && (
            <button
              type="button"
              className="task-action-btn"
              title="Tiếp tục"
              onClick={() => resumeTask(task.id).catch(err => alert(err.message))}
            >
              <Play size={13} />
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              className="task-action-btn danger"
              title="Dừng tác vụ"
              onClick={() => cancelTask(task.id).catch(err => alert(err.message))}
            >
              <X size={13} />
            </button>
          )}
          {canDismiss && (
            <button
              type="button"
              className="task-action-btn danger"
              title="Xóa khỏi danh sách"
              onClick={() => dismissTask(task.id).catch(err => alert(err.message))}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="task-progress-track">
        <div className="task-progress-fill" style={{ width: `${task.percent || 0}%` }} />
      </div>

      {isActive && task.currentPath && (
        <div className="task-current-path" title={task.currentPath}>{task.currentPath}</div>
      )}
      {hasError && <div className="task-error">{task.errors[0].message}</div>}
    </div>
  );
};

const TaskPanel = () => {
  const [collapsed, setCollapsed] = useState(false);
  const cleanupTimers = useRef(new Map());
  const tasks = useTaskStore(state => state.tasks);
  const connected = useTaskStore(state => state.connected);
  const cancelTask = useTaskStore(state => state.cancelTask);
  const pauseTask = useTaskStore(state => state.pauseTask);
  const resumeTask = useTaskStore(state => state.resumeTask);
  const dismissTask = useTaskStore(state => state.dismissTask);

  const visibleTasks = useMemo(() => tasks.slice(0, 8), [tasks]);
  const activeCount = tasks.filter(task => ACTIVE_STATUSES.has(task.status)).length;

  useEffect(() => {
    const dismissibleIds = new Set(
      tasks
        .filter(task => task.status === 'completed' && task.errors.length === 0)
        .map(task => task.id)
    );

    for (const [taskId, timer] of cleanupTimers.current) {
      if (!dismissibleIds.has(taskId)) {
        clearTimeout(timer);
        cleanupTimers.current.delete(taskId);
      }
    }

    for (const taskId of dismissibleIds) {
      if (cleanupTimers.current.has(taskId)) continue;
      const timer = setTimeout(() => {
        cleanupTimers.current.delete(taskId);
        dismissTask(taskId).catch(err => console.error('Failed to dismiss completed task:', err));
      }, COMPLETED_TASK_RETENTION_MS);
      cleanupTimers.current.set(taskId, timer);
    }
  }, [dismissTask, tasks]);

  useEffect(() => () => {
    for (const timer of cleanupTimers.current.values()) {
      clearTimeout(timer);
    }
    cleanupTimers.current.clear();
  }, []);

  if (tasks.length === 0) return null;

  return (
    <aside className={`task-panel ${collapsed ? 'collapsed' : ''}`} aria-label="Trình quản lý tác vụ">
      <button
        type="button"
        className="task-panel-header"
        onClick={() => setCollapsed(prev => !prev)}
        title={collapsed ? 'Mở rộng Task Manager' : 'Thu gọn Task Manager'}
      >
        <span className="task-panel-heading">
          <ListChecks size={16} />
          <span>Tác vụ</span>
          <span className={`task-connection-dot ${connected ? 'online' : ''}`} title={connected ? 'Đã kết nối' : 'Mất kết nối'} />
        </span>
        {activeCount > 0 && <span className="task-active-count">{activeCount}</span>}
        <span className="task-panel-toggle" aria-hidden="true">
          {collapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </span>
      </button>

      {!collapsed && (
        <div className="task-panel-body" aria-live="polite">
          {visibleTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              cancelTask={cancelTask}
              pauseTask={pauseTask}
              resumeTask={resumeTask}
              dismissTask={dismissTask}
            />
          ))}
        </div>
      )}
    </aside>
  );
};

export default TaskPanel;
