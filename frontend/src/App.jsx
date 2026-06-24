import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Pane from './components/Pane';
import PreviewPanel from './components/PreviewPanel';
import { 
  FolderPlus, FilePlus, Edit3, Trash2, RefreshCw, 
  Grid2X2, LayoutGrid, Star, HelpCircle,
  Eye, EyeOff, Sidebar as SidebarIcon,
  Copy, ArrowRightLeft,
  RectangleHorizontal, Columns2, Columns3, Settings,
  ChevronDown, X, Folder, Sliders, FileText
} from 'lucide-react';

const App = () => {
  // Drives and Bookmarks
  const [drives, setDrives] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  
  // Layout panes state: starts with dual-pane layout as default
  const [panes, setPanes] = useState([
    { id: 'pane-1' },
    { id: 'pane-2' }
  ]);
  const [activePaneId, setActivePaneId] = useState('pane-1');

  // Sync selection details from panes
  const [paneSelections, setPaneSelections] = useState({});

  // Active selected item for Preview Panel
  const [activeFile, setActiveFile] = useState(null);

  // Panel visibility states
  const [showSidebar, setShowSidebar] = useState(() => {
    const saved = localStorage.getItem('monkez_sidebar_open');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showPreview, setShowPreview] = useState(() => {
    const saved = localStorage.getItem('monkez_preview_open');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Theme & Settings States
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('monkez_theme');
    return saved || 'dark';
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showBookmarksDropdown, setShowBookmarksDropdown] = useState(false);
  const [showSystemPathsDropdown, setShowSystemPathsDropdown] = useState(false);
  const [showSystemToolsDropdown, setShowSystemToolsDropdown] = useState(false);
  const [systemPaths, setSystemPaths] = useState(null);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('monkez_theme', newTheme);
  };

  const [showHiddenFiles, setShowHiddenFiles] = useState(() => {
    const saved = localStorage.getItem('monkez_show_hidden');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [showExtensions, setShowExtensions] = useState(() => {
    const saved = localStorage.getItem('monkez_show_extensions');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [openInDefaultApp, setOpenInDefaultApp] = useState(() => {
    const saved = localStorage.getItem('monkez_open_default_app');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [defaultStartFolder, setDefaultStartFolder] = useState(() => {
    const saved = localStorage.getItem('monkez_start_folder');
    return saved || 'C:\\';
  });

  const handleShowHiddenToggle = (val) => {
    setShowHiddenFiles(val);
    localStorage.setItem('monkez_show_hidden', JSON.stringify(val));
  };

  const handleShowExtensionsToggle = (val) => {
    setShowExtensions(val);
    localStorage.setItem('monkez_show_extensions', JSON.stringify(val));
  };

  const handleOpenDefaultToggle = (val) => {
    setOpenInDefaultApp(val);
    localStorage.setItem('monkez_open_default_app', JSON.stringify(val));
  };

  const handleStartFolderChange = (val) => {
    setDefaultStartFolder(val);
    localStorage.setItem('monkez_start_folder', val);
  };

  const [terminalType, setTerminalType] = useState(() => {
    const saved = localStorage.getItem('monkez_terminal_type');
    return saved || 'auto';
  });

  const handleTerminalTypeChange = (val) => {
    setTerminalType(val);
    localStorage.setItem('monkez_terminal_type', val);
  };

  // Global Clipboard state
  const [clipboard, setClipboard] = useState({ paths: [], type: 'copy' });

  // Modals state
  const [modal, setModal] = useState({
    isOpen: false,
    type: '', // 'mkdir', 'mkfile', 'rename', 'delete', 'transfer'
    data: {},
  });

  // Sync panels state to localStorage
  useEffect(() => {
    localStorage.setItem('monkez_sidebar_open', JSON.stringify(showSidebar));
  }, [showSidebar]);

  useEffect(() => {
    localStorage.setItem('monkez_preview_open', JSON.stringify(showPreview));
  }, [showPreview]);

  // Fetch drives and bookmarks on load
  const loadDrives = async () => {
    try {
      const response = await fetch('/api/drives');
      const data = await response.json();
      setDrives(data);
    } catch (err) {
      console.error('Failed to load drives', err);
    }
  };

  const loadBookmarks = async () => {
    try {
      const response = await fetch('/api/bookmarks');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setBookmarks(data);
      } else {
        console.error('Bookmarks data is not an array:', data);
      }
    } catch (err) {
      console.error('Failed to load bookmarks:', err);
    }
  };

  const loadSystemPaths = async () => {
    try {
      const response = await fetch('/api/system-paths');
      const data = await response.json();
      setSystemPaths(data);
    } catch (err) {
      console.error('Failed to load system paths', err);
    }
  };

  useEffect(() => {
    loadDrives();
    loadBookmarks();
    loadSystemPaths();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!showBookmarksDropdown && !showSystemPathsDropdown && !showSystemToolsDropdown) return;
    const handleClose = () => {
      setShowBookmarksDropdown(false);
      setShowSystemPathsDropdown(false);
      setShowSystemToolsDropdown(false);
    };
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [showBookmarksDropdown, showSystemPathsDropdown, showSystemToolsDropdown]);

  // Listen for bookmark changes from Pane context menu actions
  useEffect(() => {
    const handleBookmarksChanged = () => {
      loadBookmarks();
    };
    window.addEventListener('bookmarks-changed', handleBookmarksChanged);
    return () => window.removeEventListener('bookmarks-changed', handleBookmarksChanged);
  }, []);

  // Update PreviewPanel's file when active selection changes
  const handleSelectionChange = (selection) => {
    setPaneSelections(prev => ({
      ...prev,
      [selection.paneId]: selection
    }));

    if (selection.paneId === activePaneId) {
      setActiveFile(selection.activeFile);
    }
  };

  // Change active pane
  const handlePaneActivate = (paneId) => {
    setActivePaneId(paneId);
    if (paneSelections[paneId]) {
      setActiveFile(paneSelections[paneId].activeFile);
    } else {
      setActiveFile(null);
    }
  };

  // Navigation from Sidebar / Drives triggers active tab navigation in active pane
  const handleNavigate = (path) => {
    if (window[`navigatePane_${activePaneId}`]) {
      window[`navigatePane_${activePaneId}`](path);
    }
  };

  // Bookmark management
  const handleAddBookmark = () => {
    const activeSelection = paneSelections[activePaneId];
    if (!activeSelection || !activeSelection.currentPath) return;

    const path = activeSelection.currentPath;
    
    // Extract last directory name for bookmark title
    let name = path;
    const parsed = path.replace(/\\/g, '/');
    const parts = parsed.split('/').filter(Boolean);
    if (parts.length > 0) {
      name = parts[parts.length - 1];
    }

    openModal('bookmark', { name, path });
  };

  const handleDeleteBookmark = async (idx) => {
    const newBookmarks = bookmarks.filter((_, i) => i !== idx);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookmarks: newBookmarks })
      });
      if (res.ok) {
        setBookmarks(newBookmarks);
      }
    } catch (err) {
      console.error('Failed to delete bookmark', err);
    }
  };

  const handleLaunchTool = async (toolName) => {
    try {
      const response = await fetch('/api/launch-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolName })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to launch tool');
      }
    } catch (err) {
      alert(`Lỗi mở ứng dụng: ${err.message}`);
    }
  };

  // Global Actions triggers (Tool Bar)
  const handleRefresh = () => {
    // Dispatch event to active pane
    const event = new CustomEvent(`refresh-pane-${activePaneId}`, {
      detail: { action: 'refresh' }
    });
    window.dispatchEvent(event);
  };

  // Open modals
  const openModal = (type, data = {}) => {
    setModal({
      isOpen: true,
      type,
      data
    });
  };

  const closeModal = () => {
    setModal({ isOpen: false, type: '', data: {} });
  };

  // Layout selection (1, 2, or 3 split views)
  const handleLayoutChange = (count) => {
    const currentCount = panes.length;
    if (count === currentCount) return;

    if (count < currentCount) {
      // Remove panes
      const newPanes = panes.slice(0, count);
      setPanes(newPanes);
      // Ensure activePaneId is still valid
      if (!newPanes.find(p => p.id === activePaneId)) {
        setActivePaneId(newPanes[0].id);
      }
    } else {
      // Add panes
      const newPanes = [...panes];
      for (let i = currentCount; i < count; i++) {
        newPanes.push({ id: `pane-${i + 1}` });
      }
      setPanes(newPanes);
    }
  };

  // Drag and drop between panes
  const handleFileDrop = (sourcePaths, targetPath) => {
    openModal('transfer', {
      sourcePaths,
      targetPath,
      callback: () => {
        // Refresh all panes after operations
        panes.forEach(pane => {
          window.dispatchEvent(new CustomEvent(`refresh-pane-${pane.id}`, { detail: { action: 'refresh' } }));
        });
      }
    });
  };

  // Handle hotkeys (F5 F6) for file copy/move to adjacent pane
  const handleF5F6Shortcut = (action) => {
    const activeSelection = paneSelections[activePaneId];
    if (!activeSelection || activeSelection.selectedPaths.length === 0) return;

    // Find the adjacent pane to copy/move files to
    const activeIndex = panes.findIndex(p => p.id === activePaneId);
    const targetPaneIndex = (activeIndex + 1) % panes.length;
    const targetPane = panes[targetPaneIndex];
    const targetSelection = paneSelections[targetPane.id];

    if (!targetSelection || !targetSelection.currentPath) return;

    openModal(action === 'copy' ? 'shortcut-copy' : 'shortcut-move', {
      sourcePaths: activeSelection.selectedPaths,
      targetPath: targetSelection.currentPath,
      targetPaneId: targetPane.id,
      callback: () => {
        // Refresh panes
        panes.forEach(pane => {
          window.dispatchEvent(new CustomEvent(`refresh-pane-${pane.id}`, { detail: { action: 'refresh' } }));
        });
      }
    });
  };

  // Listen to global shortcuts (F5, F6) on window object
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Check if user is typing in input boxes
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (isInput) return;

      if (e.key === 'F5') {
        e.preventDefault();
        handleF5F6Shortcut('copy');
      } else if (e.key === 'F6') {
        e.preventDefault();
        handleF5F6Shortcut('move');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [panes, activePaneId, paneSelections]);

  // Modal Submit Handlers
  const handleModalSubmit = async (fields) => {
    const { type, data } = modal;

    if (type === 'bookmark') {
      const path = data.path;
      const nameInput = fields.name;
      const newBookmarks = [...bookmarks, { name: nameInput || data.name, path }];
      try {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookmarks: newBookmarks })
        });
        if (res.ok) {
          setBookmarks(newBookmarks);
          window.dispatchEvent(new CustomEvent('bookmarks-changed'));
          if (data.callback) data.callback();
          closeModal();
        } else {
          throw new Error('Failed to save bookmark');
        }
      } catch (err) {
        alert(`Error: ${err.message}`);
      }
      return;
    }

    let url = '';
    let body = {};

    if (type === 'mkdir') {
      url = '/api/mkdir';
      body = { currentPath: data.currentPath, name: fields.name };
    } else if (type === 'mkfile') {
      url = '/api/mkfile';
      body = { currentPath: data.currentPath, name: fields.name };
    } else if (type === 'rename') {
      url = '/api/rename';
      body = { currentPath: data.currentPath, oldName: data.oldName, newName: fields.name };
    } else if (type === 'delete' || type === 'delete-permanent') {
      url = '/api/delete';
      body = { paths: data.paths };
    } else if (type === 'transfer' || type === 'shortcut-copy' || type === 'shortcut-move') {
      const isCopy = type === 'shortcut-copy' || (type === 'transfer' && fields.action === 'copy');
      url = isCopy ? '/api/copy' : '/api/move';
      body = { sources: data.sourcePaths, destinationDir: data.targetPath };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Operation failed');
      }
      
      // Trigger callback if defined
      if (data.callback) data.callback();
      closeModal();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Selection summaries
  const activePaneSel = paneSelections[activePaneId];
  const activeSelectionCount = activePaneSel?.selectedPaths.length || 0;

  return (
    <div className={`app-container theme-${theme}`}>
      {/* Top Main Command Toolbar */}
      <header className="toolbar-global">
        {/* File Actions Group */}
        <div className="toolbar-group">
          <button 
            className="toolbar-btn" 
            title="Create new folder"
            onClick={() => openModal('mkdir', { currentPath: activePaneSel?.currentPath, callback: handleRefresh })}
          >
            <FolderPlus size={16} />
            <span>New Folder</span>
          </button>
          <button 
            className="toolbar-btn" 
            title="Create empty file"
            onClick={() => openModal('mkfile', { currentPath: activePaneSel?.currentPath, callback: handleRefresh })}
          >
            <FilePlus size={16} />
            <span>New File</span>
          </button>
          <button 
            className="toolbar-btn" 
            title="Rename active file/folder (F2)"
            disabled={activeSelectionCount !== 1}
            onClick={() => {
              if (activeSelectionCount === 1) {
                const fullPath = activePaneSel.selectedPaths[0];
                // Extract base name
                const parts = fullPath.replace(/\\/g, '/').split('/');
                const baseName = parts[parts.length - 1];
                openModal('rename', { 
                  currentPath: activePaneSel.currentPath, 
                  oldName: baseName, 
                  callback: handleRefresh 
                });
              }
            }}
          >
            <Edit3 size={16} />
            <span>Rename</span>
          </button>
          <button 
            className="toolbar-btn btn-danger" 
            title="Delete selected files/folders (Del)"
            disabled={activeSelectionCount === 0}
            onClick={() => {
              if (activeSelectionCount > 0) {
                openModal('delete', { paths: activePaneSel.selectedPaths, callback: handleRefresh });
              }
            }}
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* View Options Group */}
        <div className="toolbar-group">
          <button 
            className={`toolbar-btn ${showHiddenFiles ? 'active' : ''}`} 
            onClick={() => handleShowHiddenToggle(!showHiddenFiles)}
            title="Toggle Hidden Files"
          >
            {showHiddenFiles ? <Eye size={15} /> : <EyeOff size={15} />}
            <span>Hidden Items</span>
          </button>
          <button 
            className={`toolbar-btn ${showExtensions ? 'active' : ''}`} 
            onClick={() => handleShowExtensionsToggle(!showExtensions)}
            title="Toggle File Extensions"
          >
            <FileText size={15} />
            <span>Extensions</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Sync & Bookmarks Group */}
        <div className="toolbar-group">
          <button className="toolbar-btn" onClick={handleRefresh} title="Reload active folder lists">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>

          
          {/* 1. Bookmark Cá Nhân Dropdown */}
          <div className="bookmarks-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button 
              className={`toolbar-btn ${showBookmarksDropdown ? 'active' : ''}`} 
              onClick={() => {
                setShowBookmarksDropdown(!showBookmarksDropdown);
                setShowSystemPathsDropdown(false);
                setShowSystemToolsDropdown(false);
              }} 
              title="Danh sách bookmark cá nhân"
            >
              <Star size={15} style={{ fill: '#fbbf24', color: '#fbbf24' }} />
              <span>Bookmarks</span>
              <ChevronDown size={12} style={{ marginLeft: '4px' }} />
            </button>
            {showBookmarksDropdown && (
              <div className="bookmarks-dropdown-menu">
                <div className="bookmarks-dropdown-header">Bookmark Cá Nhân</div>
                {bookmarks.length === 0 ? (
                  <div className="bookmarks-dropdown-item disabled">Chưa có bookmark nào</div>
                ) : (
                  bookmarks.map((b, idx) => (
                    <div 
                      key={`user-${idx}`} 
                      className="bookmarks-dropdown-item" 
                      onClick={() => { 
                        handleNavigate(b.path); 
                        setShowBookmarksDropdown(false); 
                      }}
                    >
                      <div className="bookmark-info">
                        <span className="bookmark-name">{b.name}</span>
                        <span className="bookmark-path" title={b.path}>{b.path}</span>
                      </div>
                      <button
                        className="delete-bookmark-sub-btn"
                        title="Xóa bookmark"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBookmark(idx);
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 2. Thư Mục Hệ Thống Dropdown */}
          <div className="bookmarks-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button 
              className={`toolbar-btn ${showSystemPathsDropdown ? 'active' : ''}`} 
              onClick={() => {
                setShowSystemPathsDropdown(!showSystemPathsDropdown);
                setShowBookmarksDropdown(false);
                setShowSystemToolsDropdown(false);
              }} 
              title="Danh sách thư mục hệ thống Windows"
            >
              <Folder size={15} />
              <span>Thư mục</span>
              <ChevronDown size={12} style={{ marginLeft: '4px' }} />
            </button>
            {showSystemPathsDropdown && (
              <div className="bookmarks-dropdown-menu">
                <div className="bookmarks-dropdown-header">Thư Mục Hệ Thống</div>
                {systemPaths ? (
                  <>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.desktop); setShowSystemPathsDropdown(false); }}>
                      <div className="bookmark-info">
                        <span className="bookmark-name">Desktop (Màn hình chính)</span>
                        <span className="bookmark-path">{systemPaths.desktop}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.downloads); setShowSystemPathsDropdown(false); }}>
                      <div className="bookmark-info">
                        <span className="bookmark-name">Downloads (Tải về)</span>
                        <span className="bookmark-path">{systemPaths.downloads}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.documents); setShowSystemPathsDropdown(false); }}>
                      <div className="bookmark-info">
                        <span className="bookmark-name">Documents (Tài liệu)</span>
                        <span className="bookmark-path">{systemPaths.documents}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.pictures); setShowSystemPathsDropdown(false); }}>
                      <div className="bookmark-info">
                        <span className="bookmark-name">Pictures (Hình ảnh)</span>
                        <span className="bookmark-path">{systemPaths.pictures}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.videos); setShowSystemPathsDropdown(false); }}>
                      <div className="bookmark-info">
                        <span className="bookmark-name">Videos (Video)</span>
                        <span className="bookmark-path">{systemPaths.videos}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.music); setShowSystemPathsDropdown(false); }}>
                      <div className="bookmark-info">
                        <span className="bookmark-name">Music (Nhạc)</span>
                        <span className="bookmark-path">{systemPaths.music}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.userProfile); setShowSystemPathsDropdown(false); }}>
                      <div className="bookmark-info">
                        <span className="bookmark-name">User Profile (Thư mục cá nhân)</span>
                        <span className="bookmark-path">{systemPaths.userProfile}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.programFiles); setShowSystemPathsDropdown(false); }}>
                      <div className="bookmark-info">
                        <span className="bookmark-name">Program Files</span>
                        <span className="bookmark-path">{systemPaths.programFiles}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.programFilesX86); setShowSystemPathsDropdown(false); }}>
                      <div className="bookmark-info">
                        <span className="bookmark-name">Program Files (x86)</span>
                        <span className="bookmark-path">{systemPaths.programFilesX86}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.windowsDir); setShowSystemPathsDropdown(false); }}>
                      <div className="bookmark-info">
                        <span className="bookmark-name">Windows (Thư mục cài đặt OS)</span>
                        <span className="bookmark-path">{systemPaths.windowsDir}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.appData); setShowSystemPathsDropdown(false); }}>
                      <div className="bookmark-info">
                        <span className="bookmark-name">AppData (Roaming)</span>
                        <span className="bookmark-path">{systemPaths.appData}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.tempDir); setShowSystemPathsDropdown(false); }}>
                      <div className="bookmark-info">
                        <span className="bookmark-name">Temp (Thư mục tạm)</span>
                        <span className="bookmark-path">{systemPaths.tempDir}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bookmarks-dropdown-item disabled">Đang tải thư mục hệ thống...</div>
                )}
              </div>
            )}
          </div>

          {/* 3. Công Cụ Hệ Thống Dropdown */}
          <div className="bookmarks-dropdown-container" onClick={(e) => e.stopPropagation()}>
            <button 
              className={`toolbar-btn ${showSystemToolsDropdown ? 'active' : ''}`} 
              onClick={() => {
                setShowSystemToolsDropdown(!showSystemToolsDropdown);
                setShowBookmarksDropdown(false);
                setShowSystemPathsDropdown(false);
              }} 
              title="Danh sách công cụ quản trị Windows"
            >
              <Sliders size={15} />
              <span>Công cụ</span>
              <ChevronDown size={12} style={{ marginLeft: '4px' }} />
            </button>
            {showSystemToolsDropdown && (
              <div className="bookmarks-dropdown-menu">
                <div className="bookmarks-dropdown-header">Công Cụ Hệ Thống</div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('control-panel'); setShowSystemToolsDropdown(false); }}>
                  <div className="bookmark-info">
                    <span className="bookmark-name">Control Panel</span>
                    <span className="bookmark-path">Bảng điều khiển truyền thống</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('settings'); setShowSystemToolsDropdown(false); }}>
                  <div className="bookmark-info">
                    <span className="bookmark-name">Windows Settings</span>
                    <span className="bookmark-path">Cấu hình cài đặt hệ thống</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('add-remove-programs'); setShowSystemToolsDropdown(false); }}>
                  <div className="bookmark-info">
                    <span className="bookmark-name">Add or Remove Programs</span>
                    <span className="bookmark-path">Quản lý và gỡ cài đặt phần mềm</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('task-manager'); setShowSystemToolsDropdown(false); }}>
                  <div className="bookmark-info">
                    <span className="bookmark-name">Task Manager</span>
                    <span className="bookmark-path">Quản lý các tác vụ đang chạy</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('disk-management'); setShowSystemToolsDropdown(false); }}>
                  <div className="bookmark-info">
                    <span className="bookmark-name">Disk Management</span>
                    <span className="bookmark-path">Quản lý phân vùng ổ đĩa</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('device-manager'); setShowSystemToolsDropdown(false); }}>
                  <div className="bookmark-info">
                    <span className="bookmark-name">Device Manager</span>
                    <span className="bookmark-path">Quản lý driver phần cứng</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('registry-editor'); setShowSystemToolsDropdown(false); }}>
                  <div className="bookmark-info">
                    <span className="bookmark-name">Registry Editor</span>
                    <span className="bookmark-path">Chỉnh sửa cơ sở dữ liệu registry</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('services'); setShowSystemToolsDropdown(false); }}>
                  <div className="bookmark-info">
                    <span className="bookmark-name">Services</span>
                    <span className="bookmark-path">Quản lý dịch vụ chạy ngầm</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('resource-monitor'); setShowSystemToolsDropdown(false); }}>
                  <div className="bookmark-info">
                    <span className="bookmark-name">Resource Monitor</span>
                    <span className="bookmark-path">Theo dõi CPU, Memory, Disk, Network</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('command-prompt'); setShowSystemToolsDropdown(false); }}>
                  <div className="bookmark-info">
                    <span className="bookmark-name">Command Prompt (CMD)</span>
                    <span className="bookmark-path">Khởi chạy cmd.exe</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('powershell'); setShowSystemToolsDropdown(false); }}>
                  <div className="bookmark-info">
                    <span className="bookmark-name">PowerShell</span>
                    <span className="bookmark-path">Khởi chạy powershell.exe</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="toolbar-divider" />

        {/* Copy/Move to other pane */}
        <div className="toolbar-group">
          <button 
            className="toolbar-btn" 
            title="Copy selected items to the other pane (F5)"
            disabled={activeSelectionCount === 0 || panes.length < 2}
            onClick={() => handleF5F6Shortcut('copy')}
          >
            <Copy size={15} />
            <span>Copy to Target</span>
          </button>
          <button 
            className="toolbar-btn" 
            title="Move selected items to the other pane (F6)"
            disabled={activeSelectionCount === 0 || panes.length < 2}
            onClick={() => handleF5F6Shortcut('move')}
          >
            <ArrowRightLeft size={15} />
            <span>Move to Target</span>
          </button>
        </div>

        <div style={{ marginLeft: 'auto' }} />

        {/* Panel visibility toggles & Settings */}
        <div className="toolbar-group">
          <button 
            className={`toolbar-btn ${showSidebar ? 'active' : ''}`} 
            onClick={() => setShowSidebar(!showSidebar)}
            title="Toggle Sidebar Layout (Drives/Bookmarks)"
          >
            <SidebarIcon size={15} />
            <span>Sidebar</span>
          </button>
          <button 
            className={`toolbar-btn ${showPreview ? 'active' : ''}`} 
            onClick={() => setShowPreview(!showPreview)}
            title="Toggle Preview Layout"
          >
            {showPreview ? <Eye size={15} /> : <EyeOff size={15} />}
            <span>Preview</span>
          </button>
          <button 
            className="toolbar-btn" 
            onClick={() => setSettingsOpen(true)}
            title="Open Application Settings"
          >
            <Settings size={15} />
            <span>Settings</span>
          </button>
          <button 
            className="toolbar-btn" 
            onClick={() => setHelpOpen(true)}
            title="Keyboard Shortcuts & Help"
          >
            <HelpCircle size={15} />
            <span>Help</span>
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Split Window layout options */}
        <div className="toolbar-group">
          <button 
            className={`toolbar-btn ${panes.length === 1 ? 'active' : ''}`} 
            onClick={() => handleLayoutChange(1)}
            title="Single Pane View"
          >
            <RectangleHorizontal size={15} />
            <span>1 Pane</span>
          </button>
          <button 
            className={`toolbar-btn ${panes.length === 2 ? 'active' : ''}`} 
            onClick={() => handleLayoutChange(2)}
            title="Dual Pane View (Default)"
          >
            <Columns2 size={15} />
            <span>2 Panes</span>
          </button>
          <button 
            className={`toolbar-btn ${panes.length === 3 ? 'active' : ''}`} 
            onClick={() => handleLayoutChange(3)}
            title="Triple Pane View"
          >
            <Columns3 size={15} />
            <span>3 Panes</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="main-workspace">
        <Sidebar 
          drives={drives} 
          activePanePath={activePaneSel?.currentPath || ''}
          bookmarks={bookmarks}
          onNavigate={handleNavigate}
          onAddBookmark={handleAddBookmark}
          onDeleteBookmark={handleDeleteBookmark}
          collapsed={!showSidebar}
          systemPaths={systemPaths}
        />

        {/* Sidebar Toggle Edge Handle */}
        <div 
          className={`sidebar-toggle-handle ${showSidebar ? 'open' : 'collapsed'}`}
          onClick={() => setShowSidebar(!showSidebar)}
          title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
        >
          <span className="handle-chevron">{showSidebar ? '‹' : '›'}</span>
        </div>

        <div className="panes-container">
          {panes.map((pane) => (
            <Pane
              key={pane.id}
              paneId={pane.id}
              isActive={activePaneId === pane.id}
              onActivate={() => handlePaneActivate(pane.id)}
              drives={drives}
              onFileDrop={handleFileDrop}
              onSelectionChange={handleSelectionChange}
              activeItem={activeFile}
              setActiveItem={setActiveFile}
              openModal={openModal}
              clipboard={clipboard}
              setClipboard={setClipboard}
              showHiddenFiles={showHiddenFiles}
              showExtensions={showExtensions}
              openInDefaultApp={openInDefaultApp}
            />
          ))}
        </div>

        {/* Preview Panel Toggle Edge Handle */}
        <div 
          className={`preview-toggle-handle ${showPreview ? 'open' : 'collapsed'}`}
          onClick={() => setShowPreview(!showPreview)}
          title={showPreview ? "Hide Preview Panel" : "Show Preview Panel"}
        >
          <span className="handle-chevron">{showPreview ? '›' : '‹'}</span>
        </div>

        <PreviewPanel activeFile={activeFile} collapsed={!showPreview} />
      </main>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '420px', maxWidth: '500px' }}>
            <h4 className="modal-header">Cài Đặt Chuyên Sâu</h4>
            
            <div className="settings-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
              
              {/* 1. Theme Selection */}
              <div className="settings-section">
                <div className="settings-section-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Giao Diện Hệ Thống (Themes)
                </div>
                <div className="theme-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button 
                    type="button"
                    className={`modal-btn ${theme === 'dark' ? 'modal-btn-primary' : 'modal-btn-secondary'}`}
                    style={{ fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => handleThemeChange('dark')}
                  >
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.2)' }} />
                    Dark Slate
                  </button>
                  <button 
                    type="button"
                    className={`modal-btn ${theme === 'light' ? 'modal-btn-primary' : 'modal-btn-secondary'}`}
                    style={{ fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => handleThemeChange('light')}
                  >
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: '1px solid rgba(0,0,0,0.2)' }} />
                    Light Gray
                  </button>
                  <button 
                    type="button"
                    className={`modal-btn ${theme === 'midnight' ? 'modal-btn-primary' : 'modal-btn-secondary'}`}
                    style={{ fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => handleThemeChange('midnight')}
                  >
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0f172a', border: '1px solid #38bdf8' }} />
                    Midnight Blue
                  </button>
                  <button 
                    type="button"
                    className={`modal-btn ${theme === 'obsidian' ? 'modal-btn-primary' : 'modal-btn-secondary'}`}
                    style={{ fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => handleThemeChange('obsidian')}
                  >
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#09090b', border: '1px solid #e4e4e7' }} />
                    Obsidian Black
                  </button>
                </div>
              </div>

              {/* 2. File Explorer Behaviors */}
              <div className="settings-section">
                <div className="settings-section-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Cấu Hình Duyệt File (Behaviors)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={showHiddenFiles} 
                      onChange={(e) => handleShowHiddenToggle(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Hiển thị tập tin và thư mục ẩn (Files starting with . or $)</span>
                  </label>
                  
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={showExtensions} 
                      onChange={(e) => handleShowExtensionsToggle(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Hiển thị phần mở rộng tập tin (File extensions)</span>
                  </label>
                  
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                    <input 
                      type="checkbox" 
                      checked={openInDefaultApp} 
                      onChange={(e) => handleOpenDefaultToggle(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Mở file trực tiếp bằng ứng dụng mặc định của hệ điều hành</span>
                  </label>
                </div>
              </div>

              {/* 3. Startup Path */}
              <div className="settings-section">
                <div className="settings-section-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Khởi Động Mặc Định (Startup)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Thư mục khởi đầu mặc định:</label>
                  <input 
                    type="text"
                    className="modal-input"
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      fontSize: '12px', 
                      borderRadius: '4px', 
                      border: '1px solid var(--border-color)', 
                      backgroundColor: 'var(--bg-main)', 
                      color: 'var(--text-main)',
                      outline: 'none'
                    }}
                    value={defaultStartFolder}
                    onChange={(e) => handleStartFolderChange(e.target.value)}
                    placeholder="Ví dụ: C:\ hoặc D:\Data"
                  />
                </div>
              </div>

              {/* 4. Terminal Configuration */}
              <div className="settings-section">
                <div className="settings-section-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Cấu Hình Terminal (Terminal)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Loại terminal mặc định khi mở:</label>
                  <select 
                    className="modal-input"
                    style={{ 
                      width: '100%', 
                      padding: '8px', 
                      fontSize: '12px', 
                      borderRadius: '4px', 
                      border: '1px solid var(--border-color)', 
                      backgroundColor: 'var(--bg-main)', 
                      color: 'var(--text-main)',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    value={terminalType}
                    onChange={(e) => handleTerminalTypeChange(e.target.value)}
                  >
                    <option value="auto">Tự động phát hiện (Windows Terminal / PowerShell / CMD)</option>
                    <option value="wt">Windows Terminal (wt.exe)</option>
                    <option value="powershell">Windows PowerShell (powershell.exe)</option>
                    <option value="cmd">Command Prompt (cmd.exe)</option>
                  </select>
                </div>
              </div>

            </div>

            <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                className="modal-btn modal-btn-secondary" 
                style={{ fontSize: '11px', padding: '6px 12px' }}
                onClick={() => {
                  if (window.confirm('Bạn có chắc chắn muốn khôi phục cài đặt mặc định không?')) {
                    localStorage.removeItem('monkez_theme');
                    localStorage.removeItem('monkez_show_hidden');
                    localStorage.removeItem('monkez_show_extensions');
                    localStorage.removeItem('monkez_open_default_app');
                    localStorage.removeItem('monkez_start_folder');
                    localStorage.removeItem('monkez_terminal_type');
                    setTheme('dark');
                    setShowHiddenFiles(true);
                    setShowExtensions(true);
                    setOpenInDefaultApp(true);
                    setDefaultStartFolder('C:\\');
                    setTerminalType('auto');
                    alert('Đã khôi phục cài đặt mặc định.');
                  }
                }}
              >
                Khôi phục mặc định
              </button>
              <button 
                type="button" 
                className="modal-btn modal-btn-primary" 
                style={{ minWidth: '80px' }}
                onClick={() => setSettingsOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {helpOpen && (
        <div className="modal-overlay" onClick={() => setHelpOpen(false)}>
          <div className="modal-content help-modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: '400px', maxWidth: '480px' }}>
            <h4 className="modal-header">Phím Tắt & Trợ Giúp</h4>
            
            <div className="settings-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              
              <div className="settings-section">
                <div className="settings-section-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Phím Tắt Điều Hướng (Navigation)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px', fontSize: '12px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>Arrows Up/Down</span>
                  <span>Di chuyển chọn tập tin/thư mục</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>Enter</span>
                  <span>Mở thư mục hoặc chạy file</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>Backspace</span>
                  <span>Quay lại thư mục cha (Go up)</span>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Thao Tác Tập Tin (File Operations)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '6px', fontSize: '12px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>Ctrl + C</span>
                  <span>Sao chép tập tin (Copy)</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>Ctrl + X</span>
                  <span>Cắt tập tin (Cut)</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>Ctrl + V</span>
                  <span>Dán tập tin (Paste)</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>F2</span>
                  <span>Đổi tên tập tin/thư mục</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>Delete</span>
                  <span>Xóa tập tin/thư mục</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>Shift + Delete</span>
                  <span>Xóa vĩnh viễn nhiều tập tin</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>F7</span>
                  <span>Tạo thư mục mới</span>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Tính Năng Khác (Features)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', lineHeight: '1.4' }}>
                  <p>• <strong>Kéo thả (Drag & Drop):</strong> Hỗ trợ kéo thả trực tiếp giữa các pane để sao chép/di chuyển tập tin nhanh chóng.</p>
                  <p>• <strong>Menu Chuột Phải:</strong> Click chuột phải vào file hoặc vùng trống để mở thêm tùy chọn nhanh như: Nén ZIP, Giải Nén, Tính dung lượng thư mục con,...</p>
                </div>
              </div>

            </div>

            <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="modal-btn modal-btn-primary" 
                style={{ minWidth: '80px' }}
                onClick={() => setHelpOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Modal Dialog Overlay */}
      {modal.isOpen && (
        <Modal 
          type={modal.type} 
          data={modal.data} 
          onClose={closeModal} 
          onSubmit={handleModalSubmit} 
        />
      )}

      {/* Bottom Global Status Bar */}
      <footer className="app-status-bar">
        <span>Active pane: {activePaneId.toUpperCase()} | Path: {activePaneSel?.currentPath || 'C:\\'}</span>
        <div className="hotkey-legend">
          <div className="hotkey-item">
            <span className="hotkey-badge">F2</span>
            <span>Rename</span>
          </div>
          <div className="hotkey-item">
            <span className="hotkey-badge">F5</span>
            <span>Copy</span>
          </div>
          <div className="hotkey-item">
            <span className="hotkey-badge">F6</span>
            <span>Move</span>
          </div>
          <div className="hotkey-item">
            <span className="hotkey-badge">F7</span>
            <span>New Folder</span>
          </div>
          <div className="hotkey-item">
            <span className="hotkey-badge">DEL</span>
            <span>Delete</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Modal Subcomponent
const Modal = ({ type, data, onClose, onSubmit }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (type === 'rename') {
      setInputValue(data.oldName || '');
    } else if (type === 'bookmark') {
      setInputValue(data.name || '');
    } else {
      setInputValue('');
    }
  }, [type, data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name: inputValue });
  };

  const getModalTitle = () => {
    switch (type) {
      case 'mkdir': return 'Create Folder';
      case 'mkfile': return 'Create File';
      case 'rename': return 'Rename Item';
      case 'delete': return 'Confirm Delete';
      case 'delete-permanent': return 'Permanent Delete';
      case 'transfer': return 'Copy / Move Items';
      case 'shortcut-copy': return 'Copy Items';
      case 'shortcut-move': return 'Move Items';
      case 'bookmark': return 'Add Bookmark';
      default: return 'Action Dialog';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        onSubmit={handleSubmit}
      >
        <h4 className="modal-header">{getModalTitle()}</h4>

        {/* Text Input for folder/file operations */}
        {(type === 'mkdir' || type === 'mkfile' || type === 'rename' || type === 'bookmark') && (
          <input
            type="text"
            className="modal-input"
            placeholder={
              type === 'bookmark' ? 'Enter bookmark name...' :
              type === 'mkdir' ? 'Enter folder name...' : 
              'Enter file name...'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            required
            autoFocus
          />
        )}

        {/* Deletion Details */}
        {(type === 'delete' || type === 'delete-permanent') && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <p>
              {type === 'delete-permanent' 
                ? 'Bạn có chắc chắn muốn XÓA VĨNH VIỄN các tập tin/thư mục này không?' 
                : 'Are you sure you want to delete the following items?'}
            </p>
            <div style={{ maxHeight: 120, overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 4, marginTop: 8, fontFamily: 'monospace', fontSize: 11 }}>
              {data.paths.map(p => (
                <div key={p} style={{ wordBreak: 'break-all', marginBottom: 2 }}>
                  {p}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drag & Drop Operations Dialog */}
        {type === 'transfer' && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <p>Choose file operation for {data.sourcePaths.length} items to destination folder:</p>
            <p style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: 4, wordBreak: 'break-all' }}>
              {data.targetPath}
            </p>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button 
                type="button" 
                className="modal-btn modal-btn-secondary" 
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="modal-btn modal-btn-primary" 
                onClick={() => onSubmit({ action: 'copy' })}
              >
                Copy Items
              </button>
              <button 
                type="button" 
                className="modal-btn modal-btn-primary" 
                style={{ background: 'var(--success-color)' }}
                onClick={() => onSubmit({ action: 'move' })}
              >
                Move Items
              </button>
            </div>
          </div>
        )}

        {/* Shortcuts Confirm Dialogs */}
        {(type === 'shortcut-copy' || type === 'shortcut-move') && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            <p>Are you sure you want to {type === 'shortcut-copy' ? 'COPY' : 'MOVE'} {data.sourcePaths.length} items to adjacent pane?</p>
            <p style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: 4, wordBreak: 'break-all' }}>
              {data.targetPath}
            </p>
          </div>
        )}

        {/* Footer buttons */}
        {type !== 'transfer' && (
          <div className="modal-actions">
            <button 
              type="button" 
              className="modal-btn modal-btn-secondary" 
              onClick={onClose}
            >
              Cancel
            </button>
            {(type === 'delete' || type === 'delete-permanent') ? (
              <button 
                type="submit" 
                className="modal-btn modal-btn-danger"
              >
                Delete
              </button>
            ) : (
              <button 
                type="submit" 
                className="modal-btn modal-btn-primary"
              >
                Confirm
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default App;
