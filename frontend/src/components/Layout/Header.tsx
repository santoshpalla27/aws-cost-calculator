'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { UserNav } from './UserNav';

export function Header() {
  const { isAuthenticated } = useAuthStore();

  return (
    <header className="border-b">
      <div className="container mx-auto flex justify-between items-center h-16">
        <Link href="/" className="font-bold text-lg">
          AWS Interview Master
        </Link>
        <nav>
          {isAuthenticated ? (
            <UserNav />
          ) : (
            <div className="space-x-2">
              <Link href="/login" passHref><Button variant="ghost">Login</Button></Link>
              <Link href="/signup" passHref><Button>Sign Up</Button></Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}