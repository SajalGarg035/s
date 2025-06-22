import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { FiTerminal, FiX, FiMaximize2, FiMinus } from 'react-icons/fi';

const Terminal = ({ socketRef, roomId, containerId, isVisible = true }) => {
    const terminalRef = useRef(null);
    const xtermRef = useRef(null);
    const fitAddonRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        if (!terminalRef.current || !isVisible) return;

        // Initialize xterm
        const xterm = new XTerm({
            theme: {
                background: '#1a1a1a',
                foreground: '#ffffff',
                cursor: '#ffffff',
                selection: '#3e4451',
                black: '#000000',
                red: '#e06c75',
                green: '#98c379',
                yellow: '#d19a66',
                blue: '#61afef',
                magenta: '#c678dd',
                cyan: '#56b6c2',
                white: '#ffffff',
                brightBlack: '#4b5263',
                brightRed: '#be5046',
                brightGreen: '#98c379',
                brightYellow: '#d19a66',
                brightBlue: '#61afef',
                brightMagenta: '#c678dd',
                brightCyan: '#56b6c2',
                brightWhite: '#ffffff'
            },
            fontSize: 14,
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            cursorBlink: true,
            cursorStyle: 'block',
            scrollback: 1000,
            tabStopWidth: 4
        });

        // Add addons
        const fitAddon = new FitAddon();
        const webLinksAddon = new WebLinksAddon();
        
        xterm.loadAddon(fitAddon);
        xterm.loadAddon(webLinksAddon);
        
        xtermRef.current = xterm;
        fitAddonRef.current = fitAddon;

        // Open terminal
        xterm.open(terminalRef.current);
        fitAddon.fit();

        // Connect to Docker container
        if (socketRef.current && containerId) {
            socketRef.current.emit('docker:connect-terminal', {
                roomId,
                containerId
            });

            // Handle terminal data from server
            socketRef.current.on('docker:terminal-data', (data) => {
                xterm.write(data);
            });

            // Handle connection status
            socketRef.current.on('docker:terminal-connected', () => {
                setIsConnected(true);
                xterm.write('\r\n\x1b[32m✓ Connected to container terminal\x1b[0m\r\n');
                xterm.write('$ ');
            });

            socketRef.current.on('docker:terminal-error', (error) => {
                xterm.write(`\r\n\x1b[31m✗ Terminal error: ${error}\x1b[0m\r\n`);
            });

            // Send user input to server
            xterm.onData((data) => {
                if (socketRef.current && isConnected) {
                    socketRef.current.emit('docker:terminal-input', {
                        roomId,
                        containerId,
                        data
                    });
                }
            });
        }

        // Handle window resize
        const handleResize = () => {
            setTimeout(() => {
                fitAddon.fit();
            }, 10);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (socketRef.current) {
                socketRef.current.off('docker:terminal-data');
                socketRef.current.off('docker:terminal-connected');
                socketRef.current.off('docker:terminal-error');
            }
            xterm.dispose();
        };
    }, [socketRef, roomId, containerId, isVisible]);

    useEffect(() => {
        if (fitAddonRef.current && !isMinimized) {
            setTimeout(() => {
                fitAddonRef.current.fit();
            }, 100);
        }
    }, [isMinimized]);

    if (!isVisible) return null;

    return (
        <div className={`terminal-container ${isMinimized ? 'minimized' : ''}`}>
            <div className="terminal-header">
                <div className="terminal-title">
                    <FiTerminal size={16} />
                    <span>Terminal</span>
                    <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                        <div className="status-dot"></div>
                        <span>{isConnected ? 'Connected' : 'Connecting...'}</span>
                    </div>
                </div>
                
                <div className="terminal-controls">
                    <button 
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="control-btn"
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
