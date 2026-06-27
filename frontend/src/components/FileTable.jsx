import { Folder } from 'lucide-react';

const getDisplayName = (item, showExtensions) => {
  if (showExtensions || item.isDirectory || !item.ext) return item.name;
  return item.name.slice(0, item.name.length - item.ext.length) || item.name;
};

const FileTable = ({
  items,
  loading,
  parentPath,
  filterQuery,
  selectedNames,
  focusedIndex,
  clipboard,
  showExtensions,
  sortKey,
  sortDirection,
  onSort,
  onGoUp,
  onItemClick,
  onItemDoubleClick,
  onDragStart,
  onContextMenu,
  getFileIcon,
  formatSize
}) => {
  const sortMarker = (key) => {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? '▲' : '▼';
  };

  return (
    <table className="file-table" style={{ opacity: loading ? 0.75 : 1, transition: 'opacity 0.15s ease' }}>
      <thead>
        <tr>
          <th onClick={() => onSort('name')}>Name {sortMarker('name')}</th>
          <th style={{ width: '80px', textAlign: 'right' }} onClick={() => onSort('size')}>Size {sortMarker('size')}</th>
          <th style={{ width: '130px' }} onClick={() => onSort('mtime')}>Date Modified {sortMarker('mtime')}</th>
          <th style={{ width: '60px' }} onClick={() => onSort('ext')}>Type {sortMarker('ext')}</th>
        </tr>
      </thead>
      <tbody>
        {parentPath && !filterQuery && (
          <tr onDoubleClick={onGoUp}>
            <td colSpan={4} className="file-item-name-cell" style={{ color: 'var(--accent-color)' }}>
              <Folder size={16} className="file-icon folder" style={{ color: 'var(--accent-color)' }} />
              <span>.. (Parent Folder)</span>
            </td>
          </tr>
        )}

        {items.map((item, idx) => {
          const isSelected = selectedNames.has(item.name);
          const isFocused = idx === focusedIndex;
          const isCopied = clipboard.type === 'copy' && clipboard.paths.includes(item.path);
          const isCut = clipboard.type === 'cut' && clipboard.paths.includes(item.path);

          return (
            <tr
              key={item.name}
              data-name={item.name}
              className={`${isSelected ? 'selected' : ''} ${isFocused ? 'active-selection' : ''} ${item.isHidden ? 'file-hidden' : ''} ${isCopied ? 'copied-highlight' : ''} ${isCut ? 'cut-highlight' : ''}`}
              onClick={(event) => onItemClick(item, idx, event)}
              onDoubleClick={() => onItemDoubleClick(item)}
              draggable
              onDragStart={(event) => onDragStart(event, item)}
              onContextMenu={(event) => onContextMenu(item, idx, event)}
            >
              <td className="file-item-name-cell">
                {getFileIcon(item)}
                <span className="sidebar-item-text" title={item.name}>
                  {getDisplayName(item, showExtensions)}
                </span>
              </td>
              <td style={{ textAlign: 'right' }}>{item.isDirectory ? '<DIR>' : formatSize(item.size)}</td>
              <td>{new Date(item.mtime).toLocaleString()}</td>
              <td>{item.isDirectory ? 'Folder' : item.ext.toUpperCase().replace('.', '') || 'File'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default FileTable;
