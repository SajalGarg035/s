import React, { useState, useEffect, useRef } from 'react';
import { 
    FiFolderPlus, FiFilePlus, FiFolder, FiFolderOpen, FiFile, 
    FiMoreHorizontal, FiTrash2, FiEdit2, FiDownload, FiUpload,
    FiRefreshCw, FiSearch, FiX
} from 'react-icons/fi';

const FileExplorer = ({ socketRef, roomId, containerId, onFileSelect, selectedFile }) => {
    const [fileTree, setFileTree] = useState([]);
    const [expandedFolders, setExpandedFolders] = useState(new Set(['/workspace']));
    const [contextMenu, setContextMenu] = useState(null);
    const [isCreating, setIsCreating] = useState(null);
    const [newItemName, setNewItemName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (socketRef.current && containerId) {
            // Request initial file tree
            loadFileTree();

            // Listen for file system updates
            socketRef.current.on('docker:file-tree', (data) => {
                setFileTree(data.files || []);
                setIsLoading(false);
            });

            socketRef.current.on('docker:file-created', (data) => {
                loadFileTree();
            });

            socketRef.current.on('docker:file-deleted', (data) => {
                loadFileTree();
            });

            socketRef.current.on('docker:file-error', (error) => {
                console.error('File operation error:', error);
                setIsLoading(false);
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.off('docker:file-tree');
                socketRef.current.off('docker:file-created');
                socketRef.current.off('docker:file-deleted');
                socketRef.current.off('docker:file-error');
            }
        };
    }, [socketRef, containerId]);

    const loadFileTree = () => {
        if (socketRef.current && containerId) {
            setIsLoading(true);
            socketRef.current.emit('docker:get-file-tree', {
                roomId,
                containerId,
                path: '/workspace'
            });
        }
    };

    const toggleFolder = (path) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);
        }
        setExpandedFolders(newExpanded);
    };

    const handleFileClick = (file) => {
        if (file.type === 'file') {
            onFileSelect && onFileSelect(file);
        } else {
            toggleFolder(file.path);
        }
    };

    const handleContextMenu = (e, item) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            item
        });
    };

    const closeContextMenu = () => {
        setContextMenu(null);
    };

    const createNewItem = (type, parentPath = '/workspace') => {
        setIsCreating({ type, parentPath });
        setNewItemName('');
        setContextMenu(null);
    };

    const confirmCreate = () => {
        if (newItemName.trim() && socketRef.current && containerId) {
            const fullPath = `${isCreating.parentPath}/${newItemName}`.replace('//', '/');
            
            socketRef.current.emit('docker:create-file', {
                roomId,
                containerId,
                path: fullPath,
                type: isCreating.type
            });
        }
        setIsCreating(null);
        setNewItemName('');
    };

    const cancelCreate = () => {
        setIsCreating(null);
        setNewItemName('');
    };

    const deleteItem = (item) => {
        if (socketRef.current && containerId && window.confirm(`Delete ${item.name}?`)) {
            socketRef.current.emit('docker:delete-file', {
                roomId,
                containerId,
                path: item.path
            });
        }
        setContextMenu(null);
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (socketRef.current && containerId) {
                    socketRef.current.emit('docker:upload-file', {
                        roomId,
                        containerId,
                        fileName: file.name,
                        content: event.target.result,
                        path: '/workspace'
                    });
                }
            };
            reader.readAsText(file);
        });
        setContextMenu(null);
    };

    const downloadFile = (item) => {
        if (socketRef.current && containerId) {
            socketRef.current.emit('docker:download-file', {
                roomId,
                containerId,
                path: item.path
            });
        }
        setContextMenu(null);
    };

    const getFileIcon = (item) => {
        if (item.type === 'directory') {
            return expandedFolders.has(item.path) ? <FiFolderOpen size={16} /> : <FiFolder size={16} />;
        }
        
        const ext = item.name.split('.').pop()?.toLowerCase();
        const iconMap = {
            'js': '🟨', 'jsx': '🟨', 'ts': '🔷', 'tsx': '🔷',
            'py': '🐍', 'java': '☕', 'cpp': '🔵', 'c': '🔵',
            'html': '🌐', 'css': '🎨', 'json': '📄', 'md': '📝',
            'txt': '📄', 'log': '📋', 'xml': '📄', 'yml': '⚙️',
            'yaml': '⚙️', 'sh': '🔧', 'bash': '🔧'
        };
        
        return <span className="file-icon">{iconMap[ext] || '📄'}</span>;
    };

    const filteredFiles = (files) => {
        if (!searchQuery) return files;
        return files.filter(file => 
            file.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const renderFileTree = (files, level = 0) => {
        return filteredFiles(files).map((item) => (
            <div key={item.path} className="file-tree-item">
                <div
                    className={`file-item ${selectedFile?.path === item.path ? 'selected' : ''}`}
                    style={{ paddingLeft: `${level * 20 + 8}px` }}
                    onClick={() => handleFileClick(item)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                >
                    <div className="file-icon-wrapper">
                        {getFileIcon(item)}
                    </div>
                    <span className="file-name">{item.name}</span>
                    {item.type === 'file' && (
                        <span className="file-size">{item.size}</span>
                    )}
                </div>
                
                {item.type === 'directory' && expandedFolders.has(item.path) && item.children && (
                    <div className="folder-contents">
                        {renderFileTree(item.children, level + 1)}
                        
                        {isCreating && isCreating.parentPath === item.path && (
                            <div 
                                className="file-item creating"
                                style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }}
                            >
                                <div className="file-icon-wrapper">
                                    {isCreating.type === 'directory' ? <FiFolder size={16} /> : <FiFile size={16} />}
                                </div>
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') confirmCreate();
                                        if (e.key === 'Escape') cancelCreate();
                                    }}
                                    onBlur={confirmCreate}
                                    placeholder={`New ${isCreating.type}...`}
                                    autoFocus
                                    className="new-item-input"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="file-explorer">
            <div className="explorer-header">
                <div className="explorer-title">
                    <h3>Explorer</h3>
                    <div className="explorer-actions">
                        <button 
                            onClick={() => createNewItem('file')}
                            title="New File"
                            className="action-btn"
                        >
                            <FiFilePlus size={16} />
                        </button>
                        <button 
                            onClick={() => createNewItem('directory')}
                            title="New Folder"
                            className="action-btn"
                        >
                            <FiFolderPlus size={16} />
                        </button>
                        <button 
                            onClick={loadFileTree}
                            title="Refresh"
                            className="action-btn"
                            disabled={isLoading}
                        >
                            <FiRefreshCw size={16} className={isLoading ? 'spinning' : ''} />
                        </button>
                    </div>
                </div>
                
                <div className="search-container">
                    <div className="search-input-wrapper">
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
                                <FiX size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="file-tree">
                {isLoading ? (
                    <div className="loading-state">
                        <FiRefreshCw size={16} className="spinning" />
                        <span>Loading files...</span>
                    </div>
                ) : fileTree.length > 0 ? (
                    renderFileTree(fileTree)
                ) : (
                    <div className="empty-state">
                        <FiFolder size={24} />
                        <p>No files found</p>
                        <button 
                            onClick={() => createNewItem('file')}
                            className="create-first-file"
                        >
                            Create your first file
                        </button>
                    </div>
                )}
                
                {isCreating && isCreating.parentPath === '/workspace' && (
                    <div className="file-item creating" style={{ paddingLeft: '8px' }}>
                        <div className="file-icon-wrapper">
                            {isCreating.type === 'directory' ? <FiFolder size={16} /> : <FiFile size={16} />}
                        </div>
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') confirmCreate();
                                if (e.key === 'Escape') cancelCreate();
                            }}
                            onBlur={confirmCreate}
                            placeholder={`New ${isCreating.type}...`}
                            autoFocus
                            className="new-item-input"
                        />
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={closeContextMenu}
                >
                    <div className="context-menu-content" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => createNewItem('file', contextMenu.item.path)}>
                            <FiFilePlus size={14} />
                            New File
                        </button>
                        <button onClick={() => createNewItem('directory', contextMenu.item.path)}>
                            <FiFolderPlus size={14} />
                            New Folder
                        </button>
                        <div className="separator"></div>
                        <button onClick={() => fileInputRef.current?.click()}>
                            <FiUpload size={14} />
                            Upload Files
                        </button>
                        {contextMenu.item.type === 'file' && (
                            <button onClick={() => downloadFile(contextMenu.item)}>
                                <FiDownload size={14} />
                                Download
                            </button>
                        )}
                        <div className="separator"></div>
                        <button onClick={() => deleteItem(contextMenu.item)} className="danger">
                            <FiTrash2 size={14} />
                            Delete
                        </button>
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
            />
            
            {/* Click outside to close context menu */}
            {contextMenu && (
                <div 
                    className="context-menu-overlay"
                    onClick={closeContextMenu}
                />
            )}
        </div>
    );
};

export default FileExplorer;
