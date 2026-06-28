import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Pane from './components/Pane';
import PreviewPanel from './components/PreviewPanel';
import TaskPanel from './components/TaskPanel';
import CommandPalette from './components/CommandPalette';
import BatchRenameModal from './components/BatchRenameModal';
import PowerSendPanel from './components/PowerSendPanel';
import PowerSendModal from './components/PowerSendModal';
import { useTaskStore } from './stores/useTaskStore';
import { usePowerSendStore } from './stores/usePowerSendStore';
import { 
  Trash2, RefreshCw, 
  Star, HelpCircle,
  Eye, EyeOff, Sidebar as SidebarIcon,
  RectangleHorizontal, Columns2, Columns3, Settings,
  ChevronDown, ChevronUp, X, Folder, Sliders, FileText,
  Monitor, Download, Image, Video, Music, Home, Cpu, HardDrive, Terminal, Activity, Wifi
} from 'lucide-react';

const App = () => {
  const connectTaskEvents = useTaskStore(state => state.connectTaskEvents);
  const disconnectTaskEvents = useTaskStore(state => state.disconnectTaskEvents);
  const connectPowerSendEvents = usePowerSendStore(state => state.connectEvents);
  const disconnectPowerSendEvents = usePowerSendStore(state => state.disconnectEvents);
  const createPowerSendOffer = usePowerSendStore(state => state.createOffer);
  const receivePowerSend = usePowerSendStore(state => state.receive);
  const setPowerSendPanelOpen = usePowerSendStore(state => state.setPanelOpen);

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
  const [showTopbar, setShowTopbar] = useState(() => {
    const saved = localStorage.getItem('monkez_topbar_open');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showStatusBar, setShowStatusBar] = useState(() => {
    const saved = localStorage.getItem('monkez_status_bar_open');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showShortcutHints, setShowShortcutHints] = useState(() => {
    const saved = localStorage.getItem('monkez_shortcut_hints');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Theme & Settings States
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('monkez_theme');
    return saved || 'dark';
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
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

  const handleTopbarToggle = (val) => {
    setShowTopbar(val);
    localStorage.setItem('monkez_topbar_open', JSON.stringify(val));
  };

  const handleStatusBarToggle = (val) => {
    setShowStatusBar(val);
    localStorage.setItem('monkez_status_bar_open', JSON.stringify(val));
  };

  const handleShortcutHintsToggle = (val) => {
    setShowShortcutHints(val);
    localStorage.setItem('monkez_shortcut_hints', JSON.stringify(val));
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

  useEffect(() => {
    connectTaskEvents();
    return () => disconnectTaskEvents();
  }, [connectTaskEvents, disconnectTaskEvents]);

  useEffect(() => {
    connectPowerSendEvents();
    return () => disconnectPowerSendEvents();
  }, [connectPowerSendEvents, disconnectPowerSendEvents]);

  // Listen to real-time drive plug/unplug events (USB/external disks)
  useEffect(() => {
    const eventSource = new EventSource('/api/watch-drives');
    
    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        console.log('[DriveWatcher] Received change event:', payload);
        loadDrives();
      } catch (err) {
        console.error('[DriveWatcher] Error parsing event:', err);
        loadDrives(); // Fallback refresh
      }
    };

    eventSource.onerror = () => {
      console.warn('[DriveWatcher] Connection error or disconnected. Retrying...');
    };

    return () => {
      eventSource.close();
    };
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

  const refreshAllPanes = () => {
    window.dispatchEvent(new CustomEvent('refresh-all-panes'));
  };

  const runHistoryAction = async (action) => {
    try {
      const response = await fetch(`/api/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `${action} failed`);
      }
      refreshAllPanes();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
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
        refreshAllPanes();
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
        refreshAllPanes();
      }
    });
  };

  // Listen to global shortcuts (F5, F6, Ctrl+C, Ctrl+X, Ctrl+V) on window object
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.defaultPrevented) return;

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setCommandOpen(true);
        return;
      }

      // Check if user is typing in input boxes
      const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (isInput) return;

      if ((e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        runHistoryAction('undo');
      } else if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        runHistoryAction('redo');
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleF5F6Shortcut('copy');
      } else if (e.key === 'F6') {
        e.preventDefault();
        handleF5F6Shortcut('move');
      } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        const activeSelection = paneSelections[activePaneId];
        if (activeSelection && activeSelection.selectedPaths.length > 0) {
          fetch('/api/clipboard/copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths: activeSelection.selectedPaths })
          }).catch(console.error);
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === 'x') {
        const activeSelection = paneSelections[activePaneId];
        if (activeSelection && activeSelection.selectedPaths.length > 0) {
          fetch('/api/clipboard/copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths: activeSelection.selectedPaths })
          }).catch(console.error);
          setClipboard({ paths: activeSelection.selectedPaths, type: 'cut' });
        }
      } else if (e.ctrlKey && e.key.toLowerCase() === 'v') {
        const activeSelection = paneSelections[activePaneId];
        if (!activeSelection || !activeSelection.currentPath) return;

        if (clipboard.paths.length > 0) {
          const taskType = clipboard.type === 'cut' ? 'move' : 'copy';
          fetch(`/api/tasks/${taskType}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sources: clipboard.paths, destinationDir: activeSelection.currentPath, conflictPolicy: 'keep-both' })
          }).then(() => {
            if (taskType === 'move') {
              setClipboard({ paths: [], type: 'copy' });
            }
          }).catch(console.error);
          return;
        }

        fetch('/api/clipboard/read')
          .then(res => res.json())
          .then(data => {
            if (data.paths && data.paths.length > 0) {
              fetch('/api/tasks/copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sources: data.paths, destinationDir: activeSelection.currentPath, conflictPolicy: 'keep-both' })
              }).catch(console.error);
            }
          })
          .catch(console.error);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [panes, activePaneId, paneSelections, clipboard]);

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
    let isTaskOperation = false;

    if (type === 'mkdir') {
      url = '/api/mkdir';
      body = { currentPath: data.currentPath, name: fields.name };
    } else if (type === 'mkfile') {
      url = '/api/mkfile';
      body = { currentPath: data.currentPath, name: fields.name };
    } else if (type === 'rename') {
      url = '/api/rename';
      body = { currentPath: data.currentPath, oldName: data.oldName, newName: fields.name };
    } else if (type === 'delete') {
      url = '/api/delete';
      body = { paths: data.paths };
    } else if (type === 'delete-permanent') {
      url = '/api/delete-permanent';
      body = { paths: data.paths };
    } else if (type === 'transfer' || type === 'shortcut-copy' || type === 'shortcut-move') {
      const isCopy = type === 'shortcut-copy' || (type === 'transfer' && fields.action === 'copy');
      url = isCopy ? '/api/tasks/copy' : '/api/tasks/move';
      body = {
        sources: data.sourcePaths,
        destinationDir: data.targetPath,
        conflictPolicy: fields.conflictPolicy || 'keep-both'
      };
      isTaskOperation = true;
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
      
      // Long-running tasks refresh panes when the task manager reports completion.
      if (!isTaskOperation && data.callback) data.callback();
      closeModal();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Selection summaries
  const activePaneSel = paneSelections[activePaneId];
  const selectedCount = activePaneSel?.selectedPaths?.length || 0;
  const openBatchRename = () => {
    if (!activePaneSel?.currentPath || selectedCount === 0) {
      alert('Hãy chọn ít nhất một tệp hoặc thư mục trước khi đổi tên hàng loạt.');
      return;
    }
    openModal('batch-rename', {
      currentPath: activePaneSel.currentPath,
      paths: activePaneSel.selectedPaths,
      callback: refreshAllPanes
    });
  };

  const handlePowerSendSubmit = async ({ code }) => {
    if (modal.type === 'network-send') {
      await createPowerSendOffer({
        paths: modal.data.paths,
        code
      });
    } else {
      await receivePowerSend({
        code,
        destinationDir: modal.data.destinationDir
      });
    }
    setPowerSendPanelOpen(true);
    closeModal();
  };

  const commandList = [
    {
      id: 'new-folder',
      label: 'Tạo thư mục mới',
      description: activePaneSel?.currentPath || 'Pane hiện tại',
      keywords: ['folder', 'mkdir', 'new'],
      run: () => activePaneSel?.currentPath && openModal('mkdir', { currentPath: activePaneSel.currentPath, callback: handleRefresh })
    },
    {
      id: 'new-file',
      label: 'Tạo tệp mới',
      description: activePaneSel?.currentPath || 'Pane hiện tại',
      keywords: ['file', 'mkfile', 'new'],
      run: () => activePaneSel?.currentPath && openModal('mkfile', { currentPath: activePaneSel.currentPath, callback: handleRefresh })
    },
    {
      id: 'batch-rename',
      label: 'Đổi tên hàng loạt',
      description: selectedCount > 0 ? `${selectedCount} mục đã chọn` : 'Chọn tệp/thư mục trước',
      keywords: ['rename', 'batch', 'bulk'],
      disabled: selectedCount === 0,
      run: openBatchRename
    },
    {
      id: 'undo',
      label: 'Undo thao tác file',
      description: 'Hoàn tác thao tác tạo, đổi tên, copy/move gần nhất',
      keywords: ['undo', 'history'],
      run: () => runHistoryAction('undo')
    },
    {
      id: 'redo',
      label: 'Redo thao tác file',
      description: 'Làm lại thao tác vừa undo',
      keywords: ['redo', 'history'],
      run: () => runHistoryAction('redo')
    },
    {
      id: 'network-send',
      label: 'Network Send',
      description: selectedCount > 0 ? `Gửi ${selectedCount} mục qua LAN` : 'Chọn file/thư mục trước',
      keywords: ['network', 'send', 'lan', 'power'],
      disabled: selectedCount === 0,
      run: () => openModal('network-send', { paths: activePaneSel.selectedPaths })
    },
    {
      id: 'network-receive',
      label: 'Network Receive',
      description: activePaneSel?.currentPath || 'Thư mục hiện tại',
      keywords: ['network', 'receive', 'lan', 'power'],
      disabled: !activePaneSel?.currentPath,
      run: () => openModal('network-receive', { destinationDir: activePaneSel.currentPath })
    },
    {
      id: 'power-send-manager',
      label: 'Mở Power Send Manager',
      description: 'Quản lý các phiên gửi và nhận trong LAN',
      keywords: ['network', 'manager', 'transfer', 'lan'],
      run: () => setPowerSendPanelOpen(true)
    },
    {
      id: 'refresh',
      label: 'Làm mới pane hiện tại',
      description: activePaneSel?.currentPath || '',
      keywords: ['reload', 'refresh'],
      run: handleRefresh
    },
    {
      id: 'bookmark',
      label: 'Thêm bookmark cho thư mục hiện tại',
      description: activePaneSel?.currentPath || '',
      keywords: ['bookmark', 'star'],
      run: handleAddBookmark
    },
    {
      id: 'layout-1',
      label: 'Chuyển sang 1 pane',
      keywords: ['layout', 'pane'],
      run: () => handleLayoutChange(1)
    },
    {
      id: 'layout-2',
      label: 'Chuyển sang 2 pane',
      keywords: ['layout', 'pane'],
      run: () => handleLayoutChange(2)
    },
    {
      id: 'layout-3',
      label: 'Chuyển sang 3 pane',
      keywords: ['layout', 'pane'],
      run: () => handleLayoutChange(3)
    },
    {
      id: 'toggle-hidden',
      label: showHiddenFiles ? 'Ẩn file ẩn' : 'Hiện file ẩn',
      keywords: ['hidden', 'view'],
      run: () => handleShowHiddenToggle(!showHiddenFiles)
    },
    {
      id: 'toggle-extensions',
      label: showExtensions ? 'Ẩn đuôi file' : 'Hiện đuôi file',
      keywords: ['extension', 'view'],
      run: () => handleShowExtensionsToggle(!showExtensions)
    }
  ];

  return (
    <div className={`app-container theme-${theme} ${showStatusBar ? 'status-bar-visible' : 'status-bar-hidden'}`}>
      {/* Top Main Command Toolbar */}
      <div className={`topbar-shell ${showTopbar ? 'open' : 'collapsed'}`}>
        {showTopbar && (
          <header className="toolbar-global">
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
          <button className="toolbar-btn" onClick={() => setCommandOpen(true)} title="Command Palette (Ctrl+Shift+P)">
            <Terminal size={15} />
            <span>Command</span>
          </button>
          <button className="toolbar-btn" onClick={() => setPowerSendPanelOpen(true)} title="Power Send Manager">
            <Wifi size={15} />
            <span>Power Send</span>
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
                      <Monitor size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="bookmark-info">
                        <span className="bookmark-name">Desktop (Màn hình chính)</span>
                        <span className="bookmark-path">{systemPaths.desktop}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.downloads); setShowSystemPathsDropdown(false); }}>
                      <Download size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="bookmark-info">
                        <span className="bookmark-name">Downloads (Tải về)</span>
                        <span className="bookmark-path">{systemPaths.downloads}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.documents); setShowSystemPathsDropdown(false); }}>
                      <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="bookmark-info">
                        <span className="bookmark-name">Documents (Tài liệu)</span>
                        <span className="bookmark-path">{systemPaths.documents}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.pictures); setShowSystemPathsDropdown(false); }}>
                      <Image size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="bookmark-info">
                        <span className="bookmark-name">Pictures (Hình ảnh)</span>
                        <span className="bookmark-path">{systemPaths.pictures}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.videos); setShowSystemPathsDropdown(false); }}>
                      <Video size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="bookmark-info">
                        <span className="bookmark-name">Videos (Video)</span>
                        <span className="bookmark-path">{systemPaths.videos}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.music); setShowSystemPathsDropdown(false); }}>
                      <Music size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="bookmark-info">
                        <span className="bookmark-name">Music (Nhạc)</span>
                        <span className="bookmark-path">{systemPaths.music}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.userProfile); setShowSystemPathsDropdown(false); }}>
                      <Home size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="bookmark-info">
                        <span className="bookmark-name">User Profile (Thư mục cá nhân)</span>
                        <span className="bookmark-path">{systemPaths.userProfile}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.programFiles); setShowSystemPathsDropdown(false); }}>
                      <Cpu size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="bookmark-info">
                        <span className="bookmark-name">Program Files</span>
                        <span className="bookmark-path">{systemPaths.programFiles}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.programFilesX86); setShowSystemPathsDropdown(false); }}>
                      <Cpu size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="bookmark-info">
                        <span className="bookmark-name">Program Files (x86)</span>
                        <span className="bookmark-path">{systemPaths.programFilesX86}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.windowsDir); setShowSystemPathsDropdown(false); }}>
                      <HardDrive size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="bookmark-info">
                        <span className="bookmark-name">Windows (Thư mục cài đặt OS)</span>
                        <span className="bookmark-path">{systemPaths.windowsDir}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.appData); setShowSystemPathsDropdown(false); }}>
                      <Folder size={14} style={{ color: 'var(--text-muted)' }} />
                      <div className="bookmark-info">
                        <span className="bookmark-name">AppData (Roaming)</span>
                        <span className="bookmark-path">{systemPaths.appData}</span>
                      </div>
                    </div>
                    <div className="bookmarks-dropdown-item" onClick={() => { handleNavigate(systemPaths.tempDir); setShowSystemPathsDropdown(false); }}>
                      <Trash2 size={14} style={{ color: 'var(--text-muted)' }} />
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
                  <Sliders size={14} style={{ color: 'var(--text-muted)' }} />
                  <div className="bookmark-info">
                    <span className="bookmark-name">Control Panel</span>
                    <span className="bookmark-path">Bảng điều khiển truyền thống</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('settings'); setShowSystemToolsDropdown(false); }}>
                  <Settings size={14} style={{ color: 'var(--text-muted)' }} />
                  <div className="bookmark-info">
                    <span className="bookmark-name">Windows Settings</span>
                    <span className="bookmark-path">Cấu hình cài đặt hệ thống</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('add-remove-programs'); setShowSystemToolsDropdown(false); }}>
                  <Cpu size={14} style={{ color: 'var(--text-muted)' }} />
                  <div className="bookmark-info">
                    <span className="bookmark-name">Add or Remove Programs</span>
                    <span className="bookmark-path">Quản lý và gỡ cài đặt phần mềm</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('task-manager'); setShowSystemToolsDropdown(false); }}>
                  <Activity size={14} style={{ color: 'var(--text-muted)' }} />
                  <div className="bookmark-info">
                    <span className="bookmark-name">Task Manager</span>
                    <span className="bookmark-path">Quản lý các tác vụ đang chạy</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('disk-management'); setShowSystemToolsDropdown(false); }}>
                  <HardDrive size={14} style={{ color: 'var(--text-muted)' }} />
                  <div className="bookmark-info">
                    <span className="bookmark-name">Disk Management</span>
                    <span className="bookmark-path">Quản lý phân vùng ổ đĩa</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('device-manager'); setShowSystemToolsDropdown(false); }}>
                  <Cpu size={14} style={{ color: 'var(--text-muted)' }} />
                  <div className="bookmark-info">
                    <span className="bookmark-name">Device Manager</span>
                    <span className="bookmark-path">Quản lý driver phần cứng</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('registry-editor'); setShowSystemToolsDropdown(false); }}>
                  <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                  <div className="bookmark-info">
                    <span className="bookmark-name">Registry Editor</span>
                    <span className="bookmark-path">Chỉnh sửa cơ sở dữ liệu registry</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('services'); setShowSystemToolsDropdown(false); }}>
                  <Settings size={14} style={{ color: 'var(--text-muted)' }} />
                  <div className="bookmark-info">
                    <span className="bookmark-name">Services</span>
                    <span className="bookmark-path">Quản lý dịch vụ chạy ngầm</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('resource-monitor'); setShowSystemToolsDropdown(false); }}>
                  <Activity size={14} style={{ color: 'var(--text-muted)' }} />
                  <div className="bookmark-info">
                    <span className="bookmark-name">Resource Monitor</span>
                    <span className="bookmark-path">Theo dõi CPU, Memory, Disk, Network</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('command-prompt'); setShowSystemToolsDropdown(false); }}>
                  <Terminal size={14} style={{ color: 'var(--text-muted)' }} />
                  <div className="bookmark-info">
                    <span className="bookmark-name">Command Prompt (CMD)</span>
                    <span className="bookmark-path">Khởi chạy cmd.exe</span>
                  </div>
                </div>
                <div className="bookmarks-dropdown-item" onClick={() => { handleLaunchTool('powershell'); setShowSystemToolsDropdown(false); }}>
                  <Terminal size={14} style={{ color: 'var(--text-muted)' }} />
                  <div className="bookmark-info">
                    <span className="bookmark-name">PowerShell</span>
                    <span className="bookmark-path">Khởi chạy powershell.exe</span>
                  </div>
                </div>
              </div>
            )}
          </div>
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
        )}
        <button
          type="button"
          className="topbar-toggle-handle"
          onClick={() => handleTopbarToggle(!showTopbar)}
          title={showTopbar ? 'Ẩn thanh công cụ trên cùng' : 'Hiện thanh công cụ trên cùng'}
          aria-label={showTopbar ? 'Ẩn thanh công cụ trên cùng' : 'Hiện thanh công cụ trên cùng'}
        >
          {showTopbar ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

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

              {/* 2. Interface Visibility */}
              <div className="settings-section">
                <div className="settings-section-title" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  Thành Phần Giao Diện
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                    <input
                      type="checkbox"
                      checked={showStatusBar}
                      onChange={(e) => handleStatusBarToggle(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Hiển thị thanh trạng thái dưới cùng (Status Bar)</span>
                  </label>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                    <input
                      type="checkbox"
                      checked={showShortcutHints}
                      onChange={(e) => handleShortcutHintsToggle(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Hiển thị gợi ý phím tắt trong Status Bar</span>
                  </label>
                </div>
              </div>

              {/* 3. File Explorer Behaviors */}
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

              {/* 4. Startup Path */}
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

              {/* 5. Terminal Configuration */}
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
                    localStorage.removeItem('monkez_topbar_open');
                    localStorage.removeItem('monkez_status_bar_open');
                    localStorage.removeItem('monkez_shortcut_hints');
                    setTheme('dark');
                    setShowHiddenFiles(true);
                    setShowExtensions(true);
                    setOpenInDefaultApp(true);
                    setDefaultStartFolder('C:\\');
                    setTerminalType('auto');
                    setShowTopbar(true);
                    setShowStatusBar(true);
                    setShowShortcutHints(true);
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
      {modal.isOpen && modal.type === 'batch-rename' && (
        <BatchRenameModal
          data={modal.data}
          onClose={closeModal}
          onApplied={() => modal.data.callback?.()}
        />
      )}

      {modal.isOpen && ['network-send', 'network-receive'].includes(modal.type) && (
        <PowerSendModal
          type={modal.type}
          data={modal.data}
          onClose={closeModal}
          onSubmit={handlePowerSendSubmit}
        />
      )}

      {modal.isOpen && !['batch-rename', 'network-send', 'network-receive'].includes(modal.type) && (
        <Modal 
          type={modal.type} 
          data={modal.data} 
          onClose={closeModal} 
          onSubmit={handleModalSubmit} 
        />
      )}

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        commands={commandList}
      />

      <PowerSendPanel />
      <TaskPanel />

      {/* Bottom Global Status Bar */}
      {showStatusBar && <footer className="app-status-bar">
        <span>Active pane: {activePaneId.toUpperCase()} | Path: {activePaneSel?.currentPath || 'C:\\'}</span>
        {showShortcutHints && <div className="hotkey-legend">
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
        </div>}
      </footer>}
    </div>
  );
};

// Modal Subcomponent
const Modal = ({ type, data, onClose, onSubmit }) => {
  const [inputValue, setInputValue] = useState('');
  const [conflictPolicy, setConflictPolicy] = useState('keep-both');

  useEffect(() => {
    setConflictPolicy('keep-both');
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
    onSubmit({ name: inputValue, conflictPolicy });
  };

  const getModalTitle = () => {
    switch (type) {
      case 'mkdir': return 'Create Folder';
      case 'mkfile': return 'Create File';
      case 'rename': return 'Rename Item';
      case 'delete': return 'Move to Recycle Bin';
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
        className={`modal-content ${type === 'delete-permanent' ? 'delete-permanent-modal' : ''}`} 
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
            <div className={`delete-paths-list ${type === 'delete-permanent' ? 'permanent' : ''}`}>
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
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              Conflict resolver
              <select className="modal-input" value={conflictPolicy} onChange={(e) => setConflictPolicy(e.target.value)}>
                <option value="keep-both">Keep both: tự tạo tên "Copy"</option>
                <option value="replace">Replace: ghi đè đích</option>
                <option value="skip">Skip: bỏ qua mục bị trùng</option>
                <option value="error">Error: dừng và báo lỗi khi trùng</option>
              </select>
            </label>
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
                onClick={() => onSubmit({ action: 'copy', conflictPolicy })}
              >
                Copy Items
              </button>
              <button 
                type="button" 
                className="modal-btn modal-btn-primary" 
                style={{ background: 'var(--success-color)' }}
                onClick={() => onSubmit({ action: 'move', conflictPolicy })}
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
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              Conflict resolver
              <select className="modal-input" value={conflictPolicy} onChange={(e) => setConflictPolicy(e.target.value)}>
                <option value="keep-both">Keep both: tự tạo tên "Copy"</option>
                <option value="replace">Replace: ghi đè đích</option>
                <option value="skip">Skip: bỏ qua mục bị trùng</option>
                <option value="error">Error: dừng và báo lỗi khi trùng</option>
              </select>
            </label>
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
