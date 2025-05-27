import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AuthSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { handleOAuthSuccess, handleOAuthError } = useAuth();
    const [isProcessing, setIsProcessing] = useState(true);

    useEffect(() => {
        const handleAuth = async () => {
            const token = searchParams.get('token');
            const error = searchParams.get('error');
            
            try {
                if (error) {
                    const errorMessage = handleOAuthError(error);
                    toast.error(errorMessage);
                    navigate('/login');
                    return;
                }
                
                if (token) {
                    const success = handleOAuthSuccess(token);
                    if (success) {
                        toast.success('Successfully logged in!');
                        navigate('/');
                    } else {
                        toast.error('Failed to process authentication');
                        navigate('/login');
                    }
                } else {
                    toast.error('No authentication token received');
                    navigate('/login');
                }
            } catch (err) {
                console.error('Auth processing error:', err);
                toast.error('Authentication processing failed');
                navigate('/login');
            } finally {
                setIsProcessing(false);
            }
        };

        handleAuth();
    }, [searchParams, handleOAuthSuccess, handleOAuthError, navigate]);

    if (isProcessing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Processing authentication...</p>
                </div>
            </div>
        );
    }

    return null;
};

export default AuthSuccess;
