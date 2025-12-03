import React from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Users, Calendar, DollarSign, TrendingUp, Plus } from 'lucide-react';
import { Button } from '../components/common/Button';

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();

    const stats = [
        { label: 'Total Members', value: '24', icon: <Users className="h-6 w-6" />, color: 'bg-blue-500' },
        { label: 'Upcoming Events', value: '5', icon: <Calendar className="h-6 w-6" />, color: 'bg-green-500' },
        { label: 'Pending Payments', value: '$1,250', icon: <DollarSign className="h-6 w-6" />, color: 'bg-yellow-500' },
        { label: 'Team Activity', value: '89%', icon: <TrendingUp className="h-6 w-6" />, color: 'bg-purple-500' },
    ];

    const upcomingEvents = [
        { title: 'Practice Session', date: '2025-12-15', time: '4:00 PM', location: 'Field A' },
        { title: 'Team Meeting', date: '2025-12-17', time: '6:00 PM', location: 'Clubhouse' },
        { title: 'Home Game vs Eagles', date: '2025-12-20', time: '2:00 PM', location: 'Stadium' },
    ];

    const recentActivity = [
        { action: 'New member joined', user: 'Sarah Johnson', time: '2 hours ago' },
        { action: 'Payment received', user: 'Mike Davis', time: '5 hours ago' },
        { action: 'Event created', user: 'You', time: '1 day ago' },
        { action: 'Photo uploaded', user: 'Coach Smith', time: '2 days ago' },
    ];

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="text-gray-600 mt-1">Welcome back, {user?.name}!</p>
                    </div>
                    <div className="flex space-x-3">
                        <Button variant="secondary" className="flex items-center space-x-2">
                            <Plus className="h-4 w-4" />
                            <span>New Event</span>
                        </Button>
                        <Button className="flex items-center space-x-2">
                            <Plus className="h-4 w-4" />
                            <span>Add Member</span>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                        <div key={index} className="card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">{stat.label}</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                                </div>
                                <div className={`${stat.color} text-white p-3 rounded-lg`}>
                                    {stat.icon}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
                            <Button variant="secondary" className="text-sm">View All</Button>
                        </div>
                        <div className="space-y-3">
                            {upcomingEvents.map((event, index) => (
                                <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
                            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                            <Button variant="secondary" className="text-sm">View All</Button>
                        </div>
                        <div className="space-y-3">
                            {recentActivity.map((activity, index) => (
                                <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                    <div className="w-2 h-2 mt-2 bg-primary-600 rounded-full"></div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-900">
                                            <span className="font-medium">{activity.user}</span> {activity.action}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-center">
                            <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="font-medium text-gray-700">Schedule Event</p>
                        </button>
                        <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-center">
                            <DollarSign className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="font-medium text-gray-700">Send Payment Request</p>
                        </button>
                        <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-center">
                            <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="font-medium text-gray-700">Manage Roster</p>
                        </button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;