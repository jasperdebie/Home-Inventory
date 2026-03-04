'use client';

import { useState, useCallback } from 'react';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { ScanResultDialog } from '@/components/scanner/ScanResultDialog';
import { useBarcodeLookup } from '@/lib/hooks/useBarcodeLookup';
import { useProducts } from '@/lib/hooks/useProducts';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ProductWithCategory } from '@/lib/supabase/types';
import { formatStockChange } from '@/lib/utils/format';

export default function ScannerPage() {
  const { lookupBarcode, loading: lookupLoading } = useBarcodeLookup();
  const { addStockChange } = useProducts();
  const { toast } = useToast();

  const [scannerActive, setScannerActive] = useState(true);
  const [manualBarcode, setManualBarcode] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [foundProduct, setFoundProduct] = useState<ProductWithCategory | null>(null);
  const [suggestion, setSuggestion] = useState<{ name: string; barcode: string } | null>(null);

  const handleBarcode = useCallback(
    async (barcode: string) => {
      setScannerActive(false);
      const result = await lookupBarcode(barcode);

      if (result.product) {
        setFoundProduct(result.product);
        setSuggestion(null);
      } else if (result.suggestion) {
        setFoundProduct(null);
        setSuggestion(result.suggestion);
      }
      setDialogOpen(true);
    },
    [lookupBarcode]
  );

  const handleStockChange = async (quantity: number) => {
    if (!foundProduct) return;
    try {
      const type = quantity > 0 ? 'add' : 'consume';
      await addStockChange(foundProduct.id, quantity, type as 'add' | 'consume');
      setFoundProduct((prev) =>
        prev ? { ...prev, current_stock: prev.current_stock + quantity } : prev
      );
      toast(formatStockChange(quantity, foundProduct.name, foundProduct.current_stock + quantity));
    } catch {
      toast('Failed to update stock', 'error');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleBarcode(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <BarcodeScanner onScan={handleBarcode} active={scannerActive} />

      {lookupLoading && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Spinner size="sm" />
          <span className="text-sm text-gray-500">Looking up barcode...</span>
        </div>
      )}

      <div className="text-center text-sm text-gray-400">or enter manually</div>

      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <Input
          placeholder="Type barcode..."
          value={manualBarcode}
          onChange={(e) => setManualBarcode(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={!manualBarcode.trim()}>
          Look Up
        </Button>
      </form>

      <ScanResultDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setScannerActive(true);
        }}
        product={foundProduct}
        suggestion={suggestion}
        onStockChange={handleStockChange}
      />
    </div>
  );
}
