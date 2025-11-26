'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function Home() {
    const router = useRouter();
    const { isAuthenticated } = useAuthStore();

    useEffect(() =& gt; {
        if (isAuthenticated) {
            router.push('/dashboard');
        } else {
            router.push('/login');
        }
    }, [isAuthenticated, router]);

    return (
        <div>
            <div>
                <h1>InfraCost Analyzer Pro</h1>
                <p>Loading...</p>
            </div>
        </div>
    );
}