'use client';

import Link from 'next/link';
import { ProductWithCategory } from '@/lib/supabase/types';
import { getStockStatus } from '@/lib/constants';
import { getStockBadgeColor } from '@/lib/utils/stock';
import { Badge } from '@/components/ui/Badge';
import { StockAdjuster } from './StockAdjuster';

interface ProductCardProps {
  product: ProductWithCategory;
  onStockChange: (quantity: number) => void;
}

export function ProductCard({ product, onStockChange }: ProductCardProps) {
  const status = getStockStatus(product.current_stock, product.min_stock);
  const badgeColor = getStockBadgeColor(status);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/products/${product.id}`} className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            {product.category && (
              <span className="text-xs text-gray-500">
                {product.category.icon} {product.category.name}
              </span>
            )}
          </div>
        </Link>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeColor}`}>
          {status === 'out' ? 'Out' : status === 'low' ? 'Low' : 'OK'}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <StockAdjuster
          currentStock={product.current_stock}
          onAdjust={onStockChange}
          unit={product.unit}
        />
      </div>
    </div>
  );
}
