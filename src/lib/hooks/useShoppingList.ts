'use client';

import { useMemo } from 'react';
import { useProducts } from './useProducts';
import { useProductGroups } from './useProductGroups';
import { ProductWithCategory } from '@/lib/supabase/types';
import { getShoppingQuantity } from '@/lib/utils/stock';

export interface ShoppingItem {
  id: string; // product id or group id
  name: string;
  needed: number;
  currentStock: number;
  unit: string;
  isGroup: boolean;
  // For groups: the product to add stock to (lowest stock member). Null when group has no products yet.
  targetProductId: string | null;
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
    const allItems: Array<ShoppingItem & { category: { id: string; name: string; icon: string; sort_order?: number } | null }> = [];

    // Build a map of group_id → members for efficient lookup
    const groupMembersMap = new Map<string, typeof products>();
    const groupedProductIds = new Set<string>();
    for (const product of products) {
      if (product.group_id) {
        if (!groupMembersMap.has(product.group_id)) {
          groupMembersMap.set(product.group_id, []);
        }
        groupMembersMap.get(product.group_id)!.push(product);
        groupedProductIds.add(product.id);
      }
    }

    // Process each group directly (mirrors how the groups page works)
    for (const group of productGroups) {
      const members = groupMembersMap.get(group.id) || [];
      const totalStock = members.reduce((sum, p) => sum + Number(p.current_stock), 0);
      const groupMinStock = Number(group.min_stock);

      if (totalStock >= groupMinStock) continue; // group is stocked

      const needed = groupMinStock - totalStock;
      // Target: member with lowest stock (null when group has no products yet)
      const target = members.length > 0
        ? members.reduce((lowest, m) =>
            Number(m.current_stock) < Number(lowest.current_stock) ? m : lowest
          , members[0])
        : null;

      // Use the category of the first member for grouping (fall back to Other)
      const firstMember = members[0] ?? null;
      allItems.push({
        id: group.id,
        name: group.name,
        needed: Math.max(1, Math.ceil(needed)),
        currentStock: totalStock,
        unit: target?.unit ?? 'pcs',
        isGroup: true,
        targetProductId: target?.id ?? null,
        groupMinStock: groupMinStock,
        category: firstMember?.category || { id: 'uncategorized', name: 'Other', icon: '📦' },
      });
    }

    // Process ungrouped products
    for (const product of products) {
      if (groupedProductIds.has(product.id)) continue;

      if (Number(product.current_stock) >= Number(product.min_stock)) continue;

      allItems.push({
        id: product.id,
        name: product.name,
        needed: getShoppingQuantity(product),
        currentStock: Number(product.current_stock),
        unit: product.unit,
        isGroup: false,
        targetProductId: product.id,
        category: product.category || { id: 'uncategorized', name: 'Other', icon: '📦' },
      });
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
