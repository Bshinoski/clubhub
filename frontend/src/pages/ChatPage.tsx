import React, { useState } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Send } from 'lucide-react';

interface Message {
    id: string;
    userId: string;
    userName: string;
    content: string;
    timestamp: string;
}

const ChatPage: React.FC = () => {
    const { user } = useAuth();
    const [messageText, setMessageText] = useState('');

    const [messages, setMessages] = useState<Message[]>([
        { id: '1', userId: '2', userName: 'Coach Smith', content: 'Great practice today everyone!', timestamp: '2:30 PM' },
        { id: '2', userId: '3', userName: 'Sarah Johnson', content: 'Can someone give me a ride to the game?', timestamp: '3:15 PM' },
        { id: '3', userId: '1', userName: 'You', content: 'I can help with that, Sarah!', timestamp: '3:20 PM' },
        { id: '4', userId: '4', userName: 'Mike Davis', content: 'What time is practice tomorrow?', timestamp: '4:00 PM' },
        { id: '5', userId: '2', userName: 'Coach Smith', content: 'Practice is at 4:00 PM at Field A', timestamp: '4:05 PM' },
    ]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim()) return;

        const newMessage: Message = {
            id: String(messages.length + 1),
            userId: '1',
            userName: 'You',
            content: messageText,
            timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };

        setMessages([...messages, newMessage]);
        setMessageText('');
    };

    return (
        <DashboardLayout>
            <div className="h-[calc(100vh-8rem)] flex flex-col">
                <div className="mb-4">
                    <h1 className="text-3xl font-bold text-gray-900">Team Chat</h1>
                    <p className="text-gray-600 mt-1">Real-time team communication</p>
                </div>

                {/* Messages Container */}
                <div className="flex-1 card overflow-y-auto mb-4 space-y-4">
                    {messages.map((message) => {
                        const isCurrentUser = message.userId === '1';
                        return (
                            <div
                                key={message.id}
                                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`max-w-md ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                                    <div className="flex items-center space-x-2 mb-1">
                                        {!isCurrentUser && (
                                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <span className="text-primary-700 font-semibold text-sm">
                                                    {message.userName.charAt(0)}
                                                </span>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{message.userName}</p>
                                            <p className="text-xs text-gray-500">{message.timestamp}</p>
                                        </div>
                                    </div>
                                    <div
                                        className={`px-4 py-2 rounded-lg ${isCurrentUser
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-gray-100 text-gray-900'
                                            }`}
                                    >
                                        <p>{message.content}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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
                        />
                        <Button type="submit" className="flex items-center space-x-2">
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