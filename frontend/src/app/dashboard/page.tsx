'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { CostOverview } from '@/components/dashboard/CostOverview';
import { TopResources } from '@/components/dashboard/TopResources';
import { CostTrends } from '@/components/dashboard/CostTrends';
import { useAuthStore } from '@/lib/store/authStore';

export default function DashboardPage() {
    const router = useRouter();
    const { isAuthenticated, user } = useAuthStore();

    useEffect(() =& gt; {
        if (!isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, router]);

    if (!isAuthenticated) {
        return null;
    }

    return (






        Dashboard
            
              Welcome back, { user?.firstName || user?.email
}
            
          

          
            
          

          
            
            
          
        
      
    
  );
}