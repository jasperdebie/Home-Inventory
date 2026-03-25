'use client';

import { useState } from 'react';
import { ShoppingItem as ShoppingItemType } from '@/lib/hooks/useShoppingList';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';

interface ShoppingItemProps {
  item: ShoppingItemType;
  onBought: (targetProductId: string, quantity: number) => void;
}

export function ShoppingItem({ item, onBought }: ShoppingItemProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleBought = () => {
    if (!item.targetProductId) return;
    if (item.isGroup && item.groupMembers && item.groupMembers.length > 1) {
      setShowPicker(true);
    } else {
      onBought(item.targetProductId, item.needed);
    }
  };

  return (
    <>
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
          onClick={handleBought}
          disabled={!item.targetProductId}
          className="ml-3 flex-shrink-0"
          title={!item.targetProductId ? 'Add a product to this group first' : undefined}
        >
          +{item.needed} Bought
        </Button>
      </div>

      {item.isGroup && item.groupMembers && (
        <Dialog open={showPicker} onClose={() => setShowPicker(false)} title={`Which ${item.name}?`}>
          <p className="text-sm text-gray-500 mb-3">Which product did you buy?</p>
          <div className="space-y-2">
            {item.groupMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  onBought(member.id, item.needed);
                  setShowPicker(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors text-left"
              >
                <span className="font-medium text-gray-900">{member.name}</span>
                <span className="text-sm text-gray-400">{member.currentStock} in stock</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setShowPicker(false)} className="w-full mt-3">
            Cancel
          </Button>
        </Dialog>
      )}
    </>
  );
}
