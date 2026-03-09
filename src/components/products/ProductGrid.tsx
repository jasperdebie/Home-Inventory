'use client';

import { useState, useMemo, useCallback } from 'react';
import { ProductWithCategory } from '@/lib/supabase/types';
import { useCategories } from '@/lib/hooks/useCategories';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { CategoryFilter } from './CategoryFilter';
import { ProductCard } from './ProductCard';
import { formatStockChange } from '@/lib/utils/format';

interface ProductGridProps {
  products: ProductWithCategory[];
  loading: boolean;
  onStockChange: (productId: string, quantity: number, type: 'add' | 'consume') => Promise<void>;
}

export function ProductGrid({ products, loading, onStockChange }: ProductGridProps) {
  const { categories } = useCategories();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScan = useCallback((barcode: string) => {
    setSearch(barcode);
    setScannerOpen(false);
  }, []);

  const filtered = useMemo(() => {
    let result = products;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.barcode?.includes(q)
      );
    }
    if (selectedCategory) {
      result = result.filter((p) => p.category_id === selectedCategory);
    }
    return result;
  }, [products, search, selectedCategory]);

  const handleStockChange = async (product: ProductWithCategory, quantity: number) => {
    const type = quantity > 0 ? 'add' : 'consume';
    try {
      await onStockChange(product.id, quantity, type);
      toast(formatStockChange(quantity, product.name, product.current_stock + quantity));
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
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-base flex-1"
        />
        <Button
          variant="secondary"
          onClick={() => setScannerOpen(!scannerOpen)}
          aria-label="Scan barcode"
          className="shrink-0 px-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="7" y1="8" x2="17" y2="8" />
            <line x1="7" y1="16" x2="17" y2="16" />
          </svg>
        </Button>
      </div>

      {scannerOpen && (
        <div className="rounded-xl overflow-hidden">
          <BarcodeScanner onScan={handleScan} active={scannerOpen} />
        </div>
      )}

      <CategoryFilter
        categories={categories}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {products.length === 0 ? 'No products yet. Add your first one!' : 'No matching products.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onStockChange={(qty) => handleStockChange(product, qty)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
