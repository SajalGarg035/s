import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    FiFolder, 
    FiFolderPlus, 
    FiFile, 
    FiFilePlus, 
    FiTrash2, 
    FiDownload, 
    FiUpload,
    FiRefreshCw,
    FiChevronRight,
    FiChevronDown,
    FiMoreVertical,
    FiSearch,
    FiX,
    FiGrid,
    FiList,
    FiSortAsc,
    FiSortDesc,
    FiClock,
    FiHardDrive,
    FiEdit2,
    FiCopy,
    FiMove,
    FiEye,
    FiFilter
} from 'react-icons/fi';

const FileExplorer = ({ socketRef, roomId, containerId, onFileSelect }) => {
    const [files, setFiles] = useState([]);
    const [currentPath, setCurrentPath] = useState('/workspace');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedFolders, setExpandedFolders] = useState(new Set(['/workspace']));
    const [selectedFiles, setSelectedFiles] = useState(new Set());
    const [contextMenu, setContextMenu] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createType, setCreateType] = useState('file');
    const [createName, setCreateName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
    const [sortBy, setSortBy] = useState('name'); // 'name', 'date', 'size', 'type'
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
    const [showHidden, setShowHidden] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [breadcrumbs, setBreadcrumbs] = useState([]);
    const fileInputRef = useRef(null);
    const contextMenuRef = useRef(null);

    // Fetch file tree
    const fetchFileTree = useCallback(async (path = '/workspace') => {
        if (!socketRef.current || !containerId) return;

        setLoading(true);
        setError(null);

        try {
            socketRef.current.emit('docker:get-file-tree', {
                roomId,
                containerId,
                path
            });
        } catch (err) {
            setError('Failed to fetch file tree');
            console.error('Error fetching file tree:', err);
        } finally {
            setLoading(false);
        }
    }, [socketRef, roomId, containerId]);

    // Generate breadcrumbs from path
    const generateBreadcrumbs = useCallback((path) => {
        const parts = path.split('/').filter(Boolean);
        const crumbs = [{ name: 'workspace', path: '/workspace' }];
        
        let currentPath = '/workspace';
        for (const part of parts.slice(1)) {
            currentPath += `/${part}`;
            crumbs.push({ name: part, path: currentPath });
        }
        
        return crumbs;
    }, []);

    // Filter and sort files
    const processFiles = useCallback((fileList) => {
        let processed = [...fileList];

        // Filter by search query
        if (searchQuery) {
            processed = processed.filter(file =>
                file.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filter hidden files
        if (!showHidden) {
            processed = processed.filter(file => !file.name.startsWith('.'));
        }

        // Sort files
        processed.sort((a, b) => {
            let comparison = 0;
            
            // Always put directories first
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }

            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'size':
                    comparison = (a.size || 0) - (b.size || 0);
                    break;
                case 'date':
                    comparison = new Date(a.modified || 0) - new Date(b.modified || 0);
                    break;
                case 'type':
                    const extA = a.name.split('.').pop() || '';
                    const extB = b.name.split('.').pop() || '';
                    comparison = extA.localeCompare(extB);
                    break;
                default:
                    comparison = a.name.localeCompare(b.name);
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return processed;
    }, [searchQuery, showHidden, sortBy, sortOrder]);

    // Socket event listeners
    useEffect(() => {
        if (!socketRef.current) return;

        const handleFileTree = ({ files: newFiles, path }) => {
            console.log('📁 Received file tree:', newFiles);
            setFiles(newFiles || []);
            setCurrentPath(path || '/workspace');
            setBreadcrumbs(generateBreadcrumbs(path || '/workspace'));
            setLoading(false);
        };

        const handleFileError = ({ error: errorMsg, operation }) => {
            console.error('❌ File operation error:', errorMsg, operation);
            setError(errorMsg);
            setLoading(false);
        };

        const handleFileCreated = ({ path, type }) => {
            console.log('✅ File created:', path, type);
            fetchFileTree(currentPath);
        };

        const handleFileDeleted = ({ path }) => {
            console.log('🗑️ File deleted:', path);
            fetchFileTree(currentPath);
        };

        const handleFileSaved = ({ path, success }) => {
            if (success) {
                console.log('💾 File saved:', path);
                fetchFileTree(currentPath);
            }
        };

        socketRef.current.on('docker:file-tree', handleFileTree);
        socketRef.current.on('docker:file-error', handleFileError);
        socketRef.current.on('docker:file-created', handleFileCreated);
        socketRef.current.on('docker:file-deleted', handleFileDeleted);
        socketRef.current.on('docker:file-saved', handleFileSaved);

        return () => {
            if (socketRef.current) {
                socketRef.current.off('docker:file-tree', handleFileTree);
                socketRef.current.off('docker:file-error', handleFileError);
                socketRef.current.off('docker:file-created', handleFileCreated);
                socketRef.current.off('docker:file-deleted', handleFileDeleted);
                socketRef.current.off('docker:file-saved', handleFileSaved);
            }
        };
    }, [socketRef, fetchFileTree, currentPath, generateBreadcrumbs]);

    // Initial load
    useEffect(() => {
        if (containerId) {
            fetchFileTree();
        }
    }, [containerId, fetchFileTree]);

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
                setContextMenu(null);
            }
        };

        if (contextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [contextMenu]);

    // Handle file/folder actions
    const handleFileClick = (file, event) => {
        if (event.ctrlKey || event.metaKey) {
            // Multi-select
            const newSelected = new Set(selectedFiles);
            if (newSelected.has(file.path)) {
                newSelected.delete(file.path);
            } else {
                newSelected.add(file.path);
            }
            setSelectedFiles(newSelected);
            return;
        }

        setSelectedFiles(new Set([file.path]));

        if (file.type === 'directory') {
            const isExpanded = expandedFolders.has(file.path);
            const newExpanded = new Set(expandedFolders);
            
            if (isExpanded) {
                newExpanded.delete(file.path);
            } else {
                newExpanded.add(file.path);
                fetchFileTree(file.path);
            }
            
            setExpandedFolders(newExpanded);
        } else {
            // Open file in editor
            if (onFileSelect && typeof onFileSelect === 'function') {
                onFileSelect({
                    name: file.name || 'untitled',
                    path: file.path || '',
                    type: file.type || 'file',
                    size: file.size || 0
                });
            }
            
            // Request file content
            if (socketRef.current) {
                socketRef.current.emit('docker:read-file', {
                    roomId,
                    containerId,
                    path: file.path
                });
            }
        }
    };

    const handleCreateFile = () => {
        if (!createName.trim()) return;

        const filePath = `${currentPath}/${createName}`.replace(/\/+/g, '/');
        
        socketRef.current?.emit('docker:create-file', {
            roomId,
            containerId,
            path: filePath,
            type: createType,
            content: createType === 'file' ? '' : undefined
        });

        setShowCreateModal(false);
        setCreateName('');
    };

    const handleDeleteFile = (file) => {
        if (window.confirm(`Are you sure you want to delete ${file.name}?`)) {
            socketRef.current?.emit('docker:delete-file', {
                roomId,
                containerId,
                path: file.path
            });
        }
        setContextMenu(null);
    };

    const handleDownloadFile = (file) => {
        if (file.type === 'file') {
            socketRef.current?.emit('docker:download-file', {
                roomId,
                containerId,
                path: file.path
            });
        }
        setContextMenu(null);
    };

    const handleContextMenu = (e, file) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            file
        });
    };

    const handleBreadcrumbClick = (path) => {
        setCurrentPath(path);
        fetchFileTree(path);
    };

    const handleFileUpload = (event) => {
        const files = Array.from(event.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                socketRef.current?.emit('docker:upload-file', {
                    roomId,
                    containerId,
                    fileName: file.name,
                    content: e.target.result,
                    path: currentPath
                });
            };
            reader.readAsText(file);
        });
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        
        const files = Array.from(e.dataTransfer.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                socketRef.current?.emit('docker:upload-file', {
                    roomId,
                    containerId,
                    fileName: file.name,
                    content: event.target.result,
                    path: currentPath
                });
            };
            reader.readAsText(file);
        });
    };

    const getFileIcon = (file) => {
        if (file.type === 'directory') {
            return <FiFolder size={16} className="file-icon directory" />;
        }
        
        const ext = file.name.split('.').pop()?.toLowerCase();
        const iconMap = {
            'js': '🟨',
            'jsx': '⚛️',
            'ts': '🔷',
            'tsx': '⚛️',
            'py': '🐍',
            'cpp': '⚙️',
            'c': '⚙️',
            'java': '☕',
            'html': '🌐',
            'css': '🎨',
            'json': '📋',
            'md': '📝',
            'txt': '📄',
            'png': '🖼️',
            'jpg': '🖼️',
            'gif': '🖼️',
            'pdf': '📕'
        };
        
        return iconMap[ext] || '📄';
    };

    const formatFileSize = (size) => {
        if (size === null || size === undefined) return '';
        if (size < 1024) return `${size}B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
        return `${(size / (1024 * 1024)).toFixed(1)}MB`;
    };

    const processedFiles = processFiles(files);

    return (
        <div 
            className={`file-explorer ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Header */}
            <div className="file-explorer-header">
                <div className="header-top">
                    <div className="file-explorer-title">
                        <FiFolder size={16} />
                        <span>Explorer</span>
                        <span className="file-count">({processedFiles.length})</span>
                    </div>
                    <div className="header-actions">
                        <button
                            onClick={() => {
                                setCreateType('file');
                                setShowCreateModal(true);
                            }}
                            className="action-btn"
                            title="New File"
                        >
                            <FiFilePlus size={14} />
                        </button>
                        <button
                            onClick={() => {
                                setCreateType('directory');
                                setShowCreateModal(true);
                            }}
                            className="action-btn"
                            title="New Folder"
                        >
                            <FiFolderPlus size={14} />
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="action-btn"
                            title="Upload Files"
                        >
                            <FiUpload size={14} />
                        </button>
                        <button
                            onClick={() => fetchFileTree(currentPath)}
                            className="action-btn"
                            title="Refresh"
                            disabled={loading}
                        >
                            <FiRefreshCw size={14} className={loading ? 'spinning' : ''} />
                        </button>
                    </div>
                </div>

                {/* Breadcrumbs */}
                <div className="breadcrumbs">
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={crumb.path}>
                            <button
                                onClick={() => handleBreadcrumbClick(crumb.path)}
                                className="breadcrumb-item"
                            >
                                {crumb.name}
                            </button>
                            {index < breadcrumbs.length - 1 && (
                                <FiChevronRight size={12} className="breadcrumb-separator" />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Search and Controls */}
                <div className="controls-row">
                    <div className="search-container">
                        <FiSearch size={14} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="clear-search"
                            >
                                <FiX size={12} />
                            </button>
                        )}
                    </div>

                    <div className="view-controls">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            title="List view"
                        >
                            <FiList size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            title="Grid view"
                        >
                            <FiGrid size={14} />
                        </button>
                    </div>
                </div>

                {/* Sort Controls */}
                <div className="sort-controls">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="sort-select"
                    >
                        <option value="name">Name</option>
                        <option value="date">Date</option>
                        <option value="size">Size</option>
                        <option value="type">Type</option>
                    </select>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="sort-order-btn"
                        title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                    >
                        {sortOrder === 'asc' ? <FiSortAsc size={14} /> : <FiSortDesc size={14} />}
                    </button>
                    <button
                        onClick={() => setShowHidden(!showHidden)}
                        className={`filter-btn ${showHidden ? 'active' : ''}`}
                        title="Show hidden files"
                    >
                        <FiFilter size={14} />
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="file-explorer-error">
                    ❌ {error}
                    <button onClick={() => setError(null)} className="error-close">
                        <FiX size={12} />
                    </button>
                </div>
            )}

            {/* File List */}
            <div className="file-explorer-content">
                {loading && files.length === 0 ? (
                    <div className="file-explorer-loading">
                        <FiRefreshCw className="spinning" />
                        <span>Loading files...</span>
                    </div>
                ) : processedFiles.length === 0 ? (
                    <div className="file-explorer-empty">
                        {searchQuery ? (
                            <>
                                <FiSearch size={32} className="empty-icon" />
                                <p>No files match your search</p>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="clear-search-btn"
                                >
                                    Clear search
                                </button>
                            </>
                        ) : (
                            <>
                                <FiFolder size={32} className="empty-icon" />
                                <p>This folder is empty</p>
                                <button
                                    onClick={() => {
                                        setCreateType('file');
                                        setShowCreateModal(true);
                                    }}
                                    className="create-first-btn"
                                >
                                    Create your first file
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className={`file-list ${viewMode}`}>
                        {processedFiles.map((file) => (
                            <div
                                key={file.path}
                                className={`file-item ${file.type} ${selectedFiles.has(file.path) ? 'selected' : ''}`}
                                onClick={(e) => handleFileClick(file, e)}
                                onContextMenu={(e) => handleContextMenu(e, file)}
                                title={file.path}
                            >
                                <div className="file-info">
                                    <div className="file-icon-wrapper">
                                        {file.type === 'directory' && (
                                            <button
                                                className="expand-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleFileClick(file, e);
                                                }}
                                            >
                                                {expandedFolders.has(file.path) ? 
                                                    <FiChevronDown size={12} /> : 
                                                    <FiChevronRight size={12} />
                                                }
                                            </button>
                                        )}
                                        <span className="file-icon">
                                            {getFileIcon(file)}
                                        </span>
                                    </div>
                                    <div className="file-details">
                                        <span className="file-name">{file.name}</span>
                                        {viewMode === 'list' && (
                                            <div className="file-meta">
                                                {file.type === 'file' && (
                                                    <span className="file-size">
                                                        {formatFileSize(file.size)}
                                                    </span>
                                                )}
                                                {file.modified && (
                                                    <span className="file-date">
                                                        <FiClock size={10} />
                                                        {new Date(file.modified).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className="file-menu-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleContextMenu(e, file);
                                    }}
                                >
                                    <FiMoreVertical size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Selected Files Info */}
            {selectedFiles.size > 0 && (
                <div className="selection-info">
                    <span>{selectedFiles.size} item{selectedFiles.size !== 1 ? 's' : ''} selected</span>
                    <div className="selection-actions">
                        <button
                            onClick={() => {
                                selectedFiles.forEach(path => {
                                    const file = files.find(f => f.path === path);
                                    if (file) handleDownloadFile(file);
                                });
                            }}
                            className="selection-btn"
                        >
                            <FiDownload size={12} />
                        </button>
                        <button
                            onClick={() => {
                                if (window.confirm(`Delete ${selectedFiles.size} selected items?`)) {
                                    selectedFiles.forEach(path => {
                                        socketRef.current?.emit('docker:delete-file', {
                                            roomId,
                                            containerId,
                                            path
                                        });
                                    });
                                    setSelectedFiles(new Set());
                                }
                            }}
                            className="selection-btn danger"
                        >
                            <FiTrash2 size={12} />
                        </button>
                    </div>
                </div>
            )}

            {/* Context Menu */}
            {contextMenu && (
                <>
                    <div className="context-menu-overlay" onClick={() => setContextMenu(null)} />
                    <div
                        ref={contextMenuRef}
                        className="context-menu"
                        style={{
                            left: Math.min(contextMenu.x, window.innerWidth - 200),
                            top: Math.min(contextMenu.y, window.innerHeight - 200)
                        }}
                    >
                        <button
                            className="context-menu-item"
                            onClick={() => {
                                handleFileClick(contextMenu.file, {});
                                setContextMenu(null);
                            }}
                        >
                            <FiEye size={14} />
                            Open
                        </button>
                        
                        <button
                            className="context-menu-item"
                            onClick={() => {
                                setCreateName(contextMenu.file.name);
                                setShowCreateModal(true);
                                setContextMenu(null);
                            }}
                        >
                            <FiEdit2 size={14} />
                            Rename
                        </button>

                        <button
                            className="context-menu-item"
                            onClick={() => {
                                navigator.clipboard.writeText(contextMenu.file.path);
                                setContextMenu(null);
                            }}
                        >
                            <FiCopy size={14} />
                            Copy Path
                        </button>

                        <div className="context-menu-separator" />

                        {contextMenu.file.type === 'file' && (
                            <button
                                className="context-menu-item"
                                onClick={() => handleDownloadFile(contextMenu.file)}
                            >
                                <FiDownload size={14} />
                                Download
                            </button>
                        )}
                        
                        <button
                            className="context-menu-item danger"
                            onClick={() => handleDeleteFile(contextMenu.file)}
                        >
                            <FiTrash2 size={14} />
                            Delete
                        </button>
                    </div>
                </>
            )}

            {/* Create File/Folder Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create {createType === 'file' ? 'File' : 'Folder'}</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="modal-close"
                            >
                                <FiX size={16} />
                            </button>
                        </div>
                        <div className="modal-content">
                            <input
                                type="text"
                                placeholder={`${createType === 'file' ? 'File' : 'Folder'} name`}
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCreateFile();
                                    }
                                }}
                                className="create-input"
                                autoFocus
                            />
                        </div>
                        <div className="modal-actions">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFile}
                                className="btn-primary"
                                disabled={!createName.trim()}
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden file input for uploads */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                accept=".txt,.js,.jsx,.ts,.tsx,.py,.cpp,.c,.h,.html,.css,.json,.md"
            />

            <style jsx>{`
                .file-explorer {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #0d1117;
                    border: 1px solid #21262d;
                    border-radius: 8px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }

                .file-explorer.drag-over {
                    border-color: #1f6feb;
                    background: rgba(31, 111, 235, 0.05);
                }

                .file-explorer-header {
                    background: #161b22;
                    border-bottom: 1px solid #21262d;
                    padding: 12px;
                }

                .header-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .file-explorer-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 600;
                    color: #e6edf3;
                    font-size: 14px;
                }

                .file-count {
                    color: #7d8590;
                    font-size: 12px;
                    font-weight: normal;
                }

                .header-actions {
                    display: flex;
                    gap: 4px;
                }

                .action-btn {
                    background: transparent;
                    border: none;
                    color: #7d8590;
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .action-btn:hover:not(:disabled) {
                    background: #21262d;
                    color: #e6edf3;
                }

                .action-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .breadcrumbs {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    margin-bottom: 12px;
                    padding: 6px 8px;
                    background: #0d1117;
                    border-radius: 6px;
                    font-size: 12px;
                    overflow-x: auto;
                }

                .breadcrumb-item {
                    background: transparent;
                    border: none;
                    color: #7d8590;
                    cursor: pointer;
                    padding: 2px 6px;
                    border-radius: 4px;
                    white-space: nowrap;
                    transition: all 0.2s ease;
                }

                .breadcrumb-item:hover {
                    background: #21262d;
                    color: #e6edf3;
                }

                .breadcrumb-separator {
                    color: #30363d;
                    margin: 0 2px;
                }

                .controls-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                }

                .search-container {
                    flex: 1;
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .search-icon {
                    position: absolute;
                    left: 8px;
                    color: #7d8590;
                    pointer-events: none;
                }

                .search-input {
                    width: 100%;
                    padding: 6px 8px 6px 28px;
                    background: #0d1117;
                    border: 1px solid #21262d;
                    border-radius: 6px;
                    color: #e6edf3;
                    font-size: 12px;
                    outline: none;
                    transition: border-color 0.2s ease;
                }

                .search-input:focus {
                    border-color: #1f6feb;
                }

                .clear-search {
                    position: absolute;
                    right: 6px;
                    background: transparent;
                    border: none;
                    color: #7d8590;
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 2px;
                    transition: all 0.2s ease;
                }

                .clear-search:hover {
                    background: #21262d;
                    color: #e6edf3;
                }

                .view-controls {
                    display: flex;
                    gap: 2px;
                    background: #21262d;
                    border-radius: 6px;
                    padding: 2px;
                }

                .view-btn {
                    background: transparent;
                    border: none;
                    color: #7d8590;
                    cursor: pointer;
                    padding: 4px 6px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }

                .view-btn:hover {
                    color: #e6edf3;
                }

                .view-btn.active {
                    background: #1f6feb;
                    color: white;
                }

                .sort-controls {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .sort-select {
                    background: #0d1117;
                    border: 1px solid #21262d;
                    border-radius: 6px;
                    color: #e6edf3;
                    padding: 4px 8px;
                    font-size: 12px;
                    cursor: pointer;
                }

                .sort-order-btn,
                .filter-btn {
                    background: transparent;
                    border: none;
                    color: #7d8590;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }

                .sort-order-btn:hover,
                .filter-btn:hover {
                    background: #21262d;
                    color: #e6edf3;
                }

                .filter-btn.active {
                    color: #1f6feb;
                }

                .file-explorer-error {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: #da3633;
                    color: white;
                    font-size: 12px;
                }

                .error-close {
                    background: transparent;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 2px;
                }

                .file-explorer-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }

                .file-explorer-loading,
                .file-explorer-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 40px 20px;
                    color: #7d8590;
                    text-align: center;
                }

                .empty-icon {
                    margin-bottom: 16px;
                    opacity: 0.6;
                }

                .file-explorer-loading span,
                .file-explorer-empty p {
                    margin: 8px 0;
                    font-size: 13px;
                }

                .clear-search-btn,
                .create-first-btn {
                    background: #1f6feb;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    margin-top: 12px;
                    transition: all 0.2s ease;
                }

                .clear-search-btn:hover,
                .create-first-btn:hover {
                    background: #1a5cd8;
                    transform: translateY(-1px);
                }

                .file-list {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .file-list.grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 8px;
                }

                .file-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px;
                    cursor: pointer;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    user-select: none;
                    border: 1px solid transparent;
                }

                .file-item:hover {
                    background: #161b22;
                }

                .file-item.selected {
                    background: #1f6feb;
                    color: white;
                }

                .file-list.grid .file-item {
                    flex-direction: column;
                    text-align: center;
                    padding: 12px 8px;
                    aspect-ratio: 1;
                }

                .file-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                    min-width: 0;
                }

                .file-list.grid .file-info {
                    flex-direction: column;
                    gap: 4px;
                }

                .file-icon-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    min-width: 20px;
                }

                .expand-btn {
                    background: transparent;
                    border: none;
                    color: #7d8590;
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 2px;
                    transition: all 0.2s ease;
                }

                .expand-btn:hover {
                    background: #21262d;
                    color: #e6edf3;
                }

                .file-icon {
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .file-details {
                    flex: 1;
                    min-width: 0;
                }

                .file-name {
                    font-size: 13px;
                    color: #e6edf3;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    display: block;
                }

                .file-list.grid .file-name {
                    font-size: 11px;
                    white-space: normal;
                    line-height: 1.2;
                    max-height: 2.4em;
                    overflow: hidden;
                }

                .file-meta {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 2px;
                }

                .file-size,
                .file-date {
                    font-size: 11px;
                    color: #7d8590;
                    display: flex;
                    align-items: center;
                    gap: 2px;
                }

                .file-menu-btn {
                    background: transparent;
                    border: none;
                    color: #7d8590;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    opacity: 0;
                    transition: all 0.2s ease;
                }

                .file-item:hover .file-menu-btn {
                    opacity: 1;
                }

                .file-menu-btn:hover {
                    background: #21262d;
                    color: #e6edf3;
                }

                .file-list.grid .file-menu-btn {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                }

                .selection-info {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: #161b22;
                    border-top: 1px solid #21262d;
                    font-size: 12px;
                    color: #e6edf3;
                }

                .selection-actions {
                    display: flex;
                    gap: 4px;
                }

                .selection-btn {
                    background: transparent;
                    border: none;
                    color: #7d8590;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }

                .selection-btn:hover {
                    background: #21262d;
                    color: #e6edf3;
                }

                .selection-btn.danger:hover {
                    background: #da3633;
                    color: white;
                }

                .context-menu-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 1000;
                }

                .context-menu {
                    position: fixed;
                    background: #161b22;
                    border: 1px solid #30363d;
                    border-radius: 6px;
                    padding: 4px 0;
                    z-index: 1001;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                    min-width: 160px;
                }

                .context-menu-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    padding: 8px 12px;
                    background: transparent;
                    border: none;
                    color: #e6edf3;
                    cursor: pointer;
                    font-size: 13px;
                    text-align: left;
                    transition: all 0.2s ease;
                }

                .context-menu-item:hover {
                    background: #21262d;
                }

                .context-menu-item.danger {
                    color: #f85149;
                }

                .context-menu-item.danger:hover {
                    background: #da3633;
                    color: white;
                }

                .context-menu-separator {
                    height: 1px;
                    background: #21262d;
                    margin: 4px 0;
                }

                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.6);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                }

                .modal {
                    background: #161b22;
                    border: 1px solid #30363d;
                    border-radius: 8px;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                }

                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px;
                    border-bottom: 1px solid #21262d;
                }

                .modal-header h3 {
                    margin: 0;
                    color: #e6edf3;
                    font-size: 16px;
                }

                .modal-close {
                    background: transparent;
                    border: none;
                    color: #7d8590;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }

                .modal-close:hover {
                    background: #21262d;
                    color: #e6edf3;
                }

                .modal-content {
                    padding: 16px;
                }

                .create-input {
                    width: 100%;
                    padding: 8px 12px;
                    background: #0d1117;
                    border: 1px solid #21262d;
                    border-radius: 6px;
                    color: #e6edf3;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s ease;
                }

                .create-input:focus {
                    border-color: #1f6feb;
                }

                .modal-actions {
                    display: flex;
                    gap: 8px;
                    padding: 16px;
                    justify-content: flex-end;
                    border-top: 1px solid #21262d;
                }

                .btn-secondary,
                .btn-primary {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }

                .btn-secondary {
                    background: #21262d;
                    color: #e6edf3;
                }

                .btn-secondary:hover {
                    background: #30363d;
                }

                .btn-primary {
                    background: #1f6feb;
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #1a5cd8;
                }

                .btn-primary:disabled {
                    background: #30363d;
                    color: #7d8590;
                    cursor: not-allowed;
                }

                .spinning {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .file-explorer-header {
                        padding: 8px;
                    }

                    .controls-row {
                        flex-direction: column;
                        gap: 8px;
                        align-items: stretch;
                    }

                    .view-controls {
                        align-self: flex-end;
                    }

                    .sort-controls {
                        justify-content: space-between;
                    }

                    .file-list.grid {
                        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                    }

                    .breadcrumbs {
                        font-size: 11px;
                    }

                    .file-name {
                        font-size: 12px;
                    }

                    .file-meta {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 2px;
                    }
                }
            `}</style>
        </div>
    );
};

export default FileExplorer;