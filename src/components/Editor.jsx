import React, { useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { toast } from 'react-hot-toast';

const Editor = ({ socketRef, roomId, onCodeChange, code, language = 'javascript', selectedFile }) => {
    const editorRef = useRef(null);

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        
        // Configure editor        npm install @monaco-editor/react socket.io-client react-icons xterm xterm-addon-fit xterm-addon-web-links
        editor.updateOptions({
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
        });

        // Set up themes
        monaco.editor.defineTheme('custom-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
                { token: 'keyword', foreground: '569CD6' },
                { token: 'string', foreground: 'CE9178' },
                { token: 'number', foreground: 'B5CEA8' },
            ],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#d4d4d4',
                'editorLineNumber.foreground': '#858585',
                'editor.selectionBackground': '#264f78',
                'editor.inactiveSelectionBackground': '#3a3d41',
            }
        });

        monaco.editor.setTheme('custom-dark');

        // Handle keyboard shortcuts
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            // Prevent default save and emit custom save event
            if (selectedFile && onCodeChange) {
                onCodeChange(editor.getValue());
                toast.success('Changes saved!');
            }
        });

        // Set focus
        editor.focus();
    };

    const handleEditorChange = (value) => {
        if (onCodeChange) {
            onCodeChange(value);
        }
    };

    const getLanguageFromFile = (filePath) => {
        if (!filePath) return 'javascript';
        
        const extension = filePath.split('.').pop()?.toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'json': 'json',
            'xml': 'xml',
            'md': 'markdown',
            'sh': 'shell',
            'sql': 'sql',
            'dockerfile': 'dockerfile',
            'yaml': 'yaml',
            'yml': 'yaml',
        };
        
        return languageMap[extension] || 'plaintext';
    };

    const currentLanguage = selectedFile ? getLanguageFromFile(selectedFile) : language;

    return (
        <div className="editor-container">
            <div className="editor-subheader">
                <div className="file-info">
                    {selectedFile ? (
                        <span className="file-name">{selectedFile.split('/').pop()}</span>
                    ) : (
                        <span className="file-name">Untitled</span>
                    )}
                    <span className="language-badge">{currentLanguage}</span>
                </div>
            </div>
            
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
                    }}
                />
            </div>
        </div>
    );
};

export default Editor;