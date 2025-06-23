import React, { useState, useEffect, useCallback } from 'react';
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
    FiMoreVertical
} from 'react-icons/fi';

const FileExplorer = ({ socketRef, roomId, containerId, onFileSelect }) => {
    const [files, setFiles] = useState([]);
    const [currentPath, setCurrentPath] = useState('/workspace');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedFolders, setExpandedFolders] = useState(new Set(['/workspace']));
    const [contextMenu, setContextMenu] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createType, setCreateType] = useState('file');
    const [createName, setCreateName] = useState('');

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

    // Socket event listeners
    useEffect(() => {
        if (!socketRef.current) return;

        const handleFileTree = ({ files: newFiles, path }) => {
            console.log('📁 Received file tree:', newFiles);
            setFiles(newFiles || []);
            setCurrentPath(path || '/workspace');
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
    }, [socketRef, fetchFileTree, currentPath]);

    // Initial load
    useEffect(() => {
        if (containerId) {
            fetchFileTree();
        }
    }, [containerId, fetchFileTree]);

    // Handle file/folder actions
    const handleFileClick = (file) => {
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
            // Ensure file object has proper structure
            const fileObject = {
                name: file.name || 'untitled',
                path: file.path || '',
                type: file.type || 'file',
                size: file.size || 0
            };
            
            console.log('📄 Opening file:', fileObject);
            
            // Open file in editor
            if (onFileSelect && typeof onFileSelect === 'function') {
                onFileSelect(fileObject);
            }
            
            // Request file content
            if (socketRef.current) {
                socketRef.current.emit('docker:read-file', {
                    roomId,
                    containerId,
                    path: fileObject.path
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

    const closeContextMenu = () => {
        setContextMenu(null);
    };

    const getFileIcon = (file) => {
        if (file.type === 'directory') {
            const isExpanded = expandedFolders.has(file.path);
            return isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />;
        }
        return <FiFile size={16} />;
    };

    const formatFileSize = (size) => {
        if (size === null || size === undefined) return '';
        if (size < 1024) return `${size}B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
        return `${(size / (1024 * 1024)).toFixed(1)}MB`;
    };

    return (
        <div className="file-explorer">
            <div className="file-explorer-header">
                <div className="file-explorer-title">
                    <FiFolder size={16} />
                    <span>Files</span>
                </div>
                <div className="file-explorer-actions">
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
                        onClick={() => fetchFileTree(currentPath)}
                        className="action-btn"
                        title="Refresh"
                        disabled={loading}
                    >
                        <FiRefreshCw size={14} className={loading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            <div className="file-explorer-path">
                {currentPath}
            </div>

            {error && (
                <div className="file-explorer-error">
                    ❌ {error}
                </div>
            )}

            <div className="file-explorer-content">
                {loading && files.length === 0 ? (
                    <div className="file-explorer-loading">
                        <FiRefreshCw className="spinning" />
                        <span>Loading files...</span>
                    </div>
                ) : files.length === 0 ? (
                    <div className="file-explorer-empty">
                        No files found
                    </div>
                ) : (
                    <div className="file-list">
                        {files.map((file) => (
                            <div
                                key={file.path}
                                className={`file-item ${file.type}`}
                                onClick={() => handleFileClick(file)}
                                onContextMenu={(e) => handleContextMenu(e, file)}
                            >
                                <div className="file-info">
                                    <div className="file-icon">
                                        {file.type === 'directory' ? (
                                            <FiFolder size={16} />
                                        ) : (
                                            <FiFile size={16} />
                                        )}
                                        {getFileIcon(file)}
                                    </div>
                                    <div className="file-details">
                                        <span className="file-name">{file.name}</span>
                                        {file.type === 'file' && (
                                            <span className="file-size">
                                                {formatFileSize(file.size)}
                                            </span>
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

            {/* Context Menu */}
            {contextMenu && (
                <>
                    <div className="context-menu-overlay" onClick={closeContextMenu} />
                    <div
                        className="context-menu"
                        style={{
                            left: contextMenu.x,
                            top: contextMenu.y
                        }}
                    >
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

            <style jsx>{`
                .file-explorer {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #1e1e1e;
                    border: 1px solid #444;
                    border-radius: 8px;
                    overflow: hidden;
                }

                .file-explorer-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: #2d2d2d;
                    border-bottom: 1px solid #444;
                    color: #d4d4d4;
                }

                .file-explorer-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 500;
                }

                .file-explorer-actions {
                    display: flex;
                    gap: 4px;
                }

                .action-btn {
                    background: none;
                    border: none;
                    color: #d4d4d4;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .action-btn:hover:not(:disabled) {
                    background: #444;
                }

                .action-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .file-explorer-path {
                    padding: 4px 12px;
                    background: #252525;
                    color: #888;
                    font-size: 12px;
                    border-bottom: 1px solid #333;
                }

                .file-explorer-error {
                    padding: 8px 12px;
                    background: #2d1b1b;
                    color: #f87171;
                    font-size: 12px;
                    border-bottom: 1px solid #444;
                }

                .file-explorer-content {
                    flex: 1;
                    overflow-y: auto;
                }

                .file-explorer-loading,
                .file-explorer-empty {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                    color: #888;
                    gap: 8px;
                }

                .file-list {
                    padding: 4px;
                }

                .file-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    cursor: pointer;
                    border-radius: 4px;
                    margin: 2px 0;
                    color: #d4d4d4;
                }

                .file-item:hover {
                    background: #2d2d2d;
                }

                .file-item.directory {
                    color: #569cd6;
                }

                .file-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                }

                .file-icon {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .file-details {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .file-name {
                    font-size: 14px;
                }

                .file-size {
                    font-size: 11px;
                    color: #888;
                }

                .file-menu-btn {
                    background: none;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    opacity: 0;
                    transition: opacity 0.2s;
                }

                .file-item:hover .file-menu-btn {
                    opacity: 1;
                }

                .file-menu-btn:hover {
                    background: #444;
                    color: #d4d4d4;
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
                    background: #2d2d2d;
                    border: 1px solid #444;
                    border-radius: 4px;
                    padding: 4px 0;
                    z-index: 1001;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    min-width: 120px;
                }

                .context-menu-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    padding: 8px 12px;
                    background: none;
                    border: none;
                    color: #d4d4d4;
                    cursor: pointer;
                    font-size: 13px;
                    text-align: left;
                }

                .context-menu-item:hover {
                    background: #3d3d3d;
                }

                .context-menu-item.danger {
                    color: #f87171;
                }

                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }

                .modal {
                    background: #2d2d2d;
                    border: 1px solid #444;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 400px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
                }

                .modal-header {
                    padding: 16px;
                    border-bottom: 1px solid #444;
                }

                .modal-header h3 {
                    margin: 0;
                    color: #d4d4d4;
                }

                .modal-content {
                    padding: 16px;
                }

                .modal-content input {
                    width: 100%;
                    padding: 8px 12px;
                    background: #1e1e1e;
                    border: 1px solid #444;
                    border-radius: 4px;
                    color: #d4d4d4;
                    font-size: 14px;
                }

                .modal-content input:focus {
                    outline: none;
                    border-color: #569cd6;
                }

                .modal-actions {
                    display: flex;
                    gap: 8px;
                    padding: 16px;
                    justify-content: flex-end;
                }

                .btn-secondary,
                .btn-primary {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }

                .btn-secondary {
                    background: #444;
                    color: #d4d4d4;
                }

                .btn-secondary:hover {
                    background: #555;
                }

                .btn-primary {
                    background: #569cd6;
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #4a8bc2;
                }

                .btn-primary:disabled {
                    background: #333;
                    color: #888;
                    cursor: not-allowed;
                }

                .spinning {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default FileExplorer;
