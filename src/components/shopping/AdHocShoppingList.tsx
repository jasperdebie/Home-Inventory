'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ShoppingItem } from '@/lib/supabase/types';

interface AdHocShoppingListProps {
  items: ShoppingItem[];
  onAdd: (name: string) => void;
  onToggle: (id: string, isChecked: boolean) => void;
  onDelete: (id: string) => void;
}

export function AdHocShoppingList({ items, onAdd, onToggle, onDelete }: AdHocShoppingListProps) {
  const [newItem, setNewItem] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    onAdd(newItem);
    setNewItem('');
  };

  return (
    <Card padding={false}>
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 rounded-t-xl">
        <h3 className="font-medium text-gray-700 text-sm">
          🛒 Extra boodschappen
          {items.length > 0 && <span className="ml-2 text-gray-400">({items.length})</span>}
        </h3>
      </div>
      <div className="px-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center py-2.5 border-b border-gray-100 last:border-0 ${item.is_checked ? 'opacity-50' : ''}`}
          >
            <button
              type="button"
              onClick={() => onToggle(item.id, item.is_checked)}
              className={`flex-shrink-0 mr-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 ${item.is_checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}
              aria-label={item.is_checked ? `Uncheck ${item.name}` : `Check ${item.name}`}
            >
              {item.is_checked && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className={`flex-1 min-w-0 truncate font-medium ${item.is_checked ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {item.name}
            </span>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="ml-2 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label={`Delete ${item.name}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        <form onSubmit={handleSubmit} className="flex items-center gap-2 py-2.5">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add item..."
            className="flex-1 min-w-0 text-sm bg-transparent border-none outline-none placeholder:text-gray-400 text-gray-900"
          />
          <button
            type="submit"
            disabled={!newItem.trim()}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white disabled:opacity-30 transition-opacity"
            aria-label="Add item"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </form>
      </div>
    </Card>
  );
}
