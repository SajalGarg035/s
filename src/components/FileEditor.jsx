import React, { useState, useEffect, useCallback, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { 
    FiSave, 
    FiRefreshCw, 
    FiFile, 
    FiFolder, 
    FiX, 
    FiClock,
    FiEdit3,
    FiEye,
    FiRotateCcw,
    FiRotateCw,
    FiAlertCircle,
    FiCheckCircle,
    FiUpload,
    FiDownload,
    FiCopy,
    FiTrash2
} from 'react-icons/fi';

const FileEditor = ({ socketRef, roomId, containerId, selectedFile, onFileChange }) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [error, setError] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [fileStats, setFileStats] = useState(null);
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [currentVersion, setCurrentVersion] = useState(0);
    const saveTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    // Get file extension and determine language
    const getLanguageExtension = useCallback((filePath) => {
        if (!filePath) return [javascript];
        
        const ext = filePath.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'js':
            case 'jsx':
            case 'ts':
            case 'tsx':
                return [javascript({ jsx: true, typescript: ext.includes('ts') })];
            case 'py':
                return [python()];
            case 'cpp':
            case 'c':
            case 'cc':
            case 'cxx':
                return [cpp()];
            case 'html':
            case 'htm':
                return [html()];
            case 'css':
                return [css()];
            case 'json':
                return [json()];
            case 'md':
            case 'markdown':
                return [markdown()];
            default:
                return [javascript()];
        }
    }, []);

    // Auto-save functionality
    const autoSave = useCallback(() => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        
        saveTimeoutRef.current = setTimeout(() => {
            if (hasUnsavedChanges && selectedFile && content !== null && !isReadOnly) {
                saveFile();
            }
        }, 2000);
    }, [hasUnsavedChanges, selectedFile, content, isReadOnly]);

    // Load file content from Docker container
    const loadFile = useCallback(async () => {
        if (!selectedFile || !socketRef.current) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            console.log('📖 Loading file:', selectedFile.path);
            
            socketRef.current.emit('docker:read-file', {
                roomId,
                containerId,
                path: selectedFile.path
            });
            
        } catch (error) {
            console.error('Error loading file:', error);
            setError(`Failed to load file: ${error.message}`);
            setIsLoading(false);
        }
    }, [selectedFile, socketRef, roomId, containerId]);

    // Save file content to Docker container
    const saveFile = useCallback(async () => {
        if (!selectedFile || !socketRef.current || isSaving || isReadOnly) return;
        
        setSaving(true);
        setError(null);
        
        try {
            console.log('💾 Saving file:', selectedFile.path, `(${content.length} chars)`);
            
            // Add to undo stack before saving
            setUndoStack(prev => [...prev.slice(-9), { content, timestamp: new Date(), version: currentVersion }]);
            setRedoStack([]);
            setCurrentVersion(prev => prev + 1);
            
            socketRef.current.emit('docker:write-file', {
                roomId,
                containerId,
                path: selectedFile.path,
                content
            });
            
        } catch (error) {
            console.error('Error saving file:', error);
            setError(`Failed to save file: ${error.message}`);
            setSaving(false);
        }
    }, [selectedFile, socketRef, roomId, containerId, content, isSaving, isReadOnly, currentVersion]);

    // Handle content changes
    const handleContentChange = useCallback((value) => {
        setContent(value);
        setHasUnsavedChanges(true);
        setError(null);
        
        // Trigger auto-save
        autoSave();
        
        // Notify parent component of code change for real-time collaboration
        if (onFileChange) {
            onFileChange(value);
        }
    }, [autoSave, onFileChange]);

    // Manual save (Ctrl+S)
    const handleManualSave = useCallback((event) => {
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            saveFile();
        }
    }, [saveFile]);

    // Undo functionality
    const handleUndo = useCallback(() => {
        if (undoStack.length > 0) {
            const lastState = undoStack[undoStack.length - 1];
            setRedoStack(prev => [{ content, timestamp: new Date(), version: currentVersion }, ...prev.slice(0, 9)]);
            setUndoStack(prev => prev.slice(0, -1));
            setContent(lastState.content);
            setHasUnsavedChanges(true);
        }
    }, [undoStack, content, currentVersion]);

    // Redo functionality
    const handleRedo = useCallback(() => {
        if (redoStack.length > 0) {
            const nextState = redoStack[0];
            setUndoStack(prev => [...prev.slice(-9), { content, timestamp: new Date(), version: currentVersion }]);
            setRedoStack(prev => prev.slice(1));
            setContent(nextState.content);
            setHasUnsavedChanges(true);
        }
    }, [redoStack, content, currentVersion]);

    // Copy content to clipboard
    const copyToClipboard = useCallback(() => {
        navigator.clipboard.writeText(content);
    }, [content]);

    // File upload handler
    const handleFileUpload = useCallback((event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setContent(e.target.result);
                setHasUnsavedChanges(true);
            };
            reader.readAsText(file);
        }
    }, []);

    // Download file
    const downloadFile = useCallback(() => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = selectedFile?.name || 'file.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [content, selectedFile]);

    // Format file size
    const formatFileSize = useCallback((bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }, []);

    // Socket event listeners
    useEffect(() => {
        if (!socketRef.current) return;

        const handleFileContent = ({ path, content: fileContent, error: fileError }) => {
            if (path === selectedFile?.path) {
                if (fileError) {
                    setError(fileError);
                    setContent('');
                } else {
                    console.log('📄 File content received:', path, `(${fileContent.length} chars)`);
                    setContent(fileContent);
                    setHasUnsavedChanges(false);
                    setFileStats({
                        size: fileContent.length,
                        lines: fileContent.split('\n').length,
                        words: fileContent.split(/\s+/).filter(word => word.length > 0).length,
                        characters: fileContent.length
                    });
                }
                setIsLoading(false);
                setError(null);
            }
        };

        const handleFileSaved = ({ path, success, error: saveError }) => {
            if (path === selectedFile?.path) {
                setSaving(false);
                if (success) {
                    setHasUnsavedChanges(false);
                    setLastSaved(new Date());
                    console.log('✅ File saved successfully:', path);
                } else {
                    setError(saveError || 'Failed to save file');
                    console.error('❌ File save failed:', path, saveError);
                }
            }
        };

        const handleFileError = ({ error: fileError, operation, path }) => {
            if (path === selectedFile?.path) {
                setError(`${operation}: ${fileError}`);
                setIsLoading(false);
                setSaving(false);
                console.error('❌ File operation error:', operation, path, fileError);
            }
        };

        socketRef.current.on('docker:file-content', handleFileContent);
        socketRef.current.on('docker:file-saved', handleFileSaved);
        socketRef.current.on('docker:file-error', handleFileError);

        return () => {
            socketRef.current?.off('docker:file-content', handleFileContent);
            socketRef.current?.off('docker:file-saved', handleFileSaved);
            socketRef.current?.off('docker:file-error', handleFileError);
        };
    }, [socketRef, selectedFile]);

    // Load file when selectedFile changes
    useEffect(() => {
        if (selectedFile && selectedFile.type === 'file') {
            loadFile();
            setUndoStack([]);
            setRedoStack([]);
            setCurrentVersion(0);
        } else {
            setContent('');
            setHasUnsavedChanges(false);
            setError(null);
            setFileStats(null);
        }
    }, [selectedFile, loadFile]);

    // Add keyboard event listener for shortcuts
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 's':
                        event.preventDefault();
                        saveFile();
                        break;
                    case 'z':
                        if (event.shiftKey) {
                            event.preventDefault();
                            handleRedo();
                        } else {
                            event.preventDefault();
                            handleUndo();
                        }
                        break;
                    case 'y':
                        event.preventDefault();
                        handleRedo();
                        break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [saveFile, handleUndo, handleRedo]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    if (!selectedFile) {
        return (
            <div className="file-editor-placeholder">
                <div className="placeholder-content">
                    <FiFile size={48} className="placeholder-icon" />
                    <h3>No File Selected</h3>
                    <p>Select a file from the file explorer to start editing</p>
                    <div className="placeholder-actions">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="upload-btn"
                        >
                            <FiUpload size={16} />
                            Upload File
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            accept=".txt,.js,.jsx,.ts,.tsx,.py,.cpp,.c,.h,.html,.css,.json,.md"
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (selectedFile.type === 'directory') {
        return (
            <div className="file-editor-placeholder">
                <div className="placeholder-content">
                    <FiFolder size={48} className="placeholder-icon" />
                    <h3>Directory Selected</h3>
                    <p>Please select a file to edit</p>
                </div>
            </div>
        );
    }

    return (
        <div className="file-editor">
            {/* Editor Header */}
            <div className="editor-header">
                <div className="file-info">
                    <FiFile size={16} className="file-icon" />
                    <span className="file-name">{selectedFile.name}</span>
                    {hasUnsavedChanges && <span className="unsaved-indicator">●</span>}
                    {isReadOnly && <span className="readonly-badge">Read Only</span>}
                </div>
                
                <div className="editor-actions">
                    <div className="action-group">
                        <button
                            onClick={handleUndo}
                            disabled={undoStack.length === 0}
                            className="action-btn"
                            title="Undo (Ctrl+Z)"
                        >
                            <FiRotateCcw size={14} />
                        </button>
                        
                        <button
                            onClick={handleRedo}
                            disabled={redoStack.length === 0}
                            className="action-btn"
                            title="Redo (Ctrl+Y)"
                        >
                            <FiRotateCw size={14} />
                        </button>
                    </div>

                    <div className="action-group">
                        <button
                            onClick={() => setIsReadOnly(!isReadOnly)}
                            className={`action-btn ${isReadOnly ? 'active' : ''}`}
                            title={isReadOnly ? 'Enable editing' : 'Make read-only'}
                        >
                            {isReadOnly ? <FiEye size={14} /> : <FiEdit3 size={14} />}
                        </button>

                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`action-btn ${showPreview ? 'active' : ''}`}
                            title="Toggle preview"
                        >
                            <FiEye size={14} />
                        </button>
                    </div>

                    <div className="action-group">
                        <button
                            onClick={copyToClipboard}
                            className="action-btn"
                            title="Copy to clipboard"
                        >
                            <FiCopy size={14} />
                        </button>

                        <button
                            onClick={downloadFile}
                            className="action-btn"
                            title="Download file"
                        >
                            <FiDownload size={14} />
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="action-btn"
                            title="Upload file"
                        >
                            <FiUpload size={14} />
                        </button>
                    </div>

                    <div className="action-group">
                        <button
                            onClick={loadFile}
                            disabled={isLoading}
                            className="action-btn"
                            title="Reload file"
                        >
                            <FiRefreshCw size={14} className={isLoading ? 'spinning' : ''} />
                        </button>
                        
                        <button
                            onClick={saveFile}
                            disabled={!hasUnsavedChanges || isSaving || isReadOnly}
                            className="action-btn save-btn"
                            title="Save file (Ctrl+S)"
                        >
                            <FiSave size={14} />
                            {isSaving && <span className="save-text">Saving...</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* File Stats */}
            {fileStats && (
                <div className="file-stats">
                    <span className="stat-item">
                        {fileStats.lines} lines
                    </span>
                    <span className="stat-item">
                        {fileStats.words} words
                    </span>
                    <span className="stat-item">
                        {formatFileSize(fileStats.size)}
                    </span>
                    {lastSaved && (
                        <span className="stat-item">
                            <FiClock size={12} />
                            Saved {lastSaved.toLocaleTimeString()}
                        </span>
                    )}
                </div>
            )}
            
            {/* Error Bar */}
            {error && (
                <div className="error-bar">
                    <FiAlertCircle size={14} />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="error-close">
                        <FiX size={14} />
                    </button>
                </div>
            )}

            {/* Success Bar */}
            {lastSaved && !hasUnsavedChanges && !error && (
                <div className="success-bar">
                    <FiCheckCircle size={14} />
                    <span>File saved successfully</span>
                </div>
            )}
            
            {/* Editor Content */}
            <div className="editor-content">
                {isLoading ? (
                    <div className="loading-overlay">
                        <FiRefreshCw size={24} className="spinning" />
                        <span>Loading file...</span>
                    </div>
                ) : (
                    <CodeMirror
                        value={content}
                        onChange={handleContentChange}
                        extensions={[
                            ...getLanguageExtension(selectedFile.path),
                            EditorView.theme({
                                '&': {
                                    fontSize: '14px',
                                    height: '100%'
                                },
                                '.cm-focused': {
                                    outline: 'none'
                                },
                                '.cm-editor': {
                                    height: '100%'
                                },
                                '.cm-scroller': {
                                    fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace'
                                }
                            })
                        ]}
                        theme={oneDark}
                        editable={!isReadOnly}
                        basicSetup={{
                            lineNumbers: true,
                            foldGutter: true,
                            dropCursor: false,
                            allowMultipleSelections: false,
                            indentOnInput: true,
                            bracketMatching: true,
                            closeBrackets: true,
                            autocompletion: true,
                            highlightSelectionMatches: true,
                            searchKeymap: true
                        }}
                    />
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                accept=".txt,.js,.jsx,.ts,.tsx,.py,.cpp,.c,.h,.html,.css,.json,.md"
            />
            
            <style jsx>{`
                .file-editor {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #0d1117;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .file-editor-placeholder {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    background: #0d1117;
                    border-radius: 8px;
                    border: 2px dashed #21262d;
                }
                
                .placeholder-content {
                    text-align: center;
                    color: #7d8590;
                }

                .placeholder-icon {
                    margin-bottom: 16px;
                    opacity: 0.6;
                }
                
                .placeholder-content h3 {
                    margin: 16px 0 8px;
                    color: #e6edf3;
                    font-size: 18px;
                }
                
                .placeholder-content p {
                    color: #7d8590;
                    margin-bottom: 20px;
                }

                .placeholder-actions {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }

                .upload-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #1f6feb;
                    color: white;
                    border: none;
                    padding: 10px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                }

                .upload-btn:hover {
                    background: #1a5cd8;
                    transform: translateY(-1px);
                }
                
                .editor-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    background: #161b22;
                    border-bottom: 1px solid #21262d;
                    min-height: 52px;
                }
                
                .file-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .file-icon {
                    color: #7d8590;
                }
                
                .file-name {
                    font-weight: 500;
                    color: #e6edf3;
                    font-size: 14px;
                }
                
                .unsaved-indicator {
                    color: #f85149;
                    font-size: 18px;
                    line-height: 1;
                    margin-left: 4px;
                }

                .readonly-badge {
                    background: #6e7681;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                    text-transform: uppercase;
                }
                
                .editor-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .action-group {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    padding: 2px;
                    background: #21262d;
                    border-radius: 6px;
                }
                
                .action-btn {
                    background: transparent;
                    border: none;
                    color: #7d8590;
                    cursor: pointer;
                    padding: 6px 8px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    transition: all 0.2s ease;
                    font-size: 12px;
                    white-space: nowrap;
                }
                
                .action-btn:hover:not(:disabled) {
                    background: #30363d;
                    color: #e6edf3;
                }
                
                .action-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .action-btn.active {
                    background: #1f6feb;
                    color: white;
                }
                
                .save-btn:not(:disabled) {
                    color: #238636;
                }
                
                .save-btn:hover:not(:disabled) {
                    background: #1a2e1a;
                    color: #2ea043;
                }

                .save-text {
                    font-size: 11px;
                }

                .file-stats {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 6px 16px;
                    background: #0d1117;
                    border-bottom: 1px solid #21262d;
                    font-size: 11px;
                    color: #7d8590;
                }

                .stat-item {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .error-bar {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background: #da3633;
                    color: white;
                    font-size: 13px;
                }

                .success-bar {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background: #238636;
                    color: white;
                    font-size: 13px;
                    animation: slideDown 0.3s ease;
                }

                @keyframes slideDown {
                    from {
                        transform: translateY(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                .error-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 2px;
                    margin-left: auto;
                    transition: background 0.2s ease;
                }
                
                .error-close:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .editor-content {
                    flex: 1;
                    position: relative;
                    overflow: hidden;
                }
                
                .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: #0d1117;
                    color: #7d8590;
                    gap: 12px;
                }
                
                .spinning {
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .editor-header {
                        padding: 8px 12px;
                        flex-wrap: wrap;
                        gap: 8px;
                    }

                    .editor-actions {
                        gap: 4px;
                    }

                    .action-group {
                        gap: 1px;
                    }

                    .action-btn {
                        padding: 4px 6px;
                    }

                    .save-text {
                        display: none;
                    }

                    .file-stats {
                        padding: 4px 12px;
                        gap: 8px;
                        flex-wrap: wrap;
                    }

                    .stat-item {
                        font-size: 10px;
                    }
                }
            `}</style>
        </div>
    );
};

export default FileEditor;