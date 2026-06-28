'use client';

interface BookTabsProps {
  activeTab: 'overview' | 'statistics' | 'lent';
  onTabChange: (tab: 'overview' | 'statistics' | 'lent') => void;
  lentCount?: number;
}

export function BookTabs({ activeTab, onTabChange, lentCount = 0 }: BookTabsProps) {
  return (
    <div className="flex gap-1 border-b border-gray-200">
      <button
        onClick={() => onTabChange('overview')}
        className={`px-4 py-3 font-medium text-sm transition-colors ${
          activeTab === 'overview'
            ? 'text-emerald-700 border-b-2 border-emerald-700'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        📚 Overzicht
      </button>
      <button
        onClick={() => onTabChange('statistics')}
        className={`px-4 py-3 font-medium text-sm transition-colors ${
          activeTab === 'statistics'
            ? 'text-emerald-700 border-b-2 border-emerald-700'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        📊 Statistieken
      </button>
      <button
        onClick={() => onTabChange('lent')}
        className={`px-4 py-3 font-medium text-sm transition-colors ${
          activeTab === 'lent'
            ? 'text-emerald-700 border-b-2 border-emerald-700'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        🔴 Uitgeleend {lentCount > 0 && `(${lentCount})`}
      </button>
    </div>
  );
}
