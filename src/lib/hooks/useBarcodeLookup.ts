'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ProductWithCategory } from '@/lib/supabase/types';

interface OpenFoodFactsResult {
  name: string;
  barcode: string;
}

export function useBarcodeLookup() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const lookupBarcode = useCallback(
    async (barcode: string): Promise<{ product?: ProductWithCategory; suggestion?: OpenFoodFactsResult }> => {
      setLoading(true);
      try {
        // First, check local DB
        const { data: existingProduct } = await supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('barcode', barcode)
          .eq('is_archived', false)
          .single();

        if (existingProduct) {
          return { product: existingProduct };
        }

        // If not found locally, try OpenFoodFacts
        try {
          const res = await fetch(`/api/products/lookup?barcode=${encodeURIComponent(barcode)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.name) {
              return { suggestion: { name: data.name, barcode } };
            }
          }
        } catch {
          // OpenFoodFacts lookup failed, that's ok
        }

        return { suggestion: { name: '', barcode } };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return { lookupBarcode, loading };
}
