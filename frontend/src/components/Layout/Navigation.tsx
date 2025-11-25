'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';

export function Navigation({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-8">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}