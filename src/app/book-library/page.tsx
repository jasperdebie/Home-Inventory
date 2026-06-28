import Link from 'next/link';

export default function BookLibraryPlaceholderPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-emerald-200 bg-white/90 backdrop-blur p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 mb-3">Book Library</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Coming soon</h1>
        <p className="text-gray-600 mb-8">
          This area is ready as a placeholder. We can add the real Book Library navigation and screens next.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-emerald-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors"
          >
            Back to app chooser
          </Link>
          <Link
            href="/home-inventory"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white text-gray-800 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Go to Home Inventory
          </Link>
        </div>
      </div>
    </div>
  );
}
