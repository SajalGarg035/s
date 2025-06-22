import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// AI Assistant API calls
export const aiService = {
    // Get AI coding help
    getCodingHelp: async (prompt, code, language) => {
        try {
            const response = await api.post('/api/ai/coding-help', {
                prompt,
                code,
                language
            });
            return response.data;
        } catch (error) {
            console.error('AI Service Error:', error);
            throw error;
        }
    },

    // Code review by AI
    reviewCode: async (code, language) => {
        try {
            const response = await api.post('/api/ai/code-review', {
                code,
                language
            });
            return response.data;
        } catch (error) {
            console.error('Code Review Error:', error);
            throw error;
        }
    },

    // Generate code suggestions
    generateCode: async (description, language) => {
        try {
            const response = await api.post('/api/ai/generate-code', {
                description,
                language
            });
            return response.data;
        } catch (error) {
            console.error('Code Generation Error:', error);
            throw error;
        }
    },

    // Explain code
    explainCode: async (code, language) => {
        try {
            const response = await api.post('/api/ai/explain-code', {
                code,
                language
            });
            return response.data;
        } catch (error) {
            console.error('Code Explanation Error:', error);
            throw error;
        }
    }
};

export default api;