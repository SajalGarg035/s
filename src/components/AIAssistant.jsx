import React, { useState, useRef, useEffect } from 'react';
import { FiMessageSquare, FiX, FiSend, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { aiService } from '../services/api';
import toast from 'react-hot-toast';

const AIAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = {
            type: 'user',
            content: input,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await aiService.getCodingHelp(input);
            const assistantMessage = {
                type: 'assistant',
                content: response.content,
                suggestions: response.suggestions,
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            toast.error('Failed to get AI response');
            console.error('AI Assistant Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setInput(suggestion);
    };

    return (
        <div className={`fixed ${isExpanded ? 'inset-4' : 'bottom-4 right-4'} z-50 transition-all duration-300`}>
            {!isOpen ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                >
                    <FiMessageSquare size={24} />
                    <span className="hidden md:inline">Ask AI Assistant</span>
                </button>
            ) : (
                <div 
                    className={`bg-white rounded-lg shadow-2xl flex flex-col ${
                        isExpanded ? 'w-full h-full' : 'w-[380px] h-[600px]'
                    }`}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2">
                            <FiMessageSquare size={20} />
                            AI Coding Assistant
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                            >
                                {isExpanded ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <FiX size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div 
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4"
                    >
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg p-3 ${
                                        message.type === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-900'
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                    {message.suggestions && (
                                        <div className="mt-2 space-y-1">
                                            {message.suggestions.map((suggestion, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                    className="text-sm text-blue-600 hover:text-blue-800 block"
                                                >
                                                    → {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <span className="text-xs opacity-70 mt-1 block">
                                        {new Date(message.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-100 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-4 border-t">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me anything about coding..."
                                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:border-blue-600"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiSend size={20} />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AIAssistant;