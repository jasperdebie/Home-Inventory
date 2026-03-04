'use client';

import Link from 'next/link';

export function FloatingActionButton() {
  return (
    <Link
      href="/products/new"
      className="fixed right-4 bottom-20 md:bottom-6 z-40 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg
        flex items-center justify-center text-2xl hover:bg-blue-700 active:bg-blue-800 transition-colors"
      aria-label="Add product"
    >
      +
    </Link>
  );
}
