'use client';

import Link from 'next/link';
import { ProductWithCategory } from '@/lib/supabase/types';
import { Card } from '@/components/ui/Card';

interface ExpiringAlertProps {
  products: ProductWithCategory[];
}

function daysUntilExpiry(expiresAt: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiresAt);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatExpiry(days: number): string {
  if (days < 0) return `${Math.abs(days)}d over`;
  if (days === 0) return 'today';
  if (days === 1) return 'morgen';
  return `${days} dagen`;
}

export function ExpiringAlert({ products }: ExpiringAlertProps) {
  const expiring = products
    .filter((p) => p.expires_at && p.current_stock > 0)
    .map((p) => ({ ...p, daysLeft: daysUntilExpiry(p.expires_at!) }))
    .filter((p) => p.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  if (expiring.length === 0) return null;

  return (
    <Card padding={false}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">
          Bijna verlopen <span className="text-orange-500 ml-1">({expiring.length})</span>
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {expiring.slice(0, 5).map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50"
          >
            <span className="text-sm font-medium text-gray-900">{p.name}</span>
            <span
              className={`text-sm font-medium ${
                p.daysLeft < 0
                  ? 'text-red-600'
                  : p.daysLeft <= 2
                    ? 'text-orange-600'
                    : 'text-amber-600'
              }`}
            >
              {formatExpiry(p.daysLeft)}
            </span>
          </Link>
        ))}
      </div>
      {expiring.length > 5 && (
        <div className="text-center text-sm text-gray-500 py-2 border-t border-gray-200">
          +{expiring.length - 5} meer
        </div>
      )}
    </Card>
  );
}
