'use client';

import { useMemo } from 'react';
import { useShoppingList } from '@/lib/hooks/useShoppingList';
import { useShoppingBought } from '@/lib/hooks/useShoppingBought';
import { useShoppingItems } from '@/lib/hooks/useShoppingItems';
import { ShoppingList } from '@/components/shopping/ShoppingList';
import { AdHocShoppingList } from '@/components/shopping/AdHocShoppingList';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

export default function ShoppingListPage() {
  const { groups, totalItems, loading, addStockChange } = useShoppingList();
  const { toggleChecked, clearAll } = useShoppingBought();
  const { items: adHocItems, addItem, toggleItem, deleteItem } = useShoppingItems();
  const { toast } = useToast();

  const checkedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of groups) {
      for (const item of group.items) {
        if (item.isBought) ids.add(item.id);
      }
    }
    return ids;
  }, [groups]);

  const handleToggleChecked = (id: string) => {
    const item = groups.flatMap(g => g.items).find(i => i.id === id);
    if (!item) return;
    toggleChecked(id, item.isGroup, item.isBought);
  };

  const handleBought = async (productId: string, quantity: number) => {
    try {
      await addStockChange(productId, quantity, 'add', 'Bought from shopping list');
      toast(`Added ${quantity} to stock`);
    } catch {
      toast('Failed to update stock', 'error');
    }
  };

  const handleClearAll = () => {
    const boughtItems = groups
      .flatMap(g => g.items)
      .filter(i => i.isBought)
      .map(i => ({ id: i.id, isGroup: i.isGroup }));
    clearAll(boughtItems);
  };

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
            <Button variant="ghost" size="sm" onClick={handleClearAll}>
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
      <div className="mt-4">
        <AdHocShoppingList
          items={adHocItems}
          onAdd={addItem}
          onToggle={toggleItem}
          onDelete={deleteItem}
        />
      </div>
    </div>
  );
}
