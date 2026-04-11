'use client';

import { useState } from 'react';
import { ShoppingItem as ShoppingItemType } from '@/lib/hooks/useShoppingList';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { StockAdjuster } from '@/components/products/StockAdjuster';

interface ShoppingItemProps {
  item: ShoppingItemType;
  onBought: (targetProductId: string, quantity: number) => void;
  checked: boolean;
  onToggleChecked: (id: string) => void;
  onToggleLowPrio: (id: string, isGroup: boolean) => void;
  isLowPrio?: boolean;
}

export function ShoppingItem({ item, onBought, checked, onToggleChecked, onToggleLowPrio, isLowPrio }: ShoppingItemProps) {
  const [showQuantity, setShowQuantity] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [quantity, setQuantity] = useState(item.needed);

  const handleBought = () => {
    if (!item.targetProductId) return;
    setQuantity(item.needed);
    setShowQuantity(true);
  };

  const handleConfirmQuantity = () => {
    setShowQuantity(false);
    if (item.isGroup && item.groupMembers && item.groupMembers.length > 1) {
      setShowPicker(true);
    } else if (item.targetProductId) {
      onBought(item.targetProductId, quantity);
    }
  };

  return (
    <>
      <div className={`flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0 ${checked ? 'opacity-50' : ''}`}>
        <button
          type="button"
          onClick={() => onToggleChecked(item.id)}
          className={`flex-shrink-0 mr-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
          aria-label={checked ? `Unmark ${item.name} as bought` : `Mark ${item.name} as bought`}
        >
          {checked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {item.isGroup && (
              <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">🔗</span>
            )}
            <p className={`font-medium truncate ${checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.name}</p>
          </div>
          <p className={`text-xs ${checked ? 'line-through text-gray-400' : 'text-gray-500'}`}>
            Need {item.needed} {item.unit} (have {item.currentStock})
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggleLowPrio(item.id, item.isGroup)}
          className="ml-2 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          aria-label={isLowPrio ? 'Move to main list' : 'Move to low priority'}
          title={isLowPrio ? 'Move to main list' : 'Move to low priority'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {isLowPrio ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            )}
          </svg>
        </button>
        <Button
          size="sm"
          onClick={handleBought}
          disabled={!item.targetProductId}
          className="ml-1 flex-shrink-0"
          title={!item.targetProductId ? 'Add a product to this group first' : undefined}
        >
          +{item.needed} Bought
        </Button>
      </div>

      {/* Quantity dialog */}
      <Dialog open={showQuantity} onClose={() => setShowQuantity(false)} title={`How many ${item.name}?`}>
        <p className="text-sm text-gray-500 mb-4">Need {item.needed}, but how many did you actually buy?</p>
        <div className="flex justify-center py-4">
          <StockAdjuster
            currentStock={quantity}
            onAdjust={(delta) => setQuantity(Math.max(1, quantity + delta))}
            size="lg"
            unit={item.unit}
          />
        </div>
        <Button onClick={handleConfirmQuantity} className="w-full mt-2">
          Confirm +{quantity}
        </Button>
        <Button variant="ghost" onClick={() => setShowQuantity(false)} className="w-full mt-1">
          Cancel
        </Button>
      </Dialog>

      {/* Group product picker dialog */}
      {item.isGroup && item.groupMembers && (
        <Dialog open={showPicker} onClose={() => setShowPicker(false)} title={`Which ${item.name}?`}>
          <p className="text-sm text-gray-500 mb-3">Which product did you buy?</p>
          <div className="space-y-2">
            {item.groupMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  onBought(member.id, quantity);
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
