import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api, { Event, Payment, Member } from '../api/api-client';
import { Calendar, Clock, DollarSign, Camera, Users, MapPin, AlertCircle, UserCheck } from 'lucide-react';

const MemberDashboard: React.FC = () => {
    const { user } = useAuth();

    const [stats, setStats] = useState({
        upcomingEvents: 0,
        myBalance: 0,
        unpaidPayments: 0,
        photoCount: 0,
    });
    const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
    const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
    const [teamMembers, setTeamMembers] = useState<Member[]>([]);
    const [nextEvent, setNextEvent] = useState<Event | null>(null);
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
            const [eventsData, paymentsData, myBalanceData, photoCountData, membersData] = await Promise.all([
                api.events.getUpcoming(3),
                api.payments.getAll(), // Will need to filter for current user
                api.payments.getMyBalance(),
                api.photos.getCount(),
                api.members.getAll(),
            ]);

            // Filter payments for current user
            const myPayments = paymentsData.filter(p => p.user_id === user?.id);
            const myUnpaid = myPayments.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE').length;
            const recentUserPayments = myPayments
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5);

            setStats({
                upcomingEvents: eventsData.length,
                myBalance: myBalanceData.balance,
                unpaidPayments: myUnpaid,
                photoCount: photoCountData.count,
            });

            setUpcomingEvents(eventsData);
            setRecentPayments(recentUserPayments);
            setTeamMembers(membersData);
            setNextEvent(eventsData.length > 0 ? eventsData[0] : null);
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

    const getTimeUntilEvent = (event: Event | null) => {
        if (!event) return null;

        const eventDateTime = new Date(`${event.event_date}T${event.event_time}`);
        const now = new Date();
        const diffMs = eventDateTime.getTime() - now.getTime();

        if (diffMs < 0) return 'Started';

        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffDays > 0) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''}, ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''}, ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
        } else {
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
        }
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
                    <p className="text-gray-600 mt-1">Here's your team overview</p>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Link to="/schedule" className="card hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.upcomingEvents}</p>
                                <p className="text-xs text-gray-500 mt-1">Next events</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Calendar className="h-8 w-8 text-blue-600" />
                            </div>
                        </div>
                    </Link>

                    <Link to="/payments" className="card hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Your Balance</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">
                                    ${stats.myBalance.toFixed(2)}
                                </p>
                                {stats.unpaidPayments > 0 && (
                                    <p className="text-xs text-orange-600 mt-1">{stats.unpaidPayments} unpaid</p>
                                )}
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

                    <Link to="/chat" className="card hover:shadow-xl transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Team Chat</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">Active</p>
                                <p className="text-xs text-gray-500 mt-1">Stay connected</p>
                            </div>
                            <div className="p-3 bg-primary-100 rounded-lg">
                                <Users className="h-8 w-8 text-primary-600" />
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Alert for Outstanding Balance */}
                {stats.myBalance > 0 && (
                    <div className="card bg-orange-50 border border-orange-200">
                        <div className="flex items-start space-x-3">
                            <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-orange-900">Outstanding Balance</h3>
                                <p className="text-sm text-orange-800 mt-1">
                                    You have ${stats.myBalance.toFixed(2)} in outstanding payments.
                                    {stats.unpaidPayments > 0 && ` (${stats.unpaidPayments} unpaid ${stats.unpaidPayments === 1 ? 'payment' : 'payments'})`}
                                </p>
                                <Link to="/payments" className="text-sm font-medium text-orange-900 hover:text-orange-700 mt-2 inline-block">
                                    View payments →
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

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
                                    Check schedule
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {upcomingEvents.map((event) => (
                                    <div key={event.event_id} className="p-4 bg-primary-50 rounded-lg border border-primary-100">
                                        <h3 className="font-semibold text-gray-900 mb-2">{event.title}</h3>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            <div className="flex items-center">
                                                <Calendar className="h-3 w-3 mr-2" />
                                                {formatDate(event.event_date)}
                                            </div>
                                            <div className="flex items-center">
                                                <Clock className="h-3 w-3 mr-2" />
                                                {formatTime(event.event_time)}
                                            </div>
                                            {event.location && (
                                                <div className="flex items-center">
                                                    <MapPin className="h-3 w-3 mr-2" />
                                                    {event.location}
                                                </div>
                                            )}
                                        </div>
                                        {event.description && (
                                            <p className="text-sm text-gray-700 mt-2 pt-2 border-t border-primary-200">
                                                {event.description}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Payments */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Your Recent Payments</h2>
                            <Link to="/payments" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                View all
                            </Link>
                        </div>

                        {recentPayments.length === 0 ? (
                            <div className="text-center py-8">
                                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 text-sm">No payments yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentPayments.map((payment) => (
                                    <div key={payment.payment_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${payment.status === 'paid'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-orange-100 text-orange-800'
                                                    }`}>
                                                    {payment.status}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-gray-900">{payment.description}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(payment.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="text-lg font-bold text-gray-900">
                                                ${payment.amount.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Next Event Countdown & Team Roster */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Next Event Countdown */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Next Event</h2>
                            <Clock className="h-5 w-5 text-blue-600" />
                        </div>

                        {nextEvent ? (
                            <div className="space-y-4">
                                <div className="p-5 bg-gradient-to-br from-blue-50 to-primary-50 rounded-lg border border-blue-200">
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">{nextEvent.title}</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-gray-600 mb-1">Date</p>
                                            <p className="font-semibold text-gray-900">{formatDate(nextEvent.event_date)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600 mb-1">Time</p>
                                            <p className="font-semibold text-gray-900">{formatTime(nextEvent.event_time)}</p>
                                        </div>
                                    </div>
                                    {nextEvent.location && (
                                        <div className="mt-3 pt-3 border-t border-blue-200">
                                            <p className="text-gray-600 text-sm mb-1">Location</p>
                                            <p className="font-medium text-gray-900">{nextEvent.location}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="text-center p-4 bg-blue-100 rounded-lg">
                                    <p className="text-sm text-blue-700 font-medium mb-1">Time until event</p>
                                    <p className="text-2xl font-bold text-blue-900">{getTimeUntilEvent(nextEvent)}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 text-sm">No upcoming events</p>
                                <Link to="/schedule" className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 inline-block">
                                    Check schedule
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Team Roster Quick View */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Team Roster</h2>
                            <Link to="/roster" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                                View all
                            </Link>
                        </div>

                        {teamMembers.length === 0 ? (
                            <div className="text-center py-8">
                                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 text-sm">No team members</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg border border-primary-200 mb-3">
                                    <div className="flex items-center space-x-2">
                                        <Users className="h-5 w-5 text-primary-600" />
                                        <span className="font-semibold text-gray-900">Total Members</span>
                                    </div>
                                    <span className="text-2xl font-bold text-primary-600">{teamMembers.length}</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-2">
                                    {teamMembers.slice(0, 10).map((member) => (
                                        <div key={member.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center space-x-2">
                                                <UserCheck className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-900">
                                                    {member.display_name || member.email}
                                                </span>
                                            </div>
                                            {member.role === 'admin' && (
                                                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {teamMembers.length > 10 && (
                                    <Link to="/roster" className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium pt-2">
                                        View {teamMembers.length - 10} more members
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Links */}
                <div className="card">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Links</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Link
                            to="/dashboard/schedule"
                            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-center"
                        >
                            <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-900">View Schedule</p>
                        </Link>

                        <Link
                            to="/dashboard/roster"
                            className="p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors text-center"
                        >
                            <Users className="h-8 w-8 text-primary-600 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-900">Team Roster</p>
                        </Link>

                        <Link
                            to="/dashboard/gallery"
                            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-center"
                        >
                            <Camera className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-900">Photo Gallery</p>
                        </Link>

                        <Link
                            to="/dashboard/chat"
                            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-center"
                        >
                            <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-900">Team Chat</p>
                        </Link>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default MemberDashboard;