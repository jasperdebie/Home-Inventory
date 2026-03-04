'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { StockChange } from '@/lib/supabase/types';

export function useStockChanges(productId?: string, limit = 20) {
  const [changes, setChanges] = useState<StockChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetch() {
      let query = supabase
        .from('stock_changes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching stock changes:', error);
      } else {
        setChanges(data || []);
      }
      setLoading(false);
    }

    fetch();

    const channel = supabase
      .channel(`stock-changes-${productId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stock_changes',
          ...(productId ? { filter: `product_id=eq.${productId}` } : {}),
        },
        () => {
          fetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [productId, limit]);

  return { changes, loading };
}
