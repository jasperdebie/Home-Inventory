'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductForm } from '@/components/products/ProductForm';
import { Spinner } from '@/components/ui/Spinner';

function NewProductContent() {
  const searchParams = useSearchParams();
  const barcode = searchParams.get('barcode') || undefined;
  const name = searchParams.get('name') || undefined;

  return <ProductForm initialBarcode={barcode} initialName={name} />;
}

export default function NewProductPage() {
  return (
    <div className="max-w-lg mx-auto">
      <Suspense fallback={<div className="flex justify-center py-12"><Spinner size="lg" /></div>}>
        <NewProductContent />
      </Suspense>
    </div>
  );
}
