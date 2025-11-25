'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, Puzzle, HelpCircle, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/quizzes', label: 'Quizzes', icon: ClipboardList },
  { href: '/scenarios', label: 'Scenarios', icon: HelpCircle },
  { href: '/puzzles', label: 'Puzzles', icon: Puzzle },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r">
      <div className="p-4">
        <h2 className="text-lg font-semibold">Navigation</h2>
      </div>
      <nav className="flex flex-col p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center p-2 rounded-lg hover:bg-accent',
              pathname === item.href ? 'bg-accent' : ''
            )}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}