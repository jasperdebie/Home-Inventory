'use client';

import { useStockChanges } from '@/lib/hooks/useStockChanges';
import { useProducts } from '@/lib/hooks/useProducts';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { formatDate } from '@/lib/utils/format';

export function RecentActivity() {
  const { changes, loading } = useStockChanges(undefined, 10);
  const { products } = useProducts();

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || 'Unknown';
  };

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-4"><Spinner /></div>
      </Card>
    );
  }

  if (changes.length === 0) {
    return (
      <Card>
        <h3 className="font-semibold text-gray-900 mb-2">Recent Activity</h3>
        <p className="text-sm text-gray-500">No activity yet.</p>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Recent Activity</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {changes.map((change) => (
          <div key={change.id} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-sm font-medium flex-shrink-0 ${change.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change.quantity_change > 0 ? '+' : ''}{change.quantity_change}
              </span>
              <span className="text-sm text-gray-900 truncate">{getProductName(change.product_id)}</span>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatDate(change.created_at)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
