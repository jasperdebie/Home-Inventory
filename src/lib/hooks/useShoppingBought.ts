'use client';

import { useCallback } from 'react';

export function useShoppingBought() {
  const toggleChecked = useCallback(
    async (itemId: string, isGroup: boolean, currentlyChecked: boolean) => {
      const endpoint = isGroup ? `/api/product-groups/${itemId}` : `/api/products/${itemId}`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_bought: !currentlyChecked }),
      });
      if (!res.ok) console.error('Error toggling bought status');
    },
    []
  );

  const clearAll = useCallback(
    async (items: Array<{ id: string; isGroup: boolean }>) => {
      await Promise.all(
        items.map((item) =>
          fetch(item.isGroup ? `/api/product-groups/${item.id}` : `/api/products/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_bought: false }),
          })
        )
      );
    },
    []
  );

  return { toggleChecked, clearAll };
}
