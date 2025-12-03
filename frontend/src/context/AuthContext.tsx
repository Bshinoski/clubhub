import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    cognitoId: string;
    createdAt: string;
    role?: 'admin' | 'member';
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string, phone?: string) => Promise<void>;
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
            // TODO: Replace with actual API call
            // const response = await axios.post('/api/auth/login', { email, password });

            // Mock login - determine role based on email for demo
            const mockToken = 'mock-jwt-token-' + Date.now();
            const mockUser: User = {
                id: '1',
                email,
                name: email.split('@')[0],
                cognitoId: 'mock-cognito-id',
                createdAt: new Date().toISOString(),
                role: email.includes('admin') ? 'admin' : 'member',
            };

            setToken(mockToken);
            setUser(mockUser);
            localStorage.setItem('authToken', mockToken);
            localStorage.setItem('user', JSON.stringify(mockUser));
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const signup = async (email: string, password: string, name: string, phone?: string) => {
        setLoading(true);
        try {
            // TODO: Replace with actual API call
            // const response = await axios.post('/api/auth/signup', { email, password, name, phone });

            // Mock signup
            const mockToken = 'mock-jwt-token-' + Date.now();
            const mockUser: User = {
                id: '1',
                email,
                name,
                phone,
                cognitoId: 'mock-cognito-id',
                createdAt: new Date().toISOString(),
                role: 'member', // Default to member
            };

            setToken(mockToken);
            setUser(mockUser);
            localStorage.setItem('authToken', mockToken);
            localStorage.setItem('user', JSON.stringify(mockUser));
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