import {
  Ban,
  CheckCircle2,
  Clipboard,
  Download,
  Files,
  Loader2,
  Trash2,
  Upload,
  X,
  XCircle
} from 'lucide-react';
import { usePowerSendStore } from '../stores/usePowerSendStore';

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

const getSourceName = (sourcePath = '') => {
  const normalizedPath = sourcePath.replace(/[\\/]+$/, '');
  return normalizedPath.split(/[\\/]/).pop() || sourcePath;
};

const statusLabel = {
  ready: 'Đang chờ máy nhận',
  discovering: 'Đang tìm máy gửi',
  connecting: 'Đang kết nối',
  receiving: 'Đang nhận',
  sending: 'Đang gửi',
  completed: 'Hoàn tất',
  failed: 'Lỗi',
  canceled: 'Đã dừng'
};

const StatusIcon = ({ status }) => {
  if (status === 'completed') return <CheckCircle2 size={15} className="task-status-icon success" />;
  if (status === 'failed') return <XCircle size={15} className="task-status-icon danger" />;
  if (status === 'canceled') return <Ban size={15} className="task-status-icon muted" />;
  return <Loader2 size={15} className="task-status-icon spinning" />;
};

const PowerSendPanel = () => {
  const transfers = usePowerSendStore(state => state.transfers);
  const connected = usePowerSendStore(state => state.connected);
  const panelOpen = usePowerSendStore(state => state.panelOpen);
  const setPanelOpen = usePowerSendStore(state => state.setPanelOpen);
  const cancelTransfer = usePowerSendStore(state => state.cancelTransfer);
  const removeTransfer = usePowerSendStore(state => state.removeTransfer);

  if (!panelOpen) return null;

  return (
    <aside className="power-send-panel">
      <div className="power-send-header">
        <div>
          <strong>Power Send</strong>
          <span className={`task-connection-dot ${connected ? 'online' : ''}`} />
        </div>
        <button type="button" className="task-cancel-btn" title="Đóng" onClick={() => setPanelOpen(false)}>
          <X size={14} />
        </button>
      </div>

      <div className="power-send-body">
        {transfers.length === 0 ? (
          <div className="power-send-empty">
            Chưa có phiên truyền file. Dùng Network Send hoặc Network Receive trong menu chuột phải.
          </div>
        ) : transfers.map(transfer => {
          const isActive = ['ready', 'discovering', 'connecting', 'receiving', 'sending'].includes(transfer.status);
          const canRemove = ['ready', 'completed', 'failed', 'canceled'].includes(transfer.status);
          return (
            <div className="power-send-row" key={transfer.id}>
              <div className="power-send-row-main">
                <StatusIcon status={transfer.status} />
                <div className="power-send-direction">
                  {transfer.type === 'outgoing' ? <Upload size={14} /> : <Download size={14} />}
                </div>
                <div className="power-send-info">
                  <div className="power-send-title">
                    {transfer.type === 'outgoing' ? 'Gửi' : 'Nhận'} · Mã <strong>{transfer.code}</strong>
                  </div>
                  <div className="power-send-subtitle" title={transfer.currentPath || transfer.destinationDir}>
                    {statusLabel[transfer.status] || transfer.status}
                    {transfer.peerName && ` · ${transfer.peerName}`}
                    {transfer.totalBytes > 0 && ` · ${formatBytes(transfer.processedBytes)} / ${formatBytes(transfer.totalBytes)}`}
                    {transfer.speedBps > 0 && ` · ${formatBytes(transfer.speedBps)}/s · ETA ${formatDuration(transfer.etaSeconds)}`}
                  </div>
                </div>

                {transfer.type === 'outgoing' && (
                  <button
                    type="button"
                    className="task-cancel-btn"
                    title="Copy mã gửi"
                    onClick={() => navigator.clipboard.writeText(transfer.code)}
                  >
                    <Clipboard size={13} />
                  </button>
                )}
                {isActive && (
                  <button
                    type="button"
                    className="task-cancel-btn"
                    title="Dừng"
                    onClick={() => cancelTransfer(transfer.id).catch(err => alert(err.message))}
                  >
                    <X size={13} />
                  </button>
                )}
                {canRemove && (
                  <button
                    type="button"
                    className="task-cancel-btn"
                    title="Xóa khỏi danh sách"
                    onClick={() => removeTransfer(transfer.id).catch(err => alert(err.message))}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {transfer.type === 'outgoing' && transfer.sources?.length > 0 && (
                <div className="power-send-sources">
                  <div className="power-send-sources-label">Nguồn gửi ({transfer.sources.length})</div>
                  <div className="power-send-sources-list">
                    {transfer.sources.map((sourcePath, index) => (
                      <div className="power-send-source" key={`${sourcePath}-${index}`} title={sourcePath}>
                        <Files size={13} />
                        <div className="power-send-source-details">
                          <div className="power-send-source-name">{getSourceName(sourcePath)}</div>
                          <div className="power-send-source-path">{sourcePath}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="task-progress-track">
                <div className="task-progress-fill power-send-progress" style={{ width: `${transfer.percent || 0}%` }} />
              </div>
              {transfer.currentPath && <div className="power-send-current">{transfer.currentPath}</div>}
              {transfer.error && <div className="task-error">{transfer.error}</div>}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default PowerSendPanel;
