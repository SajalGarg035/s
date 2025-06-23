import React, { useState, useRef, useEffect } from 'react';
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

    const handleFileSelect = (filePath) => {
        if (socketRef.current && containerId) {
            socketRef.current.emit('docker:read-file', {
                roomId,
                containerId,
                path: filePath
            });
        }
    };

    const saveFile = () => {
        if (socketRef.current && containerId && selectedFile) {
            socketRef.current.emit('docker:write-file', {
                roomId,
                containerId,
                path: selectedFile,
                content: fileContent
            });
        } else {
            toast.error('No file selected or container not ready');
        }
    };

    const runCode = async () => {
        if (!containerId) {
            toast.error('Container not ready');
            return;
        }

        setIsRunning(true);
        // Save file first if selected
        if (selectedFile) {
            saveFile();
        }
        
        // You can implement code execution logic here
        toast.success('Code execution started in terminal');
        setIsRunning(false);
    };

    if (!user) {
        return (
            <div className="editor-loading">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="editor-page">
            {/* Header */}
            <div className="editor-header">
                <div className="header-left">
                    <h1 className="room-title">Room: {roomId}</h1>
                    <button onClick={copyRoomId} className="copy-btn">
                        Copy Room ID
                    </button>
                </div>
                
                <div className="header-center">
                    <div className="editor-controls">
                        <button 
                            onClick={saveFile} 
                            className="control-btn save-btn"
                            disabled={!selectedFile}
                        >
                            <FiSave size={16} />
                            Save
                        </button>
                        <button 
                            onClick={runCode} 
                            className="control-btn run-btn"
                            disabled={isRunning}
                        >
                            <FiPlay size={16} />
                            {isRunning ? 'Running...' : 'Run'}
                        </button>
                    </div>
                </div>

                <div className="header-right">
                    <div className="view-toggles">
                        <button 
                            onClick={() => setIsFileExplorerVisible(!isFileExplorerVisible)}
                            className={`toggle-btn ${isFileExplorerVisible ? 'active' : ''}`}
                        >
                            <FiFolder size={16} />
                        </button>
                        <button 
                            onClick={() => setIsTerminalVisible(!isTerminalVisible)}
                            className={`toggle-btn ${isTerminalVisible ? 'active' : ''}`}
                        >
                            <FiTerminal size={16} />
                        </button>
                        <button 
                            onClick={() => setIsChatVisible(!isChatVisible)}
                            className={`toggle-btn ${isChatVisible ? 'active' : ''}`}
                        >
                            <FiMessageSquare size={16} />
                        </button>
                    </div>
                    <button onClick={leaveRoom} className="leave-btn">
                        Leave Room
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="editor-content">
                {/* Sidebar */}
                <div className="editor-sidebar">
                    {/* Connected Clients */}
                    <div className="clients-section">
                        <h3><FiUsers size={16} /> Connected ({clients.length})</h3>
                        <div className="clients-list">
                            {clients.map((client) => (
                                <Client key={client.socketId} username={client.username} />
                            ))}
                        </div>
                    </div>

                    {/* File Explorer */}
                    {isFileExplorerVisible && (
                        <FileExplorer
                            socketRef={socketRef}
                            roomId={roomId}
                            containerId={containerId}
                            onFileSelect={handleFileSelect}
                            selectedFile={selectedFile}
                        />
                    )}
                </div>

                {/* Editor Area */}
                <div className="editor-main">
                    <div className="editor-wrapper">
                        <Editor
                            socketRef={socketRef}
                            roomId={roomId}
                            onCodeChange={handleCodeChange}
                            code={fileContent}
                            language={language}
                            selectedFile={selectedFile}
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
        </div>
    );
};

export default EditorPage;