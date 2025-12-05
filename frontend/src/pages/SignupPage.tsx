import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Users, AlertCircle, CheckCircle } from 'lucide-react';

const SignupPage: React.FC = () => {
    const navigate = useNavigate();
    const { signup } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        groupName: '',
        inviteCode: '',
    });
    const [signupMode, setSignupMode] = useState<'create' | 'join'>('create');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showGroupCode, setShowGroupCode] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.email || !formData.password || !formData.name) {
            setError('Email, password, and name are required');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (signupMode === 'create' && !formData.groupName) {
            setError('Group name is required to create a new team');
            return;
        }

        if (signupMode === 'join' && !formData.inviteCode) {
            setError('Invite code is required to join a team');
            return;
        }

        setLoading(true);

        try {
            const result = await signup({
                email: formData.email,
                password: formData.password,
                name: formData.name,
                ...(signupMode === 'create' ? { groupName: formData.groupName } : {}),
                ...(signupMode === 'join' ? { inviteCode: formData.inviteCode } : {}),
            });

            // If creating a new group, show the group code
            if (signupMode === 'create' && result.groupCode) {
                setShowGroupCode(result.groupCode);
                // Delay redirect to show group code
                setTimeout(() => navigate('/dashboard'), 3000);
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Show group code success modal
    if (showGroupCode) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
                <div className="card max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Created Successfully!</h2>
                    <p className="text-gray-600 mb-6">
                        Share this invite code with your team members:
                    </p>
                    <div className="bg-primary-50 border-2 border-primary-200 rounded-lg p-6 mb-6">
                        <p className="text-4xl font-bold text-primary-700 tracking-wider">{showGroupCode}</p>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                        Save this code! You can also find it later in your group settings.
                    </p>
                    <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
            <div className="card max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <Users className="h-12 w-12 text-primary-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Account</h1>
                    <p className="text-gray-600">Join or create your team in seconds</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Mode Selection */}
                <div className="mb-6">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                setSignupMode('create');
                                setError('');
                            }}
                            className={`py-3 px-4 rounded-lg font-medium transition-all ${signupMode === 'create'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Create Team
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSignupMode('join');
                                setError('');
                            }}
                            className={`py-3 px-4 rounded-lg font-medium transition-all ${signupMode === 'join'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Join Team
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <Input
                        label="Full Name"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Smith"
                        required
                    />

                    <Input
                        label="Email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                    />

                    <Input
                        label="Confirm Password"
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        required
                    />

                    {signupMode === 'create' ? (
                        <Input
                            label="Team Name"
                            type="text"
                            name="groupName"
                            value={formData.groupName}
                            onChange={handleChange}
                            placeholder="Eagles Soccer Team"
                            required
                        />
                    ) : (
                        <Input
                            label="Invite Code"
                            type="text"
                            name="inviteCode"
                            value={formData.inviteCode}
                            onChange={handleChange}
                            placeholder="ABC123"
                            required
                        />
                    )}

                    <Button type="submit" fullWidth disabled={loading} className="mt-6">
                        {loading ? 'Creating Account...' : signupMode === 'create' ? 'Create Team & Sign Up' : 'Join Team & Sign Up'}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                            Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;