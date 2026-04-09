'use client';

import { useState, useCallback, useEffect } from 'react';
import { useShoppingList } from '@/lib/hooks/useShoppingList';
import { ShoppingList } from '@/components/shopping/ShoppingList';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

const CHECKED_STORAGE_KEY = 'shopping-list-checked';

function loadCheckedIds(): Set<string> {
  try {
    const stored = localStorage.getItem(CHECKED_STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

function saveCheckedIds(ids: Set<string>) {
  localStorage.setItem(CHECKED_STORAGE_KEY, JSON.stringify([...ids]));
}

export default function ShoppingListPage() {
  const { groups, totalItems, loading, addStockChange } = useShoppingList();
  const { toast } = useToast();
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => loadCheckedIds());

  // Sync to localStorage on change
  useEffect(() => {
    saveCheckedIds(checkedIds);
  }, [checkedIds]);

  // Clean up checked IDs that are no longer on the shopping list
  useEffect(() => {
    if (loading) return;
    const currentIds = new Set(groups.flatMap(g => g.items.map(i => i.id)));
    setCheckedIds(prev => {
      const cleaned = new Set([...prev].filter(id => currentIds.has(id)));
      if (cleaned.size !== prev.size) return cleaned;
      return prev;
    });
  }, [groups, loading]);

  const handleToggleChecked = useCallback((id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBought = async (productId: string, quantity: number) => {
    try {
      await addStockChange(productId, quantity, 'add', 'Bought from shopping list');
      toast(`Added ${quantity} to stock`);
    } catch {
      toast('Failed to update stock', 'error');
    }
  };

  const handleClearChecked = useCallback(() => {
    setCheckedIds(new Set());
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const checkedCount = checkedIds.size;

  return (
    <div className="max-w-lg mx-auto">
      {totalItems > 0 && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            {totalItems} item{totalItems !== 1 ? 's' : ''} to buy
            {checkedCount > 0 && ` · ${checkedCount} bought`}
          </p>
          {checkedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearChecked}>
              Clear checks
            </Button>
          )}
        </div>
      )}
      <ShoppingList
        groups={groups}
        onBought={handleBought}
        checkedIds={checkedIds}
        onToggleChecked={handleToggleChecked}
      />
    </div>
  );
}
