import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { FiTerminal, FiX, FiMaximize2, FiMinus } from 'react-icons/fi';

const Terminal = ({ socketRef, roomId, containerId, isVisible }) => {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        if (!terminalRef.current || !isVisible) return;

        // Initialize xterm
        xtermRef.current = new XTerm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#ffffff',
                selection: '#264f78',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
                brightBlack: '#666666',
                brightRed: '#f14c4c',
                brightGreen: '#23d18b',
                brightYellow: '#f5f543',
                brightBlue: '#3b8eea',
                brightMagenta: '#d670d6',
                brightCyan: '#29b8db',
                brightWhite: '#e5e5e5'
            },
            cols: 80,
            rows: 24,
            convertEol: true,
            scrollback: 1000
        });

        // Add addons
        fitAddonRef.current = new FitAddon();
        xtermRef.current.loadAddon(fitAddonRef.current);
        xtermRef.current.loadAddon(new WebLinksAddon());

        // Open terminal
        xtermRef.current.open(terminalRef.current);
        fitAddonRef.current.fit();

        // Handle terminal input - send every keystroke
        xtermRef.current.onData((data) => {
            console.log('⌨️ Terminal input:', data.charCodeAt(0), data);
            if (socketRef.current && isConnected) {
                socketRef.current.emit('docker:terminal-input', {
                    roomId,
                    containerId,
                    data
                });
            }
        });

        // Handle terminal resize
        xtermRef.current.onResize(({ rows, cols }) => {
            if (socketRef.current) {
                socketRef.current.emit('docker:terminal-resize', {
                    roomId,
                    containerId,
                    rows,
                    cols
                });
            }
        });

        // Connect to Docker container terminal
        if (socketRef.current && containerId) {
            socketRef.current.emit('docker:connect-terminal', {
                roomId,
                containerId
            });
        }

        // Socket event listeners
        const handleTerminalData = (data) => {
            console.log('📺 Terminal output:', data.replace(/\n/g, '\\n'));
            if (xtermRef.current) {
                xtermRef.current.write(data);
            }
        };

        const handleTerminalConnected = ({ terminalId }) => {
            console.log('✅ Terminal connected:', terminalId);
            setIsConnected(true);
            if (xtermRef.current) {
                xtermRef.current.clear();
                xtermRef.current.focus();
            }
        };

        const handleTerminalError = (error) => {
            console.error('❌ Terminal error:', error);
            setIsConnected(false);
            if (xtermRef.current) {
                xtermRef.current.write(`\r\n\x1b[31mTerminal error: ${error}\x1b[0m\r\n`);
            }
        };

        const handleTerminalDisconnected = () => {
            console.log('🔌 Terminal disconnected');
            setIsConnected(false);
            if (xtermRef.current) {
                xtermRef.current.write('\r\n\x1b[33mTerminal disconnected\x1b[0m\r\n');
            }
        };

        if (socketRef.current) {
            socketRef.current.on('docker:terminal-data', handleTerminalData);
            socketRef.current.on('docker:terminal-connected', handleTerminalConnected);
            socketRef.current.on('docker:terminal-error', handleTerminalError);
            socketRef.current.on('docker:terminal-disconnected', handleTerminalDisconnected);
        }

        // Resize handler
        const handleResize = () => {
            if (fitAddonRef.current && xtermRef.current) {
                fitAddonRef.current.fit();
            }
        };

        window.addEventListener('resize', handleResize);
        
        // Initial resize
        setTimeout(() => {
            handleResize();
        }, 100);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (socketRef.current) {
                socketRef.current.off('docker:terminal-data', handleTerminalData);
                socketRef.current.off('docker:terminal-connected', handleTerminalConnected);
                socketRef.current.off('docker:terminal-error', handleTerminalError);
                socketRef.current.off('docker:terminal-disconnected', handleTerminalDisconnected);
            }
            if (xtermRef.current) {
                xtermRef.current.dispose();
            }
        };
    }, [socketRef, roomId, containerId, isVisible]);

    if (!isVisible) return null;

    return (
        <div className={`terminal-container ${isMinimized ? 'minimized' : ''}`}>
            <div className="terminal-header">
                <div className="terminal-title">
                    <FiTerminal size={16} />
                    <span>Terminal</span>
                    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                        <div className="status-dot"></div>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                </div>
                <div className="terminal-controls">
                    <button 
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="terminal-btn"
                        title={isMinimized ? 'Maximize' : 'Minimize'}
                    >
                        {isMinimized ? <FiMaximize2 size={14} /> : <FiMinus size={14} />}
                    </button>
                </div>
            </div>
            {!isMinimized && (
                <div className="terminal-body">
                    <div ref={terminalRef} className="xterm-container" />
                </div>
            )}
        </div>
    );
};

export default Terminal;
