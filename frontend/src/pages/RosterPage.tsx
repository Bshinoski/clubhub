import React, { useState } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Plus, Edit, Trash2, Mail, Phone, Shield, User, Search, Filter, X, DollarSign, AlertCircle } from 'lucide-react';

interface Member {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'ADMIN' | 'MEMBER';
    joinedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
    balance: number; // Negative = owes money, Positive = credit, 0 = paid up
}

const RosterPage: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'ALL' | 'ADMIN' | 'MEMBER'>('ALL');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [showOutstandingAlert, setShowOutstandingAlert] = useState(true);

    const [newMember, setNewMember] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'MEMBER' as 'ADMIN' | 'MEMBER',
    });

    const [members, setMembers] = useState<Member[]>([
        { id: '1', name: 'John Smith', email: 'john@example.com', phone: '555-0101', role: 'ADMIN', joinedAt: '2024-01-15', status: 'ACTIVE', balance: 0 },
        { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', phone: '555-0102', role: 'MEMBER', joinedAt: '2024-02-20', status: 'ACTIVE', balance: -225 },
        { id: '3', name: 'Mike Davis', email: 'mike@example.com', phone: '555-0103', role: 'MEMBER', joinedAt: '2024-03-10', status: 'ACTIVE', balance: 0 },
        { id: '4', name: 'Emily Brown', email: 'emily@example.com', phone: '555-0104', role: 'MEMBER', joinedAt: '2024-03-15', status: 'ACTIVE', balance: -75 },
        { id: '5', name: 'Coach Wilson', email: 'wilson@example.com', phone: '555-0105', role: 'ADMIN', joinedAt: '2024-01-10', status: 'ACTIVE', balance: 0 },
    ]);

    const filteredMembers = members.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterRole === 'ALL' || member.role === filterRole;
        return matchesSearch && matchesFilter;
    });

    const adminCount = members.filter(m => m.role === 'ADMIN').length;
    const memberCount = members.filter(m => m.role === 'MEMBER').length;
    const totalOutstanding = members.reduce((sum, m) => sum + Math.min(0, m.balance), 0);
    const membersOwing = members.filter(m => m.balance < 0).length;

    const handleAddMember = () => {
        if (!newMember.name || !newMember.email) {
            alert('Name and email are required');
            return;
        }

        const member: Member = {
            id: String(members.length + 1),
            ...newMember,
            joinedAt: new Date().toISOString().split('T')[0],
            status: 'ACTIVE',
            balance: 0,
        };
        setMembers([...members, member]);
        setShowAddModal(false);
        setNewMember({ name: '', email: '', phone: '', role: 'MEMBER' });
    };

    const handleEditMember = () => {
        if (!editingMember) return;

        setMembers(members.map(m => m.id === editingMember.id ? editingMember : m));
        setShowEditModal(false);
        setEditingMember(null);
    };

    const handleDeleteMember = (id: string) => {
        setMembers(members.filter(m => m.id !== id));
        setShowDeleteConfirm(null);
    };

    const openEditModal = (member: Member) => {
        setEditingMember({ ...member });
        setShowEditModal(true);
    };

    const getBalanceColor = (balance: number) => {
        if (balance < 0) return 'text-red-600 bg-red-50 border-red-200';
        if (balance > 0) return 'text-green-600 bg-green-50 border-green-200';
        return 'text-gray-600 bg-gray-50 border-gray-200';
    };

    const getBalanceText = (balance: number) => {
        if (balance < 0) return `Owes $${Math.abs(balance)}`;
        if (balance > 0) return `Credit $${balance}`;
        return 'Paid Up';
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header with Stats */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Team Roster</h1>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                            <span className="text-sm text-gray-600">
                                <span className="font-semibold text-gray-900">{members.length}</span> total members
                            </span>
                            <span className="text-sm text-gray-600">•</span>
                            <span className="text-sm text-gray-600">
                                <span className="font-semibold text-purple-600">{adminCount}</span> admins
                            </span>
                            <span className="text-sm text-gray-600">•</span>
                            <span className="text-sm text-gray-600">
                                <span className="font-semibold text-blue-600">{memberCount}</span> members
                            </span>
                            {isAdmin && totalOutstanding < 0 && (
                                <>
                                    <span className="text-sm text-gray-600">•</span>
                                    <span className="text-sm text-red-600 flex items-center space-x-1">
                                        <AlertCircle className="h-4 w-4" />
                                        <span>
                                            <span className="font-semibold">${Math.abs(totalOutstanding)}</span> outstanding
                                        </span>
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                    {isAdmin && (
                        <Button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2">
                            <Plus className="h-4 w-4" />
                            <span>Add Member</span>
                        </Button>
                    )}
                </div>

                {/* Outstanding Balance Alert */}
                {isAdmin && membersOwing > 0 && showOutstandingAlert && (
                    <div className="card bg-yellow-50 border-2 border-yellow-200">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                                <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Outstanding Payments</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {membersOwing} {membersOwing === 1 ? 'member has' : 'members have'} outstanding balances totaling
                                        <span className="font-semibold text-red-600"> ${Math.abs(totalOutstanding)}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowOutstandingAlert(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
                                aria-label="Dismiss notification"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Search and Filter Bar */}
                <div className="card">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="search"
                                placeholder="Search members by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Filter className="h-5 w-5 text-gray-400" />
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value as any)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                            >
                                <option value="ALL">All Roles</option>
                                <option value="ADMIN">Admins Only</option>
                                <option value="MEMBER">Members Only</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Members List */}
                {filteredMembers.length === 0 ? (
                    <div className="card text-center py-12">
                        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No members found</h3>
                        <p className="text-gray-600">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredMembers.map((member) => (
                            <div key={member.id} className="card hover:shadow-lg transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 flex-1">
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${member.role === 'ADMIN' ? 'bg-purple-100' : 'bg-primary-100'
                                            }`}>
                                            <User className={`h-7 w-7 ${member.role === 'ADMIN' ? 'text-purple-600' : 'text-primary-600'
                                                }`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                                <h3 className="text-lg font-semibold text-gray-900 truncate">{member.name}</h3>
                                                {member.role === 'ADMIN' && (
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full flex items-center space-x-1 flex-shrink-0">
                                                        <Shield className="h-3 w-3" />
                                                        <span>Admin</span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-gray-600">
                                                <span className="flex items-center space-x-1">
                                                    <Mail className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">{member.email}</span>
                                                </span>
                                                <span className="flex items-center space-x-1">
                                                    <Phone className="h-4 w-4 flex-shrink-0" />
                                                    <span>{member.phone}</span>
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-3 mt-2">
                                                <p className="text-xs text-gray-500">Member since {member.joinedAt}</p>
                                                {isAdmin && (
                                                    <>
                                                        <span className="text-gray-300">•</span>
                                                        <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getBalanceColor(member.balance)}`}>
                                                            <DollarSign className="h-3 w-3" />
                                                            <span>{getBalanceText(member.balance)}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {isAdmin && (
                                        <div className="flex space-x-2 ml-4">
                                            <Button
                                                variant="secondary"
                                                onClick={() => openEditModal(member)}
                                                className="flex items-center space-x-1"
                                            >
                                                <Edit className="h-4 w-4" />
                                                <span className="hidden sm:inline">Edit</span>
                                            </Button>
                                            <Button
                                                variant="danger"
                                                onClick={() => setShowDeleteConfirm(member.id)}
                                                className="flex items-center space-x-1"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="hidden sm:inline">Remove</span>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Member Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Add New Member</h2>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <Input
                                label="Full Name"
                                value={newMember.name}
                                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                placeholder="John Doe"
                                required
                            />

                            <Input
                                label="Email"
                                type="email"
                                value={newMember.email}
                                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                                placeholder="john@example.com"
                                required
                            />

                            <Input
                                label="Phone"
                                type="tel"
                                value={newMember.phone}
                                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                                placeholder="555-0100"
                            />

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Role <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={newMember.role}
                                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value as 'ADMIN' | 'MEMBER' })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                >
                                    <option value="MEMBER">Member</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>

                            <div className="flex space-x-3">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    fullWidth
                                    onClick={handleAddMember}
                                >
                                    Add Member
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Member Modal */}
                {showEditModal && editingMember && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
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
                                label="Full Name"
                                value={editingMember.name}
                                onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                                placeholder="John Doe"
                                required
                            />

                            <Input
                                label="Email"
                                type="email"
                                value={editingMember.email}
                                onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                                placeholder="john@example.com"
                                required
                            />

                            <Input
                                label="Phone"
                                type="tel"
                                value={editingMember.phone}
                                onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                                placeholder="555-0100"
                            />

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={editingMember.role}
                                    onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value as 'ADMIN' | 'MEMBER' })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                >
                                    <option value="MEMBER">Member</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>

                            <Input
                                label="Balance"
                                type="number"
                                value={editingMember.balance.toString()}
                                onChange={(e) => setEditingMember({ ...editingMember, balance: parseFloat(e.target.value) || 0 })}
                                placeholder="0"
                            />
                            <p className="text-xs text-gray-500 mb-4 -mt-2">Negative = owes money, Positive = credit, 0 = paid up</p>

                            <div className="flex space-x-3">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    fullWidth
                                    onClick={handleEditMember}
                                >
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
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Removal</h2>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to remove this member? This action cannot be undone.
                            </p>
                            <div className="flex space-x-3">
                                <Button
                                    variant="secondary"
                                    fullWidth
                                    onClick={() => setShowDeleteConfirm(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    fullWidth
                                    onClick={() => handleDeleteMember(showDeleteConfirm)}
                                >
                                    Remove Member
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