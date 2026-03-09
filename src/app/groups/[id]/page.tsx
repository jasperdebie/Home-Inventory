'use client';

import { useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProductGroups } from '@/lib/hooks/useProductGroups';
import { useProducts } from '@/lib/hooks/useProducts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { getStockStatus } from '@/lib/constants';
import { getStockBadgeColor } from '@/lib/utils/stock';
import { formatStock } from '@/lib/utils/format';
import Link from 'next/link';

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { groups, loading: groupsLoading, updateGroup, deleteGroup } = useProductGroups();
  const { products, loading: productsLoading, updateProduct } = useProducts();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMinStock, setEditMinStock] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  const group = groups.find(g => g.id === id);
  const members = useMemo(() => products.filter(p => p.group_id === id), [products, id]);
  const availableProducts = useMemo(
    () => products.filter(p => !p.group_id && !p.is_archived),
    [products]
  );
  const totalStock = members.reduce((sum, p) => sum + p.current_stock, 0);

  if (groupsLoading || productsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!group) {
    router.push('/groups');
    return null;
  }

  const status = getStockStatus(totalStock, group.min_stock);

  const startEdit = () => {
    setEditName(group.name);
    setEditMinStock(String(group.min_stock));
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateGroup(id, {
        name: editName.trim(),
        min_stock: Number(editMinStock) || 1,
      });
      toast('Group updated');
      setEditing(false);
    } catch {
      toast('Failed to update', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteGroup(id);
      toast(`Deleted "${group.name}"`);
      router.push('/groups');
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const handleAddProduct = async (productId: string) => {
    try {
      await updateProduct(productId, { group_id: id });
      toast('Product added to group');
      setShowAddProduct(false);
    } catch {
      toast('Failed to add product', 'error');
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    try {
      await updateProduct(productId, { group_id: null });
      toast('Product removed from group');
    } catch {
      toast('Failed to remove product', 'error');
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Group Info */}
      <Card>
        {editing ? (
          <div className="space-y-3">
            <Input
              label="Group Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
            <Input
              label="Min Stock"
              type="number"
              min="0"
              step="1"
              value={editMinStock}
              onChange={(e) => setEditMinStock(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setEditing(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} className="flex-1">Save</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{group.name}</h2>
                <p className="text-sm text-gray-500">Min stock: {group.min_stock}</p>
              </div>
              <Badge className={getStockBadgeColor(status)}>
                {status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock'}
              </Badge>
            </div>
            <div className="text-center py-3">
              <span className="text-3xl font-bold text-gray-900">{formatStock(totalStock)}</span>
              <p className="text-sm text-gray-500">total stock across {members.length} product{members.length !== 1 ? 's' : ''}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={startEdit} className="w-full mt-2">
              Edit Group
            </Button>
          </>
        )}
      </Card>

      {/* Members */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Products</h3>
          <Button size="sm" onClick={() => setShowAddProduct(true)}>+ Add</Button>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">No products in this group yet.</p>
        ) : (
          <div>
            {members.map((product) => (
              <div key={product.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                <Link href={`/products/${product.id}`} className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    {product.category?.icon} {product.category?.name} · {formatStock(product.current_stock)} {product.unit}
                  </p>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => handleRemoveProduct(product.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.back()} className="flex-1">
          Back
        </Button>
        <Button variant="danger" onClick={() => setShowDelete(true)}>
          Delete Group
        </Button>
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onClose={() => setShowDelete(false)} title="Delete Group">
        <p className="text-sm text-gray-600 mb-4">
          Delete <strong>{group.name}</strong>? Products in this group will not be deleted, they will become ungrouped.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowDelete(false)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={handleDelete} className="flex-1">Delete</Button>
        </div>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onClose={() => setShowAddProduct(false)} title="Add Product to Group">
        {availableProducts.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">All products are already in a group.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto -mx-1">
            {availableProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleAddProduct(product.id)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <p className="font-medium text-gray-900">{product.name}</p>
                <p className="text-sm text-gray-500">
                  {product.category?.icon} {product.category?.name} · {formatStock(product.current_stock)} {product.unit}
                </p>
              </button>
            ))}
          </div>
        )}
        <Button variant="secondary" onClick={() => setShowAddProduct(false)} className="w-full mt-3">
          Close
        </Button>
      </Dialog>
    </div>
  );
}
