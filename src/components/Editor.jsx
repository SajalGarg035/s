import React, { useEffect, useRef, useState, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { toast } from 'react-hot-toast';
import { 
    FiSave, 
    FiCopy, 
    FiSearch, 
    FiSettings, 
    FiMaximize2, 
    FiMinimize2,
    FiZoomIn,
    FiZoomOut,
    FiRotateCcw,
    FiRotateCw,
    FiFileText,
    FiClock,
    FiUser
} from 'react-icons/fi';

const Editor = ({ socketRef, roomId, onCodeChange, code, language = 'javascript', selectedFile }) => {
    const editorRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fontSize, setFontSize] = useState(14);
    const [wordWrap, setWordWrap] = useState(false);
    const [showMinimap, setShowMinimap] = useState(true);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [searchVisible, setSearchVisible] = useState(false);
    const autoSaveTimeoutRef = useRef(null);

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        
        // Configure editor with modern settings
        editor.updateOptions({
            fontSize: fontSize,
            fontFamily: 'JetBrains Mono, Fira Code, Consolas, Monaco, monospace',
            fontLigatures: true,
            minimap: { enabled: showMinimap },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: wordWrap ? 'on' : 'off',
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: true,
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            renderLineHighlight: 'all',
            selectionHighlight: true,
            occurrencesHighlight: true,
            codeLens: true,
            colorDecorators: true,
            lightbulb: { enabled: true },
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            snippetSuggestions: 'top',
            formatOnPaste: true,
            formatOnType: true,
        });

        // Set up modern theme
        monaco.editor.defineTheme('modern-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
                { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
                { token: 'string', foreground: 'CE9178' },
                { token: 'number', foreground: 'B5CEA8' },
                { token: 'type', foreground: '4EC9B0' },
                { token: 'function', foreground: 'DCDCAA' },
                { token: 'variable', foreground: '9CDCFE' },
                { token: 'constant', foreground: '4FC1FF' },
            ],
            colors: {
                'editor.background': '#0d1117',
                'editor.foreground': '#e6edf3',
                'editorLineNumber.foreground': '#7d8590',
                'editorLineNumber.activeForeground': '#e6edf3',
                'editor.selectionBackground': '#264f78',
                'editor.inactiveSelectionBackground': '#3a3d41',
                'editorCursor.foreground': '#e6edf3',
                'editor.lineHighlightBackground': '#161b22',
                'editorIndentGuide.background': '#21262d',
                'editorIndentGuide.activeBackground': '#30363d',
                'editor.wordHighlightBackground': '#264f7840',
                'editor.wordHighlightStrongBackground': '#264f7860',
            }
        });

        monaco.editor.setTheme('modern-dark');

        // Track cursor position
        editor.onDidChangeCursorPosition((e) => {
            setCursorPosition({
                line: e.position.lineNumber,
                column: e.position.column
            });
        });

        // Keyboard shortcuts
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            handleSave();
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
            setSearchVisible(true);
            editor.getAction('actions.find').run();
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Equal, () => {
            setFontSize(prev => Math.min(prev + 2, 24));
        });

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Minus, () => {
            setFontSize(prev => Math.max(prev - 2, 10));
        });

        // Set focus
        editor.focus();
    };

    const handleEditorChange = useCallback((value) => {
        if (onCodeChange) {
            onCodeChange(value);
        }
        setHasUnsavedChanges(true);
        
        // Auto-save after 2 seconds of inactivity
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }
        
        autoSaveTimeoutRef.current = setTimeout(() => {
            handleAutoSave(value);
        }, 2000);
    }, [onCodeChange]);

    const handleSave = useCallback(() => {
        if (selectedFile && onCodeChange) {
            setIsAutoSaving(true);
            onCodeChange(editorRef.current?.getValue());
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            setIsAutoSaving(false);
            toast.success('File saved successfully!', {
                icon: '💾',
                duration: 2000,
            });
        }
    }, [selectedFile, onCodeChange]);

    const handleAutoSave = useCallback((value) => {
        if (selectedFile && value !== undefined) {
            setIsAutoSaving(true);
            setTimeout(() => {
                setLastSaved(new Date());
                setHasUnsavedChanges(false);
                setIsAutoSaving(false);
            }, 500);
        }
    }, [selectedFile]);

    const copyToClipboard = useCallback(() => {
        const value = editorRef.current?.getValue();
        if (value) {
            navigator.clipboard.writeText(value);
            toast.success('Code copied to clipboard!', {
                icon: '📋',
                duration: 2000,
            });
        }
    }, []);

    const getLanguageFromFile = useCallback((filePath) => {
        if (!filePath || typeof filePath !== 'string') {
            return 'javascript';
        }

        const extension = filePath.split('.').pop()?.toLowerCase();
        
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'cpp': 'cpp',
            'c': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'h': 'cpp',
            'hpp': 'cpp',
            'java': 'java',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'json': 'json',
            'xml': 'xml',
            'md': 'markdown',
            'markdown': 'markdown',
            'sql': 'sql',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'sh': 'shell',
            'bash': 'shell',
            'yml': 'yaml',
            'yaml': 'yaml',
            'txt': 'plaintext',
            'log': 'plaintext'
        };

        return languageMap[extension] || 'plaintext';
    }, []);

    const formatLastSaved = useCallback((date) => {
        if (!date) return 'Never';
        
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    }, []);

    const currentLanguage = selectedFile ? getLanguageFromFile(selectedFile) : language;

    // Update editor font size
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({ fontSize });
        }
    }, [fontSize]);

    // Update editor word wrap
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({ wordWrap: wordWrap ? 'on' : 'off' });
        }
    }, [wordWrap]);

    // Update minimap
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({ minimap: { enabled: showMinimap } });
        }
    }, [showMinimap]);

    return (
        <div className={`editor-container ${isFullscreen ? 'fullscreen' : ''}`}>
            {/* Editor Header */}
            <div className="editor-header">
                <div className="editor-header-left">
                    <div className="file-info">
                        <FiFileText size={16} className="file-icon" />
                        <span className="file-name">
                            {selectedFile ? selectedFile.split('/').pop() : 'Untitled'}
                        </span>
                        {hasUnsavedChanges && <span className="unsaved-indicator">●</span>}
                        <span className="language-badge">{currentLanguage}</span>
                    </div>
                </div>

                <div className="editor-header-center">
                    {isAutoSaving && (
                        <div className="auto-save-indicator">
                            <div className="spinner"></div>
                            <span>Saving...</span>
                        </div>
                    )}
                </div>

                <div className="editor-header-right">
                    <div className="editor-actions">
                        <button
                            onClick={() => setSearchVisible(!searchVisible)}
                            className="action-btn"
                            title="Search (Ctrl+F)"
                        >
                            <FiSearch size={14} />
                        </button>
                        
                        <button
                            onClick={copyToClipboard}
                            className="action-btn"
                            title="Copy to clipboard"
                        >
                            <FiCopy size={14} />
                        </button>

                        <div className="zoom-controls">
                            <button
                                onClick={() => setFontSize(prev => Math.max(prev - 2, 10))}
                                className="action-btn"
                                title="Zoom out (Ctrl+-)"
                            >
                                <FiZoomOut size={14} />
                            </button>
                            <span className="zoom-level">{fontSize}px</span>
                            <button
                                onClick={() => setFontSize(prev => Math.min(prev + 2, 24))}
                                className="action-btn"
                                title="Zoom in (Ctrl++)"
                            >
                                <FiZoomIn size={14} />
                            </button>
                        </div>

                        <button
                            onClick={handleSave}
                            className="action-btn save-btn"
                            title="Save (Ctrl+S)"
                            disabled={!hasUnsavedChanges}
                        >
                            <FiSave size={14} />
                        </button>

                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="action-btn"
                            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                        >
                            {isFullscreen ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor Settings Panel */}
            <div className="editor-settings">
                <div className="settings-group">
                    <label className="setting-item">
                        <input
                            type="checkbox"
                            checked={wordWrap}
                            onChange={(e) => setWordWrap(e.target.checked)}
                        />
                        <span>Word Wrap</span>
                    </label>
                    
                    <label className="setting-item">
                        <input
                            type="checkbox"
                            checked={showMinimap}
                            onChange={(e) => setShowMinimap(e.target.checked)}
                        />
                        <span>Minimap</span>
                    </label>
                </div>
            </div>

            {/* Monaco Editor */}
            <div className="monaco-editor-wrapper">
                <MonacoEditor
                    height="100%"
                    language={currentLanguage}
                    value={code}
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                    options={{
                        selectOnLineNumbers: true,
                        matchBrackets: 'always',
                        autoClosingBrackets: 'always',
                        autoClosingQuotes: 'always',
                        formatOnPaste: true,
                        formatOnType: true,
                        dragAndDrop: true,
                        links: true,
                        mouseWheelZoom: true,
                        multiCursorModifier: 'ctrlCmd',
                        accessibilitySupport: 'auto',
                    }}
                />
            </div>

            {/* Status Bar */}
            <div className="editor-status-bar">
                <div className="status-left">
                    <span className="status-item">
                        <FiUser size={12} />
                        Line {cursorPosition.line}, Column {cursorPosition.column}
                    </span>
                    <span className="status-item">
                        {currentLanguage.toUpperCase()}
                    </span>
                    <span className="status-item">
                        UTF-8
                    </span>
                </div>

                <div className="status-right">
                    <span className="status-item">
                        <FiClock size={12} />
                        Last saved: {formatLastSaved(lastSaved)}
                    </span>
                    <span className="status-item">
                        {code?.split('\n').length || 0} lines
                    </span>
                </div>
            </div>

            <style jsx>{`
                .editor-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    background: #0d1117;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    transition: all 0.3s ease;
                }

                .editor-container.fullscreen {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 1000;
                    border-radius: 0;
                }

                .editor-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 16px;
                    background: #161b22;
                    border-bottom: 1px solid #21262d;
                    min-height: 48px;
                }

                .editor-header-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
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
                    color: #e6edf3;
                    font-weight: 500;
                    font-size: 14px;
                }

                .unsaved-indicator {
                    color: #f85149;
                    font-size: 18px;
                    line-height: 1;
                    margin-left: 4px;
                }

                .language-badge {
                    background: #1f6feb;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 500;
                    text-transform: uppercase;
                }

                .editor-header-center {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                }

                .auto-save-indicator {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #7d8590;
                    font-size: 12px;
                }

                .spinner {
                    width: 12px;
                    height: 12px;
                    border: 2px solid #21262d;
                    border-top: 2px solid #1f6feb;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .editor-header-right {
                    display: flex;
                    align-items: center;
                }

                .editor-actions {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .action-btn {
                    background: transparent;
                    border: none;
                    color: #7d8590;
                    cursor: pointer;
                    padding: 6px 8px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    font-size: 12px;
                }

                .action-btn:hover {
                    background: #21262d;
                    color: #e6edf3;
                }

                .action-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .save-btn:not(:disabled) {
                    color: #238636;
                }

                .save-btn:hover:not(:disabled) {
                    background: #1a2e1a;
                    color: #2ea043;
                }

                .zoom-controls {
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    margin: 0 8px;
                }

                .zoom-level {
                    color: #7d8590;
                    font-size: 11px;
                    min-width: 32px;
                    text-align: center;
                }

                .editor-settings {
                    padding: 8px 16px;
                    background: #0d1117;
                    border-bottom: 1px solid #21262d;
                }

                .settings-group {
                    display: flex;
                    gap: 16px;
                }

                .setting-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #7d8590;
                    font-size: 12px;
                    cursor: pointer;
                    user-select: none;
                }

                .setting-item input[type="checkbox"] {
                    accent-color: #1f6feb;
                }

                .monaco-editor-wrapper {
                    flex: 1;
                    overflow: hidden;
                }

                .editor-status-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 4px 16px;
                    background: #161b22;
                    border-top: 1px solid #21262d;
                    font-size: 11px;
                    color: #7d8590;
                    min-height: 24px;
                }

                .status-left,
                .status-right {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .status-item {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    white-space: nowrap;
                }

                @media (max-width: 768px) {
                    .editor-header {
                        padding: 6px 12px;
                        flex-wrap: wrap;
                        min-height: auto;
                    }

                    .editor-actions {
                        gap: 2px;
                    }

                    .zoom-controls {
                        display: none;
                    }

                    .editor-settings {
                        padding: 6px 12px;
                    }

                    .settings-group {
                        gap: 12px;
                    }

                    .status-left,
                    .status-right {
                        gap: 8px;
                    }

                    .status-item {
                        font-size: 10px;
                    }
                }
            `}</style>
        </div>
    );
};

export default Editor;