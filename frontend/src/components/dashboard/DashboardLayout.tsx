import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, MessageCircle, DollarSign, Camera, Users as UsersIcon } from 'lucide-react';
import { Navbar } from '../common/Navbar';
import { useAuth } from '../../context/AuthContext';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const location = useLocation();
    const { user } = useAuth();

    const dashboardPath = user?.role === 'admin' ? '/dashboard/admin' : '/dashboard/member';

    const navItems = [
        { path: dashboardPath, icon: <Home className="h-5 w-5" />, label: 'Dashboard' },
        { path: '/dashboard/roster', icon: <UsersIcon className="h-5 w-5" />, label: 'Roster' },
        { path: '/dashboard/schedule', icon: <Calendar className="h-5 w-5" />, label: 'Schedule' },
        { path: '/dashboard/chat', icon: <MessageCircle className="h-5 w-5" />, label: 'Chat' },
        { path: '/dashboard/payments', icon: <DollarSign className="h-5 w-5" />, label: 'Payments' },
        { path: '/dashboard/gallery', icon: <Camera className="h-5 w-5" />, label: 'Gallery' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="flex">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] sticky top-16">
                    <nav className="p-4 space-y-1">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                            ? 'bg-primary-50 text-primary-700 font-medium'
                                            : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};