import React, { useEffect, useRef, useState } from 'react';
import { language, cmtheme, darkMode } from '../atoms';
import { useRecoilValue, useRecoilState } from 'recoil';
import ACTIONS from '../actions/Actions';
import { 
    FiSettings, FiMaximize2, FiMinimize2, FiType, FiEye, FiGrid,
    FiZap, FiSun, FiMoon, FiMonitor, FiChevronDown, FiCheck,
    FiCopy, FiDownload, FiUpload, FiRefreshCw, FiMenu, FiX,
    FiMoreHorizontal, FiCode, FiEdit3
} from 'react-icons/fi';

import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';

import 'codemirror/theme/3024-day.css';
import 'codemirror/theme/3024-night.css';
import 'codemirror/theme/abbott.css';
import 'codemirror/theme/abcdef.css';
import 'codemirror/theme/ambiance.css';
import 'codemirror/theme/ayu-dark.css';
import 'codemirror/theme/ayu-mirage.css';
import 'codemirror/theme/base16-dark.css';
import 'codemirror/theme/base16-light.css';
import 'codemirror/theme/bespin.css';
import 'codemirror/theme/blackboard.css';
import 'codemirror/theme/cobalt.css';
import 'codemirror/theme/colorforth.css';
import 'codemirror/theme/darcula.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/theme/duotone-dark.css';
import 'codemirror/theme/duotone-light.css';
import 'codemirror/theme/eclipse.css';
import 'codemirror/theme/elegant.css';
import 'codemirror/theme/erlang-dark.css';
import 'codemirror/theme/gruvbox-dark.css';
import 'codemirror/theme/hopscotch.css';
import 'codemirror/theme/icecoder.css';
import 'codemirror/theme/idea.css';
import 'codemirror/theme/isotope.css';
import 'codemirror/theme/juejin.css';
import 'codemirror/theme/lesser-dark.css';
import 'codemirror/theme/liquibyte.css';
import 'codemirror/theme/lucario.css';
import 'codemirror/theme/material.css';
import 'codemirror/theme/material-darker.css';
import 'codemirror/theme/material-palenight.css';
import 'codemirror/theme/material-ocean.css';
import 'codemirror/theme/mbo.css';
import 'codemirror/theme/mdn-like.css';
import 'codemirror/theme/midnight.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/theme/moxer.css';
import 'codemirror/theme/neat.css';
import 'codemirror/theme/neo.css';
import 'codemirror/theme/night.css';
import 'codemirror/theme/nord.css';
import 'codemirror/theme/oceanic-next.css';
import 'codemirror/theme/panda-syntax.css';
import 'codemirror/theme/paraiso-dark.css';
import 'codemirror/theme/paraiso-light.css';
import 'codemirror/theme/pastel-on-dark.css';
import 'codemirror/theme/railscasts.css';
import 'codemirror/theme/rubyblue.css';
import 'codemirror/theme/seti.css';
import 'codemirror/theme/shadowfox.css';
import 'codemirror/theme/solarized.css';
import 'codemirror/theme/the-matrix.css';
import 'codemirror/theme/tomorrow-night-bright.css';
import 'codemirror/theme/tomorrow-night-eighties.css';
import 'codemirror/theme/ttcn.css';
import 'codemirror/theme/twilight.css';
import 'codemirror/theme/vibrant-ink.css';
import 'codemirror/theme/xq-dark.css';
import 'codemirror/theme/xq-light.css';
import 'codemirror/theme/yeti.css';
import 'codemirror/theme/yonce.css';
import 'codemirror/theme/zenburn.css';

import 'codemirror/mode/clike/clike';
import 'codemirror/mode/css/css';
import 'codemirror/mode/dart/dart';
import 'codemirror/mode/django/django';
import 'codemirror/mode/dockerfile/dockerfile';
import 'codemirror/mode/go/go';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/jsx/jsx';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/php/php';
import 'codemirror/mode/python/python';
import 'codemirror/mode/r/r';
import 'codemirror/mode/rust/rust';
import 'codemirror/mode/ruby/ruby';
import 'codemirror/mode/sass/sass';
import 'codemirror/mode/shell/shell';
import 'codemirror/mode/sql/sql';
import 'codemirror/mode/swift/swift';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/yaml/yaml';

