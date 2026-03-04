'use client';

import { useProducts } from '@/lib/hooks/useProducts';
import { ProductGrid } from '@/components/products/ProductGrid';

export default function ProductsPage() {
  const { products, loading, addStockChange } = useProducts();

  return (
    <div>
      <ProductGrid
        products={products}
        loading={loading}
        onStockChange={(productId, quantity, type) => addStockChange(productId, quantity, type)}
      />
    </div>
  );
}
