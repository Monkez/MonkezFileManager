import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { 
  Folder, File, Image, FileCode, Video, Music, FileText,
  ArrowLeft, ArrowRight, ArrowUp, Search, Plus, 
  X, AlertTriangle, ChevronRight, MoreVertical,
  List, Grid, HardDrive, History,
  ExternalLink, Compass, Copy, Scissors, ClipboardPaste, 
  Bookmark, Calculator, Edit, Trash2, Trash, Archive, FolderOpen, 
  Terminal, Code, Cpu, FolderPlus, FilePlus, RefreshCw, Star
} from 'lucide-react';

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const Pane = ({
  paneId,
  isActive,
  onActivate,
  drives = [],
  onFileDrop = () => {},
  onSelectionChange = () => {},
  activeItem,
  setActiveItem = () => {},
  openModal = () => {},
  clipboard = { paths: [], type: 'copy' },
  setClipboard = () => {},
  showHiddenFiles = true,
  showExtensions = true,
  openInDefaultApp = true
}) => {
  const getStartFolder = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPath = urlParams.get('path');
    if (urlPath) return urlPath;

    const saved = localStorage.getItem('monkez_start_folder');
    return saved || 'C:\\';
  };

  const initialPath = getStartFolder();

  // Tabs and Navigation state
  const [tabs, setTabs] = useState([
    {
      id: 'tab-1',
      name: initialPath === 'C:\\' ? 'Local Disk (C:)' : initialPath.split('\\').filter(Boolean).pop() || initialPath,
      path: initialPath,
      history: [initialPath],
      historyIndex: 0
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  const [restorablePath, setRestorablePath] = useState(() => {
    return localStorage.getItem('monkez_last_path_' + paneId);
  });

  // View Mode Settings
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem(`monkez_viewmode_${paneId}`);
    return saved || 'text';
  });
  const [viewMenuOpen, setViewMenuOpen] = useState(false);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem(`monkez_viewmode_${paneId}`, mode);
  };

  // Directory listing data
  const [filesData, setFilesData] = useState({
    currentPath: initialPath,
    parentPath: null,
    breadcrumbs: [],
    items: []
  });

  const hasLastFolder = !!(restorablePath && restorablePath.toLowerCase() !== filesData.currentPath.toLowerCase());
  const restoreLastFolder = () => {
    if (restorablePath) {
      navigateTo(restorablePath);
    }
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Path edit input state
  const [pathInput, setPathInput] = useState(initialPath);
  const [isEditingPath, setIsEditingPath] = useState(false);

  // Real-time filtering
  const [filterQuery, setFilterQuery] = useState('');
  const [isSearchingRecursively, setIsSearchingRecursively] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  // Sort State
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  // Selection states
  const [selectedNames, setSelectedNames] = useState(new Set()); // list of selected item names in active tab
  const [focusedIndex, setFocusedIndex] = useState(-1); // row keyboard focus

  // Drag selection state
  const [dragSelect, setDragSelect] = useState(null);
  const [dragDidMove, setDragDidMove] = useState(false);


  // Custom Context Menu State

  const [loadingContextMenu, setLoadingContextMenu] = useState(false);
  const [dynamicMenuItems, setDynamicMenuItems] = useState([]);
  const [showDynamicSubmenu, setShowDynamicSubmenu] = useState(false);
  const [showWinrarSubmenu, setShowWinrarSubmenu] = useState(false);
  const winrarSubmenuRef = useRef(null);
  const submenuRef = useRef(null);
  const getSubmenuStyle = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const style = { position: 'absolute' };
    
    // Vertical positioning: if in the bottom half, expand upwards
    if (rect.top > window.innerHeight / 2) {
      style.bottom = 0;
      style.top = 'auto';
    } else {
      style.top = 0;
      style.bottom = 'auto';
    }
    
    // Horizontal positioning: if too close to right edge, expand leftwards
    if (rect.right + 250 > window.innerWidth) {
      style.left = 'auto';
      style.right = '100%';
    } else {
      style.left = '100%';
      style.right = 'auto';
    }
    return style;
  };
  
  const [submenuDynamicStyle, setSubmenuDynamicStyle] = useState({ position: 'absolute', left: '100%', top: 0 });
  const [winrarSubmenuDynamicStyle, setWinrarSubmenuDynamicStyle] = useState({ position: 'absolute', left: '100%', top: 0 });

  const [contextMenu, setContextMenu] = useState({
    isOpen: false,
    x: 0,
    y: 0,
    targetItem: null
  });

  const [shellApps, setShellApps] = useState({
    terminal: { available: true, path: 'cmd' },
    vscode: { available: false, path: '' },
    antigravity: { available: false, path: '' },
    winrar: { available: false, path: '' }
  });

  useEffect(() => {
    const fetchShellApps = async () => {
      try {
        const res = await fetch('/api/shell-apps');
        if (res.ok) {
          const data = await res.json();
          setShellApps(data);
        }
      } catch (err) {
        console.error('Failed to fetch shell apps:', err);
      }
    };
    fetchShellApps();
  }, []);

  const handleAreaMouseDown = (e) => {
    if (e.button !== 0) return;
    if (isEmptyAreaTarget(e.target)) {
      setDragSelect({
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY
      });
      setDragDidMove(false);
    }
  };

  useEffect(() => {
    if (!dragSelect) return;

    let localDidMove = false;

    const onMouseMove = (e) => {
      // Check if mouse moved more than a threshold
      if (!localDidMove && (Math.abs(e.clientX - dragSelect.startX) > 5 || Math.abs(e.clientY - dragSelect.startY) > 5)) {
        localDidMove = true;
        setDragDidMove(true);
      }

      if (!localDidMove) return;

      setDragSelect(prev => ({ ...prev, currentX: e.clientX, currentY: e.clientY }));
      
      const selectionBox = {
        left: Math.min(dragSelect.startX, e.clientX),
        top: Math.min(dragSelect.startY, e.clientY),
        right: Math.max(dragSelect.startX, e.clientX),
        bottom: Math.max(dragSelect.startY, e.clientY)
      };

      const newSelectedNames = new Set();
      if (paneRef.current) {
        const itemEls = paneRef.current.querySelectorAll('.file-table tbody tr, .file-grid .grid-item');
        itemEls.forEach((el) => {
          if (el.textContent.includes('.. (Parent Folder)')) return;
          const rect = el.getBoundingClientRect();
          const isIntersecting = !(rect.left > selectionBox.right || 
                                   rect.right < selectionBox.left || 
                                   rect.top > selectionBox.bottom ||
                                   rect.bottom < selectionBox.top);
          if (isIntersecting) {
            const name = el.getAttribute('data-name');
            if (name) newSelectedNames.add(name);
          }
        });
      }
      setSelectedNames(newSelectedNames);
    };
    
    const onMouseUp = () => {
      setDragSelect(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragSelect]);


  const handleOpenWith = async (appName, action, targetPath) => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
    try {
      const body = { app: appName, action, targetPath };
      if (appName === 'terminal') {
        body.terminalType = localStorage.getItem('monkez_terminal_type') || 'auto';
      }
      const res = await fetch('/api/open-with', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to open with application');
      }
      if (appName === 'winrar' && (action === 'compress' || action === 'extract-here' || action === 'extract-to')) {
        setTimeout(() => {
          fetchFiles(filesData.currentPath);
        }, 1000);
      }
    } catch (err) {
      alert(`Lỗi mở ứng dụng: ${err.message}`);
    }
  };

  const paneRef = useRef(null);
  const contextMenuRef = useRef(null);
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Close context menu on left clicks anywhere or escape
  useEffect(() => {
    const handleCloseMenu = () => {
      if (contextMenu.isOpen) {
        setContextMenu(prev => ({ ...prev, isOpen: false }));
      }
      if (viewMenuOpen) {
        setViewMenuOpen(false);
      }
    };
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, [contextMenu.isOpen, viewMenuOpen]);

  useLayoutEffect(() => {
    if (contextMenu.isOpen && contextMenuRef.current) {
      const menuEl = contextMenuRef.current;
      const rect = menuEl.getBoundingClientRect();
      let adjustedY = contextMenu.y;
      let adjustedX = contextMenu.x;
      let changed = false;

      // Check vertical overflow
      if (contextMenu.y + rect.height > window.innerHeight) {
        adjustedY = Math.max(10, window.innerHeight - rect.height - 10);
        changed = true;
      }
      // Check horizontal overflow
      if (contextMenu.x + rect.width > window.innerWidth) {
        adjustedX = Math.max(10, window.innerWidth - rect.width - 10);
        changed = true;
      }

      if (changed) {
        menuEl.style.top = `${adjustedY}px`;
        menuEl.style.left = `${adjustedX}px`;
      }
    }
  }, [contextMenu.isOpen, contextMenu.x, contextMenu.y, dynamicMenuItems, showWinrarSubmenu, showDynamicSubmenu]);


  const fetchContextMenu = async (targetPath) => {
    setLoadingContextMenu(true);
    setDynamicMenuItems([]);
    try {
      const res = await fetch(`/api/context-menu?path=${encodeURIComponent(targetPath)}`);
      if (res.ok) {
        const data = await res.json();
        setDynamicMenuItems(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch context menu:', err);
    } finally {
      setLoadingContextMenu(false);
    }
  };

  const handleRowContextMenu = (item, idx, e) => {
    e.preventDefault();
    e.stopPropagation();
    onActivate();
    
    // Auto-select row if not already selected
    let newSelected = new Set(selectedNames);
    if (!newSelected.has(item.name)) {
      newSelected = new Set([item.name]);
      setSelectedNames(newSelected);
      setFocusedIndex(idx);
    }
    
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      targetItem: item
    });
  };

  const isEmptyAreaTarget = (target) => {
    return target.classList.contains('pane-content-area')
      || target.tagName === 'TABLE'
      || target.tagName === 'TBODY'
      || target.classList.contains('file-grid')
      || target.classList.contains('empty-folder-message')
      || target.closest('.empty-folder-message');
  };

  const handleAreaContextMenu = (e) => {
    // Only context menu empty areas
    if (isEmptyAreaTarget(e.target)) {
      e.preventDefault();
      onActivate();

      // Deselect all items (like Windows Explorer)
      setSelectedNames(new Set());
      setFocusedIndex(-1);

      setContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        targetItem: null
      });
    }
  };

  const handleEmptyAreaClick = (e) => {
    if (dragDidMove) return; // Prevent clearing selection after drag

    // Left-click on empty space deselects all items (like Windows Explorer)
    if (isEmptyAreaTarget(e.target)) {
      setSelectedNames(new Set());
      setFocusedIndex(-1);
    }
  };

  const handleHeaderMenuClick = (e) => {
    e.stopPropagation();
    onActivate();

    // Deselect all items (opening folder-level menu, not item menu)
    setSelectedNames(new Set());
    setFocusedIndex(-1);

    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      isOpen: true,
      x: rect.left,
      y: rect.bottom + 5,
      targetItem: null
    });
  };

  const handleRevealInExplorer = async (targetPath) => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
    try {
      const res = await fetch('/api/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reveal in explorer');
      }
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    }
  };

  const handleCopyPath = (targetPath) => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
    
    // Check if we should copy multiple selected paths
    const isClickedItemInsideSelection = contextMenu.targetItem && selectedNames.has(contextMenu.targetItem.name);
    let textToCopy = targetPath;
    
    if (isClickedItemInsideSelection && selectedNames.size > 1) {
      const selectedPaths = Array.from(selectedNames).map(name => {
        const item = filesData.items.find(i => i.name === name);
        return item ? item.path : '';
      }).filter(Boolean);
      textToCopy = selectedPaths.join('\n');
    }

    navigator.clipboard.writeText(textToCopy)
      .catch(err => {
        alert(`Lỗi copy đường dẫn: ${err.message}`);
      });
  };

  const handleContextMenuAction = async (action) => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));

    const selectedPaths = Array.from(selectedNames).map(name => {
      const item = filesData.items.find(i => i.name === name);
      return item ? item.path : '';
    }).filter(Boolean);

    if (action === 'copy') {
      setClipboard({ paths: selectedPaths, type: 'copy' });
    } else if (action === 'cut') {
      setClipboard({ paths: selectedPaths, type: 'cut' });
    } else if (action === 'paste') {
      if (clipboard.paths.length === 0) return;
      const isCopy = clipboard.type === 'copy';
      const url = isCopy ? '/api/copy' : '/api/move';
      
      try {
        setLoading(true);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sources: clipboard.paths, destinationDir: filesData.currentPath })
        });
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || 'Paste failed');
        }
        if (!isCopy) {
          // Clear clipboard on cut
          setClipboard({ paths: [], type: 'copy' });
        }
        window.dispatchEvent(new CustomEvent('refresh-all-panes'));
      } catch (err) {
        alert(`Error pasting files: ${err.message}`);
      } finally {
        setLoading(false);
      }
    } else if (action === 'bookmark-item') {
      if (contextMenu.targetItem && contextMenu.targetItem.isDirectory) {
        openModal('bookmark', {
          name: contextMenu.targetItem.name,
          path: contextMenu.targetItem.path
        });
      }
    } else if (action === 'zip') {
      if (selectedPaths.length === 0) return;
      let archiveName = 'Archive.zip';
      if (selectedPaths.length === 1) {
        const base = selectedPaths[0].replace(/\\/g, '/').split('/').pop();
        archiveName = `${base}.zip`;
      }
      const archivePath = `${filesData.currentPath}\\${archiveName}`;

      try {
        setLoading(true);
        const res = await fetch('/api/compress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sources: selectedPaths, destination: archivePath })
        });
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || 'Compression failed');
        }
        fetchFiles(filesData.currentPath);
      } catch (err) {
        alert(`Error zipping: ${err.message}`);
      } finally {
        setLoading(false);
      }
    } else if (action === 'unzip') {
      if (!contextMenu.targetItem) return;
      
      try {
        setLoading(true);
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source: contextMenu.targetItem.path, targetDir: filesData.currentPath })
        });
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || 'Extraction failed');
        }
        fetchFiles(filesData.currentPath);
      } catch (err) {
        alert(`Error extracting zip: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Fetch files in active path
  const fetchFiles = async (targetPath) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(targetPath)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to read directory');
      }
      setFilesData(data);
      setPathInput(data.currentPath);
      setSelectedNames(new Set());
      setFocusedIndex(-1);
      setIsSearchingRecursively(false);
      setSearchResults([]);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setFilesData(prev => ({
        ...prev,
        currentPath: targetPath,
        items: []
      }));
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when tab path changes
  useEffect(() => {
    fetchFiles(activeTab.path);
  }, [activeTab.path]);

  // File Watcher (SSE)
  useEffect(() => {
    if (!filesData.currentPath) return;

    const eventSource = new EventSource(`/api/watch?path=${encodeURIComponent(filesData.currentPath)}`);
    
    let debounceTimer;
    eventSource.onmessage = (e) => {
      if (e.data === 'changed') {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          // Re-fetch files for the current path
          fetchFiles(filesData.currentPath);
        }, 500);
      }
    };

    return () => {
      clearTimeout(debounceTimer);
      eventSource.close();
    };
  }, [filesData.currentPath]);

  // Save current path to localStorage for session restoring
  useEffect(() => {
    if (filesData.currentPath) {
      localStorage.setItem('monkez_last_path_' + paneId, filesData.currentPath);
    }
  }, [filesData.currentPath, paneId]);

  // Sync back path transitions with parent container active selection
  // Always report currentPath so bookmarks/toolbar actions work
  useEffect(() => {
    // Find what file is currently focused or selected
    const selectedPaths = Array.from(selectedNames).map(name => {
      const item = filesData.items.find(i => i.name === name);
      return item ? item.path : '';
    }).filter(Boolean);

    const activeName = isActive && focusedIndex >= 0 && getSortedItems()[focusedIndex]?.name;
    const activeFileObj = activeName ? filesData.items.find(i => i.name === activeName) : null;

    onSelectionChange({
      paneId,
      currentPath: filesData.currentPath,
      selectedPaths,
      activeFile: isActive ? activeFileObj : undefined
    });
  }, [selectedNames, focusedIndex, filesData.currentPath, filesData.items, isActive]);

  // Navigate function
  const navigateTo = (newPath, updateHistory = true) => {
    if (!newPath) return;
    
    // Add slash if missing for drive roots (e.g. C: -> C:\)
    let formattedPath = newPath;
    if (/^[A-Za-z]:$/.test(newPath)) {
      formattedPath += '\\';
    }

    setTabs(prevTabs => {
      return prevTabs.map(t => {
        if (t.id === activeTabId) {
          let newHistory = [...t.history];
          let newIndex = t.historyIndex;

          if (updateHistory) {
            // Truncate forward history if navigating new
            newHistory = newHistory.slice(0, t.historyIndex + 1);
            newHistory.push(formattedPath);
            newIndex = newHistory.length - 1;
          }

          // Extract last folder name for tab label
          let tabName = formattedPath;
          const parsed = formattedPath.replace(/\\/g, '/');
          const parts = parsed.split('/').filter(Boolean);
          if (parts.length > 0) {
            tabName = parts[parts.length - 1];
          }

          return {
            ...t,
            name: tabName,
            path: formattedPath,
            history: newHistory,
            historyIndex: newIndex
          };
        }
        return t;
      });
    });
  };

  // History Actions
  const goBack = () => {
    if (activeTab.historyIndex > 0) {
      const newIndex = activeTab.historyIndex - 1;
      const path = activeTab.history[newIndex];
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, historyIndex: newIndex, path } : t));
    }
  };

  const goForward = () => {
    if (activeTab.historyIndex < activeTab.history.length - 1) {
      const newIndex = activeTab.historyIndex + 1;
      const path = activeTab.history[newIndex];
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, historyIndex: newIndex, path } : t));
    }
  };

  const goUp = () => {
    if (filesData.parentPath) {
      navigateTo(filesData.parentPath);
    }
  };

  // Tabs management
  const addTab = (path = 'C:\\') => {
    const newId = `tab-${Date.now()}`;
    const newTab = {
      id: newId,
      name: 'Local Disk (C:)',
      path: path,
      history: [path],
      historyIndex: 0
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (tabId, e) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Must keep at least 1 tab

    const index = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      // Move to adjacent tab
      const nextActiveTab = newTabs[index] || newTabs[index - 1];
      setActiveTabId(nextActiveTab.id);
    }
  };

  // Sorting Handler
  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Filter and sort items
  const getSortedItems = () => {
    let itemsToProcess = isSearchingRecursively ? searchResults : filesData.items;
    let filtered = itemsToProcess;

    if (!showHiddenFiles) {
      filtered = filtered.filter(item => !item.isHidden);
    }

    if (filterQuery && !isSearchingRecursively) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(filterQuery.toLowerCase())
      );
    }

    // Sort items: Folders always on top, then sort by selected column
    return [...filtered].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;

      let valA = a[sortKey];
      let valB = b[sortKey];

      if (sortKey === 'name') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      if (sortKey === 'mtime') {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (sortKey === 'size') {
        // Size is 0 for folders in normal lists, comparing file sizes
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      if (sortKey === 'ext') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      return 0;
    });
  };

  // File Icon resolver
  const getFileIcon = (item) => {
    if (item.isDirectory) return <Folder className="file-icon folder" size={16} />;
    
    const ext = item.ext;
    const thumbnailImages = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.svg'];
    const genericImages = [];
    const code = ['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.py', '.sh', '.cpp', '.cs', '.go'];
    const videos = ['.mp4', '.webm', '.avi', '.mkv'];
    const audio = ['.mp3', '.wav', '.ogg', '.m4a'];

    if (thumbnailImages.includes(ext)) {
      return (
        <img 
          src={`/api/raw?path=${encodeURIComponent(item.path)}`} 
          className="file-icon image-thumbnail" 
          alt="" 
          loading="lazy" 
          draggable={false}
          style={{
            width: '16px',
            height: '16px',
            objectFit: 'cover',
            borderRadius: '2px'
          }}
        />
      );
    }

    if (item.icon) {
      return (
        <img 
          src={item.icon} 
          className="file-icon app-icon" 
          alt="" 
          draggable={false}
          style={{
            width: '16px',
            height: '16px',
            objectFit: 'contain'
          }}
        />
      );
    }

    if (genericImages.includes(ext)) return <Image className="file-icon image" size={16} />;
    if (code.includes(ext)) return <FileCode className="file-icon code" size={16} />;
    if (videos.includes(ext)) return <Video className="file-icon video" size={16} />;
    if (audio.includes(ext)) return <Music className="file-icon audio" size={16} />;
    
    return <File className="file-icon file" size={16} />;
  };

  // Grid Item Media/Icon resolver
  const getGridItemMedia = (item, size) => {
    if (item.isDirectory) {
      const folderSize = size === 'small' ? 32 : size === 'medium' ? 48 : 64;
      return <Folder className="file-icon folder" size={folderSize} />;
    }
    
    const ext = item.ext;
    const thumbnailImages = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.svg'];
    const genericImages = [];
    const videos = ['.mp4', '.webm', '.avi', '.mkv'];

    if (thumbnailImages.includes(ext)) {
      return (
        <img 
          src={`/api/raw?path=${encodeURIComponent(item.path)}`} 
          className="grid-item-thumbnail" 
          alt={item.name} 
          loading="lazy" 
          draggable={false}
        />
      );
    }
    
    if (videos.includes(ext)) {
      return (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video 
            src={`/api/raw?path=${encodeURIComponent(item.path)}#t=0.1`} 
            className="grid-item-thumbnail" 
            preload="metadata" 
            muted 
            draggable={false}
          />
          <div style={{ position: 'absolute', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Video size={16} style={{ color: '#fff' }} />
          </div>
        </div>
      );
    }

    if (item.icon) {
      const iconSize = size === 'small' ? 32 : size === 'medium' ? 48 : 64;
      return (
        <img 
          src={item.icon} 
          className="grid-item-thumbnail" 
          alt="" 
          draggable={false}
          style={{
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            objectFit: 'contain'
          }}
        />
      );
    }
    
    const iconSize = size === 'small' ? 32 : size === 'medium' ? 48 : 64;
    const code = ['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.py', '.sh', '.cpp', '.cs', '.go'];
    const audio = ['.mp3', '.wav', '.ogg', '.m4a'];

    if (genericImages.includes(ext)) return <Image className="file-icon image" size={iconSize} />;
    if (code.includes(ext)) return <FileCode className="file-icon code" size={iconSize} />;
    if (audio.includes(ext)) return <Music className="file-icon audio" size={iconSize} />;
    
    return <File className="file-icon file" size={iconSize} />;
  };

  // Size formatter
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Click Handlers
  const handleItemClick = (item, index, e) => {
    onActivate(); // Set active pane
    if (paneRef.current) {
      paneRef.current.focus();
    }

    if (e.ctrlKey) {
      // Toggle selection
      const newSelected = new Set(selectedNames);
      if (newSelected.has(item.name)) {
        newSelected.delete(item.name);
      } else {
        newSelected.add(item.name);
      }
      setSelectedNames(newSelected);
      setFocusedIndex(index);
    } else if (e.shiftKey && focusedIndex >= 0) {
      // Range selection
      const sorted = getSortedItems();
      const start = Math.min(focusedIndex, index);
      const end = Math.max(focusedIndex, index);
      const newSelected = new Set();
      for (let i = start; i <= end; i++) {
        newSelected.add(sorted[i].name);
      }
      setSelectedNames(newSelected);
    } else {
      // Single select
      setSelectedNames(new Set([item.name]));
      setFocusedIndex(index);
    }
  };

  const handleItemDoubleClick = async (item) => {
    if (item.isDirectory) {
      navigateTo(item.path);
    } else if (openInDefaultApp) {
      try {
        await fetch('/api/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: item.path })
        });
      } catch (err) {
        console.error('Failed to open file in system:', err);
      }
    }
  };

  const handleCalculateSize = async (item) => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
    try {
      const res = await fetch(`/api/foldersize?path=${encodeURIComponent(item.path)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to calculate size');
      
      const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      alert(
        `Thư mục: ${item.name}\n` +
        `-------------------------\n` +
        `Tổng dung lượng: ${formatBytes(data.size)}\n` +
        `Số tập tin (Files): ${data.fileCount}\n` +
        `Số thư mục con (Folders): ${data.folderCount}`
      );
    } catch (err) {
      alert(`Lỗi tính dung lượng: ${err.message}`);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (isEditingPath) return;

    const sorted = getSortedItems();
    
    // Clipboard keyboard shortcuts
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      const selectedPaths = Array.from(selectedNames).map(name => {
        const item = filesData.items.find(i => i.name === name);
        return item ? item.path : '';
      }).filter(Boolean);
      if (selectedPaths.length > 0) {
        setClipboard({ paths: selectedPaths, type: 'copy' });
      }
      return;
    } else if (e.ctrlKey && e.key === 'x') {
      e.preventDefault();
      const selectedPaths = Array.from(selectedNames).map(name => {
        const item = filesData.items.find(i => i.name === name);
        return item ? item.path : '';
      }).filter(Boolean);
      if (selectedPaths.length > 0) {
        setClipboard({ paths: selectedPaths, type: 'cut' });
      }
      return;
    } else if (e.ctrlKey && e.key === 'v') {
      e.preventDefault();
      handleContextMenuAction('paste');
      return;
    }

    // Select all shortcut (Ctrl + A)
    if (e.ctrlKey && e.key === 'a') {
      e.preventDefault();
      const allNames = new Set(sorted.map(item => item.name));
      setSelectedNames(allNames);
      setFocusedIndex(0);
      return;
    }

    if (sorted.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(focusedIndex + 1, sorted.length - 1);
      if (e.shiftKey && focusedIndex >= 0) {
        const newSelected = new Set(selectedNames);
        newSelected.add(sorted[nextIndex].name);
        setSelectedNames(newSelected);
        setFocusedIndex(nextIndex);
      } else {
        setFocusedIndex(nextIndex);
        setSelectedNames(new Set([sorted[nextIndex].name]));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIndex = Math.max(focusedIndex - 1, 0);
      if (e.shiftKey && focusedIndex >= 0) {
        const newSelected = new Set(selectedNames);
        newSelected.add(sorted[nextIndex].name);
        setSelectedNames(newSelected);
        setFocusedIndex(nextIndex);
      } else {
        setFocusedIndex(nextIndex);
        setSelectedNames(new Set([sorted[nextIndex].name]));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0) {
        handleItemDoubleClick(sorted[focusedIndex]);
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      goUp();
    } else if (e.key === 'Delete') {
      e.preventDefault();
      triggerFileAction(e.shiftKey ? 'delete-permanent' : 'delete');
    } else if (e.key === 'F2') {
      e.preventDefault();
      triggerFileAction('rename');
    } else if (e.key === 'F7') {
      e.preventDefault();
      triggerFileAction('mkdir');
    }
  };

  // File action dispatcher helper
  const triggerFileAction = (action) => {
    const selectedPaths = Array.from(selectedNames).map(name => {
      const file = filesData.items.find(i => i.name === name);
      return file ? file.path : '';
    }).filter(Boolean);

    if (action === 'mkdir') {
      openModal('mkdir', { currentPath: filesData.currentPath, callback: () => fetchFiles(filesData.currentPath) });
    } else if (action === 'mkfile') {
      openModal('mkfile', { currentPath: filesData.currentPath, callback: () => fetchFiles(filesData.currentPath) });
    } else if (selectedPaths.length > 0) {
      if (action === 'rename' && selectedPaths.length === 1) {
        const name = selectedPaths[0].replace(/\\/g, '/').split('/').pop();
        openModal('rename', { 
          currentPath: filesData.currentPath, 
          oldName: name, 
          callback: () => fetchFiles(filesData.currentPath) 
        });
      } else if (action === 'delete' || action === 'delete-permanent') {
        openModal(action, { 
          paths: selectedPaths, 
          callback: () => fetchFiles(filesData.currentPath) 
        });
      }
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, item) => {
    // Determine path(s) to drag
    let pathsToDrag = [];
    if (!selectedNames.has(item.name)) {
      pathsToDrag = [item.path];
    } else {
      pathsToDrag = Array.from(selectedNames).map(name => {
        const f = filesData.items.find(i => i.name === name);
        return f ? f.path : '';
      }).filter(Boolean);
    }

    // Support native Electron drag-out to external OS apps
    if (window.electron && window.electron.startDrag) {
      e.preventDefault();
      window.electron.startDrag(pathsToDrag);
      return;
    }

    // Custom drag image for internal HTML5 drag-and-drop between panes
    try {
      const ghost = document.createElement('div');
      ghost.style.position = 'absolute';
      ghost.style.top = '-1000px';
      ghost.style.left = '-1000px';
      ghost.style.display = 'flex';
      ghost.style.alignItems = 'center';
      ghost.style.gap = '8px';
      ghost.style.padding = '6px 12px';
      ghost.style.background = '#0f172a'; // Solid slate-900 for high-contrast visibility
      ghost.style.color = '#ffffff'; // White text
      ghost.style.border = '1px solid #38bdf8'; // Sky blue border highlight
      ghost.style.borderRadius = '6px';
      ghost.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)';
      ghost.style.fontFamily = 'sans-serif';
      ghost.style.fontSize = '12px';
      ghost.style.fontWeight = '500';
      ghost.style.whiteSpace = 'nowrap';
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '9999';

      // Load the exact same PNG drag icons
      const img = document.createElement('img');
      img.src = item.isDirectory ? '/drag_folder.png' : '/drag_file.png';
      img.style.width = '32px';
      img.style.height = '32px';
      img.style.objectFit = 'contain';
      ghost.appendChild(img);

      const textSpan = document.createElement('span');
      if (pathsToDrag.length <= 1) {
        textSpan.textContent = item.name;
      } else {
        textSpan.textContent = `${item.name} (+${pathsToDrag.length - 1} tệp)`;
      }
      ghost.appendChild(textSpan);

      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 20, 20);

      setTimeout(() => {
        if (document.body.contains(ghost)) {
          document.body.removeChild(ghost);
        }
      }, 0);
    } catch (err) {
      console.error('Failed to set drag image:', err);
    }

    // Fallback: internal HTML5 drag-and-drop between panes
    e.dataTransfer.setData('application/json', JSON.stringify({
      sourcePaths: pathsToDrag,
      sourcePaneId: paneId
    }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    // Support native OS / third-party drop-in file imports
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const externalPaths = files.map(f => f.path).filter(Boolean);
      
      if (externalPaths.length > 0) {
        try {
          setLoading(true);
          const res = await fetch('/api/copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sources: externalPaths, destinationDir: filesData.currentPath })
          });
          const resData = await res.json();
          if (!res.ok) {
            throw new Error(resData.error || 'Failed to copy external files');
          }
          window.dispatchEvent(new CustomEvent('refresh-all-panes'));
        } catch (err) {
          alert(`Lỗi kéo thả từ ứng dụng ngoài: ${err.message}`);
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    // Fallback: internal HTML5 drop-in between panes
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data && data.sourcePaths && data.sourcePaneId !== paneId) {
        // Trigger modal drop action in App container
        onFileDrop(data.sourcePaths, filesData.currentPath);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Path Input Submission
  const handlePathSubmit = (e) => {
    if (e.key === 'Enter') {
      setIsEditingPath(false);
      navigateTo(pathInput, true);
    } else if (e.key === 'Escape') {
      setIsEditingPath(false);
      setPathInput(filesData.currentPath);
    }
  };

  const handleFilterKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!filterQuery.trim()) {
        setIsSearchingRecursively(false);
        setSearchResults([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?path=${encodeURIComponent(filesData.currentPath)}&query=${encodeURIComponent(filterQuery)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Search failed');
        setSearchResults(data);
        setIsSearchingRecursively(true);
      } catch (err) {
        setError(err.message);
        setIsSearchingRecursively(false);
      } finally {
        setLoading(false);
      }
    }
  };

  // External actions exposed (like refresh, path trigger)
  useEffect(() => {
    const handleRefresh = (e) => {
      if (e.detail && e.detail.action === 'refresh') {
        fetchFiles(filesData.currentPath);
      }
    };
    window.addEventListener(`refresh-pane-${paneId}`, handleRefresh);
    return () => window.removeEventListener(`refresh-pane-${paneId}`, handleRefresh);
  }, [paneId, filesData.currentPath]);

  // Listen to global refresh event for all panes
  useEffect(() => {
    const handleRefreshAll = () => {
      fetchFiles(filesData.currentPath);
    };
    window.addEventListener('refresh-all-panes', handleRefreshAll);
    return () => window.removeEventListener('refresh-all-panes', handleRefreshAll);
  }, [filesData.currentPath]);

  // Public navigate interface
  window[`navigatePane_${paneId}`] = (newPath) => {
    navigateTo(newPath);
  };

  // Statistics calculation
  const sortedItems = getSortedItems();
  const selectedCount = selectedNames.size;
  let selectedSize = 0;
  selectedNames.forEach(name => {
    const item = filesData.items.find(i => i.name === name);
    if (item && !item.isDirectory) {
      selectedSize += item.size;
    }
  });

  return (
    <div
      ref={paneRef}
      className={`file-pane ${isActive ? 'active-pane' : ''}`}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: 'none' }}
      onContextMenu={handleAreaContextMenu}
    >
      {/* Tabs list bar */}
      <div className="pane-tabs-row">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`pane-tab ${activeTabId === tab.id ? 'active-tab' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onActivate();
              setActiveTabId(tab.id);
            }}
          >
            <span className="pane-tab-title">{tab.name}</span>
            {tabs.length > 1 && (
              <button
                className="close-tab-btn"
                onClick={(e) => closeTab(tab.id, e)}
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}
        <button
          className="add-tab-btn"
          title="Open new tab"
          onClick={() => addTab(filesData.currentPath)}
        >
          <Plus size={14} />
        </button>

        {/* Tab-row right-side quick widgets */}
        <div className="pane-tabs-widgets" onClick={(e) => e.stopPropagation()}>
          <button
            className="pane-tab-widget-btn"
            title={hasLastFolder ? `Khôi phục thư mục phiên trước: ${restorablePath}` : "Không có lịch sử khôi phục"}
            onClick={restoreLastFolder}
            disabled={!hasLastFolder}
          >
            <History size={14} />
          </button>

          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              className={`pane-tab-widget-btn ${viewMode !== 'text' ? 'active' : ''}`}
              title="Thay đổi chế độ xem (View Mode)"
              onClick={(e) => { e.stopPropagation(); setViewMenuOpen(!viewMenuOpen); }}
            >
              {viewMode === 'text' ? <List size={14} /> : <Grid size={14} />}
            </button>
            {viewMenuOpen && (
              <div className="context-menu glass" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 100 }}>
                <div className={`context-menu-item ${viewMode === 'text' ? 'active' : ''}`} onClick={() => handleViewModeChange('text')}>
                  <List size={14} style={{ marginRight: 8 }} /> Chi tiết (Chỉ chữ)
                </div>
                <div className={`context-menu-item ${viewMode === 'grid-small' ? 'active' : ''}`} onClick={() => handleViewModeChange('grid-small')}>
                  <Grid size={14} style={{ marginRight: 8 }} /> Ảnh nhỏ
                </div>
                <div className={`context-menu-item ${viewMode === 'grid-medium' ? 'active' : ''}`} onClick={() => handleViewModeChange('grid-medium')}>
                  <Grid size={14} style={{ marginRight: 8 }} /> Ảnh vừa
                </div>
                <div className={`context-menu-item ${viewMode === 'grid-large' ? 'active' : ''}`} onClick={() => handleViewModeChange('grid-large')}>
                  <Grid size={14} style={{ marginRight: 8 }} /> Ảnh lớn
                </div>
              </div>
            )}
          </div>
          
          <button
            className="pane-tab-widget-btn"
            title="Folder Menu (Actions/New/Paste/Refresh)"
            onClick={handleHeaderMenuClick}
          >
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* Pane specific Drives Letter list toolbar */}
      <div className="drive-letter-toolbar">
        {drives.map((drive) => {
          const letter = drive.DeviceID;
          const isActiveDrive = filesData.currentPath.toLowerCase().startsWith(letter.toLowerCase());
          
          const size = Number(drive.Size) || 0;
          const free = Number(drive.FreeSpace) || 0;
          const used = size - free;
          const percentUsed = size > 0 ? (used / size) * 100 : 0;
          
          // Determine color scheme based on space usage
          let color = '#3b82f6'; // Blue for low usage (<50%)
          let bg = isActiveDrive ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.04)';
          let border = isActiveDrive ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.2)';
          
          if (size > 0) {
            if (percentUsed > 80) {
              color = '#ef4444'; // Red for critical usage (>80%)
              bg = isActiveDrive ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.05)';
              border = isActiveDrive ? 'rgba(239, 68, 68, 0.6)' : 'rgba(239, 68, 68, 0.25)';
            } else if (percentUsed > 50) {
              color = '#f59e0b'; // Amber/Yellow for warning usage (50%-80%)
              bg = isActiveDrive ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.05)';
              border = isActiveDrive ? 'rgba(245, 158, 11, 0.6)' : 'rgba(245, 158, 11, 0.25)';
            }
          }
          
          const driveStyleVars = {
            '--drive-bg': bg,
            '--drive-border': border,
            '--drive-color': color
          };

          return (
            <button
              key={letter}
              className={`drive-letter-btn ${isActiveDrive ? 'active' : ''}`}
              onClick={() => {
                onActivate();
                navigateTo(letter.endsWith('\\') ? letter : letter + '\\');
              }}
              title={drive.VolumeName ? `${drive.VolumeName} (${letter})` : `Local Disk (${letter})`}
              style={driveStyleVars}
            >
              <HardDrive size={13} style={{ color: isActiveDrive ? color : 'var(--text-inactive)', opacity: 0.9 }} />
              <div className="drive-btn-info">
                <span className="drive-btn-name" style={{ color: isActiveDrive ? 'var(--text-main)' : undefined }}>
                  {drive.VolumeName ? `${drive.VolumeName} (${letter})` : `Local Disk (${letter})`}
                </span>
                {size > 0 && (
                  <span className="drive-btn-space">
                    {formatBytes(free)} trống / {formatBytes(size)}
                  </span>
                )}
              </div>
              {size > 0 && (
                <div className="drive-btn-progress-bar">
                  <div className="drive-btn-progress-fill" style={{ width: `${percentUsed}%`, backgroundColor: color }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Pane Navigation bar */}
      <div className="pane-nav-bar">
        <button
          className="nav-history-btn"
          title="Back"
          onClick={goBack}
          disabled={activeTab.historyIndex === 0}
        >
          <ArrowLeft size={16} />
        </button>
        <button
          className="nav-history-btn"
          title="Forward"
          onClick={goForward}
          disabled={activeTab.historyIndex === activeTab.history.length - 1}
        >
          <ArrowRight size={16} />
        </button>
        <button
          className="nav-history-btn"
          title="Up (Parent folder)"
          onClick={goUp}
          disabled={!filesData.parentPath}
        >
          <ArrowUp size={16} />
        </button>


        <div className="path-input-container" onClick={() => { if (!isEditingPath) setIsEditingPath(true); }}>
          {isEditingPath ? (
            <input
              type="text"
              className="path-input"
              value={pathInput}
              onChange={(e) => setPathInput(e.target.value)}
              onFocus={() => setIsEditingPath(true)}
              onBlur={() => setTimeout(() => setIsEditingPath(false), 250)}
              onKeyDown={handlePathSubmit}
              autoFocus
            />
          ) : (
            <div className="breadcrumbs-trail">
              {filesData.breadcrumbs && filesData.breadcrumbs.length > 0 ? (
                filesData.breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={crumb.path}>
                    <button
                      className="breadcrumb-segment"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateTo(crumb.path);
                      }}
                    >
                      {crumb.name}
                    </button>
                    {idx < filesData.breadcrumbs.length - 1 && (
                      <span className="breadcrumb-separator">
                        <ChevronRight size={12} />
                      </span>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <span className="breadcrumb-fallback">{filesData.currentPath}</span>
              )}
            </div>
          )}
        </div>

        <div className="filter-input-container">
          <Search size={14} className="filter-icon" />
          <input
            type="text"
            placeholder="Quick Filter (Enter to search deep)..."
            className="filter-input"
            value={filterQuery}
            onChange={(e) => {
              setFilterQuery(e.target.value);
              if (!e.target.value) {
                setIsSearchingRecursively(false);
                setSearchResults([]);
              }
            }}
            onKeyDown={handleFilterKeyDown}
            style={{ paddingRight: isSearchingRecursively ? '24px' : '10px' }}
          />
          {isSearchingRecursively && (
            <button 
              className="close-tab-btn" 
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, padding: 0 }}
              onClick={() => {
                setFilterQuery('');
                setIsSearchingRecursively(false);
                setSearchResults([]);
              }}
              title="Clear search results"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* File List Content Area */}
      <div 
        className={`pane-content-area scrollable ${loading ? 'loading-state' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleEmptyAreaClick}
        onMouseDown={handleAreaMouseDown}
        style={{ position: 'relative' }}
      >
        {dragSelect && (
          <div style={{
            position: 'fixed',
            left: Math.min(dragSelect.startX, dragSelect.currentX),
            top: Math.min(dragSelect.startY, dragSelect.currentY),
            width: Math.abs(dragSelect.currentX - dragSelect.startX),
            height: Math.abs(dragSelect.currentY - dragSelect.startY),
            backgroundColor: 'rgba(56, 189, 248, 0.2)',
            border: '1px solid rgba(56, 189, 248, 0.6)',
            pointerEvents: 'none',
            zIndex: 9999
          }} />
        )}
        {/* Animated loading bar at the top of active loading pane */}
        {loading && <div className="pane-loading-bar" />}

        {error ? (
          <div className="pane-error-message">
            <AlertTriangle className="pane-error-icon" size={32} />
            <p style={{ fontWeight: 500, color: 'var(--text-main)' }}>Access Denied or Directory Error</p>
            <p style={{ fontSize: '11px', maxWidth: '300px' }}>{error}</p>
          </div>
        ) : sortedItems.length === 0 ? (
          loading ? (
            <div className="empty-folder-message" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-inactive)', fontSize: '13px' }}>
              Scanning folder content...
            </div>
          ) : (
            <div className="empty-folder-message" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-inactive)', fontSize: '13px', fontStyle: 'italic' }}>
              Empty Folder
            </div>
          )
        ) : viewMode === 'text' ? (
          <table className="file-table" style={{ opacity: loading ? 0.75 : 1, transition: 'opacity 0.15s ease' }}>
            <thead>
              <tr>
                <th onClick={() => handleSort('name')}>
                  Name {sortKey === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th style={{ width: '80px', textAlign: 'right' }} onClick={() => handleSort('size')}>
                  Size {sortKey === 'size' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th style={{ width: '130px' }} onClick={() => handleSort('mtime')}>
                  Date Modified {sortKey === 'mtime' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th style={{ width: '60px' }} onClick={() => handleSort('ext')}>
                  Type {sortKey === 'ext' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Parent folder shortcut if parent path is available */}
              {filesData.parentPath && !filterQuery && (
                <tr onDoubleClick={goUp}>
                  <td colSpan={4} className="file-item-name-cell" style={{ color: 'var(--accent-color)' }}>
                    <Folder size={16} className="file-icon folder" style={{ color: 'var(--accent-color)' }} />
                    <span>.. (Parent Folder)</span>
                  </td>
                </tr>
              )}

              {sortedItems.map((item, idx) => {
                const isSelected = selectedNames.has(item.name);
                const isFocused = idx === focusedIndex;
                const isCopied = clipboard.type === 'copy' && clipboard.paths.includes(item.path);
                const isCut = clipboard.type === 'cut' && clipboard.paths.includes(item.path);
                
                return (
                  <tr
                    key={item.name}
                    data-name={item.name}
                    className={`${isSelected ? 'selected' : ''} ${isFocused ? 'active-selection' : ''} ${item.isHidden ? 'file-hidden' : ''} ${isCopied ? 'copied-highlight' : ''} ${isCut ? 'cut-highlight' : ''}`}
                    onClick={(e) => handleItemClick(item, idx, e)}
                    onDoubleClick={() => handleItemDoubleClick(item)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onContextMenu={(e) => handleRowContextMenu(item, idx, e)}
                  >
                    <td className="file-item-name-cell">
                      {getFileIcon(item)}
                      <span className="sidebar-item-text" title={item.name}>
                        {(showExtensions || item.isDirectory || !item.ext) ? item.name : item.name.slice(0, item.name.length - item.ext.length) || item.name}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {item.isDirectory ? '<DIR>' : formatSize(item.size)}
                    </td>
                    <td>
                      {new Date(item.mtime).toLocaleString()}
                    </td>
                    <td>
                      {item.isDirectory ? 'Folder' : item.ext.toUpperCase().replace('.', '') || 'File'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div 
            className={`file-grid ${viewMode}`}
            style={{ opacity: loading ? 0.75 : 1, transition: 'opacity 0.15s ease' }}
          >
            {/* Parent folder shortcut for Grid view */}
            {filesData.parentPath && !filterQuery && (
              <div 
                className="grid-item parent-folder-grid" 
                onDoubleClick={goUp}
                style={{ color: 'var(--accent-color)' }}
              >
                <div className="grid-item-thumbnail-wrapper">
                  <Folder className="file-icon folder" size={viewMode === 'grid-small' ? 32 : viewMode === 'grid-medium' ? 48 : 64} style={{ color: 'var(--accent-color)' }} />
                </div>
                <span className="grid-item-name">.. (Parent Folder)</span>
              </div>
            )}

            {sortedItems.map((item, idx) => {
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
                  onClick={(e) => handleItemClick(item, idx, e)}
                  onDoubleClick={() => handleItemDoubleClick(item)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onContextMenu={(e) => handleRowContextMenu(item, idx, e)}
                >
                  <div className="grid-item-thumbnail-wrapper">
                    {getGridItemMedia(item, sizeLabel)}
                  </div>
                  <span className="grid-item-name" title={item.name}>
                    {(showExtensions || item.isDirectory || !item.ext) ? item.name : item.name.slice(0, item.name.length - item.ext.length) || item.name}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pane selection footer summary */}
      <div className="pane-footer">
        <span>Total: {filesData.items.length} items</span>
        {selectedCount > 0 && (
          <span style={{ color: 'var(--accent-color)', fontWeight: 500 }}>
            Selected: {selectedCount} items ({selectedCount === 1 && filesData.items.find(i => selectedNames.has(i.name))?.isDirectory ? 'Folder' : formatSize(selectedSize)})
          </span>
        )}
      </div>

      {/* Custom Context Menu Dropdown */}
      {contextMenu.isOpen && (
        <div 
          ref={contextMenuRef}
          className="context-menu glass"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.targetItem ? (
            <>
              <div className="context-menu-item" onClick={() => { handleItemDoubleClick(contextMenu.targetItem); setContextMenu(prev => ({ ...prev, isOpen: false })); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ExternalLink size={14} /> <span>Open</span></div>
              </div>
              <div className="context-menu-item" onClick={() => handleRevealInExplorer(contextMenu.targetItem.path)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Compass size={14} /> <span>Show in Explorer</span></div>
              </div>
              <div className="context-menu-item" onClick={() => handleCopyPath(contextMenu.targetItem.path)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Copy size={14} /> <span>Copy Path</span></div>
              </div>
              <div className="context-menu-divider" />
              <div className="context-menu-item" onClick={() => handleContextMenuAction('copy')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Copy size={14} /> <span>Copy</span></div>
                <span className="context-menu-shortcut">Ctrl+C</span>
              </div>
              <div className="context-menu-item" onClick={() => handleContextMenuAction('cut')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Scissors size={14} /> <span>Cut</span></div>
                <span className="context-menu-shortcut">Ctrl+X</span>
              </div>
              {contextMenu.targetItem.isDirectory && (
                <>
                  <div className="context-menu-item" onClick={() => handleContextMenuAction('bookmark-item')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bookmark size={14} /> <span>Add to Bookmarks</span></div>
                  </div>
                  <div className="context-menu-item" onClick={() => handleCalculateSize(contextMenu.targetItem)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calculator size={14} /> <span>Calculate Folder Size</span></div>
                  </div>
                </>
              )}
              <div className="context-menu-divider" />
              <div className="context-menu-item" onClick={() => { setContextMenu(prev => ({ ...prev, isOpen: false })); triggerFileAction('rename'); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Edit size={14} /> <span>Rename</span></div>
                <span className="context-menu-shortcut">F2</span>
              </div>
              <div className="context-menu-item danger" onClick={() => { setContextMenu(prev => ({ ...prev, isOpen: false })); triggerFileAction('delete'); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Trash2 size={14} /> <span>Delete</span></div>
                <span className="context-menu-shortcut">Del</span>
              </div>
              <div className="context-menu-item danger" onClick={() => { setContextMenu(prev => ({ ...prev, isOpen: false })); triggerFileAction('delete-permanent'); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Trash size={14} /> <span>Permanent Delete</span></div>
                <span className="context-menu-shortcut">Shift+Del</span>
              </div>
              <div className="context-menu-divider" />
              <div className="context-menu-item" onClick={() => handleContextMenuAction('zip')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Archive size={14} /> <span>Compress to ZIP</span></div>
              </div>
              {contextMenu.targetItem.ext === '.zip' && (
                <div className="context-menu-item" onClick={() => handleContextMenuAction('unzip')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FolderOpen size={14} /> <span>Extract ZIP Here</span></div>
                </div>
              )}

              {/* External explorer-like options */}
              {(shellApps.terminal.available || shellApps.vscode.available || shellApps.antigravity.available || shellApps.winrar.available) && (
                <>
                  <div className="context-menu-divider" />
                  {shellApps.terminal.available && (
                    <div className="context-menu-item" onClick={() => handleOpenWith('terminal', 'open', contextMenu.targetItem.path)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Terminal size={14} /> <span>Open Terminal here</span></div>
                    </div>
                  )}
                  {shellApps.vscode.available && (
                    <div className="context-menu-item" onClick={() => handleOpenWith('vscode', 'open', contextMenu.targetItem.path)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code size={14} /> <span>Open with VS Code</span></div>
                    </div>
                  )}
                  {shellApps.antigravity.available && (
                    <div className="context-menu-item" onClick={() => handleOpenWith('antigravity', 'open', contextMenu.targetItem.path)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Cpu size={14} /> <span>Open with Antigravity IDE</span></div>
                    </div>
                  )}
                  {shellApps.winrar.available && (
                    <>
                      <div className="context-menu-item" onClick={() => handleOpenWith('winrar', 'compress', contextMenu.targetItem.path)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Archive size={14} /> <span>WinRAR: Compress to "{contextMenu.targetItem.ext ? contextMenu.targetItem.name.slice(0, -contextMenu.targetItem.ext.length) : contextMenu.targetItem.name}.rar"</span></div>
                      </div>
                      {['.rar', '.zip', '.7z', '.tar', '.gz', '.tgz', '.bz2', '.cab', '.iso'].includes(contextMenu.targetItem.ext) && (
                        <>
                          <div className="context-menu-item" onClick={() => handleOpenWith('winrar', 'open', contextMenu.targetItem.path)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Archive size={14} /> <span>WinRAR: Open with WinRAR</span></div>
                          </div>
                          <div className="context-menu-item" onClick={() => handleOpenWith('winrar', 'extract-here', contextMenu.targetItem.path)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FolderOpen size={14} /> <span>WinRAR: Extract Here</span></div>
                          </div>
                          <div className="context-menu-item" onClick={() => handleOpenWith('winrar', 'extract-to', contextMenu.targetItem.path)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FolderOpen size={14} /> <span>WinRAR: Extract to "{contextMenu.targetItem.ext ? contextMenu.targetItem.name.slice(0, -contextMenu.targetItem.ext.length) : contextMenu.targetItem.name}\"</span></div>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <div className="context-menu-item" onClick={() => { setContextMenu(prev => ({ ...prev, isOpen: false })); triggerFileAction('mkdir'); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FolderPlus size={14} /> <span>New Folder</span></div>
                <span className="context-menu-shortcut">F7</span>
              </div>
              <div className="context-menu-item" onClick={() => { setContextMenu(prev => ({ ...prev, isOpen: false })); triggerFileAction('mkfile'); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FilePlus size={14} /> <span>New File</span></div>
              </div>
              <div className="context-menu-divider" />
              <div className="context-menu-item" onClick={() => { 
                setContextMenu(prev => ({ ...prev, isOpen: false })); 
                let name = filesData.currentPath;
                const parsed = name.replace(/\\/g, '/');
                const parts = parsed.split('/').filter(Boolean);
                if (parts.length > 0) name = parts[parts.length - 1];
                openModal('bookmark', { name, path: filesData.currentPath }); 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Star size={14} /> <span>Add Current Folder to Bookmarks</span></div>
              </div>
              <div className="context-menu-divider" />
              <div className="context-menu-item" onClick={() => handleRevealInExplorer(filesData.currentPath)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Compass size={14} /> <span>Show in Explorer</span></div>
              </div>
              <div className="context-menu-item" onClick={() => handleCopyPath(filesData.currentPath)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Copy size={14} /> <span>Copy Path</span></div>
              </div>
              <div className="context-menu-divider" />
              {shellApps.terminal.available && (
                <div className="context-menu-item" onClick={() => handleOpenWith('terminal', 'open', filesData.currentPath)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Terminal size={14} /> <span>Open Terminal here</span></div>
                </div>
              )}
              {shellApps.vscode.available && (
                <div className="context-menu-item" onClick={() => handleOpenWith('vscode', 'open', filesData.currentPath)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Code size={14} /> <span>Open Folder in VS Code</span></div>
                </div>
              )}
              {shellApps.antigravity.available && (
                <div className="context-menu-item" onClick={() => handleOpenWith('antigravity', 'open', filesData.currentPath)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Cpu size={14} /> <span>Open Folder in Antigravity IDE</span></div>
                </div>
              )}
              {(shellApps.terminal.available || shellApps.vscode.available || shellApps.antigravity.available) && (
                <div className="context-menu-divider" />
              )}
              <div 
                className={`context-menu-item ${clipboard.paths.length === 0 ? 'disabled' : ''}`} 
                onClick={() => { if (clipboard.paths.length > 0) handleContextMenuAction('paste'); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardPaste size={14} /> <span>Paste</span></div>
                <span className="context-menu-shortcut">Ctrl+V</span>
              </div>
              <div className="context-menu-divider" />
              <div className="context-menu-item" onClick={() => { fetchFiles(filesData.currentPath); setContextMenu(prev => ({ ...prev, isOpen: false })); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCw size={14} /> <span>Refresh</span></div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Pane;
