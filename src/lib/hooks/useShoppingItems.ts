'use client';

import { useEffect, useState, useCallback } from 'react';
import { ShoppingItem } from '@/lib/supabase/types';

export function useShoppingItems() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/shopping-items');
      if (!res.ok) throw new Error('Failed to fetch shopping items');
      setItems(await res.json());
    } catch (error) {
      console.error('Error fetching shopping items:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const optimistic: ShoppingItem = {
      id: crypto.randomUUID(),
      name: trimmed,
      is_checked: false,
      created_at: new Date().toISOString(),
    };
    setItems((prev) => [...prev, optimistic]);

    const res = await fetch('/api/shopping-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    });

    if (!res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== optimistic.id));
      return;
    }
    await fetchItems();
  }, [fetchItems]);

  const toggleItem = useCallback(async (id: string, currentlyChecked: boolean) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, is_checked: !currentlyChecked } : i));
    const res = await fetch(`/api/shopping-items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_checked: !currentlyChecked }),
    });
    if (!res.ok) await fetchItems();
  }, [fetchItems]);

  const deleteItem = useCallback(async (id: string) => {
    const prev = items;
    setItems((curr) => curr.filter((i) => i.id !== id));
    const res = await fetch(`/api/shopping-items/${id}`, { method: 'DELETE' });
    if (!res.ok) setItems(prev);
  }, [items]);

  return { items, loading, addItem, toggleItem, deleteItem };
}
