import { create } from 'zustand';

interface User {
    id: string;
    email: string;
    name?: string;
    role?: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    login: async (email, password) => {
        // TODO: Implement actual API call
        // For now, simulate a successful login
        console.log('Logging in with', email);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const mockUser = {
            id: '1',
            email,
            name: 'Test User',
            role: 'user'
        };

        set({ user: mockUser, isAuthenticated: true });
        localStorage.setItem('token', 'mock-jwt-token');
    },
    logout: () => {
        set({ user: null, isAuthenticated: false });
        localStorage.removeItem('token');
    },
    checkAuth: async () => {
        // Check if running in browser
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                // In a real app, verify token with backend
                // For now, just restore session if token exists
                set({
                    isAuthenticated: true,
                    user: { id: '1', email: 'user@example.com', name: 'Test User', role: 'user' }
                });
            } else {
                set({ isAuthenticated: false, user: null });
            }
        }
    },
}));
