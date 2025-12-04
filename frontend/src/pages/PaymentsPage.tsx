import React, { useState } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Plus, DollarSign, CheckCircle, Clock, AlertCircle, TrendingUp, TrendingDown, X, Users } from 'lucide-react';

interface Payment {
    id: string;
    memberId: string;
    memberName: string;
    description: string;
    amount: number;
    type: 'CHARGE' | 'CREDIT';
    dueDate?: string;
    status: 'PENDING' | 'PAID' | 'OVERDUE';
    paidDate?: string;
    createdAt: string;
}

interface Member {
    id: string;
    name: string;
    balance: number;
}

const PaymentsPage: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkChargeModal, setShowBulkChargeModal] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

    const [newCharge, setNewCharge] = useState({
        description: '',
        amount: '',
        type: 'CHARGE' as 'CHARGE' | 'CREDIT',
        dueDate: '',
        memberId: '',
    });

    const [bulkCharge, setBulkCharge] = useState({
        description: '',
        amount: '',
        dueDate: '',
    });

    // Mock members data
    const [members] = useState<Member[]>([
        { id: '1', name: 'John Smith', balance: 0 },
        { id: '2', name: 'Sarah Johnson', balance: -225 },
        { id: '3', name: 'Mike Davis', balance: 0 },
        { id: '4', name: 'Emily Brown', balance: -75 },
        { id: '5', name: 'Coach Wilson', balance: 0 },
    ]);

    const [payments, setPayments] = useState<Payment[]>([
        { id: '1', memberId: '2', memberName: 'Sarah Johnson', description: 'Monthly Dues - December', amount: 75, type: 'CHARGE', dueDate: '2025-12-20', status: 'PENDING', createdAt: '2025-12-01' },
        { id: '2', memberId: '2', memberName: 'Sarah Johnson', description: 'Tournament Fee', amount: 150, type: 'CHARGE', dueDate: '2025-12-25', status: 'PENDING', createdAt: '2025-12-01' },
        { id: '3', memberId: '2', memberName: 'Sarah Johnson', description: 'Monthly Dues - November', amount: 75, type: 'CHARGE', dueDate: '2025-11-20', status: 'PAID', paidDate: '2025-11-18', createdAt: '2025-11-01' },
        { id: '4', memberId: '4', memberName: 'Emily Brown', description: 'Equipment Fee', amount: 50, type: 'CHARGE', dueDate: '2025-10-15', status: 'PAID', paidDate: '2025-10-14', createdAt: '2025-10-01' },
        { id: '5', memberId: '4', memberName: 'Emily Brown', description: 'Monthly Dues - December', amount: 75, type: 'CHARGE', dueDate: '2025-12-20', status: 'PENDING', createdAt: '2025-12-01' },
    ]);

    // For demo: if member, show payments for member with ID '2' (Sarah Johnson)
    const demoMemberId = isAdmin ? user?.id : '2';
    const userPayments = isAdmin ? payments : payments.filter(p => p.memberId === demoMemberId);

    // Calculate current balance dynamically
    const currentUserBalance = isAdmin
        ? 0
        : userPayments.reduce((balance, payment) => {
            if (payment.type === 'CHARGE' && payment.status === 'PENDING') {
                return balance - payment.amount;
            }
            return balance;
        }, 0);

    const totalPending = userPayments.filter(p => p.status === 'PENDING' && p.type === 'CHARGE').reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = userPayments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
    const pendingCount = userPayments.filter(p => p.status === 'PENDING').length;

    // Admin stats
    const totalOutstanding = members.reduce((sum, m) => sum + Math.abs(Math.min(0, m.balance)), 0);
    const membersOwing = members.filter(m => m.balance < 0).length;
    const totalCollected = payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);

    const statusConfig = {
        PENDING: { icon: <Clock className="h-5 w-5" />, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
        PAID: { icon: <CheckCircle className="h-5 w-5" />, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
        OVERDUE: { icon: <AlertCircle className="h-5 w-5" />, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    };

    const handleCreateCharge = () => {
        if (!newCharge.description || !newCharge.amount || !newCharge.memberId) {
            alert('All fields are required');
            return;
        }

        const member = members.find(m => m.id === newCharge.memberId);
        if (!member) return;

        const payment: Payment = {
            id: String(payments.length + 1),
            memberId: newCharge.memberId,
            memberName: member.name,
            description: newCharge.description,
            amount: parseFloat(newCharge.amount),
            type: newCharge.type,
            dueDate: newCharge.dueDate || undefined,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
        };

        setPayments([payment, ...payments]);
        setShowCreateModal(false);
        setNewCharge({ description: '', amount: '', type: 'CHARGE', dueDate: '', memberId: '' });
    };

    const handleBulkCharge = () => {
        if (!bulkCharge.description || !bulkCharge.amount || selectedMembers.length === 0) {
            alert('Please fill all fields and select at least one member');
            return;
        }

        const newPayments = selectedMembers.map((memberId, index) => {
            const member = members.find(m => m.id === memberId);
            if (!member) return null;

            return {
                id: String(payments.length + index + 1),
                memberId,
                memberName: member.name,
                description: bulkCharge.description,
                amount: parseFloat(bulkCharge.amount),
                type: 'CHARGE' as const,
                dueDate: bulkCharge.dueDate || undefined,
                status: 'PENDING' as const,
                createdAt: new Date().toISOString(),
            };
        }).filter(Boolean) as Payment[];

        setPayments([...newPayments, ...payments]);
        setShowBulkChargeModal(false);
        setBulkCharge({ description: '', amount: '', dueDate: '' });
        setSelectedMembers([]);
    };

    const handlePayNow = (id: string) => {
        setPayments(payments.map(p =>
            p.id === id ? { ...p, status: 'PAID' as const, paidDate: new Date().toISOString().split('T')[0] } : p
        ));
    };

    const toggleMemberSelection = (memberId: string) => {
        setSelectedMembers(prev =>
            prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
        );
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
                        <p className="text-gray-600 mt-1">
                            {isAdmin ? 'Manage team payments and balances' : 'View your payment history and balance'}
                        </p>
                    </div>
                    {isAdmin && (
                        <div className="flex space-x-3">
                            <Button onClick={() => setShowBulkChargeModal(true)} variant="secondary" className="flex items-center space-x-2">
                                <Users className="h-4 w-4" />
                                <span>Bulk Charge</span>
                            </Button>
                            <Button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2">
                                <Plus className="h-4 w-4" />
                                <span>Create Charge</span>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                {isAdmin ? (
                    // Admin Stats
                    <div className="grid md:grid-cols-4 gap-6">
                        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Total Outstanding</p>
                                    <p className="text-3xl font-bold mt-1">${totalOutstanding}</p>
                                    <p className="text-xs opacity-75 mt-1">{membersOwing} members owing</p>
                                </div>
                                <TrendingDown className="h-12 w-12 opacity-50" />
                            </div>
                        </div>

                        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Total Collected</p>
                                    <p className="text-3xl font-bold mt-1">${totalCollected}</p>
                                    <p className="text-xs opacity-75 mt-1">All time</p>
                                </div>
                                <TrendingUp className="h-12 w-12 opacity-50" />
                            </div>
                        </div>

                        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Pending Payments</p>
                                    <p className="text-3xl font-bold mt-1">{payments.filter(p => p.status === 'PENDING').length}</p>
                                    <p className="text-xs opacity-75 mt-1">Awaiting payment</p>
                                </div>
                                <Clock className="h-12 w-12 opacity-50" />
                            </div>
                        </div>

                        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Total Members</p>
                                    <p className="text-3xl font-bold mt-1">{members.length}</p>
                                    <p className="text-xs opacity-75 mt-1">Active members</p>
                                </div>
                                <Users className="h-12 w-12 opacity-50" />
                            </div>
                        </div>
                    </div>
                ) : (
                    // Member Stats
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className={`card ${currentUserBalance < 0 ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-green-500 to-green-600'} text-white`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Current Balance</p>
                                    <p className="text-4xl font-bold mt-1">${Math.abs(currentUserBalance)}</p>
                                    <p className="text-xs opacity-75 mt-1">
                                        {currentUserBalance < 0 ? 'Amount owed' : currentUserBalance > 0 ? 'Credit balance' : 'All paid up'}
                                    </p>
                                </div>
                                <DollarSign className="h-16 w-16 opacity-50" />
                            </div>
                        </div>

                        <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Pending Payments</p>
                                    <p className="text-4xl font-bold mt-1">${totalPending}</p>
                                    <p className="text-xs opacity-75 mt-1">{pendingCount} unpaid charges</p>
                                </div>
                                <Clock className="h-16 w-16 opacity-50" />
                            </div>
                        </div>

                        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm opacity-90">Total Paid</p>
                                    <p className="text-4xl font-bold mt-1">${totalPaid}</p>
                                    <p className="text-xs opacity-75 mt-1">Lifetime payments</p>
                                </div>
                                <CheckCircle className="h-16 w-16 opacity-50" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin: Member Balances */}
                {isAdmin && (
                    <div className="card">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Member Balances</h2>
                        <div className="space-y-2">
                            {members.map(member => (
                                <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <span className="font-medium text-gray-900">{member.name}</span>
                                    <span className={`text-lg font-bold ${member.balance < 0 ? 'text-red-600' : member.balance > 0 ? 'text-green-600' : 'text-gray-600'
                                        }`}>
                                        {member.balance < 0 ? `-$${Math.abs(member.balance)}` : member.balance > 0 ? `+$${member.balance}` : '$0'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Payment History */}
                <div className="card">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        {isAdmin ? 'All Payments' : 'Payment History'}
                    </h2>

                    <div className="space-y-3">
                        {userPayments.length === 0 ? (
                            <div className="text-center py-12">
                                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments yet</h3>
                                <p className="text-gray-600">Payment history will appear here</p>
                            </div>
                        ) : (
                            userPayments.map((payment) => {
                                const config = statusConfig[payment.status];
                                return (
                                    <div key={payment.id} className={`border-2 rounded-lg p-4 ${config.bg} ${config.border}`}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-2">
                                                    <div className={config.color}>
                                                        {config.icon}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">{payment.description}</h3>
                                                        {isAdmin && <p className="text-sm text-gray-600">{payment.memberName}</p>}
                                                    </div>
                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${config.color} ${config.bg} border ${config.border}`}>
                                                        {payment.status}
                                                    </span>
                                                </div>

                                                <div className="flex items-center space-x-6 text-sm text-gray-600 ml-8">
                                                    <span className="text-2xl font-bold text-gray-900">${payment.amount}</span>
                                                    {payment.dueDate && <span>Due: {payment.dueDate}</span>}
                                                    {payment.paidDate && <span>Paid: {payment.paidDate}</span>}
                                                </div>
                                            </div>

                                            {!isAdmin && payment.status === 'PENDING' && (
                                                <Button onClick={() => handlePayNow(payment.id)} className="ml-4">
                                                    Pay Now
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Create Single Charge Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Create Charge/Credit</h2>
                                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
                                <select
                                    value={newCharge.memberId}
                                    onChange={(e) => setNewCharge({ ...newCharge, memberId: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                >
                                    <option value="">Select a member</option>
                                    {members.map(member => (
                                        <option key={member.id} value={member.id}>{member.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    value={newCharge.type}
                                    onChange={(e) => setNewCharge({ ...newCharge, type: e.target.value as 'CHARGE' | 'CREDIT' })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                >
                                    <option value="CHARGE">Charge (they owe)</option>
                                    <option value="CREDIT">Credit (give them money back)</option>
                                </select>
                            </div>

                            <Input
                                label="Description"
                                value={newCharge.description}
                                onChange={(e) => setNewCharge({ ...newCharge, description: e.target.value })}
                                placeholder="Monthly Dues - January"
                                required
                            />

                            <Input
                                label="Amount ($)"
                                type="number"
                                value={newCharge.amount}
                                onChange={(e) => setNewCharge({ ...newCharge, amount: e.target.value })}
                                placeholder="75"
                                required
                            />

                            <Input
                                label="Due Date (optional)"
                                type="date"
                                value={newCharge.dueDate}
                                onChange={(e) => setNewCharge({ ...newCharge, dueDate: e.target.value })}
                            />

                            <div className="flex space-x-3">
                                <Button variant="secondary" fullWidth onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </Button>
                                <Button fullWidth onClick={handleCreateCharge}>
                                    Create {newCharge.type === 'CHARGE' ? 'Charge' : 'Credit'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Charge Modal */}
                {showBulkChargeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Bulk Charge Members</h2>
                                <button onClick={() => setShowBulkChargeModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <Input
                                label="Description"
                                value={bulkCharge.description}
                                onChange={(e) => setBulkCharge({ ...bulkCharge, description: e.target.value })}
                                placeholder="Monthly Dues - January"
                                required
                            />

                            <Input
                                label="Amount ($)"
                                type="number"
                                value={bulkCharge.amount}
                                onChange={(e) => setBulkCharge({ ...bulkCharge, amount: e.target.value })}
                                placeholder="75"
                                required
                            />

                            <Input
                                label="Due Date"
                                type="date"
                                value={bulkCharge.dueDate}
                                onChange={(e) => setBulkCharge({ ...bulkCharge, dueDate: e.target.value })}
                                required
                            />

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Members ({selectedMembers.length} selected)
                                </label>
                                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
                                    {members.map(member => (
                                        <label key={member.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedMembers.includes(member.id)}
                                                onChange={() => toggleMemberSelection(member.id)}
                                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                            />
                                            <span className="flex-1 text-gray-900">{member.name}</span>
                                            <span className="text-sm text-gray-600">Balance: ${member.balance}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <Button variant="secondary" fullWidth onClick={() => setShowBulkChargeModal(false)}>
                                    Cancel
                                </Button>
                                <Button fullWidth onClick={handleBulkCharge}>
                                    Charge {selectedMembers.length} Members
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default PaymentsPage;