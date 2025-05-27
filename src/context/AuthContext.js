import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const response = await api.get('/api/auth/me');
                setUser(response.data.user);
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await api.post('/api/auth/login', { email, password });
            const { token, user } = response.data;
            
            localStorage.setItem('token', token);
            setUser(user);
            setIsAuthenticated(true);
            
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.message || 'Login failed' 
            };
        }
    };

    const signup = async (username, email, password) => {
        try {
            const response = await api.post('/api/auth/signup', { username, email, password });
            const { token, user } = response.data;
            
            localStorage.setItem('token', token);
            setUser(user);
            setIsAuthenticated(true);
            
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.message || 'Signup failed' 
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
    };

    const updateProfile = async (profileData) => {
        try {
            const response = await api.put('/api/auth/profile', profileData);
            setUser(response.data.user);
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.message || 'Profile update failed' 
            };
        }
    };

    // Handle OAuth success from URL params
    const handleOAuthSuccess = (token) => {
        if (token) {
            localStorage.setItem('token', token);
            checkAuthStatus();
            return true;
        }
        return false;
    };

    // Handle OAuth errors from URL params
    const handleOAuthError = (error) => {
        let errorMessage = 'Authentication failed';
        
        switch (error) {
            case 'oauth_error':
                errorMessage = 'OAuth provider error. Please try again.';
                break;
            case 'oauth_failed':
                errorMessage = 'OAuth authentication failed. Please try again.';
                break;
            case 'token_error':
                errorMessage = 'Token generation failed. Please try again.';
                break;
            default:
                errorMessage = 'Authentication error. Please try again.';
        }
        
        return errorMessage;
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        signup,
        logout,
        updateProfile,
        checkAuthStatus,
        handleOAuthSuccess,
        handleOAuthError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
