import { useEffect, useState } from 'react';

const BatchRenameModal = ({ data, onClose, onApplied }) => {
  const [mode, setMode] = useState('pattern');
  const [pattern, setPattern] = useState('{name}-{index}');
  const [find, setFind] = useState('');
  const [replace, setReplace] = useState('');
  const [startIndex, setStartIndex] = useState(1);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const selectedCount = data.paths?.length || 0;

  useEffect(() => {
    if (!data.currentPath || selectedCount === 0) return;
    const controller = new AbortController();
    const payload = {
      currentPath: data.currentPath,
      paths: data.paths,
      mode,
      pattern,
      find,
      replace,
      startIndex: Number(startIndex) || 1
    };

    fetch('/api/batch-rename/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
      .then(res => res.json().then(body => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body.error || 'Preview failed');
        setPreview(body.items || []);
        setError('');
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setPreview([]);
        }
      });

    return () => controller.abort();
  }, [data.currentPath, data.paths, selectedCount, mode, pattern, find, replace, startIndex]);

  const apply = async () => {
    const response = await fetch('/api/batch-rename/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPath: data.currentPath,
        paths: data.paths,
        mode,
        pattern,
        find,
        replace,
        startIndex: Number(startIndex) || 1
      })
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || 'Batch rename failed');
    }
    onApplied?.();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content batch-rename-modal" onClick={(event) => event.stopPropagation()}>
        <h4 className="modal-header">Batch Rename</h4>

        <div className="batch-rename-controls">
          <label>
            Mode
            <select className="modal-input" value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="pattern">Pattern</option>
              <option value="replace">Find / Replace</option>
              <option value="lowercase">Lowercase</option>
              <option value="uppercase">Uppercase</option>
            </select>
          </label>

          {mode === 'pattern' && (
            <>
              <label>
                Pattern
                <input className="modal-input" value={pattern} onChange={(event) => setPattern(event.target.value)} />
              </label>
              <label>
                Start index
                <input className="modal-input" type="number" min="0" value={startIndex} onChange={(event) => setStartIndex(event.target.value)} />
              </label>
            </>
          )}

          {mode === 'replace' && (
            <>
              <label>
                Find
                <input className="modal-input" value={find} onChange={(event) => setFind(event.target.value)} />
              </label>
              <label>
                Replace
                <input className="modal-input" value={replace} onChange={(event) => setReplace(event.target.value)} />
              </label>
            </>
          )}
        </div>

        <div className="batch-preview-list">
          {error ? (
            <div className="task-error">{error}</div>
          ) : preview.map(item => (
            <div key={item.oldPath} className={`batch-preview-row ${item.conflict ? 'conflict' : ''}`}>
              <span>{item.oldName}</span>
              <span>{item.newName}</span>
            </div>
          ))}
        </div>

        <div className="modal-actions">
          <button type="button" className="modal-btn modal-btn-secondary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="modal-btn modal-btn-primary"
            disabled={selectedCount === 0 || preview.some(item => item.conflict)}
            onClick={() => apply().catch(err => setError(err.message))}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchRenameModal;
