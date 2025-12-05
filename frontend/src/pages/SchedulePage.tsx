import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import api, { Event } from '../api/api-client';
import { Calendar, Clock, MapPin, Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';

type EventFormData = {
    title: string;
    date: string;       // maps to event_date
    time: string;       // maps to event_time
    location: string;
    description: string;
};

const SchedulePage: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState<Event | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

    const [formData, setFormData] = useState<EventFormData>({
        title: '',
        date: '',
        time: '',
        location: '',
        description: '',
    });

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.events.getAll();
            // Sort by date & time using event_date/event_time from API
            const sorted = data.sort((a, b) =>
                new Date(a.event_date + ' ' + a.event_time).getTime() -
                new Date(b.event_date + ' ' + b.event_time).getTime()
            );
            setEvents(sorted);
        } catch (err: any) {
            setError(err.message || 'Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            date: '',
            time: '',
            location: '',
            description: '',
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.date || !formData.time || !formData.location) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            await api.events.create({
                title: formData.title,
                event_date: formData.date,
                event_time: formData.time,
                location: formData.location,
                description: formData.description,
                event_type: 'PRACTICE', // default for now; can add a selector later
            });
            await fetchEvents();
            setShowCreateModal(false);
            resetForm();
        } catch (err: any) {
            alert(err.message || 'Failed to create event');
        }
    };

    const openEditModal = (event: Event) => {
        setShowEditModal(event);
        setFormData({
            title: event.title,
            date: event.event_date,
            time: event.event_time,
            location: event.location || '',
            description: event.description || '',
        });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showEditModal) return;

        if (!formData.title || !formData.date || !formData.time || !formData.location) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            await api.events.update(showEditModal.event_id, {
                title: formData.title,
                event_date: formData.date,
                event_time: formData.time,
                location: formData.location,
                description: formData.description,
                event_type: showEditModal.event_type, // keep existing type
            });
            await fetchEvents();
            setShowEditModal(null);
            resetForm();
        } catch (err: any) {
            alert(err.message || 'Failed to update event');
        }
    };

    const handleDelete = async (eventId: string) => {
        try {
            await api.events.delete(eventId);
            await fetchEvents();
            setShowDeleteConfirm(null);
        } catch (err: any) {
            alert(err.message || 'Failed to delete event');
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    const isUpcoming = (event: Event) => {
        const eventDateTime = new Date(event.event_date + ' ' + event.event_time);
        return eventDateTime >= new Date();
    };

    const upcomingEvents = events.filter(isUpcoming);
    const pastEvents = events.filter(e => !isUpcoming(e));

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading events...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Event Schedule</h1>
                        <p className="text-gray-600 mt-1">{upcomingEvents.length} upcoming events</p>
                    </div>
                    {isAdmin && (
                        <Button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2">
                            <Plus className="h-4 w-4" />
                            <span>Create Event</span>
                        </Button>
                    )}
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Upcoming Events */}
                {upcomingEvents.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Events</h2>
                        <div className="space-y-4">
                            {upcomingEvents.map((event) => (
                                <div key={event.event_id} className="card hover:shadow-lg transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>

                                            <div className="space-y-2">
                                                <div className="flex items-center text-gray-600">
                                                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                                                    <span>{formatDate(event.event_date)}</span>
                                                </div>

                                                <div className="flex items-center text-gray-600">
                                                    <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                                                    <span>{formatTime(event.event_time)}</span>
                                                </div>

                                                <div className="flex items-center text-gray-600">
                                                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                                                    <span>{event.location}</span>
                                                </div>
                                            </div>

                                            {event.description && (
                                                <p className="mt-3 text-gray-700">{event.description}</p>
                                            )}
                                        </div>

                                        {isAdmin && (
                                            <div className="flex space-x-2 ml-4">
                                                <button
                                                    onClick={() => openEditModal(event)}
                                                    className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    title="Edit event"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteConfirm(event.event_id)}
                                                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete event"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Past Events */}
                {pastEvents.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Past Events</h2>
                        <div className="space-y-4">
                            {pastEvents.map((event) => (
                                <div key={event.event_id} className="card opacity-60">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>

                                            <div className="space-y-1 text-sm">
                                                <div className="flex items-center text-gray-600">
                                                    <Calendar className="h-3 w-3 mr-2" />
                                                    <span>{formatDate(event.event_date)}</span>
                                                </div>

                                                <div className="flex items-center text-gray-600">
                                                    <MapPin className="h-3 w-3 mr-2" />
                                                    <span>{event.location}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {isAdmin && (
                                            <button
                                                onClick={() => setShowDeleteConfirm(event.event_id)}
                                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete event"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {events.length === 0 && (
                    <div className="card text-center py-16">
                        <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No events scheduled</h3>
                        <p className="text-gray-600 mb-6">
                            {isAdmin ? 'Create your first event to get started' : 'Check back later for upcoming events'}
                        </p>
                        {isAdmin && (
                            <Button onClick={() => setShowCreateModal(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Event
                            </Button>
                        )}
                    </div>
                )}

                {/* Create Event Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Create Event</h2>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreate}>
                                <Input
                                    label="Event Title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Team Practice"
                                    required
                                />

                                <Input
                                    label="Date"
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />

                                <Input
                                    label="Time"
                                    type="time"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleChange}
                                    required
                                />

                                <Input
                                    label="Location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="Main Field"
                                    required
                                />

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Add any additional details..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    />
                                </div>

                                <div className="flex space-x-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        fullWidth
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            resetForm();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" fullWidth>
                                        Create Event
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Event Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
                                <button
                                    onClick={() => {
                                        setShowEditModal(null);
                                        resetForm();
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdate}>
                                <Input
                                    label="Event Title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                />

                                <Input
                                    label="Date"
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />

                                <Input
                                    label="Time"
                                    type="time"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleChange}
                                    required
                                />

                                <Input
                                    label="Location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    required
                                />

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                    />
                                </div>

                                <div className="flex space-x-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        fullWidth
                                        onClick={() => {
                                            setShowEditModal(null);
                                            resetForm();
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" fullWidth>
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-sm w-full">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Event</h2>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete this event? This action cannot be undone.
                            </p>
                            <div className="flex space-x-3">
                                <Button variant="secondary" fullWidth onClick={() => setShowDeleteConfirm(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    fullWidth
                                    onClick={() => handleDelete(showDeleteConfirm)}
                                >
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
