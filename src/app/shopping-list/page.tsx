'use client';

import { useShoppingList } from '@/lib/hooks/useShoppingList';
import { ShoppingList } from '@/components/shopping/ShoppingList';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

export default function ShoppingListPage() {
  const { groups, totalItems, loading, addStockChange } = useShoppingList();
  const { toast } = useToast();

  const handleBought = async (productId: string, quantity: number) => {
    try {
      await addStockChange(productId, quantity, 'add', 'Bought from shopping list');
      toast(`Added ${quantity} to stock`);
    } catch {
      toast('Failed to update stock', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {totalItems > 0 && (
        <p className="text-sm text-gray-500 mb-3">{totalItems} item{totalItems !== 1 ? 's' : ''} to buy</p>
      )}
      <ShoppingList groups={groups} onBought={handleBought} />
    </div>
  );
}
