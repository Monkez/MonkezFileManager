import { useState, useEffect } from 'react';
import { FileText, Eye, Info } from 'lucide-react';

const PreviewPanel = ({ activeFile, collapsed = false }) => {
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activeFile) {
      setPreviewData(null);
      return;
    }

    const loadPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/preview?path=${encodeURIComponent(activeFile.path)}`);
        if (!response.ok) {
          throw new Error('Failed to load file preview');
        }
        const data = await response.json();
        setPreviewData(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPreview();
  }, [activeFile]);

  // Size formatter
  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!activeFile) {
    return (
      <aside className={`preview-panel-container ${collapsed ? 'collapsed' : ''}`}>
        <div className="preview-header">
          <span className="preview-header-title">Preview Pane</span>
          <Eye size={16} style={{ color: 'var(--text-inactive)' }} />
        </div>
        <div className="preview-content" style={{ justifyContent: 'center', alignItems: 'center', color: 'var(--text-inactive)', textAlign: 'center', padding: '24px' }}>
          <Info size={28} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: '13px', fontWeight: 500 }}>No item selected</p>
          <p style={{ fontSize: '11px', marginTop: 4 }}>Select a folder or a file to view properties and preview contents.</p>
        </div>
      </aside>
    );
  }

  // Load raw static file URL for media player
  const rawUrl = `/api/raw?path=${encodeURIComponent(activeFile.path)}`;

  return (
    <aside className={`preview-panel-container ${collapsed ? 'collapsed' : ''}`}>
      <div className="preview-header">
        <span className="preview-header-title">File Preview</span>
        <FileText size={16} className="file-icon code" />
      </div>

      <div className="preview-content scrollable">
        <h4 style={{ fontSize: 14, wordBreak: 'break-all', fontWeight: 600, color: 'var(--text-main)' }}>
          {activeFile.name}
        </h4>

        {loading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-inactive)', fontSize: 13 }}>
            Generating preview...
          </div>
        ) : error ? (
          <div style={{ color: 'var(--danger-color)', fontSize: 12, padding: '10px 0' }}>
            Preview Error: {error}
          </div>
        ) : previewData ? (
          <>
            {/* Rich previews based on format types */}
            {previewData.type === 'image' && (
              <div className="preview-media-wrapper">
                <img className="preview-image" src={rawUrl} alt={activeFile.name} />
              </div>
            )}

            {previewData.type === 'video' && (
              <div className="preview-media-wrapper">
                <video className="preview-video" src={rawUrl} controls />
              </div>
            )}

            {previewData.type === 'audio' && (
              <div className="preview-media-wrapper" style={{ minHeight: '80px' }}>
                <audio className="preview-audio" src={rawUrl} controls />
              </div>
            )}

            {previewData.type === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, color: 'var(--text-inactive)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Text Content</span>
                  {previewData.truncated && <span>Truncated (first 10KB)</span>}
                </div>
                <pre className="preview-text-box">{previewData.content}</pre>
              </div>
            )}

            {previewData.type === 'directory' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', padding: '20px 0', border: '1px dashed var(--border-color)', borderRadius: '6px', background: 'rgba(255,255,255,0.01)' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-inactive)' }}>Browse directory contents to see nested folder files.</span>
              </div>
            )}
          </>
        ) : null}

        {/* Detailed Metadata Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: '8px' }}>
          <h5 style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-inactive)', fontWeight: 700 }}>
            Properties
          </h5>
          <div className="preview-meta-list">
            <div className="preview-meta-row">
              <span className="preview-meta-label">Path</span>
              <span className="preview-meta-value" style={{ fontSize: 10, fontFamily: 'monospace' }}>
                {activeFile.path}
              </span>
            </div>
            <div className="preview-meta-row">
              <span className="preview-meta-label">Size</span>
              <span className="preview-meta-value">
                {activeFile.isDirectory ? 'Directory' : formatSize(activeFile.size)}
              </span>
            </div>
            <div className="preview-meta-row">
              <span className="preview-meta-label">Type</span>
              <span className="preview-meta-value">
                {activeFile.isDirectory ? 'System Folder' : activeFile.ext.toUpperCase().replace('.', '') || 'File'}
              </span>
            </div>
            <div className="preview-meta-row">
              <span className="preview-meta-label">Modified</span>
              <span className="preview-meta-value">
                {new Date(activeFile.mtime).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default PreviewPanel;
