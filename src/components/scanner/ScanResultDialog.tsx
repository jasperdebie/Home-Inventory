'use client';

import { useRouter } from 'next/navigation';
import { ProductWithCategory } from '@/lib/supabase/types';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { StockAdjuster } from '@/components/products/StockAdjuster';
import { getStockStatus } from '@/lib/constants';
import { getStockBadgeColor } from '@/lib/utils/stock';

interface ScanResultDialogProps {
  open: boolean;
  onClose: () => void;
  product?: ProductWithCategory | null;
  suggestion?: { name: string; barcode: string } | null;
  onStockChange?: (quantity: number) => void;
}

export function ScanResultDialog({ open, onClose, product, suggestion, onStockChange }: ScanResultDialogProps) {
  const router = useRouter();

  if (product) {
    const status = getStockStatus(product.current_stock, product.min_stock);
    return (
      <Dialog open={open} onClose={onClose} title="Product Found">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{product.name}</h3>
            {product.category && (
              <span className="text-sm text-gray-500">
                {product.category.icon} {product.category.name}
              </span>
            )}
            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStockBadgeColor(status)}`}>
              {product.current_stock} {product.unit}
            </span>
          </div>

          <div className="flex justify-center py-2">
            <StockAdjuster
              currentStock={product.current_stock}
              onAdjust={(qty) => onStockChange?.(qty)}
              size="lg"
              unit={product.unit}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="primary" onClick={() => { onStockChange?.(1); onClose(); }} className="flex-1">
              +1 Bought
            </Button>
            <Button variant="secondary" onClick={() => { onStockChange?.(-1); onClose(); }} className="flex-1">
              -1 Used
            </Button>
          </div>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </Dialog>
    );
  }

  if (suggestion) {
    return (
      <Dialog open={open} onClose={onClose} title="New Product">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {suggestion.name
              ? `Found "${suggestion.name}" on OpenFoodFacts.`
              : 'This barcode is not in your inventory yet.'}
          </p>
          <p className="text-xs text-gray-400 font-mono">{suggestion.barcode}</p>
          <Button
            onClick={() => {
              const params = new URLSearchParams({ barcode: suggestion.barcode });
              if (suggestion.name) params.set('name', suggestion.name);
              router.push(`/products/new?${params.toString()}`);
              onClose();
            }}
            className="w-full"
          >
            Add Product
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>
      </Dialog>
    );
  }

  return null;
}
