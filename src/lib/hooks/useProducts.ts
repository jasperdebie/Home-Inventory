'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProductWithCategory } from '@/lib/supabase/types';

export function useProducts() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to fetch products');
      setProducts(await res.json());
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addStockChange = useCallback(
    async (productId: string, quantity: number, type: 'add' | 'consume' | 'adjust' | 'initial', note?: string) => {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, current_stock: Number(p.current_stock) + quantity } : p
        )
      );

      const res = await fetch('/api/stock-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          quantity_change: quantity,
          change_type: type,
          note: note || null,
        }),
      });

      if (!res.ok) {
        await fetchProducts();
        throw new Error('Failed to add stock change');
      }
    },
    [fetchProducts]
  );

  const createProduct = useCallback(
    async (product: {
      name: string;
      category_id?: string | null;
      group_id?: string | null;
      unit: string;
      barcode?: string | null;
      min_stock: number;
      notes?: string | null;
      expires_at?: string | null;
      is_low_prio?: boolean;
      initial_stock?: number;
    }) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error('Failed to create product');
      const data = await res.json();
      await fetchProducts();
      return data;
    },
    [fetchProducts]
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<{
      name: string;
      category_id: string | null;
      group_id: string | null;
      unit: string;
      barcode: string | null;
      min_stock: number;
      extra_needed: number;
      notes: string | null;
      expires_at: string | null;
      is_archived: boolean;
      is_low_prio: boolean;
      is_bought: boolean;
    }>) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update product');
      await fetchProducts();
    },
    [fetchProducts]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');
      setProducts((prev) => prev.filter((p) => p.id !== id));
    },
    []
  );

  return { products, loading, addStockChange, createProduct, updateProduct, deleteProduct, refetch: fetchProducts };
}
