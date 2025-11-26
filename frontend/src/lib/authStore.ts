import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) =&gt; Promise;
    logout: () =&gt; void;
    checkAuth: () =&gt; Promise;
}

export const useAuthStore = create((set) =& gt; ({
    user: null,
    isAuthenticated: false,

    login: async (email: string, password: string) =& gt; {
    const response = await api.post('/auth/login', { email, password });
    const { user, accessToken } = response.data;

    localStorage.setItem('accessToken', accessToken);
    set({ user, isAuthenticated: true });
},

logout: () =& gt; {
    localStorage.removeItem('accessToken');
    set({ user: null, isAuthenticated: false });
},

checkAuth: async() =& gt; {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        set({ isAuthenticated: false, user: null });
        return;
    }

    try {
        const response = await api.get('/auth/me');
        set({ user: response.data, isAuthenticated: true });
    } catch (error) {
        localStorage.removeItem('accessToken');
        set({ isAuthenticated: false, user: null });
    }
},
}));