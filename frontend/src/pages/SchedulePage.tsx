import React, { useState } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Plus, Edit, Trash2, Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Event {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    type: 'PRACTICE' | 'GAME' | 'MEETING' | 'OTHER';
}

const SchedulePage: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [currentDate, setCurrentDate] = useState(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showEventDetails, setShowEventDetails] = useState<Event | null>(null);
    const [showDayEvents, setShowDayEvents] = useState<{ date: Date; events: Event[] } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        type: 'PRACTICE' as 'PRACTICE' | 'GAME' | 'MEETING' | 'OTHER',
    });

    const [events, setEvents] = useState<Event[]>([
        { id: '1', title: 'Practice Session', description: 'Regular team practice', date: '2025-12-15', time: '4:00 PM', location: 'Field A', type: 'PRACTICE' },
        { id: '2', title: 'Team Meeting', description: 'Monthly team meeting', date: '2025-12-17', time: '6:00 PM', location: 'Clubhouse', type: 'MEETING' },
        { id: '3', title: 'Home Game vs Eagles', description: 'League championship game', date: '2025-12-20', time: '2:00 PM', location: 'Stadium', type: 'GAME' },
        { id: '4', title: 'Practice Session', description: 'Evening practice', date: '2025-12-08', time: '5:00 PM', location: 'Field B', type: 'PRACTICE' },
        { id: '5', title: 'Away Game vs Tigers', description: 'Regular season game', date: '2025-12-12', time: '7:00 PM', location: 'Tiger Stadium', type: 'GAME' },
    ]);

    const typeColors = {
        PRACTICE: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
        GAME: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
        MEETING: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
        OTHER: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' },
    };

    const getEventsForDate = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return events.filter(event => event.date === dateStr);
    };

    const getUpcomingEvents = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return events
            .filter(event => new Date(event.date) >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 5);
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];

        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const handlePreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const handleAddEvent = () => {
        if (!newEvent.title || !newEvent.date || !newEvent.time) {
            alert('Title, date, and time are required');
            return;
        }

        const event: Event = {
            id: String(events.length + 1),
            ...newEvent,
        };
        setEvents([...events, event]);
        setShowAddModal(false);
        setNewEvent({ title: '', description: '', date: '', time: '', location: '', type: 'PRACTICE' });
    };

    const handleEditEvent = () => {
        if (!editingEvent) return;

        if (!editingEvent.title || !editingEvent.date || !editingEvent.time) {
            alert('Title, date, and time are required');
            return;
        }

        setEvents(events.map(e => e.id === editingEvent.id ? editingEvent : e));
        setShowEditModal(false);
        setEditingEvent(null);
        setShowEventDetails(null);
    };

    const openEditModal = (event: Event) => {
        setEditingEvent({ ...event });
        setShowEditModal(true);
        setShowEventDetails(null);
    };

    const handleDeleteEvent = (id: string) => {
        setEvents(events.filter(e => e.id !== id));
        setShowDeleteConfirm(null);
        setShowEventDetails(null);
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const days = getDaysInMonth(currentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingEvents = getUpcomingEvents();

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Team Schedule</h1>
                        <p className="text-gray-600 mt-1">{events.length} total events</p>
                    </div>
                    {isAdmin && (
                        <Button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2">
                            <Plus className="h-4 w-4" />
                            <span>Create Event</span>
                        </Button>
                    )}
                </div>

                {/* Calendar and Upcoming Events Grid */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Compact Calendar */}
                    <div className="card lg:col-span-1">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </h2>
                            <div className="flex space-x-1">
                                <button
                                    onClick={handlePreviousMonth}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={handleNextMonth}
                                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Day Names */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {dayNames.map(day => (
                                <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1.5">
                            {days.map((day, index) => {
                                if (!day) {
                                    return <div key={`empty-${index}`} className="aspect-square" />;
                                }

                                const dayEvents = getEventsForDate(day);
                                const isToday = day.toDateString() === today.toDateString();
                                const isPast = day < today;
                                const hasEvents = dayEvents.length > 0;

                                return (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            if (hasEvents) {
                                                setShowDayEvents({ date: day, events: dayEvents });
                                            }
                                        }}
                                        className={`aspect-square p-1.5 rounded-lg text-base font-semibold transition-all flex flex-col items-center justify-center ${isToday
                                                ? 'bg-primary-600 text-white'
                                                : hasEvents
                                                    ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                                                    : 'text-gray-700 hover:bg-gray-100'
                                            } ${isPast && !isToday ? 'opacity-40' : ''}`}
                                    >
                                        <span className="text-sm">{day.getDate()}</span>
                                        {hasEvents && (
                                            <div className="flex space-x-0.5 mt-0.5">
                                                {dayEvents.slice(0, 3).map((event, i) => (
                                                    <div key={i} className={`w-1 h-1 rounded-full ${typeColors[event.type].dot}`} />
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="w-full mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                            Jump to Today
                        </button>
                    </div>

                    {/* Upcoming Events */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
                        </div>

                        {upcomingEvents.length === 0 ? (
                            <div className="card text-center py-12">
                                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming events</h3>
                                <p className="text-gray-600">Create your first event to get started</p>
                            </div>
                        ) : (
                            upcomingEvents.map((event) => {
                                const colors = typeColors[event.type];
                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => setShowEventDetails(event)}
                                        className="card hover:shadow-lg transition-shadow cursor-pointer"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
                                                    <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                                                        {event.type}
                                                    </span>
                                                </div>

                                                <p className="text-sm text-gray-600 mb-3">{event.description}</p>

                                                <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                                    <span className="flex items-center space-x-1">
                                                        <CalendarIcon className="h-4 w-4" />
                                                        <span>{event.date}</span>
                                                    </span>
                                                    <span className="flex items-center space-x-1">
                                                        <Clock className="h-4 w-4" />
                                                        <span>{event.time}</span>
                                                    </span>
                                                    <span className="flex items-center space-x-1">
                                                        <MapPin className="h-4 w-4" />
                                                        <span>{event.location}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            {isAdmin && (
                                                <div className="flex space-x-2 ml-4">
                                                    <Button
                                                        variant="secondary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEditModal(event);
                                                        }}
                                                        className="p-2"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowDeleteConfirm(event.id);
                                                        }}
                                                        className="p-2"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Day Events Modal */}
                {showDayEvents && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Events on {showDayEvents.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                </h2>
                                <button
                                    onClick={() => setShowDayEvents(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {showDayEvents.events.map((event) => {
                                    const colors = typeColors[event.type];
                                    return (
                                        <div
                                            key={event.id}
                                            onClick={() => {
                                                setShowDayEvents(null);
                                                setShowEventDetails(event);
                                            }}
                                            className="card border-2 hover:shadow-lg transition-all cursor-pointer"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <div className={`w-4 h-4 rounded-full ${colors.dot}`} />
                                                        <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
                                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${colors.bg} ${colors.text}`}>
                                                            {event.type}
                                                        </span>
                                                    </div>

                                                    <p className="text-gray-600 mb-3">{event.description}</p>

                                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                                        <span className="flex items-center space-x-2">
                                                            <Clock className="h-4 w-4" />
                                                            <span>{event.time}</span>
                                                        </span>
                                                        <span className="flex items-center space-x-2">
                                                            <MapPin className="h-4 w-4" />
                                                            <span>{event.location}</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                {isAdmin && (
                                                    <div className="flex space-x-2 ml-4">
                                                        <Button
                                                            variant="secondary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowDayEvents(null);
                                                                openEditModal(event);
                                                            }}
                                                            className="p-2"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="danger"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowDayEvents(null);
                                                                setShowDeleteConfirm(event.id);
                                                            }}
                                                            className="p-2"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Event Details Modal */}
                {showEventDetails && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-lg w-full">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className={`w-4 h-4 rounded-full ${typeColors[showEventDetails.type].dot}`} />
                                    <h2 className="text-2xl font-bold text-gray-900">{showEventDetails.title}</h2>
                                </div>
                                <button
                                    onClick={() => setShowEventDetails(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full mb-4 ${typeColors[showEventDetails.type].bg} ${typeColors[showEventDetails.type].text}`}>
                                {showEventDetails.type}
                            </span>

                            <p className="text-gray-700 mb-6">{showEventDetails.description}</p>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center space-x-3 text-gray-700">
                                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                                    <span>{showEventDetails.date}</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-700">
                                    <Clock className="h-5 w-5 text-gray-400" />
                                    <span>{showEventDetails.time}</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-700">
                                    <MapPin className="h-5 w-5 text-gray-400" />
                                    <span>{showEventDetails.location}</span>
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="flex space-x-3">
                                    <Button
                                        variant="secondary"
                                        fullWidth
                                        onClick={() => openEditModal(showEventDetails)}
                                        className="flex items-center justify-center space-x-2"
                                    >
                                        <Edit className="h-4 w-4" />
                                        <span>Edit Event</span>
                                    </Button>
                                    <Button
                                        variant="danger"
                                        fullWidth
                                        onClick={() => setShowDeleteConfirm(showEventDetails.id)}
                                        className="flex items-center justify-center space-x-2"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span>Delete</span>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Add Event Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <Input
                                label="Event Title"
                                value={newEvent.title}
                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                placeholder="Practice Session"
                                required
                            />

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={newEvent.description}
                                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    placeholder="Event details..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                />
                            </div>

                            <Input
                                label="Date"
                                type="date"
                                value={newEvent.date}
                                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                required
                            />

                            <Input
                                label="Time"
                                type="time"
                                value={newEvent.time}
                                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                                required
                            />

                            <Input
                                label="Location"
                                value={newEvent.location}
                                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                placeholder="Field A"
                                required
                            />

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                                <select
                                    value={newEvent.type}
                                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                >
                                    <option value="PRACTICE">Practice</option>
                                    <option value="GAME">Game</option>
                                    <option value="MEETING">Meeting</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div className="flex space-x-3">
                                <Button variant="secondary" fullWidth onClick={() => setShowAddModal(false)}>
                                    Cancel
                                </Button>
                                <Button fullWidth onClick={handleAddEvent}>
                                    Create Event
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Event Modal */}
                {showEditModal && editingEvent && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <Input
                                label="Event Title"
                                value={editingEvent.title}
                                onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                                placeholder="Practice Session"
                                required
                            />

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={editingEvent.description}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                                    placeholder="Event details..."
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                />
                            </div>

                            <Input
                                label="Date"
                                type="date"
                                value={editingEvent.date}
                                onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                                required
                            />

                            <Input
                                label="Time"
                                type="time"
                                value={editingEvent.time}
                                onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                                required
                            />

                            <Input
                                label="Location"
                                value={editingEvent.location}
                                onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                                placeholder="Field A"
                                required
                            />

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                                <select
                                    value={editingEvent.type}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value as any })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                >
                                    <option value="PRACTICE">Practice</option>
                                    <option value="GAME">Game</option>
                                    <option value="MEETING">Meeting</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div className="flex space-x-3">
                                <Button variant="secondary" fullWidth onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </Button>
                                <Button fullWidth onClick={handleEditEvent}>
                                    Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-sm w-full">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Deletion</h2>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete this event? This action cannot be undone.
                            </p>
                            <div className="flex space-x-3">
                                <Button variant="secondary" fullWidth onClick={() => setShowDeleteConfirm(null)}>
                                    Cancel
                                </Button>
                                <Button variant="danger" fullWidth onClick={() => handleDeleteEvent(showDeleteConfirm)}>
                                    Delete Event
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default SchedulePage;