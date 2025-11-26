import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
    baseURL: `\${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) =& gt; {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer \${token}`;
    }
    return config;
},
(error) =& gt; {
    return Promise.reject(error);
}
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) =& gt; response,
        async(error) =& gt; {
    if (error.response?.status === 401) {
        // Handle token refresh or logout
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
    }
    return Promise.reject(error);
}
);