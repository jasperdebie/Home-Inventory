'use client';

import { useState, useCallback } from 'react';
import { ProductWithCategory } from '@/lib/supabase/types';

interface OpenFoodFactsResult {
  name: string;
  barcode: string;
}

export function useBarcodeLookup() {
  const [loading, setLoading] = useState(false);
  const lookupBarcode = useCallback(
    async (barcode: string): Promise<{ product?: ProductWithCategory; suggestion?: OpenFoodFactsResult }> => {
      setLoading(true);
      try {
        // First, check local PostgreSQL database through our API.
        const localRes = await fetch(`/api/products?barcode=${encodeURIComponent(barcode)}`);
        if (localRes.ok) {
          const rows: ProductWithCategory[] = await localRes.json();
          if (rows[0]) {
            return { product: rows[0] };
          }
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
    []
  );

  return { lookupBarcode, loading };
}
