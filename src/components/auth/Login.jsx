import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
    FiMail, FiLock, FiEye, FiEyeOff, FiGithub, FiCode, 
    FiZap, FiUsers, FiShield, FiArrowRight 
} from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import Navbar from '../Navbar';
import './Login.css';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const result = await login(formData.email, formData.password);
        
        if (result.success) {
            toast.success('Welcome back!');
            navigate('/');
        } else {
            toast.error(result.error);
        }
        
        setLoading(false);
    };

    const handleOAuthLogin = (provider) => {
        const backendURL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
        window.location.href = `${backendURL}/auth/${provider}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
            <Navbar />
            
            <div className="container mx-auto px-4 py-16">
                <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 transform -skew-y-6 sm:-skew-y-12"></div>
                        <div className="relative px-8 pt-8 pb-6 bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <FiCode size={24} />
                                </div>
                                <h2 className="text-2xl font-bold">Welcome Back</h2>
                            </div>
                            <p className="text-blue-100">Sign in to continue your coding journey</p>
                        </div>
                    </div>

                    <div className="px-8 py-6">
                        <div className="space-y-4 mb-6">
                            <button
                                onClick={() => handleOAuthLogin('google')}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <FcGoogle size={20} />
                                Continue with Google
                            </button>
                            
                            <button
                                onClick={() => handleOAuthLogin('github')}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <FiGithub size={20} />
                                Continue with GitHub
                            </button>
                        </div>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Or continue with email</span>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email address
                                </label>
                                <div className="relative">
                                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Enter your email"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Password
                                </label>
                                <div className="relative">
                                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-10 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="Enter your password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="remember"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="remember" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                        Remember me
                                    </label>
                                </div>
                                <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                    Forgot password?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign in</span>
                                        <FiArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                            Don't have an account?{' '}
                            <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                Sign up for free
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <FiZap className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Lightning Fast</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Real-time collaboration</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                            <FiUsers className="text-purple-600 dark:text-purple-400" size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Team Focused</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Built for teams</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                            <FiShield className="text-green-600 dark:text-green-400" size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Enterprise Security</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Bank-level encryption</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;