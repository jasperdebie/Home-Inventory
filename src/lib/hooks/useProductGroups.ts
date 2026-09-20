'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProductGroup } from '@/lib/supabase/types';

export function useProductGroups() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/product-groups');
      if (!res.ok) throw new Error('Failed to fetch product groups');
      setGroups(await res.json());
    } catch (error) {
      console.error('Error fetching product groups:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = useCallback(async (group: { name: string; min_stock?: number }) => {
    const res = await fetch('/api/product-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(group),
    });
    if (!res.ok) throw new Error('Failed to create product group');
    const data = await res.json();
    await fetchGroups();
    return data;
  }, [fetchGroups]);

  const updateGroup = useCallback(async (
    id: string,
    updates: Partial<Pick<ProductGroup, 'name' | 'min_stock' | 'extra_needed' | 'is_low_prio' | 'is_bought'>>
  ) => {
    const res = await fetch(`/api/product-groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update product group');
    await fetchGroups();
  }, [fetchGroups]);

  const deleteGroup = useCallback(async (id: string) => {
    const res = await fetch(`/api/product-groups/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete product group');
    setGroups(prev => prev.filter(g => g.id !== id));
  }, []);

  return { groups, loading, createGroup, updateGroup, deleteGroup, refetch: fetchGroups };
}
