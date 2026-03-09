'use client';

import { ShoppingItem as ShoppingItemType } from '@/lib/hooks/useShoppingList';
import { Button } from '@/components/ui/Button';

interface ShoppingItemProps {
  item: ShoppingItemType;
  onBought: (targetProductId: string, quantity: number) => void;
}

export function ShoppingItem({ item, onBought }: ShoppingItemProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {item.isGroup && (
            <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">🔗</span>
          )}
          <p className="font-medium text-gray-900 truncate">{item.name}</p>
        </div>
        <p className="text-xs text-gray-500">
          Need {item.needed} {item.unit} (have {item.currentStock})
        </p>
      </div>
      <Button
        size="sm"
        onClick={() => onBought(item.targetProductId, item.needed)}
        className="ml-3 flex-shrink-0"
      >
        +{item.needed} Bought
      </Button>
    </div>
  );
}
