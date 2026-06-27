import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, XCircle, Ban, X } from 'lucide-react';
import { useTaskStore } from '../stores/useTaskStore';

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const getTaskIcon = (status) => {
  if (status === 'completed') return <CheckCircle2 size={14} className="task-status-icon success" />;
  if (status === 'failed') return <XCircle size={14} className="task-status-icon danger" />;
  if (status === 'canceled') return <Ban size={14} className="task-status-icon muted" />;
  return <Loader2 size={14} className="task-status-icon spinning" />;
};

const TaskPanel = () => {
  const [collapsed, setCollapsed] = useState(false);
  const tasks = useTaskStore(state => state.tasks);
  const connected = useTaskStore(state => state.connected);
  const cancelTask = useTaskStore(state => state.cancelTask);

  const visibleTasks = useMemo(() => tasks.slice(0, 8), [tasks]);
  const activeCount = tasks.filter(task => ['queued', 'running', 'canceling'].includes(task.status)).length;

  if (tasks.length === 0) return null;

  return (
    <aside className={`task-panel ${collapsed ? 'collapsed' : ''}`}>
      <button
        type="button"
        className="task-panel-header"
        onClick={() => setCollapsed(prev => !prev)}
        title="Task Manager"
      >
        <span>Tasks</span>
        <span className={`task-connection-dot ${connected ? 'online' : ''}`} />
        {activeCount > 0 && <span className="task-active-count">{activeCount}</span>}
      </button>

      {!collapsed && (
        <div className="task-panel-body">
          {visibleTasks.map(task => {
            const canCancel = ['queued', 'running'].includes(task.status);
            return (
              <div className="task-row" key={task.id}>
                <div className="task-row-main">
                  {getTaskIcon(task.status)}
                  <div className="task-row-text">
                    <div className="task-title">
                      {task.type === 'move' ? 'Move' : 'Copy'} {task.sources.length} item(s)
                    </div>
                    <div className="task-subtitle" title={task.currentPath || task.destinationDir}>
                      {task.status} · {formatBytes(task.processedBytes)} / {formatBytes(task.totalBytes)}
                    </div>
                  </div>
                  {canCancel && (
                    <button
                      type="button"
                      className="task-cancel-btn"
                      title="Cancel task"
                      onClick={(event) => {
                        event.stopPropagation();
                        cancelTask(task.id).catch(err => alert(err.message));
                      }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                <div className="task-progress-track">
                  <div className="task-progress-fill" style={{ width: `${task.percent || 0}%` }} />
                </div>
                {task.errors.length > 0 && (
                  <div className="task-error">{task.errors[0].message}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};

export default TaskPanel;
