'use client';

import Link from 'next/link';

const ACTIONS = [
  { href: '/scanner', icon: '📷', label: 'Scan' },
  { href: '/products/new', icon: '➕', label: 'Add' },
  { href: '/shopping-list', icon: '🛒', label: 'Shopping' },
  { href: '/products', icon: '📦', label: 'Products' },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex flex-col items-center justify-center bg-white rounded-xl border border-gray-200 shadow-sm p-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <span className="text-2xl mb-1">{action.icon}</span>
          <span className="text-xs font-medium text-gray-600">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
