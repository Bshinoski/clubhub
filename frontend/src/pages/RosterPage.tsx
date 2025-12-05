import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import api, { Member } from '../api/api-client';
import { Users, Edit, Trash2, Shield, User, X, AlertCircle } from 'lucide-react';

const RosterPage: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [editingMember, setEditingMember] = useState<Member | null>(null);

    const [editForm, setEditForm] = useState({
        display_name: '',
        phone: '',
    });

    // Fetch members on mount
    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.members.getAll();
            setMembers(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load members');
        } finally {
            setLoading(false);
        }
    };

    const openEditModal = (member: Member) => {
        setEditingMember(member);
        setEditForm({
            display_name: member.display_name || '',
            phone: member.phone || '',
        });
        setShowEditModal(true);
    };

    const handleEditMember = async () => {
        if (!editingMember) return;

        try {
            await api.members.update(editingMember.user_id, {
                display_name: editForm.display_name,
                phone: editForm.phone,
            });

            // Refresh members
            await fetchMembers();
            setShowEditModal(false);
            setEditingMember(null);
        } catch (err: any) {
            alert(err.message || 'Failed to update member');
        }
    };

    const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member') => {
        try {
            await api.members.updateRole(memberId, newRole);
            await fetchMembers();
        } catch (err: any) {
            alert(err.message || 'Failed to update role');
        }
    };

    const handleDeleteMember = async (memberId: string) => {
        try {
            await api.members.remove(memberId);
            await fetchMembers();
            setShowDeleteConfirm(null);
        } catch (err: any) {
            alert(err.message || 'Failed to remove member');
        }
    };

    const admins = members.filter((m) => m.role === 'admin');
    const regularMembers = members.filter((m) => m.role === 'member');

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading roster...</p>
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
                        <h1 className="text-3xl font-bold text-gray-900">Team Roster</h1>
                        <p className="text-gray-600 mt-1">{members.length} team members</p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Stats */}
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Total Members</p>
                                <p className="text-4xl font-bold mt-1">{members.length}</p>
                            </div>
                            <Users className="h-16 w-16 opacity-50" />
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Admins</p>
                                <p className="text-4xl font-bold mt-1">{admins.length}</p>
                            </div>
                            <Shield className="h-16 w-16 opacity-50" />
                        </div>
                    </div>

                    <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Members</p>
                                <p className="text-4xl font-bold mt-1">{regularMembers.length}</p>
                            </div>
                            <User className="h-16 w-16 opacity-50" />
                        </div>
                    </div>
                </div>

                {/* Admins Section */}
                <div className="card">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-purple-600" />
                        <span>Administrators</span>
                    </h2>
                    <div className="space-y-3">
                        {admins.map((member) => (
                            <div
                                key={member.user_id}
                                className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-semibold text-lg">
                                            {(member.display_name || member.email).charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">
                                            {member.display_name || member.email}
                                            {member.user_id === user?.id && (
                                                <span className="ml-2 text-sm text-purple-600">(You)</span>
                                            )}
                                        </h3>
                                        <p className="text-sm text-gray-600">{member.email}</p>
                                        {member.phone && (
                                            <p className="text-sm text-gray-600">{member.phone}</p>
                                        )}
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="secondary"
                                            onClick={() => openEditModal(member)}
                                            className="p-2"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        {member.user_id !== user?.id && admins.length > 1 && (
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleRoleChange(member.user_id, 'member')}
                                                className="p-2 text-xs"
                                            >
                                                Demote
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Members Section */}
                <div className="card">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                        <User className="h-5 w-5 text-blue-600" />
                        <span>Members</span>
                    </h2>
                    <div className="space-y-3">
                        {regularMembers.length === 0 ? (
                            <div className="text-center py-12">
                                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No members yet</h3>
                                <p className="text-gray-600">Invite team members to join</p>
                            </div>
                        ) : (
                            regularMembers.map((member) => (
                                <div
                                    key={member.user_id}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-white font-semibold text-lg">
                                                {(member.display_name || member.email).charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {member.display_name || member.email}
                                            </h3>
                                            <p className="text-sm text-gray-600">{member.email}</p>
                                            {member.phone && (
                                                <p className="text-sm text-gray-600">{member.phone}</p>
                                            )}
                                        </div>
                                    </div>

                                    {isAdmin && (
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="secondary"
                                                onClick={() => openEditModal(member)}
                                                className="p-2"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleRoleChange(member.user_id, 'admin')}
                                                className="p-2 text-xs"
                                            >
                                                Make Admin
                                            </Button>
                                            <Button
                                                variant="danger"
                                                onClick={() => setShowDeleteConfirm(member.user_id)}
                                                className="p-2"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Edit Member Modal */}
                {showEditModal && editingMember && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Edit Member</h2>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <Input
                                label="Display Name"
                                value={editForm.display_name}
                                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                                placeholder="John Smith"
                            />

                            <Input
                                label="Phone Number"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                placeholder="(555) 123-4567"
                            />

                            <div className="flex space-x-3">
                                <Button variant="secondary" fullWidth onClick={() => setShowEditModal(false)}>
                                    Cancel
                                </Button>
                                <Button fullWidth onClick={handleEditMember}>
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
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Remove Member</h2>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to remove this member from the team?
                            </p>
                            <div className="flex space-x-3">
                                <Button variant="secondary" fullWidth onClick={() => setShowDeleteConfirm(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    fullWidth
                                    onClick={() => handleDeleteMember(showDeleteConfirm)}
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default RosterPage;