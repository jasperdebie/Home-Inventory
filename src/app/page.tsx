'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-2rem)] flex items-center justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 text-center">Choose your app</h1>
        <p className="text-center text-gray-600">Select where you want to continue.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/home-inventory"
            className="group rounded-2xl border border-blue-200 bg-blue-50 p-8 min-h-48 flex flex-col justify-between transition-all hover:bg-blue-100 hover:border-blue-300"
          >
            <span className="text-4xl">🏠</span>
            <div>
              <h2 className="text-2xl font-semibold text-blue-900">Home Inventory</h2>
              <p className="text-sm text-blue-700 mt-2">Open your current inventory app.</p>
            </div>
          </Link>

          <Link
            href="/book-library"
            className="group rounded-2xl border border-emerald-200 bg-emerald-50 p-8 min-h-48 flex flex-col justify-between transition-all hover:bg-emerald-100 hover:border-emerald-300"
          >
            <span className="text-4xl">📚</span>
            <div>
              <h2 className="text-2xl font-semibold text-emerald-900">Book Library</h2>
              <p className="text-sm text-emerald-700 mt-2">Open the placeholder page.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
