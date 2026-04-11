'use client';

import { ShoppingGroup } from '@/lib/hooks/useShoppingList';
import { ShoppingItem } from './ShoppingItem';
import { Card } from '@/components/ui/Card';

interface ShoppingListProps {
  groups: ShoppingGroup[];
  onBought: (productId: string, quantity: number) => void;
  checkedIds: Set<string>;
  onToggleChecked: (id: string) => void;
  onToggleLowPrio: (id: string, isGroup: boolean) => void;
  isLowPrio?: boolean;
}

export function ShoppingList({ groups, onBought, checkedIds, onToggleChecked, onToggleLowPrio, isLowPrio }: ShoppingListProps) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-gray-500 font-medium">All stocked up!</p>
        <p className="text-gray-400 text-sm mt-1">Nothing to buy right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.category?.id || 'uncategorized'} padding={false}>
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-xl">
            <h3 className="font-medium text-gray-700 text-sm">
              {group.category?.icon} {group.category?.name}
              <span className="ml-2 text-gray-400">({group.items.length})</span>
            </h3>
          </div>
          <div className="px-4">
            {group.items.map((item) => (
              <ShoppingItem
                key={item.id}
                item={item}
                onBought={onBought}
                checked={checkedIds.has(item.id)}
                onToggleChecked={onToggleChecked}
                onToggleLowPrio={onToggleLowPrio}
                isLowPrio={isLowPrio}
              />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
