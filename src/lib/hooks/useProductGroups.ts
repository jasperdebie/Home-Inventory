'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ProductGroup } from '@/lib/supabase/types';

export function useProductGroups() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchGroups = useCallback(async () => {
    const { data, error } = await supabase
      .from('product_groups')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching product groups:', error);
    } else {
      setGroups(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchGroups();

    const channel = supabase
      .channel('product-groups-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_groups' }, () => fetchGroups())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchGroups, supabase]);

  const createGroup = useCallback(async (group: { name: string; min_stock?: number }) => {
    const { data, error } = await supabase
      .from('product_groups')
      .insert({ name: group.name, min_stock: group.min_stock ?? 1 })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, [supabase]);

  const updateGroup = useCallback(async (id: string, updates: Partial<Pick<ProductGroup, 'name' | 'min_stock' | 'extra_needed' | 'is_low_prio'>>) => {
    const { error } = await supabase
      .from('product_groups')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    await fetchGroups();
  }, [supabase, fetchGroups]);

  const deleteGroup = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('product_groups')
      .delete()
      .eq('id', id);
    if (error) throw error;
    setGroups(prev => prev.filter(g => g.id !== id));
  }, [supabase]);

  return { groups, loading, createGroup, updateGroup, deleteGroup, refetch: fetchGroups };
}
