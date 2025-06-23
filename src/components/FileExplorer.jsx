import React, { useState, useEffect } from 'react';
import { 
    FiFolder, 
    FiFile, 
    FiFolderPlus, 
    FiFilePlus, 
    FiTrash2, 
    FiRefreshCw,
    FiChevronRight,
    FiChevronDown
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const FileExplorer = ({ socketRef, roomId, containerId, onFileSelect, selectedFile }) => {
    const [files, setFiles] = useState([]);
    const [expandedFolders, setExpandedFolders] = useState(new Set(['/workspace']));
    const [isLoading, setIsLoading] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [newItemModal, setNewItemModal] = useState(null);
    const [newItemName, setNewItemName] = useState('');

    useEffect(() => {
        if (socketRef.current && containerId) {
            loadFileTree('/workspace');

            // Listen for file system events
            socketRef.current.on('docker:file-tree', ({ files }) => {
                setFiles(files);
                setIsLoading(false);
            });

            socketRef.current.on('docker:file-created', ({ path, type }) => {
                toast.success(`${type === 'directory' ? 'Folder' : 'File'} created: ${path}`);
                loadFileTree('/workspace');
                setNewItemModal(null);
                setNewItemName('');
            });

            socketRef.current.on('docker:file-deleted', ({ path }) => {
                toast.success(`Deleted: ${path}`);
                loadFileTree('/workspace');
            });

            return () => {
                socketRef.current?.off('docker:file-tree');
                socketRef.current?.off('docker:file-created');
                socketRef.current?.off('docker:file-deleted');
            };
        }
    }, [socketRef, containerId]);

    const loadFileTree = (path = '/workspace') => {
        if (socketRef.current && containerId) {
            setIsLoading(true);
            socketRef.current.emit('docker:get-file-tree', {
                roomId,
                containerId,
                path
            });
        }
    };

    const toggleFolder = (folderPath) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderPath)) {
            newExpanded.delete(folderPath);
        } else {
            newExpanded.add(folderPath);
        }
        setExpandedFolders(newExpanded);
    };

    const handleFileClick = (file) => {
        if (file.type === 'file') {
            onFileSelect(file.path);
        } else if (file.type === 'directory') {
            toggleFolder(file.path);
        }
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

    const createNewItem = (type, parentPath = '/workspace') => {
        setNewItemModal({ type, parentPath });
        setContextMenu(null);
    };

    const handleCreateItem = () => {
        if (!newItemName.trim()) {
            toast.error('Please enter a name');
            return;
        }

        const fullPath = `${newItemModal.parentPath}/${newItemName}`.replace('//', '/');
        
        if (socketRef.current && containerId) {
            socketRef.current.emit('docker:create-file', {
                roomId,
                containerId,
                path: fullPath,
                type: newItemModal.type
            });
        }
    };

    const deleteItem = (filePath) => {
        if (window.confirm(`Are you sure you want to delete ${filePath}?`)) {
            if (socketRef.current && containerId) {
                socketRef.current.emit('docker:delete-file', {
                    roomId,
                    containerId,
                    path: filePath
                });
            }
        }
        setContextMenu(null);
    };

    const getFileIcon = (file) => {
        if (file.type === 'directory') {
            return expandedFolders.has(file.path) ? 
                <FiChevronDown size={14} /> : 
                <FiChevronRight size={14} />;
        }
        return <FiFile size={14} />;
    };

    const buildFileTree = (files, parentPath = '/workspace') => {
        const items = files
            .filter(file => {
                const filePath = file.path.replace(parentPath, '').replace(/^\//, '');
                return filePath && !filePath.includes('/');
            })
            .sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

        return items.map(file => (
            <div key={file.path}>
                <div
                    className={`file-item ${file.type} ${selectedFile === file.path ? 'selected' : ''}`}
                    onClick={() => handleFileClick(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                >
                    <div className="file-icon">
                        {file.type === 'directory' ? <FiFolder size={14} /> : <FiFile size={14} />}
                    </div>
                    <span className="file-name">{file.name}</span>
                </div>
                
                {file.type === 'directory' && expandedFolders.has(file.path) && (
                    <div className="folder-children">
                        {buildFileTree(files, file.path)}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="file-explorer" onClick={closeContextMenu}>
            <div className="file-explorer-header">
                <h3><FiFolder size={16} /> Files</h3>
                <div className="file-explorer-actions">
                    <button 
                        onClick={() => createNewItem('file')}
                        className="action-btn"
                        title="New File"
                    >
                        <FiFilePlus size={14} />
                    </button>
                    <button 
                        onClick={() => createNewItem('directory')}
                        className="action-btn"
                        title="New Folder"
                    >
                        <FiFolderPlus size={14} />
                    </button>
                    <button 
                        onClick={() => loadFileTree()}
                        className="action-btn"
                        title="Refresh"
                        disabled={isLoading}
                    >
                        <FiRefreshCw size={14} className={isLoading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            <div className="file-tree">
                {isLoading ? (
                    <div className="loading">Loading files...</div>
                ) : files.length > 0 ? (
                    buildFileTree(files)
                ) : (
                    <div className="empty-state">
                        <p>No files found</p>
                        <button 
                            onClick={() => createNewItem('file')}
                            className="create-first-file"
                        >
                            Create your first file
                        </button>
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div 
                    className="context-menu"
                    style={{ 
                        left: contextMenu.x, 
                        top: contextMenu.y 
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button onClick={() => createNewItem('file', contextMenu.file.path)}>
                        <FiFilePlus size={14} /> New File
                    </button>
                    <button onClick={() => createNewItem('directory', contextMenu.file.path)}>
                        <FiFolderPlus size={14} /> New Folder
                    </button>
                    <hr />
                    <button 
                        onClick={() => deleteItem(contextMenu.file.path)}
                        className="danger"
                    >
                        <FiTrash2 size={14} /> Delete
                    </button>
                </div>
            )}

            {/* New Item Modal */}
            {newItemModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Create New {newItemModal.type === 'directory' ? 'Folder' : 'File'}</h3>
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder={`Enter ${newItemModal.type} name`}
                            autoFocus
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateItem()}
                        />
                        <div className="modal-actions">
                            <button onClick={() => setNewItemModal(null)}>Cancel</button>
                            <button onClick={handleCreateItem} className="primary">Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileExplorer;
