import { Folder } from 'lucide-react';

const getDisplayName = (item, showExtensions) => {
  if (showExtensions || item.isDirectory || !item.ext) return item.name;
  return item.name.slice(0, item.name.length - item.ext.length) || item.name;
};

const FileGrid = ({
  items,
  loading,
  viewMode,
  parentPath,
  filterQuery,
  selectedNames,
  focusedIndex,
  clipboard,
  showExtensions,
  onGoUp,
  onItemClick,
  onItemDoubleClick,
  onDragStart,
  onContextMenu,
  getGridItemMedia
}) => {
  const parentIconSize = viewMode === 'grid-small' ? 32 : viewMode === 'grid-medium' ? 48 : 64;

  return (
    <div className={`file-grid ${viewMode}`} style={{ opacity: loading ? 0.75 : 1, transition: 'opacity 0.15s ease' }}>
      {parentPath && !filterQuery && (
        <div className="grid-item parent-folder-grid" onDoubleClick={onGoUp} style={{ color: 'var(--accent-color)' }}>
          <div className="grid-item-thumbnail-wrapper">
            <Folder className="file-icon folder" size={parentIconSize} style={{ color: 'var(--accent-color)' }} />
          </div>
          <span className="grid-item-name">.. (Parent Folder)</span>
        </div>
      )}

      {items.map((item, idx) => {
        const isSelected = selectedNames.has(item.name);
        const isFocused = idx === focusedIndex;
        const isCopied = clipboard.type === 'copy' && clipboard.paths.includes(item.path);
        const isCut = clipboard.type === 'cut' && clipboard.paths.includes(item.path);
        const sizeLabel = viewMode === 'grid-small' ? 'small' : viewMode === 'grid-medium' ? 'medium' : 'large';

        return (
          <div
            key={item.name}
            data-name={item.name}
            className={`grid-item ${isSelected ? 'selected' : ''} ${isFocused ? 'active-selection' : ''} ${item.isHidden ? 'file-hidden' : ''} ${isCopied ? 'copied-highlight' : ''} ${isCut ? 'cut-highlight' : ''}`}
            onClick={(event) => onItemClick(item, idx, event)}
            onDoubleClick={() => onItemDoubleClick(item)}
            draggable
            onDragStart={(event) => onDragStart(event, item)}
            onContextMenu={(event) => onContextMenu(item, idx, event)}
          >
            <div className="grid-item-thumbnail-wrapper">
              {getGridItemMedia(item, sizeLabel)}
            </div>
            <span className="grid-item-name" title={item.name}>
              {getDisplayName(item, showExtensions)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default FileGrid;
