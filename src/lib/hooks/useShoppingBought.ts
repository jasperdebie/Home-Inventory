'use client';

import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useShoppingBought() {
  const supabase = createClient();

  const toggleChecked = useCallback(
    async (itemId: string, isGroup: boolean, currentlyChecked: boolean) => {
      const table = isGroup ? 'product_groups' : 'products';
      const { error } = await supabase
        .from(table)
        .update({ is_bought: !currentlyChecked })
        .eq('id', itemId);

      if (error) {
        console.error('Error toggling bought status:', error);
      }
    },
    [supabase]
  );

  const clearAll = useCallback(
    async (items: Array<{ id: string; isGroup: boolean }>) => {
      const productIds = items.filter(i => !i.isGroup).map(i => i.id);
      const groupIds = items.filter(i => i.isGroup).map(i => i.id);

      if (productIds.length > 0) {
        await supabase.from('products').update({ is_bought: false }).in('id', productIds);
      }
      if (groupIds.length > 0) {
        await supabase.from('product_groups').update({ is_bought: false }).in('id', groupIds);
      }
    },
    [supabase]
  );

  return { toggleChecked, clearAll };
}
