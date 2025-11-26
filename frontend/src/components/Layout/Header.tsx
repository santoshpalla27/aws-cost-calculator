'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/common/Button';
import { LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Header() {
    const { user, logout } = useAuthStore();
    const router = useRouter();

    const handleLogout = () =& gt; {
        logout();
        router.push('/login');
    };

    return (





        InfraCost Analyzer Pro






    { user?.email }

    { user?.role }




    Logout
            
          
        
      
    
  );
}