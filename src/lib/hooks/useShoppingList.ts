'use client';

import { useMemo } from 'react';
import { useProducts } from './useProducts';
import { useProductGroups } from './useProductGroups';
import { ProductWithCategory, ProductGroup } from '@/lib/supabase/types';
import { getShoppingQuantity } from '@/lib/utils/stock';

export interface ShoppingItem {
  id: string; // product id or group id
  name: string;
  needed: number;
  currentStock: number;
  unit: string;
  isGroup: boolean;
  // For groups: the product to add stock to (lowest stock member)
  targetProductId: string;
  groupMinStock?: number;
}

export interface ShoppingGroup {
  category: { id: string; name: string; icon: string } | null;
  items: ShoppingItem[];
}

export function useShoppingList() {
  const { products, loading: productsLoading, addStockChange } = useProducts();
  const { groups: productGroups, loading: groupsLoading } = useProductGroups();

  const shoppingGroups = useMemo(() => {
    const processedGroupIds = new Set<string>();
    const allItems: Array<ShoppingItem & { category: { id: string; name: string; icon: string; sort_order?: number } | null }> = [];

    for (const product of products) {
      // Skip products that belong to a group (handled below)
      if (product.group_id) {
        if (processedGroupIds.has(product.group_id)) continue;
        processedGroupIds.add(product.group_id);

        const group = productGroups.find(g => g.id === product.group_id);
        if (!group) continue;

        const members = products.filter(p => p.group_id === group.id);
        const totalStock = members.reduce((sum, p) => sum + p.current_stock, 0);

        if (totalStock >= group.min_stock) continue; // group is stocked

        const needed = group.min_stock - totalStock;
        // Target: member with lowest stock
        const target = members.reduce((lowest, m) =>
          m.current_stock < lowest.current_stock ? m : lowest
        , members[0]);

        // Use the category of the first member for grouping
        const firstMember = members[0];
        allItems.push({
          id: group.id,
          name: group.name,
          needed: Math.max(1, Math.ceil(needed)),
          currentStock: totalStock,
          unit: target.unit,
          isGroup: true,
          targetProductId: target.id,
          groupMinStock: group.min_stock,
          category: firstMember.category || { id: 'uncategorized', name: 'Other', icon: '📦' },
        });
      } else {
        // Ungrouped product
        if (product.current_stock >= product.min_stock) continue;

        allItems.push({
          id: product.id,
          name: product.name,
          needed: getShoppingQuantity(product),
          currentStock: product.current_stock,
          unit: product.unit,
          isGroup: false,
          targetProductId: product.id,
          category: product.category || { id: 'uncategorized', name: 'Other', icon: '📦' },
        });
      }
    }

    // Group by category
    const grouped = new Map<string, ShoppingGroup>();
    for (const item of allItems) {
      const key = item.category?.id || 'uncategorized';
      if (!grouped.has(key)) {
        grouped.set(key, {
          category: item.category,
          items: [],
        });
      }
      grouped.get(key)!.items.push(item);
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const aOrder = (a.category as { sort_order?: number })?.sort_order ?? 99;
      const bOrder = (b.category as { sort_order?: number })?.sort_order ?? 99;
      return aOrder - bOrder;
    });
  }, [products, productGroups]);

  const totalItems = shoppingGroups.reduce((sum, g) => sum + g.items.length, 0);
  const loading = productsLoading || groupsLoading;

  return { groups: shoppingGroups, totalItems, loading, addStockChange };
}
