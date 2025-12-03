import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MessageCircle, DollarSign, Camera, Users, Shield } from 'lucide-react';
import { Button } from '../components/common/Button';

const LandingPage: React.FC = () => {
    const features = [
        {
            icon: <Users className="h-6 w-6" />,
            title: 'Roster Management',
            description: 'Easily manage players, parents, and coaches all in one place.',
        },
        {
            icon: <Shield className="h-6 w-6" />,
            title: 'Role-Based Access',
            description: 'Admin and member roles with appropriate permissions.',
        },
        {
            icon: <Calendar className="h-6 w-6" />,
            title: 'Schedule Updates',
            description: 'Keep everyone informed with practice and game schedules.',
        },
        {
            icon: <MessageCircle className="h-6 w-6" />,
            title: 'Team Chat',
            description: 'Real-time messaging to keep your team connected.',
        },
        {
            icon: <DollarSign className="h-6 w-6" />,
            title: 'Payment Processing',
            description: 'Collect fees, dues, and event charges seamlessly.',
        },
        {
            icon: <Camera className="h-6 w-6" />,
            title: 'Photo Gallery',
            description: 'Share and preserve team memories in one place.',
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
                <div className="text-center">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
                        Manage Your Club Sports Team
                        <span className="text-primary-600"> Effortlessly</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                        ClubApp is the all-in-one platform for club sports teams. Manage rosters,
                        communicate with your team, handle payments, and more—all in one place.
                    </p>
                    <div className="flex justify-center space-x-4">
                        <Link to="/signup">
                            <Button className="text-lg px-8 py-3">Get Started Free</Button>
                        </Link>
                        <Link to="/login">
                            <Button variant="secondary" className="text-lg px-8 py-3">
                                Login
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                    Everything You Need to Run Your Team
                </h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div key={index} className="card hover:shadow-lg transition-shadow">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="p-3 bg-primary-100 text-primary-600 rounded-lg">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                    {feature.title}
                                </h3>
                            </div>
                            <p className="text-gray-600">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA Section */}
            <div className="bg-primary-600 py-16">
                <div className="max-w-4xl mx-auto text-center px-4">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Ready to Transform Your Team Management?
                    </h2>
                    <p className="text-primary-100 text-lg mb-8">
                        Join hundreds of teams already using ClubApp to stay organized and connected.
                    </p>
                    <Link to="/signup">
                        <Button className="bg-white text-primary-600 hover:bg-gray-100 text-lg px-8 py-3">
                            Start Your Free Trial
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-8">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p>&copy; 2025 ClubApp. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;