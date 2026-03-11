'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { useBarcodeLookup } from '@/lib/hooks/useBarcodeLookup';
import { useProducts } from '@/lib/hooks/useProducts';
import { useToast } from '@/components/ui/Toast';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { formatStockChange } from '@/lib/utils/format';
import { Spinner } from '@/components/ui/Spinner';

type QuickMode = 'add' | 'consume';

interface QuickScanButtonProps {
  mode: QuickMode;
}

function QuickScanButton({ mode }: QuickScanButtonProps) {
  const [open, setOpen] = useState(false);
  const [lastName, setLastName] = useState<string | null>(null);
  const [pendingSuggestion, setPendingSuggestion] = useState<{ name: string; barcode: string } | null>(null);
  const { lookupBarcode, loading: lookupLoading } = useBarcodeLookup();
  const { addStockChange } = useProducts();
  const { toast } = useToast();
  const router = useRouter();

  const delta = mode === 'add' ? 1 : -1;
  const label = mode === 'add' ? 'Quick Add +1' : 'Quick Use -1';
  const subtitle = mode === 'add' ? 'Scan barcode to add stock' : 'Scan barcode to use stock';

  const handleScan = useCallback(
    async (barcode: string) => {
      setLastName(null);
      setPendingSuggestion(null);
      const result = await lookupBarcode(barcode);

      if (result.product) {
        if (mode === 'consume' && result.product.current_stock <= 0) {
          toast(`${result.product.name} is already out of stock`, 'error');
          return;
        }
        try {
          await addStockChange(result.product.id, delta, mode);
          const msg = formatStockChange(delta, result.product.name, result.product.current_stock + delta);
          toast(msg);
          setLastName(result.product.name);
          if (navigator.vibrate) navigator.vibrate(200);
        } catch {
          toast('Failed to update stock', 'error');
        }
      } else if (result.suggestion) {
        setPendingSuggestion(result.suggestion);
      }
    },
    [lookupBarcode, addStockChange, toast, delta, mode]
  );

  const handleAddNewProduct = () => {
    if (!pendingSuggestion) return;
    const params = new URLSearchParams({ barcode: pendingSuggestion.barcode });
    if (pendingSuggestion.name) params.set('name', pendingSuggestion.name);
    setOpen(false);
    setPendingSuggestion(null);
    setLastName(null);
    router.push(`/products/new?${params.toString()}`);
  };

  const handleClose = () => {
    setOpen(false);
    setLastName(null);
    setPendingSuggestion(null);
  };

  const isAdd = mode === 'add';

  return (
    <>
      <button
        onClick={() => { setOpen(true); setLastName(null); setPendingSuggestion(null); }}
        className={`flex flex-col items-center justify-center text-white rounded-xl shadow-sm p-3 transition-colors ${
          isAdd
            ? 'bg-green-500 hover:bg-green-600 active:bg-green-700'
            : 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700'
        }`}
      >
        <span className="text-lg font-semibold">{label}</span>
        <span className="text-xs opacity-90">{subtitle}</span>
      </button>

      <Dialog open={open} onClose={handleClose} title={label}>
        <div className="space-y-3">
          <BarcodeScanner onScan={handleScan} active={open && !pendingSuggestion} />

          {lookupLoading && (
            <div className="flex items-center justify-center gap-2 py-2">
              <Spinner size="sm" />
              <span className="text-sm text-gray-500">Looking up product...</span>
            </div>
          )}

          {lastName && !pendingSuggestion && (
            <div className={`rounded-lg p-3 text-center border ${
              isAdd
                ? 'bg-green-50 border-green-200'
                : 'bg-orange-50 border-orange-200'
            }`}>
              <p className={`text-sm font-medium ${isAdd ? 'text-green-800' : 'text-orange-800'}`}>
                {isAdd ? '✓ +1' : '✓ -1'} {lastName}
              </p>
              <p className={`text-xs mt-1 ${isAdd ? 'text-green-600' : 'text-orange-600'}`}>
                Scan another product
              </p>
            </div>
          )}

          {pendingSuggestion && (
            <div className="rounded-lg p-4 bg-amber-50 border border-amber-200 space-y-3">
              <div>
                <p className="text-sm font-medium text-amber-800">Product not found</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {pendingSuggestion.name
                    ? `"${pendingSuggestion.name}" is not in your inventory yet.`
                    : 'This barcode is not in your inventory yet.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddNewProduct} className="flex-1">Add new product</Button>
                <Button variant="secondary" onClick={() => setPendingSuggestion(null)} className="flex-1">Skip</Button>
              </div>
            </div>
          )}

          <Button variant="ghost" onClick={handleClose} className="w-full">
            Close
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export function QuickAddButton() {
  return <QuickScanButton mode="add" />;
}

export function QuickSubtractButton() {
  return <QuickScanButton mode="consume" />;
}
