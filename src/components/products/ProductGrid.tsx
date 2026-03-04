'use client';

import { useState, useMemo } from 'react';
import { ProductWithCategory } from '@/lib/supabase/types';
import { useCategories } from '@/lib/hooks/useCategories';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
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
      <Input
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="text-base"
      />

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