import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/scroll/simplescrollbars.css';

import 'codemirror/addon/search/search.js';
import 'codemirror/addon/search/searchcursor.js';
import 'codemirror/addon/search/jump-to-line.js';
import 'codemirror/addon/dialog/dialog.js';
import 'codemirror/addon/dialog/dialog.css';
import './Editor.css';

const Editor = ({ socketRef, roomId, onCodeChange }) => {
    const editorRef = useRef(null);
    const [lang, setLang] = useRecoilState(language);
    const [editorTheme, setEditorTheme] = useRecoilState(cmtheme);
    const [isDark, setIsDark] = useRecoilState(darkMode);
    
    // UI state
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [fontSize, setFontSize] = useState(14);
    const [lineHeight, setLineHeight] = useState(1.6);
    const [showLineNumbers, setShowLineNumbers] = useState(true);
    const [wordWrap, setWordWrap] = useState(false);
    const [cursorBlinkRate, setCursorBlinkRate] = useState(530);
    
    // Mobile responsive state
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    // Theme categories
    const themeCategories = {
        'Dark Themes': [
            { value: 'monokai', label: 'Monokai Pro', preview: '#2D2A2E' },
            { value: 'dracula', label: 'Dracula', preview: '#282A36' },
            { value: 'material-darker', label: 'Material Darker', preview: '#212121' },
            { value: 'material-ocean', label: 'Material Ocean', preview: '#0F111A' },
            { value: 'darcula', label: 'Darcula', preview: '#2B2B2B' },
            { value: 'nord', label: 'Nord', preview: '#2E3440' },
            { value: 'oceanic-next', label: 'Oceanic Next', preview: '#1B2B34' },
            { value: 'gruvbox-dark', label: 'Gruvbox Dark', preview: '#282828' },
            { value: 'tomorrow-night-eighties', label: 'Tomorrow Night 80s', preview: '#2D2D2D' },
            { value: 'panda-syntax', label: 'Panda', preview: '#292A2B' },
            { value: 'shadowfox', label: 'Shadowfox', preview: '#2A2A2E' },
            { value: 'zenburn', label: 'Zenburn', preview: '#3F3F3F' }
        ],
        'Light Themes': [
            { value: 'default', label: 'Default Light', preview: '#FFFFFF' },
            { value: 'eclipse', label: 'Eclipse', preview: '#FFFFFF' },
            { value: 'elegant', label: 'Elegant', preview: '#FFFFFF' },
            { value: 'neat', label: 'Neat', preview: '#FFFFFF' },
            { value: 'solarized', label: 'Solarized Light', preview: '#FDF6E3' },
            { value: 'base16-light', label: 'Base16 Light', preview: '#F5F5F5' },
            { value: 'duotone-light', label: 'Duotone Light', preview: '#FAFAFA' },
            { value: 'mdn-like', label: 'MDN Like', preview: '#FFFFFF' },
            { value: 'yeti', label: 'Yeti', preview: '#FFFFFF' },
            { value: 'paraiso-light', label: 'Paraiso Light', preview: '#E7E9DB' }
        ],
        'Vibrant Themes': [
            { value: 'material', label: 'Material', preview: '#263238' },
            { value: 'cobalt', label: 'Cobalt', preview: '#002240' },
            { value: 'vibrant-ink', label: 'Vibrant Ink', preview: '#0F0F0F' },
            { value: 'the-matrix', label: 'The Matrix', preview: '#000000' },
            { value: 'blackboard', label: 'Blackboard', preview: '#0C1021' },
            { value: 'twilight', label: 'Twilight', preview: '#141414' },
            { value: 'night', label: 'Night', preview: '#0A0A0A' },
            { value: 'midnight', label: 'Midnight', preview: '#0F0F23' }
        ],
        'Specialty Themes': [
            { value: 'ayu-dark', label: 'Ayu Dark', preview: '#0A0E27' },
            { value: 'ayu-mirage', label: 'Ayu Mirage', preview: '#1F2430' },
            { value: 'lucario', label: 'Lucario', preview: '#2B3E50' },
            { value: 'railscasts', label: 'Railscasts', preview: '#2B2B2B' },
            { value: 'rubyblue', label: 'Ruby Blue', preview: '#112435' },
            { value: 'seti', label: 'Seti', preview: '#151718' },
            { value: 'juejin', label: 'Juejin', preview: '#1E1E1E' },
            { value: 'yonce', label: 'Yoncé', preview: '#1C1C1C' }
        ]
    };

    const languageModes = {
        javascript: { mode: 'javascript', icon: '🟨', name: 'JavaScript' },
        typescript: { mode: 'javascript', icon: '🔷', name: 'TypeScript' },
        python: { mode: 'python', icon: '🐍', name: 'Python' },
        java: { mode: 'clike', icon: '☕', name: 'Java' },
        cpp: { mode: 'clike', icon: '⚡', name: 'C++' },
        c: { mode: 'clike', icon: '🔵', name: 'C' },
        go: { mode: 'go', icon: '🔵', name: 'Go' },
        rust: { mode: 'rust', icon: '🦀', name: 'Rust' },
        php: { mode: 'php', icon: '🐘', name: 'PHP' },
        ruby: { mode: 'ruby', icon: '💎', name: 'Ruby' },
        swift: { mode: 'swift', icon: '🍎', name: 'Swift' },
        kotlin: { mode: 'clike', icon: '🟣', name: 'Kotlin' },
        dart: { mode: 'dart', icon: '🎯', name: 'Dart' },
        html: { mode: 'htmlmixed', icon: '🌐', name: 'HTML' },
        css: { mode: 'css', icon: '🎨', name: 'CSS' },
        sql: { mode: 'sql', icon: '🗃️', name: 'SQL' },
        markdown: { mode: 'markdown', icon: '📝', name: 'Markdown' },
        yaml: { mode: 'yaml', icon: '⚙️', name: 'YAML' },
        xml: { mode: 'xml', icon: '📄', name: 'XML' },
        shell: { mode: 'shell', icon: '💻', name: 'Shell' }
    };

    useEffect(() => {
        async function init() {
            const textarea = document.getElementById('realtimeEditor');
            if (!textarea) return;

            // Destroy existing editor if it exists
            if (editorRef.current) {
                editorRef.current.toTextArea();
            }

            editorRef.current = Codemirror.fromTextArea(textarea, {
                mode: languageModes[lang]?.mode || 'javascript',
                theme: editorTheme,
                autoCloseTags: true,
                autoCloseBrackets: true,
                lineNumbers: showLineNumbers,
                lineWrapping: wordWrap,
                cursorBlinkRate: cursorBlinkRate,
                indentUnit: 2,
                tabSize: 2,
                smartIndent: true,
                electricChars: true,
                matchBrackets: true,
                autoRefresh: true,
                styleActiveLine: true,
                foldGutter: !isMobile,
                gutters: isMobile 
                    ? ['CodeMirror-linenumbers'] 
                    : ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
                extraKeys: {
                    'Ctrl-Space': 'autocomplete',
                    'F11': () => !isMobile && toggleFullscreen(),
                    'Esc': () => setIsFullscreen(false)
                }
            });

            // Apply custom styling
            const wrapper = editorRef.current.getWrapperElement();
            wrapper.style.fontSize = `${fontSize}px`;
            wrapper.style.lineHeight = lineHeight;
            wrapper.style.height = '100%';
            
            // Mobile-specific optimizations
            if (isMobile) {
                wrapper.style.touchAction = 'manipulation';
                wrapper.style.WebkitTextSizeAdjust = 'none';
            }

            editorRef.current.on('change', (instance, changes) => {
                const { origin } = changes;
                const code = instance.getValue();
                onCodeChange(code);
                if (origin !== 'setValue') {
                    socketRef.current?.emit(ACTIONS.CODE_CHANGE, {
                        roomId,
                        code,
                    });
                }
            });

            // Set initial code sample
            if (editorRef.current.getValue() === '') {
                const sampleCode = getSampleCode(lang);
                editorRef.current.setValue(sampleCode);
            }
        }
        init();

        return () => {
            if (editorRef.current) {
                editorRef.current.toTextArea();
            }
        };
    }, [lang, editorTheme, showLineNumbers, wordWrap, cursorBlinkRate, fontSize, lineHeight, isMobile]);

    // Update editor options when settings change
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.setOption('lineNumbers', showLineNumbers);
            editorRef.current.setOption('lineWrapping', wordWrap);
            editorRef.current.setOption('cursorBlinkRate', cursorBlinkRate);
            
            const wrapper = editorRef.current.getWrapperElement();
            wrapper.style.fontSize = `${fontSize}px`;
            wrapper.style.lineHeight = lineHeight;
            
            editorRef.current.refresh();
        }
    }, [showLineNumbers, wordWrap, cursorBlinkRate, fontSize, lineHeight]);

    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code !== null && editorRef.current) {
                    const currentCode = editorRef.current.getValue();
                    if (currentCode !== code) {
                        editorRef.current.setValue(code);
                    }
                }
            });
        }

        return () => {
            socketRef.current?.off(ACTIONS.CODE_CHANGE);
        };
    }, [socketRef.current]);

    const getSampleCode = (language) => {
        const samples = {
            javascript: `// Welcome to CodeSync Pro! 🚀
console.log("Hello, World!");

function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci sequence:");
for (let i = 0; i < 10; i++) {
    console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`,
            
            python: `# Welcome to CodeSync Pro! 🚀
print("Hello, World!")

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print("Fibonacci sequence:")
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")`,
    
            java: `// Welcome to CodeSync Pro! 🚀
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        System.out.println("Fibonacci sequence:");
        for (int i = 0; i < 10; i++) {
            System.out.println("F(" + i + ") = " + fibonacci(i));
        }
    }
    
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
}`,
            
            cpp: `// Welcome to CodeSync Pro! 🚀
#include <iostream>
using namespace std;

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    cout << "Hello, World!" << endl;
    
    cout << "Fibonacci sequence:" << endl;
    for (int i = 0; i < 10; i++) {
        cout << "F(" << i << ") = " << fibonacci(i) << endl;
    }
    
    return 0;
}`
        };
        
        return samples[language] || samples.javascript;
    };

    const toggleFullscreen = () => {
        const wrapper = editorRef.current?.getWrapperElement();
        if (!wrapper) return;

        if (!isFullscreen) {
            wrapper.requestFullscreen?.();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen?.();
            setIsFullscreen(false);
        }
    };

    const copyCode = () => {
        if (editorRef.current) {
            navigator.clipboard.writeText(editorRef.current.getValue());
        }
    };

    const downloadCode = () => {
        if (editorRef.current) {
            const code = editorRef.current.getValue();
            const ext = languageModes[lang]?.mode === 'clike' ? 'cpp' : lang;
            const blob = new Blob([code], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `code.${ext}`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const formatCode = () => {
        if (editorRef.current) {
            const code = editorRef.current.getValue();
            // Basic formatting - in a real app you'd use a proper formatter
            const formatted = code.replace(/;/g, ';\n').replace(/{/g, '{\n').replace(/}/g, '\n}');
            editorRef.current.setValue(formatted);
        }
    };

    // Handle window resize for responsiveness
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            
            // Auto-enable word wrap on mobile
            if (mobile && !wordWrap) {
                setWordWrap(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [wordWrap]);

    // Mobile helper functions
    const insertText = (text) => {
        if (editorRef.current) {
            const doc = editorRef.current.getDoc();
            const cursor = doc.getCursor();
            doc.replaceRange(text, cursor);
            editorRef.current.focus();
        }
    };

    const quickActions = [
        { icon: FiCopy, label: 'Copy', action: copyCode },
        { icon: FiDownload, label: 'Download', action: downloadCode },
        { icon: FiZap, label: 'Format', action: formatCode },
        { icon: isFullscreen ? FiMinimize2 : FiMaximize2, label: isFullscreen ? 'Exit Full' : 'Fullscreen', action: toggleFullscreen }
    ];

    return (
        <div className={`editor-container ${isDark ? 'dark' : 'light'} ${isFullscreen ? 'fullscreen' : ''} ${isMobile ? 'mobile' : 'desktop'}`}>
            {isMobile ? (
                // Mobile Toolbar
                <div className="mobile-editor-toolbar">
                    <div className="mobile-toolbar-main">
                        <div className="mobile-language-info">
                            <span className="language-icon">{languageModes[lang]?.icon}</span>
                            <span className="language-name">{languageModes[lang]?.name}</span>
                        </div>
                        
                        <div className="mobile-actions">
                            <button 
                                className="mobile-action-btn"
                                onClick={() => setShowMobileMenu(!showMobileMenu)}
                            >
                                <FiMoreHorizontal size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Quick Keys Bar */}
                    <div className="mobile-quick-keys">
                        {['{', '}', '(', ')', '[', ']', ';', '"', "'", 'Tab'].map((key) => (
                            <button
                                key={key}
                                className="quick-key-btn"
                                onClick={() => insertText(key === 'Tab' ? '    ' : key)}
                            >
                                {key}
                            </button>
                        ))}
                    </div>

                    {/* Mobile Settings Menu */}
                    {showMobileMenu && (
                        <div className="mobile-settings-overlay">
                            <div className="mobile-settings-panel">
                                <div className="mobile-settings-header">
                                    <h3>Editor Settings</h3>
                                    <button onClick={() => setShowMobileMenu(false)}>
                                        <FiX size={20} />
                                    </button>
                                </div>

                                <div className="mobile-settings-content">
                                    <div className="setting-section">
                                        <h4>Language</h4>
                                        <div className="language-grid">
                                            {Object.entries(languageModes).map(([key, { icon, name }]) => (
                                                <button
                                                    key={key}
                                                    className={`language-option ${lang === key ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setLang(key);
                                                        setShowMobileMenu(false);
                                                    }}
                                                >
                                                    <span className="lang-icon">{icon}</span>
                                                    <span className="lang-name">{name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="setting-section">
                                        <h4>Theme</h4>
                                        <div className="theme-categories">
                                            {Object.entries(themeCategories).map(([category, themes]) => (
                                                <div key={category} className="theme-category">
                                                    <h5>{category}</h5>
                                                    <div className="theme-options">
                                                        {themes.map((theme) => (
                                                            <button
                                                                key={theme.value}
                                                                className={`theme-option ${editorTheme === theme.value ? 'active' : ''}`}
                                                                onClick={() => {
                                                                    setEditorTheme(theme.value);
                                                                }}
                                                            >
                                                                <div 
                                                                    className="theme-color" 
                                                                    style={{ backgroundColor: theme.preview }}
                                                                ></div>
                                                                <span>{theme.label}</span>
                                                                {editorTheme === theme.value && <FiCheck size={12} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="setting-section">
                                        <h4>Editor Options</h4>
                                        <div className="editor-options">
                                            <div className="option-row">
                                                <label>Font Size: {fontSize}px</label>
                                                <div className="size-controls">
                                                    <button onClick={() => setFontSize(Math.max(10, fontSize - 1))}>-</button>
                                                    <button onClick={() => setFontSize(Math.min(24, fontSize + 1))}>+</button>
                                                </div>
                                            </div>
                                            
                                            <div className="option-toggle">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={showLineNumbers}
                                                        onChange={(e) => setShowLineNumbers(e.target.checked)}
                                                    />
                                                    <span>Line Numbers</span>
                                                </label>
                                            </div>
                                            
                                            <div className="option-toggle">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={wordWrap}
                                                        onChange={(e) => setWordWrap(e.target.checked)}
                                                    />
                                                    <span>Word Wrap</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="setting-section">
                                        <h4>Quick Actions</h4>
                                        <div className="quick-actions-grid">
                                            {quickActions.map((action, index) => (
                                                <button
                                                    key={index}
                                                    className="quick-action-btn"
                                                    onClick={() => {
                                                        action.action();
                                                        setShowMobileMenu(false);
                                                    }}
                                                >
                                                    <action.icon size={16} />
                                                    <span>{action.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // Desktop Toolbar
                <div className="desktop-editor-toolbar">
                    <div className="toolbar-left">
                        <div className="language-selector">
                            <select 
                                value={lang} 
                                onChange={(e) => setLang(e.target.value)}
                                className="language-select"
                            >
                                {Object.entries(languageModes).map(([key, { icon, name }]) => (
                                    <option key={key} value={key}>
                                        {icon} {name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="theme-selector">
                            <button 
                                className="theme-button"
                                onClick={() => setShowSettings(!showSettings)}
                            >
                                <FiEdit3 size={14} />
                                <span>Theme & Settings</span>
                                <FiChevronDown size={12} />
                            </button>
                            
                            {showSettings && (
                                <div className="desktop-settings-dropdown">
                                    <div className="settings-header">
                                        <h3>Editor Configuration</h3>
                                        <button onClick={() => setShowSettings(false)}>
                                            <FiX size={16} />
                                        </button>
                                    </div>

                                    <div className="settings-tabs">
                                        <div className="settings-content">
                                            {Object.entries(themeCategories).map(([category, themes]) => (
                                                <div key={category} className="theme-category">
                                                    <div className="category-header">
                                                        <FiEdit3 size={14} />
                                                        <span>{category}</span>
                                                    </div>
                                                    <div className="theme-grid">
                                                        {themes.map((theme) => (
                                                            <button
                                                                key={theme.value}
                                                                className={`theme-card ${editorTheme === theme.value ? 'active' : ''}`}
                                                                onClick={() => {
                                                                    setEditorTheme(theme.value);
                                                                }}
                                                            >
                                                                <div 
                                                                    className="theme-preview" 
                                                                    style={{ backgroundColor: theme.preview }}
                                                                >
                                                                    {editorTheme === theme.value && <FiCheck size={16} />}
                                                                </div>
                                                                <span className="theme-name">{theme.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            <div className="editor-settings">
                                                <h4>
                                                    <FiSettings size={14} />
                                                    Editor Settings
                                                </h4>
                                                
                                                <div className="settings-grid">
                                                    <div className="setting-item">
                                                        <label>Font Size</label>
                                                        <div className="range-control">
                                                            <input
                                                                type="range"
                                                                min="10"
                                                                max="24"
                                                                value={fontSize}
                                                                onChange={(e) => setFontSize(Number(e.target.value))}
                                                            />
                                                            <span className="range-value">{fontSize}px</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="setting-item">
                                                        <label>Line Height</label>
                                                        <div className="range-control">
                                                            <input
                                                                type="range"
                                                                min="1.2"
                                                                max="2.0"
                                                                step="0.1"
                                                                value={lineHeight}
                                                                onChange={(e) => setLineHeight(Number(e.target.value))}
                                                            />
                                                            <span className="range-value">{lineHeight}</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="setting-toggle">
                                                        <label className="toggle-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={showLineNumbers}
                                                                onChange={(e) => setShowLineNumbers(e.target.checked)}
                                                            />
                                                            <span className="toggle-switch"></span>
                                                            <span>Line Numbers</span>
                                                        </label>
                                                    </div>
                                                    
                                                    <div className="setting-toggle">
                                                        <label className="toggle-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={wordWrap}
                                                                onChange={(e) => setWordWrap(e.target.checked)}
                                                            />
                                                            <span className="toggle-switch"></span>
                                                            <span>Word Wrap</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="toolbar-right">
                        {quickActions.map((action, index) => (
                            <button 
                                key={index}
                                className="toolbar-btn" 
                                onClick={action.action} 
                                title={action.label}
                            >
                                <action.icon size={14} />
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* CodeMirror Editor */}
            <div className="editor-wrapper">
                <textarea id="realtimeEditor"></textarea>
            </div>
            
            {/* Overlays */}
            {showSettings && !isMobile && (
                <div 
                    className="settings-overlay" 
                    onClick={() => setShowSettings(false)}
                />
            )}
            
            {showMobileMenu && isMobile && (
                <div 
                    className="mobile-overlay" 
                    onClick={() => setShowMobileMenu(false)}
                />
            )}
        </div>
    );
};

export default Editor;