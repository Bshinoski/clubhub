import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import api, { Message } from '../api/api-client';
import { Send, AlertCircle } from 'lucide-react';

const ChatPage: React.FC = () => {
    const { user, token } = useAuth();
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [wsConnected, setWsConnected] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const wsRef = useRef<WebSocket | null>(null);

    // Fetch initial messages
    useEffect(() => {
        fetchMessages();
    }, []);

    // Setup WebSocket connection
    useEffect(() => {
        if (!token) return;

        try {
            const ws = api.chat.connectWebSocket(token);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket connected');
                setWsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'connected') {
                        console.log('Connected to chat');
                    } else if (data.type === 'new_message') {
                        // Add new message to the list
                        setMessages(prev => [...prev, data.message]);
                    } else if (data.type === 'message_deleted') {
                        // Remove deleted message
                        setMessages(prev => prev.filter(m => m.message_id !== data.message_id));
                    }
                } catch (err) {
                    console.error('Error parsing WebSocket message:', err);
                }
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setWsConnected(false);
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setWsConnected(false);
            };

            // Cleanup on unmount
            return () => {
                if (wsRef.current) {
                    wsRef.current.close();
                }
            };
        } catch (err) {
            console.error('Failed to connect WebSocket:', err);
        }
    }, [token]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchMessages = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.chat.getMessages({ limit: 50 });
            setMessages(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load messages');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim()) return;

        const tempMessage = messageText;
        setMessageText('');

        try {
            // Send via REST API (WebSocket will broadcast to all)
            await api.chat.sendMessage(tempMessage);
        } catch (err: any) {
            setError(err.message || 'Failed to send message');
            setMessageText(tempMessage); // Restore message on error
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!window.confirm('Delete this message?')) return;

        try {
            await api.chat.deleteMessage(messageId);
        } catch (err: any) {
            alert(err.message || 'Failed to delete message');
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading messages...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-8rem)] flex flex-col">
                <div className="mb-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Team Chat</h1>
                        <p className="text-gray-600 mt-1">
                            Real-time team communication
                            {wsConnected && (
                                <span className="ml-2 inline-flex items-center">
                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                                    <span className="text-xs text-green-600">Connected</span>
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Messages Container */}
                <div className="flex-1 card overflow-y-auto mb-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Send className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
                                <p className="text-gray-600">Be the first to send a message!</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((message) => {
                                const isCurrentUser = message.user_id === user?.id;
                                const canDelete = isCurrentUser || user?.role === 'admin';

                                return (
                                    <div
                                        key={message.message_id}
                                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-md ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                                            <div className="flex items-center space-x-2 mb-1">
                                                {!isCurrentUser && (
                                                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <span className="text-primary-700 font-semibold text-sm">
                                                            {message.user_name.charAt(0)}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{message.user_name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(message.created_at).toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start space-x-2">
                                                <div
                                                    className={`px-4 py-2 rounded-lg ${isCurrentUser
                                                            ? 'bg-primary-600 text-white'
                                                            : 'bg-gray-100 text-gray-900'
                                                        }`}
                                                >
                                                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                                </div>
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDeleteMessage(message.message_id)}
                                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                                        title="Delete message"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="card">
                    <div className="flex space-x-3">
                        <input
                            type="text"
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            disabled={!wsConnected}
                        />
                        <Button type="submit" disabled={!messageText.trim() || !wsConnected} className="flex items-center space-x-2">
                            <Send className="h-4 w-4" />
                            <span>Send</span>
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
};

export default ChatPage;