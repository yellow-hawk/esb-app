import { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div 
      className="min-h-screen w-full"
      style={{ backgroundColor: 'var(--brand-bg)' }}
    >
      <Header />
      <main className="pt-16 pb-20 px-4 min-h-[calc(100vh-4rem-5rem)]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
