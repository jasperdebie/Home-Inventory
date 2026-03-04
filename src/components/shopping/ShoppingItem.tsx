'use client';

import { ProductWithCategory } from '@/lib/supabase/types';
import { Button } from '@/components/ui/Button';

interface ShoppingItemProps {
  product: ProductWithCategory & { needed: number };
  onBought: (quantity: number) => void;
}

export function ShoppingItem({ product, onBought }: ShoppingItemProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{product.name}</p>
        <p className="text-xs text-gray-500">
          Need {product.needed} {product.unit} (have {product.current_stock})
        </p>
      </div>
      <Button
        size="sm"
        onClick={() => onBought(product.needed)}
        className="ml-3 flex-shrink-0"
      >
        +{product.needed} Bought
      </Button>
    </div>
  );
}
