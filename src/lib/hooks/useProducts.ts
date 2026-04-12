'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ProductWithCategory } from '@/lib/supabase/types';

export function useProducts() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), product_group:product_groups(*)')
      .eq('is_archived', false)
      .order('name');

    if (error) {
      console.error('Error fetching products:', error);
      setLoading(false);
      return;
    }
    setProducts(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts, supabase]);

  const addStockChange = useCallback(
    async (productId: string, quantity: number, type: 'add' | 'consume' | 'adjust' | 'initial', note?: string) => {
      // Optimistic update
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, current_stock: Number(p.current_stock) + quantity } : p
        )
      );

      const { error } = await supabase.from('stock_changes').insert({
        product_id: productId,
        quantity_change: quantity,
        change_type: type,
        note: note || null,
      });

      if (error) {
        console.error('Error adding stock change:', error);
        fetchProducts(); // Revert on error
        throw error;
      }
    },
    [supabase, fetchProducts]
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
      const { initial_stock, ...productData } = product;

      const { data, error } = await supabase
        .from('products')
        .insert({ ...productData, current_stock: 0 })
        .select()
        .single();

      if (error) throw error;

      // Set initial stock via stock_changes trigger
      if (initial_stock && initial_stock > 0) {
        await supabase.from('stock_changes').insert({
          product_id: data.id,
          quantity_change: initial_stock,
          change_type: 'initial',
        });
      }

      return data;
    },
    [supabase]
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<{ name: string; category_id: string | null; group_id: string | null; unit: string; barcode: string | null; min_stock: number; extra_needed: number; notes: string | null; expires_at: string | null; is_archived: boolean; is_low_prio: boolean }>) => {
      const { error } = await supabase.from('products').update(updates).eq('id', id);
      if (error) throw error;
      await fetchProducts();
    },
    [supabase, fetchProducts]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p.id !== id));
    },
    [supabase]
  );

  return { products, loading, addStockChange, createProduct, updateProduct, deleteProduct, refetch: fetchProducts };
}
