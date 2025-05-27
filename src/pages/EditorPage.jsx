import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Client from '../components/Client';
import Editor from '../components/Editor';
import Chat from '../components/Chat';
import CodeOutput from '../components/CodeOutput';
import { language, cmtheme, darkMode } from '../atoms';
import { useRecoilState } from 'recoil';
import ACTIONS from '../actions/Actions';
import { initSocket } from '../socket';
import { useLocation, useNavigate, Navigate, useParams } from 'react-router-dom';
import { 
    FiCopy, FiLogOut, FiMoon, FiSun, FiCode, FiUsers, FiMessageSquare, 
    FiPlay, FiSettings, FiMaximize2, FiMinimize2, FiGitBranch, FiSave,
    FiWifi, FiClock, FiActivity, FiZap, FiShield, FiSend, FiMenu, FiX
} from 'react-icons/fi';
import './EditorPage.css';

const EditorPage = () => {
    const [lang, setLang] = useRecoilState(language);
    const [them, setThem] = useRecoilState(cmtheme);
    const [isDark, setIsDark] = useRecoilState(darkMode);
    const [activeTab, setActiveTab] = useState('editor');
    const [clients, setClients] = useState([]);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Connection failed. Attempting to reconnect...');
                reactNavigator('/');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
                if (username !== location.state?.username) {
                    toast.success(`${username} joined the session`);
                }
                setClients(clients);
                socketRef.current.emit(ACTIONS.SYNC_CODE, {
                    code: codeRef.current,
                    socketId,
                });
            });

            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                toast.error(`${username} left the session`);
                setClients((prev) => prev.filter((client) => client.socketId !== socketId));
            });

            // Chat message listener
            socketRef.current.on(ACTIONS.RECEIVE_MESSAGE, ({ message, username, timestamp }) => {
                setMessages(prev => [...prev, { message, username, timestamp, id: Date.now() }]);
            });
        };
        init();
        return () => {
            socketRef.current?.disconnect();
        };
    }, []);

    const sendMessage = () => {
        if (!newMessage.trim()) return;
        
        const messageData = {
            roomId,
            message: newMessage,
            username: location.state?.username
        };
        
        // Add to local messages immediately
        setMessages(prev => [...prev, {
            ...messageData,
            timestamp: new Date().toISOString(),
            id: Date.now()
        }]);
        
        // Send to other clients
        socketRef.current.emit(ACTIONS.SEND_MESSAGE, messageData);
        setNewMessage('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const copyRoomId = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied to clipboard');
        } catch (err) {
            toast.error('Failed to copy Room ID');
        }
    };

    const leaveRoom = () => {
        if (window.confirm('Are you sure you want to leave the session?')) {
            reactNavigator('/');
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Handle window resize for mobile responsiveness
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Apply dark mode class to document
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
        }
        
        return () => {
            document.documentElement.classList.remove('dark-mode');
        };
    }, [isDark]);

    if (!location.state) {
        return <Navigate to="/" />;
    }

    const tabs = [
        { 
            id: 'editor', 
            label: 'Editor', 
            icon: FiCode,
            description: 'Collaborative code editor'
        },
        { 
            id: 'output', 
            label: 'Output', 
            icon: FiPlay,
            description: 'Code execution results'
        },
        { 
            id: 'chat', 
            label: 'Chat', 
            icon: FiMessageSquare,
            description: 'Team communication',
            badge: messages.filter(m => m.username !== location.state?.username).length
        }
    ];

    const languageOptions = [
        { value: 'javascript', label: 'JavaScript', icon: '🟨' },
        { value: 'python', label: 'Python', icon: '🐍' },
        { value: 'java', label: 'Java', icon: '☕' },
        { value: 'cpp', label: 'C++', icon: '⚡' },
        { value: 'go', label: 'Go', icon: '🔵' },
        { value: 'rust', label: 'Rust', icon: '🦀' },
        { value: 'typescript', label: 'TypeScript', icon: '🔷' }
    ];

    const themeOptions = [
        { value: 'monokai', label: 'Monokai Pro' },
        { value: 'dracula', label: 'Dracula' },
        { value: 'github', label: 'GitHub Light' },
        { value: 'material', label: 'Material Dark' },
        { value: 'nord', label: 'Nord' },
        { value: 'solarized', label: 'Solarized' }
    ];

    return (
        <div className={`ide-container ${isDark ? 'dark' : 'light'} ${isMobile ? 'mobile' : 'desktop'}`}>
            {/* Enhanced Menu Bar */}
            {isMobile ? (
                // Mobile Header
                <div className="mobile-header">
                    <div className="mobile-header-left">
                        <button 
                            className="mobile-menu-btn"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
                        </button>
                        <div className="mobile-logo">
                            <FiCode size={18} />
                            <span>CodeSync</span>
                        </div>
                    </div>
                    
                    <div className="mobile-header-center">
                        <div className="mobile-status">
                            <div className="status-dot online"></div>
                            <span>Live</span>
                        </div>
                    </div>
                    
                    <div className="mobile-header-right">
                        <button 
                            className="mobile-theme-btn"
                            onClick={() => setIsDark(!isDark)}
                            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
                        </button>
                        
                        <button 
                            className="mobile-action-btn"
                            onClick={copyRoomId}
                            title="Copy room ID"
                        >
                            <FiCopy size={16} />
                        </button>
                        
                        <button 
                            className="mobile-action-btn danger"
                            onClick={leaveRoom}
                            title="Leave session"
                        >
                            <FiLogOut size={16} />
                        </button>
                    </div>

                    {/* Mobile Menu Overlay */}
                    {isMobileMenuOpen && (
                        <div className="mobile-menu-overlay">
                            <div className="mobile-menu-content">
                                <div className="mobile-session-info">
                                    <div className="session-item">
                                        <FiWifi size={16} />
                                        <div>
                                            <span className="session-label">Room ID</span>
                                            <span className="session-value">{roomId}</span>
                                        </div>
                                    </div>
                                    <div className="session-item">
                                        <FiUsers size={16} />
                                        <div>
                                            <span className="session-label">Online</span>
                                            <span className="session-value">{clients.length} users</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mobile-collaborators">
                                    <h4>Team Members</h4>
                                    <div className="mobile-collaborators-list">
                                        {clients.map((client) => (
                                            <div key={client.socketId} className="mobile-client-item">
                                                <div className="client-avatar">
                                                    {client.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="client-info">
                                                    <span className="client-username">{client.username}</span>
                                                    <span className="client-status">
                                                        <FiActivity size={10} />
                                                        Active
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // Desktop Menu Bar
                <div className="ide-menubar">
                    <div className="menubar-left">
                        <div className="ide-logo">
                            <div className="logo-icon">
                                <FiCode size={20} />
                            </div>
                            <span>CodeSync Pro</span>
                            <div className="session-indicator">
                                <div className="status-dot"></div>
                                <span>Live</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="menubar-center">
                        <div className="breadcrumb">
                            <div className="breadcrumb-item">
                                <FiWifi size={12} />
                                <span>{roomId.slice(0, 8)}...</span>
                            </div>
                            <span className="breadcrumb-separator">/</span>
                            <div className="breadcrumb-item">
                                <span>{location.state?.username}</span>
                            </div>
                        </div>
                        
                        <div className="connection-status">
                            <div className="status-indicator online">
                                <FiActivity size={12} />
                                <span>Connected</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="menubar-right">
                        <div className="menu-group">
                            <button 
                                className="menu-action"
                                onClick={() => setIsDark(!isDark)}
                                title="Toggle theme"
                            >
                                {isDark ? <FiSun size={14} /> : <FiMoon size={14} />}
                            </button>
                            
                            <button 
                                className="menu-action"
                                onClick={toggleFullscreen}
                                title="Toggle fullscreen"
                            >
                                {isFullscreen ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
                            </button>
                        </div>
                        
                        <button 
                            className="menu-action primary"
                            onClick={copyRoomId}
                            title="Copy room ID"
                        >
                            <FiCopy size={14} />
                        </button>
                        
                        <button 
                            className="menu-action danger"
                            onClick={leaveRoom}
                            title="Leave session"
                        >
                            <FiLogOut size={14} />
                        </button>
                    </div>
                </div>
            )}

            <div className="ide-workspace">
                {/* Enhanced Sidebar - Hidden on Mobile */}
                {!isMobile && (
                    <div className={`ide-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                        <div className="sidebar-header">
                            <button 
                                className="sidebar-toggle"
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            >
                                <FiUsers size={16} />
                            </button>
                            {!sidebarCollapsed && (
                                <div className="sidebar-title-group">
                                    <span className="sidebar-title">Team</span>
                                    <span className="collaborator-count">({clients.length})</span>
                                </div>
                            )}
                        </div>
                        
                        {!sidebarCollapsed && (
                            <>
                                <div className="collaborators-section">
                                    <div className="section-header">
                                        <h4>Online Now</h4>
                                        <div className="online-indicator">
                                            <div className="pulse-dot"></div>
                                            <span>{clients.length}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="collaborators-list">
                                        {clients.map((client) => (
                                            <div key={client.socketId} className="client-item">
                                                <div className="client-avatar">
                                                    {client.username.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="client-info">
                                                    <div className="client-username">{client.username}</div>
                                                    <div className="client-status">
                                                        <FiActivity size={10} />
                                                        <span>Active</span>
                                                    </div>
                                                </div>
                                                <div className="client-actions">
                                                    <FiZap size={12} className="coding-indicator" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="sidebar-controls">
                                    <div className="controls-header">
                                        <h4>Environment</h4>
                                        <FiSettings size={14} />
                                    </div>
                                    
                                    <div className="control-group">
                                        <label className="control-label">
                                            <FiCode size={12} />
                                            Language
                                        </label>
                                        <select
                                            value={lang}
                                            onChange={(e) => setLang(e.target.value)}
                                            className="enterprise-select"
                                        >
                                            {languageOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.icon} {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="control-group">
                                        <label className="control-label">
                                            <FiSettings size={12} />
                                            Theme
                                        </label>
                                        <select
                                            value={them}
                                            onChange={(e) => setThem(e.target.value)}
                                            className="enterprise-select"
                                        >
                                            {themeOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    <div className="environment-info">
                                        <div className="info-item">
                                            <FiShield size={12} />
                                            <span>Secure</span>
                                        </div>
                                        <div className="info-item">
                                            <FiClock size={12} />
                                            <span>Auto-save</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Main Content */}
                <div className="ide-main">
                    {/* Mobile Bottom Tab Bar */}
                    {isMobile ? (
                        <div className="mobile-bottom-tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`mobile-tab ${activeTab === tab.id ? 'active' : ''}`}
                                >
                                    <div className="tab-icon-wrapper">
                                        <tab.icon size={20} />
                                        {tab.badge > 0 && (
                                            <span className="mobile-badge">{tab.badge}</span>
                                        )}
                                    </div>
                                    <span className="tab-label">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        // Desktop Tab Bar
                        <div className="ide-tabs">
                            <div className="tabs-container">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                                        title={tab.description}
                                    >
                                        <tab.icon size={14} />
                                        <span>{tab.label}</span>
                                        {tab.badge > 0 && (
                                            <span className="notification-badge">{tab.badge}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            
                            <div className="tab-actions">
                                <button className="tab-action" title="Save (Ctrl+S)">
                                    <FiSave size={12} />
                                </button>
                                <button className="tab-action" title="Git">
                                    <FiGitBranch size={12} />
                                </button>
                                <div className="tab-divider"></div>
                                <div className="tab-info">
                                    <span className="file-status">●</span>
                                    <span className="file-name">main.{lang}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="content-area">
                        {activeTab === 'editor' && (
                            <div className="editor-panel">
                                <div className="editor-background-overlay"></div>
                                <Editor
                                    socketRef={socketRef}
                                    roomId={roomId}
                                    onCodeChange={(code) => {
                                        codeRef.current = code;
                                    }}
                                />
                                <div className="editor-floating-info">
                                    <div className="typing-indicators">
                                        {clients.filter(c => c.username !== location.state?.username).map(client => (
                                            <div key={client.socketId} className="typing-indicator">
                                                <span className="typing-dot"></span>
                                                <span>{client.username} is typing...</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'output' && (
                            <div className="output-container">
                                <div className="output-header">
                                    <div className="output-controls">
                                        <button className="run-button">
                                            <FiPlay size={12} />
                                            <span>Run Code</span>
                                        </button>
                                        <select className="language-select" value={lang}>
                                            {languageOptions.map(option => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <CodeOutput
                                    socketRef={socketRef}
                                    roomId={roomId}
                                    code={codeRef.current}
                                    language={lang}
                                    username={location.state?.username}
                                />
                            </div>
                        )}
                        
                        {activeTab === 'chat' && (
                            <div className="chat-container">
                                <div className="chat-background"></div>
                                <div className="chat-header">
                                    <div className="chat-title">
                                        <FiMessageSquare size={16} />
                                        <span>Team Chat</span>
                                    </div>
                                </div>
                                
                                <div className="chat-messages">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className="chat-message">
                                            <div className="message-avatar">
                                                {msg.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="message-content">
                                                <div className="message-header">
                                                    <span className="message-username">{msg.username}</span>
                                                    <span className="message-timestamp">
                                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <div className="message-text">{msg.message}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="chat-input-area">
                                    <div className="chat-input-container">
                                        <textarea
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={handleKeyPress}
                                            placeholder="Type a message..."
                                            className="chat-input"
                                            rows={1}
                                        />
                                        <button 
                                            onClick={sendMessage}
                                            disabled={!newMessage.trim()}
                                            className="chat-send-button"
                                        >
                                            <FiSend size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Bar - Hidden on Mobile */}
            {!isMobile && (
                <div className="ide-statusbar">
                    <div className="status-left">
                        <div className="status-item primary">
                            <div className="status-dot online"></div>
                            <span>Connected</span>
                        </div>
                        <div className="status-item">
                            <span className="language-badge">{lang.toUpperCase()}</span>
                        </div>
                        <div className="status-item">
                            <span>UTF-8</span>
                        </div>
                    </div>
                    
                    <div className="status-right">
                        <div className="status-item">
                            <FiClock size={10} />
                            <span>Ln 1, Col 1</span>
                        </div>
                        <div className="status-item collaborators-status">
                            <FiUsers size={10} />
                            <span>{clients.length} online</span>
                        </div>
                        <div className="status-item performance">
                            <FiActivity size={10} />
                            <span>0ms</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile overlays */}
            {isMobile && isMobileMenuOpen && (
                <div 
                    className="mobile-overlay" 
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
};

export default EditorPage;