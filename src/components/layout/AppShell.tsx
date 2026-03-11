'use client';

import { usePathname } from 'next/navigation';
import { ToastProvider } from '@/components/ui/Toast';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 p-4 pb-20 md:pb-4 max-w-5xl w-full mx-auto">
            {children}
          </main>
          <BottomNav />
        </div>
      </div>
    </ToastProvider>
  );
}
