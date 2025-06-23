import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { initSocket } from '../socket';
import ACTIONS from '../actions/Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import Terminal from '../components/Terminal';
import FileExplorer from '../components/FileExplorer';
import Chat from '../components/Chat';
import { useAuth } from '../context/AuthContext';
import { 
    FiUsers, 
    FiMessageSquare, 
    FiFolder, 
    FiTerminal, 
    FiSettings,
    FiPlay,
    FiSave,
    FiDownload
} from 'react-icons/fi';

const EditorPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    
    const [clients, setClients] = useState([]);
    const [containerId, setContainerId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileContent, setFileContent] = useState('// Welcome to the collaborative editor!\n// Start coding together...\n');
    const [isTerminalVisible, setIsTerminalVisible] = useState(true);
    const [isFileExplorerVisible, setIsFileExplorerVisible] = useState(true);
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [language, setLanguage] = useState('javascript');
    const [isRunning, setIsRunning] = useState(false);
    const [currentFile, setCurrentFile] = useState(null);
    const [code, setCode] = useState('');

    useEffect(() => {
        const init = async () => {
            if (!user?.username) {
                toast.error('Please login to join the room');
                navigate('/login');
                return;
            }

            try {
                socketRef.current = await initSocket();
                
                socketRef.current.on('connect_error', (err) => handleErrors(err));
                socketRef.current.on('connect_failed', (err) => handleErrors(err));

                // Join the room
                socketRef.current.emit(ACTIONS.JOIN, {
                    roomId,
                    username: user.username,
                });

                // Listen for new clients joining
                socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
                    if (username !== user.username) {
                        toast.success(`${username} joined the room`);
                    }
                    setClients(clients);
                    
                    // Sync code with new client
                    socketRef.current.emit(ACTIONS.SYNC_CODE, {
                        code: codeRef.current,
                        socketId,
                    });
                });

                // Listen for clients disconnecting
                socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                    toast(`${username} left the room`, { icon: '👋' });
                    setClients((prev) => prev.filter((client) => client.socketId !== socketId));
                });

                // Listen for code changes
                socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                    if (code !== null) {
                        setFileContent(code);
                    }
                });

                // Docker container events
                socketRef.current.on('docker:container-ready', ({ containerId, status }) => {
                    setContainerId(containerId);
                    toast.success('Docker container is ready!');
                });

                socketRef.current.on('docker:container-error', ({ error }) => {
                    toast.error(`Docker error: ${error}`);
                });

                // File system events
                socketRef.current.on('docker:file-content', ({ path, content }) => {
                    setFileContent(content);
                    setSelectedFile(path);
                });

                socketRef.current.on('docker:file-saved', ({ path }) => {
                    toast.success(`File saved: ${path}`);
                });

                socketRef.current.on('docker:file-error', (error) => {
                    toast.error(`File operation failed: ${error}`);
                });

            } catch (error) {
                console.error('Socket initialization error:', error);
                toast.error('Failed to connect to the server');
                navigate('/');
            }
        };

        init();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.CODE_CHANGE);
            }
        };
    }, [roomId, user, navigate]);

    const handleErrors = (e) => {
        console.error('Socket error:', e);
        toast.error('Socket connection failed, try again later.');
        navigate('/');
    };

    const copyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied to clipboard!');
        } catch (err) {
            toast.error('Could not copy the Room ID');
        }
    };

    const leaveRoom = () => {
        navigate('/');
    };

    const handleCodeChange = (code) => {
        codeRef.current = code;
        setFileContent(code);
        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                roomId,
                code,
            });
        }
    };

    const handleFileSelect = useCallback((file) => {
        console.log('📄 File selected:', file);
        
        // Validate file object
        if (!file || typeof file !== 'object') {
            console.error('Invalid file object:', file);
            return;
        }

        // Ensure file has required properties
        const validatedFile = {
            name: file.name || 'untitled',
            path: file.path || '',
            type: file.type || 'file',
            size: file.size || 0
        };

        setCurrentFile(validatedFile);
        
        // Clear current content while loading
        setCode('// Loading file...');
        
        // Don't immediately request content here as FileExplorer already does it
        // Just set the file and wait for content to arrive via socket
    }, []);

    useEffect(() => {
        if (!socketRef.current) return;

        const handleFileContent = ({ path, content, error }) => {
            console.log('📄 Received file content for:', path);
            
            if (error) {
                console.error('Error loading file content:', error);
                setCode(`// Error loading file: ${error}`);
                return;
            }

            // Validate that this content is for the current file
            if (currentFile && currentFile.path === path) {
                setCode(content || '');
                console.log('✅ File content loaded successfully');
            } else {
                console.warn('Received content for different file:', path, 'current:', currentFile?.path);
            }
        };

        const handleFileError = ({ error, operation, path }) => {
            console.error(`File operation ${operation} failed:`, error, 'path:', path);
            
            if (operation === 'read-file' && currentFile && currentFile.path === path) {
                setCode(`// Error loading file: ${error}`);
            }
        };

        const handleFileSaved = ({ path, success, error }) => {
            if (success) {
                console.log('✅ File saved successfully:', path);
            } else {
                console.error('❌ Failed to save file:', path, error);
            }
        };

        socketRef.current.on('docker:file-content', handleFileContent);
        socketRef.current.on('docker:file-error', handleFileError);
        socketRef.current.on('docker:file-saved', handleFileSaved);

        return () => {
            if (socketRef.current) {
                socketRef.current.off('docker:file-content', handleFileContent);
                socketRef.current.off('docker:file-error', handleFileError);
                socketRef.current.off('docker:file-saved', handleFileSaved);
            }
        };
    }, [currentFile]);

    const saveCurrentFile = useCallback(() => {
        if (!currentFile || !currentFile.path || !socketRef.current) {
            console.warn('Cannot save: no current file or socket connection');
            return;
        }

        console.log('💾 Saving file:', currentFile.path);
        
        socketRef.current.emit('docker:write-file', {
            roomId,
            containerId,
            path: currentFile.path,
            content: code
        });
    }, [currentFile, code, roomId, containerId, socketRef]);

    useEffect(() => {
        if (!currentFile || !currentFile.path) return;

        const autoSaveTimer = setTimeout(() => {
            saveCurrentFile();
        }, 2000);

        return () => clearTimeout(autoSaveTimer);
    }, [code, saveCurrentFile, currentFile]);

    const runCode = async () => {
        if (!containerId) {
            toast.error('Container not ready');
            return;
        }

        setIsRunning(true);
        if (selectedFile) {
            saveCurrentFile();
        }
        
        toast.success('Code execution started in terminal');
        setIsRunning(false);
    };

    if (!user) {
        return (
            <div className="editor-loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading editor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="editor-page">
            {/* Header */}
            <div className="editor-header">
                <div className="editor-header-left">
                    <h1 className="room-title">
                        <span className="room-label">Room:</span>
                        <span className="room-id">{roomId}</span>
                    </h1>
                    <div className="clients-info">
                        <FiUsers size={16} />
                        <span>{clients.length} online</span>
                    </div>
                </div>

                <div className="editor-header-center">
                    {currentFile && (
                        <div className="current-file-info">
                            <FiFolder size={16} />
                            <span>{currentFile.name}</span>
                            <button 
                                onClick={saveCurrentFile}
                                className="save-btn"
                                title="Save file (Ctrl+S)"
                            >
                                <FiSave size={14} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="editor-header-right">
                    <div className="header-actions">
                        <button
                            onClick={() => setIsFileExplorerVisible(!isFileExplorerVisible)}
                            className={`action-btn ${isFileExplorerVisible ? 'active' : ''}`}
                            title="Toggle File Explorer"
                        >
                            <FiFolder size={16} />
                        </button>
                        <button
                            onClick={() => setIsTerminalVisible(!isTerminalVisible)}
                            className={`action-btn ${isTerminalVisible ? 'active' : ''}`}
                            title="Toggle Terminal"
                        >
                            <FiTerminal size={16} />
                        </button>
                        <button
                            onClick={() => setIsChatVisible(!isChatVisible)}
                            className={`action-btn ${isChatVisible ? 'active' : ''}`}
                            title="Toggle Chat"
                        >
                            <FiMessageSquare size={16} />
                        </button>
                        <button
                            onClick={runCode}
                            className="run-btn"
                            disabled={isRunning || !containerId}
                            title="Run code"
                        >
                            <FiPlay size={14} />
                            {isRunning ? 'Running...' : 'Run'}
                        </button>
                        <button
                            onClick={copyRoomId}
                            className="copy-btn"
                            title="Copy Room ID"
                        >
                            Copy ID
                        </button>
                        <button
                            onClick={leaveRoom}
                            className="leave-btn"
                            title="Leave Room"
                        >
                            Leave
                        </button>
                    </div>
                </div>
            </div>

            {/* Connected Clients */}
            <div className="clients-sidebar">
                <div className="clients-list">
                    {clients.map((client) => (
                        <Client key={client.socketId} username={client.username} />
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="editor-content">
                {/* Sidebar */}
                <div className="editor-sidebar">
                    {/* File Explorer */}
                    {isFileExplorerVisible && (
                        <div className="sidebar-panel">
                            <FileExplorer
                                socketRef={socketRef}
                                roomId={roomId}
                                containerId={containerId}
                                onFileSelect={handleFileSelect}
                                selectedFile={selectedFile}
                            />
                        </div>
                    )}
                </div>

                {/* Editor Area */}
                <div className="editor-main">
                    <div className="editor-wrapper">
                        <Editor
                            socketRef={socketRef}
                            roomId={roomId}
                            onCodeChange={(newCode) => {
                                setCode(newCode);
                                handleCodeChange(newCode);
                            }}
                            code={code}
                            language={language}
                            selectedFile={currentFile?.path}
                        />
                    </div>

                    {/* Terminal */}
                    {isTerminalVisible && (
                        <div className="terminal-wrapper">
                            <Terminal
                                socketRef={socketRef}
                                roomId={roomId}
                                containerId={containerId}
                                isVisible={isTerminalVisible}
                            />
                        </div>
                    )}
                </div>

                {/* Chat Panel */}
                {isChatVisible && (
                    <div className="chat-panel">
                        <Chat
                            socketRef={socketRef}
                            roomId={roomId}
                            username={user.username}
                        />
                    </div>
                )}
            </div>

            <style jsx>{`
                .editor-page {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    background: #1e1e1e;
                    color: #d4d4d4;
                    overflow: hidden;
                }

                .editor-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    background: #1e1e1e;
                    color: #d4d4d4;
                }

                .loading-spinner {
                    text-align: center;
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid #333;
                    border-top: 3px solid #569cd6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 16px;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .editor-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    background: #2d2d2d;
                    border-bottom: 1px solid #444;
                    min-height: 60px;
                }

                .editor-header-left {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .room-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 0;
                    font-size: 16px;
                    font-weight: 500;
                }

                .room-label {
                    color: #888;
                }

                .room-id {
                    color: #569cd6;
                    font-family: 'JetBrains Mono', monospace;
                    background: #333;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .clients-info {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    color: #888;
                    font-size: 14px;
                }

                .editor-header-center {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                }

                .current-file-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #333;
                    padding: 4px 12px;
                    border-radius: 6px;
                    font-size: 14px;
                }

                .save-btn {
                    background: none;
                    border: none;
                    color: #569cd6;
                    cursor: pointer;
                    padding: 2px;
                    border-radius: 2px;
                    display: flex;
                    align-items: center;
                }

                .save-btn:hover {
                    background: #444;
                }

                .editor-header-right {
                    display: flex;
                    align-items: center;
                }

                .header-actions {
                    display: flex;
                    gap: 8px;
                }

                .action-btn {
                    background: none;
                    border: none;
                    color: #d4d4d4;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .action-btn:hover {
                    background: #444;
                }

                .action-btn.active {
                    background: #569cd6;
                    color: white;
                }

                .run-btn {
                    background: #0e8620;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 8px 12px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 14px;
                    font-weight: 500;
                }

                .run-btn:hover:not(:disabled) {
                    background: #0f9025;
                }

                .run-btn:disabled {
                    background: #444;
                    color: #888;
                    cursor: not-allowed;
                }

                .copy-btn {
                    background: #569cd6;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .copy-btn:hover {
                    background: #4a8bc2;
                }

                .leave-btn {
                    background: #d73a49;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 14px;
                }

                .leave-btn:hover {
                    background: #c42634;
                }

                .clients-sidebar {
                    position: fixed;
                    top: 60px;
                    left: 0;
                    width: 200px;
                    height: calc(100vh - 60px);
                    background: #252525;
                    border-right: 1px solid #444;
                    z-index: 100;
                    overflow-y: auto;
                }

                .clients-list {
                    padding: 16px;
                }

                .editor-content {
                    display: flex;
                    flex: 1;
                    margin-left: 200px;
                    overflow: hidden;
                }

                .editor-sidebar {
                    width: 300px;
                    background: #252525;
                    border-right: 1px solid #444;
                    overflow: hidden;
                }

                .sidebar-panel {
                    height: 100%;
                }

                .editor-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .editor-wrapper {
                    flex: 1;
                    overflow: hidden;
                }

                .terminal-wrapper {
                    height: 300px;
                    border-top: 1px solid #444;
                }

                .chat-panel {
                    width: 300px;
                    background: #252525;
                    border-left: 1px solid #444;
                }

                @media (max-width: 1200px) {
                    .clients-sidebar {
                        width: 150px;
                    }
                    
                    .editor-content {
                        margin-left: 150px;
                    }
                    
                    .editor-sidebar {
                        width: 250px;
                    }
                    
                    .chat-panel {
                        width: 250px;
                    }
                }

                @media (max-width: 900px) {
                    .clients-sidebar {
                        transform: translateX(-100%);
                        transition: transform 0.3s;
                    }
                    
                    .editor-content {
                        margin-left: 0;
                    }
                    
                    .editor-sidebar {
                        width: 200px;
                    }
                }
            `}</style>
        </div>
    );
};

export default EditorPage;