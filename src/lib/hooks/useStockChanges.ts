'use client';

import { useEffect, useState } from 'react';
import { StockChange } from '@/lib/supabase/types';

export function useStockChanges(productId?: string, limit = 20) {
  const [changes, setChanges] = useState<StockChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (productId) params.set('productId', productId);
        const res = await fetch(`/api/stock-changes?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch stock changes');
        setChanges(await res.json());
      } catch (error) {
        console.error('Error fetching stock changes:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [productId, limit]);

  return { changes, loading };
}
