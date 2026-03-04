'use client';

import { useProducts } from '@/lib/hooks/useProducts';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';
import { QuickActions } from '@/components/dashboard/QuickActions';
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
      <LowStockAlert products={products} />
      <RecentActivity />
    </div>
  );
}
