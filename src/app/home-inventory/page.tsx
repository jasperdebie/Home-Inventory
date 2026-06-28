'use client';

import { useProducts } from '@/lib/hooks/useProducts';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';
import { ExpiringAlert } from '@/components/dashboard/ExpiringAlert';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { QuickAddButton, QuickSubtractButton } from '@/components/dashboard/QuickAddButton';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Spinner } from '@/components/ui/Spinner';

export default function DashboardPage() {
  const { products, loading } = useProducts();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <QuickActions />
      <div className="grid grid-cols-2 gap-3">
        <QuickAddButton />
        <QuickSubtractButton />
      </div>
      <LowStockAlert products={products} />
      <ExpiringAlert products={products} />
      <RecentActivity />
    </div>
  );
}
