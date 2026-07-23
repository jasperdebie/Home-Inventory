'use client';

import { usePathname } from 'next/navigation';
import { ToastProvider } from '@/components/ui/Toast';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const isLanding = pathname === '/';
  const isBookLibrary = pathname === '/book-library' || pathname.startsWith('/book-library/');
  const isCookbook = pathname === '/cookbook' || pathname.startsWith('/cookbook/');
  const isFoodDiary = pathname === '/food-diary' || pathname.startsWith('/food-diary/');
  const isPeople = pathname === '/people' || pathname.startsWith('/people/');

  if (isLogin || isLanding) {
    return <>{children}</>;
  }

  if (isBookLibrary || isCookbook || isFoodDiary || isPeople) {
    return <ToastProvider>{children}</ToastProvider>;
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
