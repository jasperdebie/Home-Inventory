'use client';

import { useMemo } from 'react';
import { useProducts } from './useProducts';
import { ProductWithCategory } from '@/lib/supabase/types';
import { getShoppingQuantity } from '@/lib/utils/stock';

export interface ShoppingGroup {
  category: { id: string; name: string; icon: string } | null;
  items: Array<ProductWithCategory & { needed: number }>;
}

export function useShoppingList() {
  const { products, loading, addStockChange } = useProducts();

  const groups = useMemo(() => {
    const lowStockProducts = products
      .filter((p) => p.current_stock < p.min_stock)
      .map((p) => ({ ...p, needed: getShoppingQuantity(p) }));

    const grouped = new Map<string, ShoppingGroup>();

    for (const product of lowStockProducts) {
      const key = product.category?.id || 'uncategorized';
      if (!grouped.has(key)) {
        grouped.set(key, {
          category: product.category || { id: 'uncategorized', name: 'Other', icon: '📦' },
          items: [],
        });
      }
      grouped.get(key)!.items.push(product);
    }

    // Sort groups by category sort_order
    return Array.from(grouped.values()).sort((a, b) => {
      const aOrder = (a.category as { sort_order?: number })?.sort_order ?? 99;
      const bOrder = (b.category as { sort_order?: number })?.sort_order ?? 99;
      return aOrder - bOrder;
    });
  }, [products]);

  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  return { groups, totalItems, loading, addStockChange };
}
