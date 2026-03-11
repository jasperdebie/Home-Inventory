'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ProductWithCategory, StockChange } from '@/lib/supabase/types';
import { useProducts } from '@/lib/hooks/useProducts';
import { useProductGroups } from '@/lib/hooks/useProductGroups';
import { useStockChanges } from '@/lib/hooks/useStockChanges';
import { useToast } from '@/components/ui/Toast';
import { StockAdjuster } from '@/components/products/StockAdjuster';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Dialog } from '@/components/ui/Dialog';
import { getStockStatus } from '@/lib/constants';
import { getStockBadgeColor } from '@/lib/utils/stock';
import { formatDate, formatStockChange } from '@/lib/utils/format';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { products, addStockChange, deleteProduct, updateProduct } = useProducts();
  const { groups } = useProductGroups();
  const { changes, loading: changesLoading } = useStockChanges(id);
  const { toast } = useToast();

  const [product, setProduct] = useState<ProductWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [editBarcode, setEditBarcode] = useState('');
  const [barcodeError, setBarcodeError] = useState('');

  useEffect(() => {
    const supabase = createClient();

    async function fetch() {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*), product_group:product_groups(*)')
        .eq('id', id)
        .single();

      if (error || !data) {
        router.push('/products');
        return;
      }
      setProduct(data);
      setLoading(false);
    }

    fetch();

    const channel = supabase
      .channel(`product-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products', filter: `id=eq.${id}` },
        () => fetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, router]);

  // Sync editBarcode when navigating to a different product (but not on stock updates)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (product) setEditBarcode(product.barcode ?? ''); }, [product?.id]);

  if (loading || !product) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const status = getStockStatus(product.current_stock, product.min_stock);

  const handleStockChange = async (quantity: number) => {
    const type = quantity > 0 ? 'add' : 'consume';
    try {
      await addStockChange(product.id, quantity, type);
      setProduct((prev) => prev ? { ...prev, current_stock: prev.current_stock + quantity } : prev);
      toast(formatStockChange(quantity, product.name, product.current_stock + quantity));
    } catch {
      toast('Failed to update stock', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct(product.id);
      toast(`Deleted ${product.name}`);
      router.push('/products');
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const handleBarcodeBlur = async () => {
    if (barcodeError) return;
    const trimmed = editBarcode.trim() || null;
    if (trimmed === (product.barcode ?? null)) return;
    try {
      await updateProduct(product.id, { barcode: trimmed });
      setProduct(prev => prev ? { ...prev, barcode: trimmed } : prev);
      toast(trimmed ? 'Barcode updated' : 'Barcode removed');
    } catch {
      toast('Failed to update barcode', 'error');
      setEditBarcode(product.barcode ?? '');
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
            {product.category && (
              <span className="text-sm text-gray-500">
                {product.category.icon} {product.category.name}
              </span>
            )}
            {product.product_group && (
              <Link href={`/groups/${product.product_group.id}`} className="text-sm text-blue-600 hover:underline block">
                🔗 {product.product_group.name}
              </Link>
            )}
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStockBadgeColor(status)}`}>
            {status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock'}
          </span>
        </div>

        <div className="flex justify-center py-4">
          <StockAdjuster
            currentStock={product.current_stock}
            onAdjust={handleStockChange}
            size="lg"
            unit={product.unit}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mt-4 pt-4 border-t">
          <div>
            <span className="text-gray-500">Min Stock:</span>
            <span className="ml-1 font-medium">{product.min_stock} {product.unit}</span>
          </div>
          <div className="col-span-2">
            <p className="text-gray-500 mb-1">Barcode</p>
            <input
              type="text"
              value={editBarcode}
              onChange={(e) => {
                const v = e.target.value;
                setEditBarcode(v);
                if (v.trim() && products.some(p => p.id !== product.id && p.barcode === v.trim())) {
                  setBarcodeError('Already in use by another product.');
                } else {
                  setBarcodeError('');
                }
              }}
              onBlur={handleBarcodeBlur}
              placeholder="Scan or type barcode"
              className={`w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                barcodeError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
              }`}
            />
            {barcodeError && <p className="mt-0.5 text-xs text-red-600">{barcodeError}</p>}
          </div>
          {product.notes && (
            <div className="col-span-2">
              <span className="text-gray-500">Notes:</span>
              <span className="ml-1">{product.notes}</span>
            </div>
          )}
          <div className="col-span-2">
            <span className="text-gray-500">Group:</span>
            <select
              value={product.group_id || ''}
              onChange={async (e) => {
                const newGroupId = e.target.value || null;
                try {
                  await updateProduct(product.id, { group_id: newGroupId });
                  setProduct(prev => {
                    if (!prev) return prev;
                    const pg = newGroupId ? (groups.find(g => g.id === newGroupId) ?? null) : null;
                    return { ...prev, group_id: newGroupId, product_group: pg } as ProductWithCategory;
                  });
                  toast(newGroupId ? 'Added to group' : 'Removed from group');
                } catch {
                  toast('Failed to update group', 'error');
                }
              }}
              className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>🔗 {g.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Stock History */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-3">Stock History</h3>
        {changesLoading ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : changes.length === 0 ? (
          <p className="text-sm text-gray-500">No stock changes yet.</p>
        ) : (
          <div className="space-y-2">
            {changes.map((change) => (
              <div key={change.id} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={change.quantity_change > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {change.quantity_change > 0 ? '+' : ''}{change.quantity_change}
                  </span>
                  <Badge variant="default">{change.change_type}</Badge>
                  {change.note && <span className="text-gray-500">{change.note}</span>}
                </div>
                <span className="text-gray-400 text-xs">{formatDate(change.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.back()} className="flex-1">
          Back
        </Button>
        <Button variant="danger" onClick={() => setShowDelete(true)}>
          Delete
        </Button>
      </div>

      <Dialog open={showDelete} onClose={() => setShowDelete(false)} title="Delete Product">
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete <strong>{product.name}</strong>? This will also delete all stock history.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowDelete(false)} className="flex-1">
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
