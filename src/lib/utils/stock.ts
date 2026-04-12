import { Product } from '@/lib/supabase/types';
import { getStockStatus, StockStatus } from '@/lib/constants';

export function getShoppingQuantity(product: Product): number {
  const deficit = Math.max(product.min_stock - product.current_stock, 0);
  return deficit + (product.extra_needed ?? 0);
}

export function getStockColor(status: StockStatus): string {
  switch (status) {
    case 'out':
      return 'text-red-600 bg-red-50';
    case 'low':
      return 'text-amber-600 bg-amber-50';
    case 'ok':
      return 'text-green-600 bg-green-50';
  }
}

export function getStockBadgeColor(status: StockStatus): string {
  switch (status) {
    case 'out':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'low':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'ok':
      return 'bg-green-100 text-green-700 border-green-200';
  }
}

export function sortByStockUrgency(a: Product, b: Product): number {
  const statusOrder: Record<StockStatus, number> = { out: 0, low: 1, ok: 2 };
  const aStatus = getStockStatus(a.current_stock, a.min_stock);
  const bStatus = getStockStatus(b.current_stock, b.min_stock);
  return statusOrder[aStatus] - statusOrder[bStatus];
}
