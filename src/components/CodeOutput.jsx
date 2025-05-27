import React, { useState, useEffect } from 'react';
import ACTIONS from '../actions/Actions';
import { FiPlay, FiSquare, FiTrash2, FiDownload, FiCopy, FiAlertCircle, FiCheck } from 'react-icons/fi';

const CodeOutput = ({ socketRef, roomId, code, language, username }) => {
    const [output, setOutput] = useState('');
    const [isCompiling, setIsCompiling] = useState(false);
    const [compilationHistory, setCompilationHistory] = useState([]);
    const [outputType, setOutputType] = useState('output'); // 'output', 'errors', 'warnings'

    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.COMPILATION_RESULT, ({ result, username: compilerUsername }) => {
                setIsCompiling(false);
                const newResult = {
                    username: compilerUsername,
                    timestamp: new Date().toLocaleTimeString(),
                    result
                };
                setCompilationHistory(prev => [...prev, newResult]);
                setOutput(result.output || result.error || result.stderr || 'No output');
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.off(ACTIONS.COMPILATION_RESULT);
            }
        };
    }, [socketRef]);

    const compileCode = () => {
        if (!code.trim()) {
            setOutput('No code to compile. Please write some code first.');
            return;
        }

        setIsCompiling(true);
        setOutput('⚡ Executing code...\n');
        
        socketRef.current.emit(ACTIONS.COMPILE_CODE, {
            roomId,
            code,
            language,
            username
        });
    };

    const stopExecution = () => {
        setIsCompiling(false);
        setOutput(prev => prev + '\n🛑 Execution stopped by user');
    };

    const clearOutput = () => {
        setOutput('');
        setCompilationHistory([]);
    };

    const copyOutput = async () => {
        try {
            await navigator.clipboard.writeText(output);
            // Show success feedback
        } catch (err) {
            console.error('Failed to copy output');
        }
    };

    const downloadOutput = () => {
        const blob = new Blob([output], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `output_${new Date().toISOString().slice(0, 19)}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getLanguageInfo = () => {
        const langMap = {
            javascript: { name: 'JavaScript', version: 'ES2022', icon: '🟨' },
            python: { name: 'Python', version: '3.11', icon: '🐍' },
            java: { name: 'Java', version: '17', icon: '☕' },
            cpp: { name: 'C++', version: '20', icon: '⚡' },
            go: { name: 'Go', version: '1.20', icon: '🐹' },
            rust: { name: 'Rust', version: '1.70', icon: '🦀' }
        };
        return langMap[language] || { name: language, version: '', icon: '📄' };
    };

    const langInfo = getLanguageInfo();

    return (
        <div className="enterprise-output">
            {/* Output Header */}
            <div className="output-header">
                <div className="output-title">
                    <div className="language-badge">
                        <span className="language-icon">{langInfo.icon}</span>
                        <span className="language-name">{langInfo.name}</span>
                        {langInfo.version && (
                            <span className="language-version">{langInfo.version}</span>
                        )}
                    </div>
                    
                    <div className="execution-status">
                        {isCompiling ? (
                            <span className="status running">
                                <div className="spinner"></div>
                                Running...
                            </span>
                        ) : (
                            <span className="status ready">
                                <FiCheck size={14} />
                                Ready
                            </span>
                        )}
                    </div>
                </div>

                <div className="output-actions">
                    <button 
                        onClick={compileCode} 
                        disabled={isCompiling}
                        className="action-btn primary"
                        title="Run code"
                    >
                        <FiPlay size={16} />
                        <span>Run</span>
                    </button>
                    
                    {isCompiling && (
                        <button 
                            onClick={stopExecution}
                            className="action-btn danger"
                            title="Stop execution"
                        >
                            <FiSquare size={16} />
                            <span>Stop</span>
                        </button>
                    )}
                    
                    <div className="action-divider"></div>
                    
                    <button 
                        onClick={copyOutput}
                        className="action-btn secondary"
                        title="Copy output"
                        disabled={!output}
                    >
                        <FiCopy size={16} />
                    </button>
                    
                    <button 
                        onClick={downloadOutput}
                        className="action-btn secondary"
                        title="Download output"
                        disabled={!output}
                    >
                        <FiDownload size={16} />
                    </button>
                    
                    <button 
                        onClick={clearOutput}
                        className="action-btn secondary"
                        title="Clear output"
                        disabled={!output}
                    >
                        <FiTrash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Output Tabs */}
            <div className="output-tabs">
                {['output', 'errors', 'warnings'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setOutputType(tab)}
                        className={`output-tab ${outputType === tab ? 'active' : ''}`}
                    >
                        {tab === 'errors' && <FiAlertCircle size={14} />}
                        <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                        {tab === 'errors' && (
                            <span className="tab-count error">2</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Output Content */}
            <div className="output-content">
                {output ? (
                    <div className="console-output">
                        <pre className="output-text">{output}</pre>
                        
                        {isCompiling && (
                            <div className="execution-indicator">
                                <div className="pulse-dot"></div>
                                <span>Executing {langInfo.name} code...</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="output-placeholder">
                        <div className="placeholder-icon">
                            <FiPlay size={48} />
                        </div>
                        <h4>No output yet</h4>
                        <p>Run your {langInfo.name} code to see the output here.</p>
                        <button 
                            onClick={compileCode}
                            className="placeholder-cta"
                            disabled={!code.trim()}
                        >
                            <FiPlay size={16} />
                            Run Code
                        </button>
                    </div>
                )}
            </div>

            {/* Execution History */}
            {compilationHistory.length > 0 && (
                <div className="execution-history">
                    <div className="history-header">
                        <h5>Recent Executions</h5>
                        <span className="history-count">{compilationHistory.length}</span>
                    </div>
                    
                    <div className="history-list">
                        {compilationHistory.slice(-3).map((item, index) => (
                            <div key={index} className="history-item">
                                <div className="history-meta">
                                    <span className="history-user">{item.username}</span>
                                    <span className="history-time">{item.timestamp}</span>
                                    <span className={`history-status ${item.result.error ? 'error' : 'success'}`}>
                                        {item.result.error ? 'Failed' : 'Success'}
                                    </span>
                                </div>
                                
                                <div className="history-output">
                                    <pre>{item.result.output || item.result.error || 'No output'}</pre>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodeOutput;
