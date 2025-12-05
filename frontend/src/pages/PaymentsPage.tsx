import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import api, { Payment, CreatePaymentRequest, Member, MemberBalance, PaymentStatistics } from '../api/api-client';
import { DollarSign, Plus, Check, X, Users, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

const PaymentsPage: React.FC = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [payments, setPayments] = useState<Payment[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [balances, setBalances] = useState<MemberBalance[]>([]);
    const [myBalance, setMyBalance] = useState<number>(0);
    const [statistics, setStatistics] = useState<PaymentStatistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showBulkChargeModal, setShowBulkChargeModal] = useState(false);
    const [showBulkCreditModal, setShowBulkCreditModal] = useState(false);

    const [formData, setFormData] = useState<CreatePaymentRequest>({
        user_id: '',
        amount: 0,
        description: '',
        payment_type: 'CHARGE',
    });

    const [bulkChargeData, setbulkChargeData] = useState({
        user_ids: [] as string[],
        amount: 0,
        description: '',
    });

    const [bulkCreditData, setBulkCreditData] = useState({
        user_ids: [] as string[],
        amount: 0,
        description: '',
    });

    const [filterStatus, setFilterStatus] = useState<'all' | 'PAID' | 'PENDING'>('all');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
            if (isAdmin) {
                const [paymentsData, membersData, balancesData, myBalanceData, statsData] = await Promise.all([
                    api.payments.getAll(),
                    api.members.getAll(),
                    api.payments.getBalances(),
                    api.payments.getMyBalance(),
                    api.payments.getStatistics(),
                ]);

                setPayments(paymentsData);
                setMembers(membersData);
                setBalances(balancesData);
                setMyBalance(myBalanceData.balance);
                setStatistics(statsData);
            } else {
                const [paymentsData, myBalanceData] = await Promise.all([
                    api.payments.getAll(),
                    api.payments.getMyBalance(),
                ]);

                setPayments(paymentsData);
                setMyBalance(myBalanceData.balance);
            }
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

    const handleBulkCreditChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setBulkCreditData({
            ...bulkCreditData,
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

    const toggleMemberForBulkCredit = (userId: string) => {
        setBulkCreditData((prev) => ({
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
            setFormData({ user_id: '', amount: 0, description: '', payment_type: 'CHARGE' });
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

    const handleBulkCredit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (
            bulkCreditData.user_ids.length === 0 ||
            bulkCreditData.amount <= 0 ||
            !bulkCreditData.description
        ) {
            alert('Please select members and fill in all fields');
            return;
        }

        try {
            await api.payments.bulkCredit(bulkCreditData);
            await fetchData();
            setShowBulkCreditModal(false);
            setBulkCreditData({ user_ids: [], amount: 0, description: '' });
        } catch (err: any) {
            alert(err.message || 'Failed to create bulk credits');
        }
    };

    const handleMarkPaid = async (paymentId: string) => {
        try {
            await api.payments.updateStatus(paymentId, 'PAID');
            await fetchData();
        } catch (err: any) {
            alert(err.message || 'Failed to update payment status');
        }
    };

    const handleMarkUnpaid = async (paymentId: string) => {
        try {
            await api.payments.updateStatus(paymentId, 'PENDING');
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

    // Get admin's own payments
    const myPayments = isAdmin ? payments.filter(p => p.user_id === user?.id) : payments;

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

    // --- Payment history component (reusable) ---
    const renderPaymentHistory = (paymentsToShow: Payment[], title: string = "Payment History") => (
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
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
                        onClick={() => setFilterStatus('PENDING')}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'PENDING'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Unpaid
                    </button>
                    <button
                        onClick={() => setFilterStatus('PAID')}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${filterStatus === 'PAID'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Paid
                    </button>
                </div>
            </div>

            {paymentsToShow.length === 0 ? (
                <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No payments found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {paymentsToShow.map((payment) => (
                        <div
                            key={payment.payment_id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${payment.status === 'PAID'
                                                ? 'bg-green-100 text-green-800'
                                                : payment.status === 'PENDING'
                                                    ? 'bg-orange-100 text-orange-800'
                                                    : 'bg-red-100 text-red-800'
                                            }`}
                                    >
                                        {payment.status}
                                    </span>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${payment.payment_type === 'CHARGE'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-purple-100 text-purple-800'
                                            }`}
                                    >
                                        {payment.payment_type === 'CHARGE' ? (
                                            <span className="flex items-center space-x-1">
                                                <TrendingUp className="h-3 w-3" />
                                                <span>CHARGE</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center space-x-1">
                                                <TrendingDown className="h-3 w-3" />
                                                <span>CREDIT</span>
                                            </span>
                                        )}
                                    </span>
                                    <p className="font-medium text-gray-900">{payment.user_name}</p>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{payment.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date(payment.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex items-center space-x-4">
                                <p className={`text-lg font-bold ${payment.payment_type === 'CREDIT' ? 'text-green-600' : 'text-gray-900'
                                    }`}>
                                    {payment.payment_type === 'CREDIT' ? '+' : ''}${payment.amount.toFixed(2)}
                                </p>

                                {isAdmin && (
                                    <div className="flex space-x-2">
                                        {payment.status === 'PENDING' && payment.payment_type === 'CHARGE' ? (
                                            <button
                                                onClick={() => handleMarkPaid(payment.payment_id)}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Mark as paid"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                        ) : payment.status === 'PAID' && payment.payment_type === 'CHARGE' ? (
                                            <button
                                                onClick={() => handleMarkUnpaid(payment.payment_id)}
                                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                                title="Mark as unpaid"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        ) : null}
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
                                onClick={() => setShowBulkCreditModal(true)}
                                className="flex items-center space-x-2"
                            >
                                <TrendingDown className="h-4 w-4" />
                                <span>Bulk Credit</span>
                            </Button>
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

                {/* Admin View */}
                {isAdmin ? (
                    <>
                        {/* Statistics Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="card">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Total Money Owed</p>
                                        <p className="text-2xl font-bold text-orange-600 mt-1">
                                            ${statistics?.total_money_owed.toFixed(2) || '0.00'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Unpaid charges</p>
                                    </div>
                                    <div className="p-3 bg-orange-100 rounded-lg">
                                        <AlertCircle className="h-6 w-6 text-orange-600" />
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Total Money Collected</p>
                                        <p className="text-2xl font-bold text-green-600 mt-1">
                                            ${statistics?.total_money_collected.toFixed(2) || '0.00'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">Paid charges</p>
                                    </div>
                                    <div className="p-3 bg-green-100 rounded-lg">
                                        <Check className="h-6 w-6 text-green-600" />
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Total Payments</p>
                                        <p className="text-2xl font-bold text-gray-900 mt-1">
                                            {statistics?.total_payments_count || 0}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">All records</p>
                                    </div>
                                    <div className="p-3 bg-primary-100 rounded-lg">
                                        <DollarSign className="h-6 w-6 text-primary-600" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Admin Personal Section */}
                        <div className="card bg-blue-50 border-2 border-blue-200">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Your Personal Payments</h2>
                                    <p className="text-sm text-gray-600 mt-1">Your balance and payment history</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-600">Your Balance</p>
                                    <p className={`text-3xl font-bold mt-1 ${myBalance < 0 ? 'text-red-600' : myBalance > 0 ? 'text-orange-600' : 'text-green-600'
                                        }`}>
                                        ${Math.abs(myBalance).toFixed(2)}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {myBalance < 0 ? 'Credit balance' : myBalance > 0 ? 'Amount owed' : 'All paid up!'}
                                    </p>
                                </div>
                            </div>

                            {myPayments.length > 0 ? (
                                <div className="space-y-2 mt-4">
                                    {myPayments.slice(0, 5).map((payment) => (
                                        <div
                                            key={payment.payment_id}
                                            className="flex items-center justify-between p-3 bg-white rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${payment.status === 'PAID'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-orange-100 text-orange-800'
                                                            }`}
                                                    >
                                                        {payment.status}
                                                    </span>
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${payment.payment_type === 'CHARGE'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-purple-100 text-purple-800'
                                                            }`}
                                                    >
                                                        {payment.payment_type}
                                                    </span>
                                                    <p className="text-sm text-gray-900">{payment.description}</p>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(payment.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <p className={`text-sm font-bold ${payment.payment_type === 'CREDIT' ? 'text-green-600' : 'text-gray-900'
                                                }`}>
                                                {payment.payment_type === 'CREDIT' ? '+' : ''}${payment.amount.toFixed(2)}
                                            </p>
                                        </div>
                                    ))}
                                    {myPayments.length > 5 && (
                                        <p className="text-xs text-gray-600 text-center mt-2">
                                            Showing 5 of {myPayments.length} payments
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-white rounded-lg">
                                    <p className="text-sm text-gray-600">No payments yet</p>
                                </div>
                            )}
                        </div>

                        {/* Member Balances and All Payments */}
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
                                                        Balance
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
                                                                className={`text-sm font-semibold ${balance.balance < 0
                                                                        ? 'text-green-600'
                                                                        : balance.balance > 0
                                                                            ? 'text-orange-600'
                                                                            : 'text-gray-600'
                                                                    }`}
                                                            >
                                                                ${Math.abs(balance.balance).toFixed(2)}
                                                                {balance.balance < 0 ? ' (credit)' : balance.balance > 0 ? ' (owed)' : ''}
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
                            {renderPaymentHistory(filteredPayments, "All Member Payments")}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Member View */}
                        <div className="card md:col-span-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Your Balance</p>
                                    <p className={`text-3xl font-bold mt-1 ${myBalance < 0 ? 'text-green-600' : myBalance > 0 ? 'text-orange-600' : 'text-gray-900'
                                        }`}>
                                        ${Math.abs(myBalance).toFixed(2)}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-2">
                                        {myBalance < 0 ? 'You have a credit balance' : myBalance > 0 ? 'You have outstanding payments' : 'All paid up!'}
                                    </p>
                                </div>
                                <div className="p-4 bg-primary-100 rounded-lg">
                                    <DollarSign className="h-8 w-8 text-primary-600" />
                                </div>
                            </div>
                        </div>

                        {/* Payment history for members */}
                        {renderPaymentHistory(filteredPayments)}
                    </>
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
                                                {member.display_name || member.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Payment Type
                                    </label>
                                    <select
                                        name="payment_type"
                                        value={formData.payment_type}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                        required
                                    >
                                        <option value="CHARGE">Charge (Member owes money)</option>
                                        <option value="CREDIT">Credit (Apply credit to member)</option>
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
                                                    {member.display_name || member.email}
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

                {/* Bulk Credit Modal */}
                {showBulkCreditModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Bulk Credit</h2>
                                <button
                                    onClick={() => setShowBulkCreditModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleBulkCredit}>
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
                                                    checked={bulkCreditData.user_ids.includes(
                                                        member.user_id
                                                    )}
                                                    onChange={() =>
                                                        toggleMemberForBulkCredit(member.user_id)
                                                    }
                                                    className="rounded text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="text-sm text-gray-900">
                                                    {member.display_name || member.email}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {bulkCreditData.user_ids.length} member(s) selected
                                    </p>
                                </div>

                                <Input
                                    label="Credit Amount per Member"
                                    type="number"
                                    name="amount"
                                    value={bulkCreditData.amount || ''}
                                    onChange={handleBulkCreditChange}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0.01"
                                    required
                                />

                                <Input
                                    label="Description"
                                    name="description"
                                    value={bulkCreditData.description}
                                    onChange={handleBulkCreditChange}
                                    placeholder="Refund, overpayment credit, etc."
                                    required
                                />

                                <div className="flex space-x-3">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        fullWidth
                                        onClick={() => setShowBulkCreditModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" fullWidth>
                                        Credit Members
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
