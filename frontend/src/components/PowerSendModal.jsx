import { useState } from 'react';
import { RefreshCw, Wifi } from 'lucide-react';

const makeQuickCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
};

const PowerSendModal = ({ type, data, onClose, onSubmit }) => {
  const [code, setCode] = useState(type === 'network-send' ? makeQuickCode() : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isSend = type === 'network-send';

  const submit = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit({ code: code.trim() });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal-content power-send-modal" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <h4 className="modal-header">
          <Wifi size={17} />
          {isSend ? 'Network Send' : 'Network Receive'}
        </h4>

        <p className="power-send-modal-description">
          {isSend
            ? `Chia sẻ ${data.paths?.length || 0} mục trong mạng LAN. Máy nhận chỉ cần nhập đúng mã này.`
            : 'Nhập mã từ máy gửi. Ứng dụng sẽ tự tìm máy gửi trong cùng mạng LAN và tải toàn bộ dữ liệu về thư mục này.'}
        </p>

        <div className="power-send-destination">
          {isSend ? `${data.paths?.length || 0} file/thư mục đã chọn` : data.destinationDir}
        </div>

        <label className="power-send-code-label">
          Mã {isSend ? 'gửi' : 'nhận'}
          <div className="power-send-code-row">
            <input
              className="modal-input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Nhập mã bất kỳ"
              maxLength={128}
              autoFocus
              required
            />
            {isSend && (
              <button
                type="button"
                className="modal-btn modal-btn-secondary"
                title="Tạo mã mới"
                onClick={() => setCode(makeQuickCode())}
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </label>

        <div className="power-send-security-note">
          Dữ liệu truyền trực tiếp trong LAN, không tải lên cloud. Nên dùng mã khó đoán khi ở mạng công cộng.
        </div>

        {error && <div className="task-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose}>Hủy</button>
          <button type="submit" className="modal-btn modal-btn-primary" disabled={busy || !code.trim()}>
            {busy ? 'Đang khởi tạo...' : isSend ? 'Bắt đầu chờ nhận' : 'Tìm và tải về'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PowerSendModal;
