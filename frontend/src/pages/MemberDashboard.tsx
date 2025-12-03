import React from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Calendar, MessageCircle, DollarSign, Camera } from 'lucide-react';
import { Button } from '../components/common/Button';

const MemberDashboard: React.FC = () => {
    const { user } = useAuth();

    const upcomingEvents = [
        { title: 'Practice Session', date: '2025-12-15', time: '4:00 PM', location: 'Field A' },
        { title: 'Team Meeting', date: '2025-12-17', time: '6:00 PM', location: 'Clubhouse' },
        { title: 'Home Game vs Eagles', date: '2025-12-20', time: '2:00 PM', location: 'Stadium' },
    ];

    const pendingPayments = [
        { description: 'Monthly Dues - December', amount: 75, dueDate: '2025-12-20', status: 'pending' },
        { description: 'Tournament Fee', amount: 150, dueDate: '2025-12-25', status: 'pending' },
    ];

    const recentMessages = [
        { from: 'Coach Smith', message: 'Great practice today everyone!', time: '2 hours ago' },
        { from: 'Sarah Johnson', message: 'Can someone give me a ride to the game?', time: '5 hours ago' },
        { from: 'Team Admin', message: 'Reminder: Payment due this Friday', time: '1 day ago' },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
                    <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                    <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <div className="flex items-center space-x-3">
                            <Calendar className="h-8 w-8" />
                            <div>
                                <p className="text-sm opacity-90">Next Event</p>
                                <p className="text-lg font-bold">Tomorrow</p>
                            </div>
                        </div>
                    </div>
                    <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <div className="flex items-center space-x-3">
                            <MessageCircle className="h-8 w-8" />
                            <div>
                                <p className="text-sm opacity-90">Unread Messages</p>
                                <p className="text-lg font-bold">3</p>
                            </div>
                        </div>
                    </div>
                    <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                        <div className="flex items-center space-x-3">
                            <DollarSign className="h-8 w-8" />
                            <div>
                                <p className="text-sm opacity-90">Pending Payments</p>
                                <p className="text-lg font-bold">$225</p>
                            </div>
                        </div>
                    </div>
                    <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <div className="flex items-center space-x-3">
                            <Camera className="h-8 w-8" />
                            <div>
                                <p className="text-sm opacity-90">New Photos</p>
                                <p className="text-lg font-bold">12</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
                            <Button variant="secondary" className="text-sm">View All</Button>
                        </div>
                        <div className="space-y-3">
                            {upcomingEvents.map((event, index) => (
                                <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                                    <h3 className="font-semibold text-gray-900">{event.title}</h3>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-2">
                                        <span>📅 {event.date}</span>
                                        <span>🕐 {event.time}</span>
                                        <span>📍 {event.location}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Pending Payments</h2>
                            <Button variant="secondary" className="text-sm">View All</Button>
                        </div>
                        <div className="space-y-3">
                            {pendingPayments.map((payment, index) => (
                                <div key={index} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-gray-900">{payment.description}</h3>
                                        <span className="text-lg font-bold text-gray-900">${payment.amount}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">Due: {payment.dueDate}</p>
                                    <Button fullWidth className="text-sm">Pay Now</Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Recent Team Messages</h2>
                        <Button variant="secondary" className="text-sm">Open Chat</Button>
                    </div>
                    <div className="space-y-3">
                        {recentMessages.map((msg, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-primary-700 font-semibold text-sm">
                                        {msg.from.charAt(0)}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className="font-medium text-gray-900">{msg.from}</p>
                                        <span className="text-xs text-gray-500">{msg.time}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 truncate">{msg.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default MemberDashboard;