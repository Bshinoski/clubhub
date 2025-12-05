import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api, { Member, Event, MemberBalance, PaymentStatistics } from '../api/api-client';
import { Users, Calendar, Clock, DollarSign, Camera, TrendingUp, AlertCircle } from 'lucide-react';

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();

    const [stats, setStats] = useState({
        totalMembers: 0,
        adminCount: 0,
        upcomingEvents: 0,
        totalOwed: 0,
        photoCount: 0,
    });
    const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
    const [topBalances, setTopBalances] = useState<MemberBalance[]>([]);
    const [paymentStats, setPaymentStats] = useState<PaymentStatistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch all data in parallel - using same pattern as PaymentsPage
            const [membersData, eventsData, balancesData, photoCountData, statsData] = await Promise.all([
                api.members.getAll(),
                api.events.getUpcoming(3),
                api.payments.getBalances(),
                api.photos.getCount(),
                api.payments.getStatistics(),
            ]);

            // Calculate stats
            const adminCount = membersData.filter(m => m.role === 'admin').length;
            const totalOwed = balancesData.reduce((sum, b) => sum + b.balance, 0);
            const topOwing = balancesData
                .filter(b => b.balance > 0)
                .sort((a, b) => b.balance - a.balance)
                .slice(0, 5);

            setStats({
                totalMembers: membersData.length,
                adminCount,
                upcomingEvents: eventsData.length,
                totalOwed,
                photoCount: photoCountData.count,
            });

            setUpcomingEvents(eventsData);
            setTopBalances(topOwing);
            setPaymentStats(statsData);
        } catch (err: any) {
            setError(err.message || 'Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading dashboard...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Welcome Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
                    <p className="text-gray-600 mt-1">Here's what's happening with your team</p>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Link to="/roster" className="card hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Members</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalMembers}</p>
                                <p className="text-xs text-gray-500 mt-1">{stats.adminCount} admins</p>
                            </div>
                            <div className="p-3 bg-primary-100 rounded-lg">
                                <Users className="h-8 w-8 text-primary-600" />
                            </div>
                        </div>
                    </Link>

                    <Link to="/schedule" className="card hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.upcomingEvents}</p>
                                <p className="text-xs text-gray-500 mt-1">Next 3 events</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Calendar className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                    </Link>

                    <Link to="/payments" className="card hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Owed</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">
                                    ${stats.totalOwed.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Outstanding balance</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <DollarSign className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                    </Link>

                    <Link to="/gallery" className="card hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Team Photos</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.photoCount}</p>
                                <p className="text-xs text-gray-500 mt-1">In gallery</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <Camera className="h-8 w-8 text-purple-600" />
                            </div>
                        </div>
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upcoming Events */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
                            <Link to="/schedule" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                View all
                            </Link>
                        </div>

                        {upcomingEvents.length === 0 ? (
                            <div className="text-center py-8">
                                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 text-sm">No upcoming events</p>
                                <Link to="/schedule" className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block">
                                    Create an event
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingEvents.map((event) => (
                                    <div key={event.event_id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900">{event.title}</h3>
                                                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                                                    <span className="flex items-center">
                                                        <Calendar className="h-3 w-3 mr-1" />
                                                        {formatDate(event.event_date)}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {formatTime(event.event_time)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Outstanding Balances */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Top Outstanding Balances</h2>
                            <Link to="/payments" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                View all
                            </Link>
                        </div>

                        {topBalances.length === 0 ? (
                            <div className="text-center py-8">
                                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 text-sm">No outstanding balances</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topBalances.map((balance, index) => (
                                    <div key={balance.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <span className="text-orange-700 font-semibold text-sm">
                                                    {index + 1}
                                                </span>
                                            </div>
                                            <span className="font-medium text-gray-900">{balance.user_name}</span>
                                        </div>
                                        <span className="text-orange-600 font-bold">
                                            ${balance.balance.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Payment Statistics */}
                {paymentStats && (
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Payment Statistics</h2>
                            <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-green-50 rounded-lg">
                                <p className="text-sm text-green-700 font-medium">Total Collected</p>
                                <p className="text-3xl font-bold text-green-900 mt-2">
                                    ${paymentStats.total_money_collected.toFixed(2)}
                                </p>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-lg">
                                <p className="text-sm text-orange-700 font-medium">Total Outstanding</p>
                                <p className="text-3xl font-bold text-orange-900 mt-2">
                                    ${paymentStats.total_money_owed.toFixed(2)}
                                </p>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-sm text-gray-600">Total Payments</p>
                                    <p className="text-2xl font-bold text-gray-900 mt-1">
                                        {paymentStats.total_payments_count}
                                    </p>
                                </div>
                                <DollarSign className="h-8 w-8 text-gray-400" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="card">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link
                            to="/schedule"
                            className="p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors text-center"
                        >
                            <Calendar className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-900">Create Event</p>
                        </Link>

                        <Link
                            to="/payments"
                            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-center"
                        >
                            <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-900">Add Payment</p>
                        </Link>

                        <Link
                            to="/roster"
                            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-center"
                        >
                            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-900">Manage Roster</p>
                        </Link>

                        <Link
                            to="/gallery"
                            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-center"
                        >
                            <Camera className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-900">Upload Photo</p>
                        </Link>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;