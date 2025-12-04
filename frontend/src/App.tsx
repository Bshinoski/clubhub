import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminDashboard from './pages/AdminDashboard';
import MemberDashboard from './pages/MemberDashboard';
import RosterPage from './pages/RosterPage';
import SchedulePage from './pages/SchedulePage';
import ChatPage from './pages/ChatPage';
import PaymentsPage from './pages/PaymentsPage';
import GalleryPage from './pages/GalleryPage';

function HomeRedirect() {
    const { user } = useAuth();

    if (!user) {
        return <Navigate to="/landing" replace />;
    }

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

            {/* Protected Routes - Dashboards */}
            <Route
                path="/dashboard/admin"
                element={
                    <PrivateRoute>
                        <AdminDashboard />
                    </PrivateRoute>
                }
            />
            <Route
                path="/dashboard/member"
                element={
                    <PrivateRoute>
                        <MemberDashboard />
                    </PrivateRoute>
                }
            />

            {/* Protected Routes - Feature Pages */}
            <Route
                path="/dashboard/roster"
                element={
                    <PrivateRoute>
                        <RosterPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/dashboard/schedule"
                element={
                    <PrivateRoute>
                        <SchedulePage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/dashboard/chat"
                element={
                    <PrivateRoute>
                        <ChatPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/dashboard/payments"
                element={
                    <PrivateRoute>
                        <PaymentsPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/dashboard/gallery"
                element={
                    <PrivateRoute>
                        <GalleryPage />
                    </PrivateRoute>
                }
            />

            {/* Legacy redirects */}
            <Route path="/dashboard" element={<HomeRedirect />} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;