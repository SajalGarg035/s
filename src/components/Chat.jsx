import React, { useState, useEffect, useRef } from 'react';
import ACTIONS from '../actions/Actions';
import { FiSend, FiPaperclip, FiSmile, FiSearch, FiMoreHorizontal } from 'react-icons/fi';

const Chat = ({ socketRef, roomId, username }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.RECEIVE_MESSAGE, ({ message, username: senderUsername, timestamp }) => {
                setMessages(prev => [...prev, {
                    message,
                    username: senderUsername,
                    timestamp,
                    isSelf: false
                }]);
            });
        }

        return () => {
            socketRef.current?.off(ACTIONS.RECEIVE_MESSAGE);
        };
    }, [socketRef]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (newMessage.trim() && socketRef.current) {
            const messageData = {
                message: newMessage,
                username,
                timestamp: new Date().toLocaleTimeString(),
                isSelf: true
            };
            
            setMessages(prev => [...prev, messageData]);
            
            socketRef.current.emit(ACTIONS.SEND_MESSAGE, {
                roomId,
                message: newMessage,
                username
            });
            
            setNewMessage('');
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    return (
        <div className="enterprise-chat">
            {/* Chat Header */}
            <div className="chat-header">
                <div className="chat-title">
                    <h3>Team Chat</h3>
                    <span className="chat-subtitle">
                        {messages.length} message{messages.length !== 1 ? 's' : ''}
                    </span>
                </div>
                
                <div className="chat-actions">
                    <button className="chat-action" title="Search messages">
                        <FiSearch size={16} />
                    </button>
                    <button className="chat-action" title="More options">
                        <FiMoreHorizontal size={16} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="messages-container">
                {messages.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">💬</div>
                        <h4>Start the conversation</h4>
                        <p>Send your first message to begin collaborating with your team.</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => {
                            const prevMsg = messages[index - 1];
                            const showAvatar = !prevMsg || prevMsg.username !== msg.username;
                            const showTime = !prevMsg || 
                                new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() > 60000;

                            return (
                                <div
                                    key={index}
                                    className={`message-group ${msg.isSelf ? 'self' : 'other'}`}
                                >
                                    {showTime && (
                                        <div className="message-timestamp">
                                            {formatTime(msg.timestamp)}
                                        </div>
                                    )}
                                    
                                    <div className="message-wrapper">
                                        {showAvatar && !msg.isSelf && (
                                            <div className="message-avatar">
                                                <span>{msg.username.charAt(0).toUpperCase()}</span>
                                            </div>
                                        )}
                                        
                                        <div className="message-content">
                                            {showAvatar && !msg.isSelf && (
                                                <div className="message-header">
                                                    <span className="message-author">{msg.username}</span>
                                                    <span className="message-time">{msg.timestamp}</span>
                                                </div>
                                            )}
                                            
                                            <div className={`message-bubble ${msg.isSelf ? 'self' : 'other'}`}>
                                                <p>{msg.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {typingUsers.length > 0 && (
                            <div className="typing-indicator">
                                <div className="typing-avatar">
                                    <div className="typing-dots">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                                <span className="typing-text">
                                    {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                                </span>
                            </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Message Input */}
            <div className="message-input-container">
                <form onSubmit={sendMessage} className="message-form">
                    <div className="input-wrapper">
                        <button type="button" className="input-action" title="Attach file">
                            <FiPaperclip size={16} />
                        </button>
                        
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="message-input"
                            maxLength={1000}
                        />
                        
                        <button type="button" className="input-action" title="Add emoji">
                            <FiSmile size={16} />
                        </button>
                        
                        <button 
                            type="submit" 
                            className={`send-button ${newMessage.trim() ? 'active' : ''}`}
                            disabled={!newMessage.trim()}
                            title="Send message"
                        >
                            <FiSend size={16} />
                        </button>
                    </div>
                </form>
                
                <div className="input-footer">
                    <span className="character-count">
                        {newMessage.length}/1000
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Chat;