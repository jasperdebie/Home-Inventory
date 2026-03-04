'use client';

import Link from 'next/link';
import { ProductWithCategory } from '@/lib/supabase/types';
import { Card } from '@/components/ui/Card';
import { getStockStatus } from '@/lib/constants';

interface LowStockAlertProps {
  products: ProductWithCategory[];
}

export function LowStockAlert({ products }: LowStockAlertProps) {
  const lowStock = products.filter((p) => {
    const status = getStockStatus(p.current_stock, p.min_stock);
    return status === 'low' || status === 'out';
  });

  if (lowStock.length === 0) {
    return (
      <Card>
        <div className="text-center py-2">
          <p className="text-green-600 font-medium">All stocked up! ✅</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">
          Low Stock <span className="text-red-500 ml-1">({lowStock.length})</span>
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {lowStock.slice(0, 5).map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50"
          >
            <span className="text-sm font-medium text-gray-900">{p.name}</span>
            <span className={`text-sm font-medium ${p.current_stock <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
              {p.current_stock} / {p.min_stock} {p.unit}
            </span>
          </Link>
        ))}
      </div>
      {lowStock.length > 5 && (
        <Link href="/shopping-list" className="block text-center text-sm text-blue-600 py-2 border-t border-gray-200 hover:bg-gray-50">
          View all {lowStock.length} items →
        </Link>
      )}
    </Card>
  );
}
