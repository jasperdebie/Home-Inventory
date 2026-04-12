'use client';

import { useMemo } from 'react';
import { useProducts } from './useProducts';
import { useProductGroups } from './useProductGroups';
import { ProductWithCategory } from '@/lib/supabase/types';
import { getShoppingQuantity } from '@/lib/utils/stock';

export interface GroupMember {
  id: string;
  name: string;
  currentStock: number;
}

export interface ShoppingItem {
  id: string; // product id or group id
  name: string;
  needed: number;
  currentStock: number;
  unit: string;
  isGroup: boolean;
  isBought: boolean;
  // For groups: the product to add stock to (lowest stock member). Null when group has no products yet.
  targetProductId: string | null;
  groupMinStock?: number;
  groupMembers?: GroupMember[];
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
    const lowPrioItems: typeof allItems = [];

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
      const extraNeeded = Number(group.extra_needed ?? 0);
      const deficit = Math.max(groupMinStock - totalStock, 0);
      const needed = deficit + extraNeeded;

      if (needed <= 0) continue; // group is stocked and no extras requested
      // Target: member with lowest stock (null when group has no products yet)
      const target = members.length > 0
        ? members.reduce((lowest, m) =>
            Number(m.current_stock) < Number(lowest.current_stock) ? m : lowest
          , members[0])
        : null;

      // Use the category of the first member for grouping (fall back to Other)
      const firstMember = members[0] ?? null;
      const groupItem = {
        id: group.id,
        name: group.name,
        needed: Math.max(1, Math.ceil(needed)),
        currentStock: totalStock,
        unit: target?.unit ?? 'pcs',
        isGroup: true,
        isBought: group.is_bought,
        targetProductId: target?.id ?? null,
        groupMinStock: groupMinStock,
        groupMembers: members.map(m => ({ id: m.id, name: m.name, currentStock: Number(m.current_stock) })),
        category: firstMember?.category || { id: 'uncategorized', name: 'Other', icon: '📦' },
      };

      if (group.is_low_prio) {
        lowPrioItems.push(groupItem);
      } else {
        allItems.push(groupItem);
      }
    }

    // Process ungrouped products (separate low prio)
    for (const product of products) {
      if (groupedProductIds.has(product.id)) continue;

      const needed = getShoppingQuantity(product);
      if (needed <= 0) continue;

      const item = {
        id: product.id,
        name: product.name,
        needed,
        currentStock: Number(product.current_stock),
        unit: product.unit,
        isGroup: false,
        isBought: product.is_bought,
        targetProductId: product.id,
        category: product.category || { id: 'uncategorized', name: 'Other', icon: '📦' },
      };

      if (product.is_low_prio) {
        lowPrioItems.push(item);
      } else {
        allItems.push(item);
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

    // Group low prio items by category
    const lowPrioGrouped = new Map<string, ShoppingGroup>();
    for (const item of lowPrioItems) {
      const key = item.category?.id || 'uncategorized';
      if (!lowPrioGrouped.has(key)) {
        lowPrioGrouped.set(key, {
          category: item.category,
          items: [],
        });
      }
      lowPrioGrouped.get(key)!.items.push(item);
    }

    const sortByCategory = (a: ShoppingGroup, b: ShoppingGroup) => {
      const aOrder = (a.category as { sort_order?: number })?.sort_order ?? 99;
      const bOrder = (b.category as { sort_order?: number })?.sort_order ?? 99;
      return aOrder - bOrder;
    };

    return {
      main: Array.from(grouped.values()).sort(sortByCategory),
      lowPrio: Array.from(lowPrioGrouped.values()).sort(sortByCategory),
    };
  }, [products, productGroups]);

  const totalItems = shoppingGroups.main.reduce((sum, g) => sum + g.items.length, 0);
  const totalLowPrio = shoppingGroups.lowPrio.reduce((sum, g) => sum + g.items.length, 0);
  const loading = productsLoading || groupsLoading;

  return { groups: shoppingGroups.main, lowPrioGroups: shoppingGroups.lowPrio, totalItems, totalLowPrio, loading, addStockChange };
}
