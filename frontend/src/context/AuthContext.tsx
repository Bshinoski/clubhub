import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/api-client';

interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role?: 'admin' | 'member';
    groupId?: number;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (data: {
        email: string;
        password: string;
        name: string;
        groupName?: string;
        inviteCode?: string;
    }) => Promise<{ groupCode?: string }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session on mount
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            // 👇 backend now expects { email, password }
            const response = await api.auth.login({
                email,
                password,
            });

            const userData: User = {
                id: response.userId,
                email,
                name: response.displayName || email.split('@')[0],
                role: response.role,
                groupId: response.groupId,
            };

            setToken(response.token);
            setUser(userData);
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signup = async (data: {
        email: string;
        password: string;
        name: string;
        groupName?: string;
        inviteCode?: string;
    }) => {
        setLoading(true);
        try {
            // 👇 backend now expects { email, password, name, groupName?, inviteCode? }
            const response = await api.auth.signup({
                email: data.email,
                password: data.password,
                name: data.name,
                ...(data.groupName ? { groupName: data.groupName } : {}),
                ...(data.inviteCode ? { inviteCode: data.inviteCode } : {}),
            });

            const userData: User = {
                id: response.userId,
                email: data.email,
                name: data.name,
                role: response.role,
                groupId: response.groupId,
            };

            setToken(response.token);
            setUser(userData);
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('user', JSON.stringify(userData));

            return { groupCode: response.groupCode };
        } catch (error) {
            console.error('Signup failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};