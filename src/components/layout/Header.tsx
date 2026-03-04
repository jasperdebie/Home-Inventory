'use client';

import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/constants';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/products/new': 'Add Product',
  '/shopping-list': 'Shopping List',
  '/scanner': 'Scanner',
};

export function Header() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] || APP_NAME;

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 md:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>
    </header>
  );
}
