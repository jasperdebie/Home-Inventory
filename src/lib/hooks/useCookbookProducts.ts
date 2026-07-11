'use client';

import { useEffect, useRef, useState } from 'react';
import { CookbookProduct } from '@/lib/supabase/types';

export type { CookbookProduct };

export function useCookbookProducts(query: string) {
  const [products, setProducts] = useState<CookbookProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const q = encodeURIComponent(query.trim());
        const res = await fetch(`/api/cookbook-products?q=${q}`);
        if (!res.ok) return;
        const data = await res.json();
        setProducts(data);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { products, loading };
}
