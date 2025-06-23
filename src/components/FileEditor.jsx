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
import { FiSave, FiRefreshCw, FiFile, FiFolder, FiX } from 'react-icons/fi';

const FileEditor = ({ socketRef, roomId, containerId, selectedFile, onFileChange }) => {
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [error, setError] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const saveTimeoutRef = useRef(null);

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
            if (hasUnsavedChanges && selectedFile && content !== null) {
                saveFile();
            }
        }, 2000); // Auto-save after 2 seconds of inactivity
    }, [hasUnsavedChanges, selectedFile, content]);

    // Load file content from Docker container
    const loadFile = useCallback(async () => {
        if (!selectedFile || !socketRef.current) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            console.log('📖 Loading file:', selectedFile.path);
            
            // Request file content from server
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
        if (!selectedFile || !socketRef.current || isSaving) return;
        
        setSaving(true);
        setError(null);
        
        try {
            console.log('💾 Saving file:', selectedFile.path, `(${content.length} chars)`);
            
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
    }, [selectedFile, socketRef, roomId, containerId, content, isSaving]);

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

    // Socket event listeners
    useEffect(() => {
        if (!socketRef.current) return;

        const handleFileContent = ({ path, content: fileContent }) => {
            if (path === selectedFile?.path) {
                console.log('📄 File content received:', path, `(${fileContent.length} chars)`);
                setContent(fileContent);
                setHasUnsavedChanges(false);
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
        } else {
            setContent('');
            setHasUnsavedChanges(false);
            setError(null);
        }
    }, [selectedFile, loadFile]);

    // Add keyboard event listener for Ctrl+S
    useEffect(() => {
        document.addEventListener('keydown', handleManualSave);
        return () => {
            document.removeEventListener('keydown', handleManualSave);
        };
    }, [handleManualSave]);

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
                    <FiFile size={48} />
                    <h3>No File Selected</h3>
                    <p>Select a file from the file explorer to start editing</p>
                </div>
                
                <style jsx>{`
                    .file-editor-placeholder {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        background: #1e1e1e;
                        color: #666;
                    }
                    
                    .placeholder-content {
                        text-align: center;
                    }
                    
                    .placeholder-content h3 {
                        margin: 16px 0 8px;
                        color: #999;
                    }
                    
                    .placeholder-content p {
                        color: #666;
                    }
                `}</style>
            </div>
        );
    }

    if (selectedFile.type === 'directory') {
        return (
            <div className="file-editor-placeholder">
                <div className="placeholder-content">
                    <FiFolder size={48} />
                    <h3>Directory Selected</h3>
                    <p>Please select a file to edit</p>
                </div>
                
                <style jsx>{`
                    .file-editor-placeholder {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100%;
                        background: #1e1e1e;
                        color: #666;
                    }
                    
                    .placeholder-content {
                        text-align: center;
                    }
                    
                    .placeholder-content h3 {
                        margin: 16px 0 8px;
                        color: #999;
                    }
                    
                    .placeholder-content p {
                        color: #666;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="file-editor">
            <div className="editor-header">
                <div className="file-info">
                    <FiFile size={16} />
                    <span className="file-name">{selectedFile.name}</span>
                    {hasUnsavedChanges && <span className="unsaved-indicator">●</span>}
                </div>
                
                <div className="editor-actions">
                    {lastSaved && (
                        <span className="last-saved">
                            Saved {lastSaved.toLocaleTimeString()}
                        </span>
                    )}
                    
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
                        disabled={!hasUnsavedChanges || isSaving}
                        className="action-btn save-btn"
                        title="Save file (Ctrl+S)"
                    >
                        <FiSave size={14} />
                        {isSaving && ' Saving...'}
                    </button>
                </div>
            </div>
            
            {error && (
                <div className="error-bar">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="error-close">
                        <FiX size={14} />
                    </button>
                </div>
            )}
            
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
            
            <style jsx>{`
                .file-editor {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #1e1e1e;
                }
                
                .editor-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 16px;
                    background: #2d2d2d;
                    border-bottom: 1px solid #444;
                    color: #d4d4d4;
                    font-size: 14px;
                }
                
                .file-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .file-name {
                    font-weight: 500;
                }
                
                .unsaved-indicator {
                    color: #f59e0b;
                    font-size: 18px;
                    line-height: 1;
                }
                
                .editor-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .last-saved {
                    font-size: 12px;
                    color: #888;
                }
                
                .action-btn {
                    background: none;
                    border: 1px solid #444;
                    color: #d4d4d4;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 12px;
                }
                
                .action-btn:hover:not(:disabled) {
                    background: #444;
                    border-color: #666;
                }
                
                .action-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .save-btn:not(:disabled) {
                    background: #059669;
                    border-color: #059669;
                    color: white;
                }
                
                .save-btn:hover:not(:disabled) {
                    background: #047857;
                    border-color: #047857;
                }
                
                .error-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 16px;
                    background: #dc2626;
                    color: white;
                    font-size: 14px;
                }
                
                .error-close {
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 2px;
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
                    background: #1e1e1e;
                    color: #888;
                    gap: 12px;
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

export default FileEditor;
