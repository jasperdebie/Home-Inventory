'use client';

import { useMemo, useCallback } from 'react';
import { useShoppingList } from '@/lib/hooks/useShoppingList';
import { useShoppingBought } from '@/lib/hooks/useShoppingBought';
import { useShoppingItems } from '@/lib/hooks/useShoppingItems';
import { createClient } from '@/lib/supabase/client';
import { ShoppingList } from '@/components/shopping/ShoppingList';
import { AdHocShoppingList } from '@/components/shopping/AdHocShoppingList';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

export default function ShoppingListPage() {
  const { groups, lowPrioGroups, totalItems, totalLowPrio, loading, addStockChange } = useShoppingList();
  const { toggleChecked, clearAll } = useShoppingBought();
  const { items: adHocItems, addItem, toggleItem, deleteItem } = useShoppingItems();
  const { toast } = useToast();

  const checkedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const group of [...groups, ...lowPrioGroups]) {
      for (const item of group.items) {
        if (item.isBought) ids.add(item.id);
      }
    }
    return ids;
  }, [groups, lowPrioGroups]);

  const handleToggleChecked = (id: string) => {
    const item = [...groups, ...lowPrioGroups].flatMap(g => g.items).find(i => i.id === id);
    if (!item) return;
    toggleChecked(id, item.isGroup, item.isBought);
  };

  const handleBought = async (productId: string, quantity: number) => {
    try {
      await addStockChange(productId, quantity, 'add', 'Bought from shopping list');

      // Reset extra_needed on the shopping list item (product or group) that was bought
      const supabase = createClient();
      const allItems = [...groups, ...lowPrioGroups].flatMap(g => g.items);
      const item = allItems.find(i => i.targetProductId === productId || (i.isGroup && i.groupMembers?.some(m => m.id === productId)));
      if (item && item.isGroup) {
        await supabase.from('product_groups').update({ extra_needed: 0 }).eq('id', item.id);
      } else if (item) {
        await supabase.from('products').update({ extra_needed: 0 }).eq('id', item.id);
      }

      toast(`Added ${quantity} to stock`);
    } catch {
      toast('Failed to update stock', 'error');
    }
  };

  const handleToggleLowPrio = useCallback(async (id: string, isGroup: boolean) => {
    const supabase = createClient();
    const table = isGroup ? 'product_groups' : 'products';
    const { data } = await supabase.from(table).select('is_low_prio').eq('id', id).single();
    if (!data) return;
    const { error } = await supabase.from(table).update({ is_low_prio: !data.is_low_prio }).eq('id', id);
    if (error) {
      toast('Failed to update priority', 'error');
    }
  }, [toast]);

  const handleClearAll = () => {
    const boughtItems = [...groups, ...lowPrioGroups]
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
    <div className="max-w-lg lg:max-w-2xl mx-auto">
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
        onToggleLowPrio={handleToggleLowPrio}
      />
      <div className="mt-4">
        <AdHocShoppingList
          items={adHocItems}
          onAdd={addItem}
          onToggle={toggleItem}
          onDelete={deleteItem}
        />
      </div>
      {totalLowPrio > 0 && (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-3">
            🔽 Low priority ({totalLowPrio})
          </p>
          <ShoppingList
            groups={lowPrioGroups}
            onBought={handleBought}
            checkedIds={checkedIds}
            onToggleChecked={handleToggleChecked}
            onToggleLowPrio={handleToggleLowPrio}
            isLowPrio
          />
        </div>
      )}
    </div>
  );
}
