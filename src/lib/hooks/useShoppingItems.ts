'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ShoppingItem } from '@/lib/supabase/types';

export function useShoppingItems() {
  const supabase = createClient();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching shopping items:', error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel('shopping_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () => {
        fetchItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchItems]);

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

    const { error } = await supabase
      .from('shopping_items')
      .insert({ name: trimmed });

    if (error) {
      console.error('Error adding shopping item:', error);
      setItems((prev) => prev.filter((i) => i.id !== optimistic.id));
    } else {
      fetchItems();
    }
  }, [supabase, fetchItems]);

  const toggleItem = useCallback(async (id: string, currentlyChecked: boolean) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, is_checked: !currentlyChecked } : i));

    const { error } = await supabase
      .from('shopping_items')
      .update({ is_checked: !currentlyChecked })
      .eq('id', id);

    if (error) {
      console.error('Error toggling shopping item:', error);
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, is_checked: currentlyChecked } : i));
    }
  }, [supabase]);

  const deleteItem = useCallback(async (id: string) => {
    const prev = items;
    setItems((curr) => curr.filter((i) => i.id !== id));

    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting shopping item:', error);
      setItems(prev);
    }
  }, [supabase, items]);

  return { items, loading, addItem, toggleItem, deleteItem };
}
