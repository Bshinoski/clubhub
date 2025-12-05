import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import api, { Payment, CreatePaymentRequest, Member, MemberBalance } from '../api/api-client';
import { DollarSign, Plus, Check, X, Users, AlertCircle } from 'lucide-react';

const PaymentsPage: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [payments, setPayments] = useState<Payment[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [balances, setBalances] = useState<MemberBalance[]>([]);
    const [myBalance, setMyBalance] = useState<MemberBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkChargeModal, setShowBulkChargeModal] = useState(false);

    const [formData, setFormData] = useState<CreatePaymentRequest>({
        user_id: '',
        amount: 0,
        description: '',
    });

    const [bulkChargeData, setbulkChargeData] = useState({
        user_ids: [] as string[],
        amount: 0,
        description: '',
    });

    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            const [paymentsData, membersData, balancesData, myBalanceData] = await Promise.all([
                api.payments.getAll(),
                api.members.getAll(),
                api.payments.getBalances(),
                api.payments.getMyBalance(),
            ]);

            setPayments(paymentsData);
            setMembers(membersData);
            setBalances(balancesData);
            setMyBalance(myBalanceData);
        } catch (err: any) {
            setError(err.message || 'Failed to load payments data');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: name === 'amount' ? parseFloat(value) || 0 : value,
        });
    };

    const handleBulkChargeChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setbulkChargeData({
            ...bulkChargeData,
            [name]: name === 'amount' ? parseFloat(value) || 0 : value,
        });
    };

    const toggleMemberForBulkCharge = (userId: string) => {
        setbulkChargeData((prev) => ({
            ...prev,
            user_ids: prev.user_ids.includes(userId)
                ? prev.user_ids.filter((id) => id !== userId)
                : [...prev.user_ids, userId],
        }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.user_id || formData.amount <= 0 || !formData.description) {
            alert('Please fill in all fields with valid values');
            return;
        }

        try {
            await api.payments.create(formData);
            await fetchData();
            setShowCreateModal(false);
            setFormData({ user_id: '', amount: 0, description: '' });
        } catch (err: any) {
            alert(err.message || 'Failed to create payment');
        }
    };

    const handleBulkCharge = async (e: React.FormEvent) => {
        e.preventDefault();

        if (
            bulkChargeData.user_ids.length === 0 ||
            bulkChargeData.amount <= 0 ||
            !bulkChargeData.description
        ) {
            alert('Please select members and fill in all fields');
            return;
        }

        try {
            await api.payments.bulkCharge(bulkChargeData);
            await fetchData();
            setShowBulkChargeModal(false);
            setbulkChargeData({ user_ids: [], amount: 0, description: '' });
        } catch (err: any) {
            alert(err.message || 'Failed to create bulk charges');
        }
    };

    const handleMarkPaid = async (paymentId: string) => {
        try {
            await api.payments.updateStatus(paymentId, 'paid');
            await fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to update payment status');
        }
    };

    const handleMarkUnpaid = async (paymentId: string) => {
        try {
            await api.payments.updateStatus(paymentId, 'unpaid');
            await fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to update payment status');
        }
    };

    const handleDelete = async (paymentId: string) => {
        if (!window.confirm('Delete this payment? This will affect member balances.')) return;

        try {
            await api.payments.delete(paymentId);
            await fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to delete payment');
        }
    };

    const filteredPayments = payments.filter((p) => {
        if (filterStatus === 'all') return true;
        return p.status === filterStatus;
    });

    const totalOwed = balances.reduce((sum, b) => sum + b.balance, 0);
    const unpaidCount = payments.filter((p) => p.status === 'unpaid').length;

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
                        <p className="mt-4 text-gray-600">Loading payments...</p>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // --- Shared Payment History content so we can reuse it in both layouts ---
    const paymentHistoryCard = (
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'all'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterStatus('unpaid')}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'unpaid'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Unpaid
                    </button>
                    <button
                        onClick={() => setFilterStatus('paid')}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'paid'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Paid
                    </button>
                </div>
            </div>

            {filteredPayments.length === 0 ? (
                <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No payments found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredPayments.map((payment) => (
                        <div
                            key={payment.payment_id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${payment.status === 'paid'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-orange-100 text-orange-800'
                                            }`}
                                    >
                                        {payment.status}
                                    </span>
                                    <p className="font-medium text-gray-900">{payment.user_name}</p>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{payment.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date(payment.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex items-center space-x-4">
                                <p className="text-lg font-bold text-gray-900">
                                    ${payment.amount.toFixed(2)}
                                </p>

                                {isAdmin && (
                                    <div className="flex space-x-2">
                                        {payment.status === 'unpaid' ? (
                                            <button
                                                onClick={() => handleMarkPaid(payment.payment_id)}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Mark as paid"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleMarkUnpaid(payment.payment_id)}
                                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                title="Mark as unpaid"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(payment.payment_id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete payment"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
                        <p className="text-gray-600 mt-1">Team payments and balances</p>
                    </div>
                    {isAdmin && (
                        <div className="flex space-x-3">
                            <Button
                                variant="secondary"
                                onClick={() => setShowBulkChargeModal(true)}
                                className="flex items-center space-x-2"
                            >
                                <Users className="h-4 w-4" />
                                <span>Bulk Charge</span>
                            </Button>
                            <Button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center space-x-2"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Add Payment</span>
                            </Button>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Top stats row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {isAdmin ? (
                        <>
                            <div className="card">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Total Owed</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-1">
                                            ${totalOwed.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-primary-100 rounded-lg">
                                        <DollarSign className="h-6 w-6 text-primary-600" />
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Unpaid</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-1">
                                            {unpaidCount}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-orange-100 rounded-lg">
                                        <AlertCircle className="h-6 w-6 text-orange-600" />
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Total Payments</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-1">
                                            {payments.length}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <Check className="h-6 w-6 text-green-600" />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="card md:col-span-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Your Balance</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-1">
                                        ${myBalance?.balance.toFixed(2) || '0.00'}
                                    </p>
                                    {myBalance && myBalance.balance > 0 && (
                                        <p className="text-sm text-orange-600 mt-2">
                                            You have outstanding payments
                                        </p>
                                    )}
                                </div>
                                <div className="p-4 bg-primary-100 rounded-lg">
                                    <DollarSign className="h-8 w-8 text-primary-600" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main content row: 2 columns for admin, 1 column for members */}
                {isAdmin ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Member balances */}
                        <div className="card">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Member Balances</h2>
                            {balances.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    No members with balances yet.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead>
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Member
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Balance Owed
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {balances.map((balance) => (
                                                <tr key={balance.user_id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {balance.user_name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        <span
                                                            className={`text-sm font-semibold ${balance.balance > 0
                                                                    ? 'text-orange-600'
                                                                    : 'text-green-600'
                                                                }`}
                                                        >
                                                            ${balance.balance.toFixed(2)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Right: Payment history */}
                        {paymentHistoryCard}
                    </div>
                ) : (
                    // Non-admins: just show payment history full width
                    paymentHistoryCard
                )}

                {/* Create Payment Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Add Payment</h2>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreate}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Member
                                    </label>
                                    <select
                                        name="user_id"
                                        value={formData.user_id}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                        required
                                    >
                                        <option value="">Select a member</option>
                                        {members.map((member) => (
                                            <option key={member.user_id} value={member.user_id}>
                                                {member.display_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <Input
                                    label="Amount"
                                    type="number"
                                    name="amount"
                                    value={formData.amount || ''}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0.01"
                                    required
                                />

                                <Input
                                    label="Description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Tournament fee, equipment, etc."
                                    required
                                />

                                <div className="flex space-x-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        fullWidth
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" fullWidth>
                                        Add Payment
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Bulk Charge Modal */}
                {showBulkChargeModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Bulk Charge</h2>
                                <button
                                    onClick={() => setShowBulkChargeModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleBulkCharge}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Members
                                    </label>
                                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                                        {members.map((member) => (
                                            <label
                                                key={member.user_id}
                                                className="flex items-center space-x-2 cursor-pointer"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={bulkChargeData.user_ids.includes(
                                                        member.user_id
                                                    )}
                                                    onChange={() =>
                                                        toggleMemberForBulkCharge(member.user_id)
                                                    }
                                                    className="rounded text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="text-sm text-gray-900">
                                                    {member.display_name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {bulkChargeData.user_ids.length} member(s) selected
                                    </p>
                                </div>

                                <Input
                                    label="Amount per Member"
                                    type="number"
                                    name="amount"
                                    value={bulkChargeData.amount || ''}
                                    onChange={handleBulkChargeChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0.01"
                                    required
                                />

                                <Input
                                    label="Description"
                                    name="description"
                                    value={bulkChargeData.description}
                                    onChange={handleBulkChargeChange}
                                    placeholder="Tournament fee, equipment, etc."
                                    required
                                />

                                <div className="flex space-x-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        fullWidth
                                        onClick={() => setShowBulkChargeModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" fullWidth>
                                        Charge Members
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default PaymentsPage;
