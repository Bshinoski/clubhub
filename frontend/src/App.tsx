import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminDashboard from './pages/AdminDashboard';
import MemberDashboard from './pages/MemberDashboard';

// Redirect component that routes based on role
function HomeRedirect() {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/landing" replace />;
    }

    // Redirect to role-specific dashboard
    const dashboardPath = user.role === 'admin' ? '/dashboard/admin' : '/dashboard/member';
    return <Navigate to={dashboardPath} replace />;
}

function App() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected Routes - Admin Dashboard */}
            <Route
                path="/dashboard/admin"
                element={
                    <PrivateRoute>
                        <AdminDashboard />
                    </PrivateRoute>
                }
            />

            {/* Protected Routes - Member Dashboard */}
            <Route
                path="/dashboard/member"
                element={
                    <PrivateRoute>
                        <MemberDashboard />
                    </PrivateRoute>
                }
            />

            {/* Legacy route redirects */}
            <Route path="/dashboard" element={<HomeRedirect />} />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;