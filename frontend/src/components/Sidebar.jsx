import React from 'react';
import { HardDrive, FolderHeart, Home, Monitor, FileText, Download, Trash2, Plus } from 'lucide-react';

const Sidebar = ({
  drives = [],
  activePanePath = '',
  bookmarks = [],
  onNavigate = () => {},
  onAddBookmark = () => {},
  onDeleteBookmark = () => {},
  collapsed = false
}) => {
  // Format sizes nicely
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(1) + ' GB';
  };

  // Check if a path is active in sidebar
  const isPathActive = (path) => {
    return activePanePath.toLowerCase() === path.toLowerCase() ||
           activePanePath.toLowerCase() === (path + '\\').toLowerCase();
  };

  // Fast Navigation Targets
  const quickAccess = [
    { name: 'Home/User Profile', path: navigator.platform.includes('Win') ? 'C:\\Users' : '/', icon: Home },
    { name: 'Desktop', path: activePanePath.substring(0, activePanePath.indexOf('\\', 10) > 0 ? activePanePath.indexOf('\\', 10) : activePanePath.length), type: 'desktop', icon: Monitor },
  ];

  // Resolve standard windows paths if possible (otherwise standard fallbacks)
  const userProfile = 'C:\\Users'; // default guess, will update dynamically on activePanePath
  
  // Find current username from path if browsing C:\Users\...
  let computedPaths = {
    home: '',
    desktop: '',
    documents: '',
    downloads: ''
  };

  const match = activePanePath.match(/^[A-Za-z]:\\Users\\[^\\]+/i);
  if (match) {
    const userHome = match[0];
    computedPaths.home = userHome;
    computedPaths.desktop = `${userHome}\\Desktop`;
    computedPaths.documents = `${userHome}\\Documents`;
    computedPaths.downloads = `${userHome}\\Downloads`;
  } else {
    // Standard system environment fallback (using C:\Users\Public or drive root)
    computedPaths.home = 'C:\\';
    computedPaths.desktop = 'C:\\Users';
    computedPaths.documents = 'C:\\';
    computedPaths.downloads = 'C:\\';
  }

  const systemFolders = [
    { name: 'User Profile', path: computedPaths.home || 'C:\\', icon: Home },
    { name: 'Desktop', path: computedPaths.desktop, icon: Monitor },
    { name: 'Documents', path: computedPaths.documents, icon: FileText },
    { name: 'Downloads', path: computedPaths.downloads, icon: Download },
  ];

  const handleDriveClick = (driveID) => {
    // Add trailing backslash to drive letter on Windows (e.g. C: -> C:\)
    const formatted = driveID.endsWith('\\') ? driveID : driveID + '\\';
    onNavigate(formatted);
  };

  return (
    <aside className={`sidebar-container ${collapsed ? 'collapsed' : ''}`}>
      {/* Drives Section */}
      <div className="sidebar-section">
        <h3 className="sidebar-section-title">Drives</h3>
        {drives.map((drive) => {
          const size = Number(drive.Size) || 0;
          const free = Number(drive.FreeSpace) || 0;
          const used = size - free;
          const percentUsed = size > 0 ? (used / size) * 100 : 0;
          const driveLetter = drive.DeviceID;

          return (
            <div
              key={driveLetter}
              className={`drive-card ${isPathActive(driveLetter) ? 'active' : ''}`}
              onClick={() => handleDriveClick(driveLetter)}
            >
              <div className="drive-card-header">
                <HardDrive size={16} className="file-icon code" />
                <span>{drive.VolumeName ? `${drive.VolumeName} (${driveLetter})` : `Local Disk (${driveLetter})`}</span>
              </div>
              {size > 0 && (
                <>
                  <div className="drive-progress-bar">
                    <div
                      className="drive-progress-fill"
                      style={{ width: `${percentUsed}%` }}
                    />
                  </div>
                  <div className="drive-space-info">
                    <span>{formatBytes(free)} free</span>
                    <span>{formatBytes(size)} total</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Access Section */}
      <div className="sidebar-section">
        <h3 className="sidebar-section-title">Quick Access</h3>
        <ul className="sidebar-list">
          {systemFolders.map((folder) => {
            const Icon = folder.icon;
            const active = isPathActive(folder.path);
            return (
              <li
                key={folder.name}
                className={`sidebar-item ${active ? 'active' : ''}`}
                onClick={() => onNavigate(folder.path)}
              >
                <div className="sidebar-item-inner">
                  <Icon size={16} />
                  <span className="sidebar-item-text">{folder.name}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Bookmarks Section */}
      <div className="sidebar-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingRight: 4 }}>
          <h3 className="sidebar-section-title" style={{ marginBottom: 0 }}>Bookmarks</h3>
          <button
            className="add-tab-btn"
            title="Bookmark active directory"
            style={{ padding: '2px 6px', fontSize: 10 }}
            onClick={onAddBookmark}
          >
            <Plus size={12} style={{ marginRight: 2 }} /> Add
          </button>
        </div>
        
        {bookmarks.length === 0 ? (
          <p style={{ fontSize: 12, paddingLeft: 8, color: 'var(--text-inactive)', fontStyle: 'italic' }}>
            No bookmarks saved yet.
          </p>
        ) : (
          <ul className="sidebar-list">
            {bookmarks.map((bookmark, idx) => {
              const active = isPathActive(bookmark.path);
              return (
                <li
                  key={idx}
                  className={`sidebar-item ${active ? 'active' : ''}`}
                  onClick={() => onNavigate(bookmark.path)}
                >
                  <div className="sidebar-item-inner">
                    <FolderHeart size={16} style={{ color: '#ec4899' }} />
                    <span className="sidebar-item-text" title={bookmark.path}>{bookmark.name}</span>
                  </div>
                  <button
                    className="delete-bookmark-btn"
                    title="Delete bookmark"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBookmark(idx);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
