'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProductGroups } from '@/lib/hooks/useProductGroups';
import { useProducts } from '@/lib/hooks/useProducts';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getStockStatus } from '@/lib/constants';
import { getStockBadgeColor } from '@/lib/utils/stock';

export default function GroupsPage() {
  const { groups, loading, createGroup } = useProductGroups();
  const { products, loading: productsLoading } = useProducts();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMinStock, setNewMinStock] = useState('1');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createGroup({ name: newName.trim(), min_stock: Number(newMinStock) || 1 });
      toast(`Created group "${newName.trim()}"`);
      setNewName('');
      setNewMinStock('1');
      setShowCreate(false);
    } catch {
      toast('Failed to create group', 'error');
    }
    setSaving(false);
  };

  if (loading || productsLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Product Groups</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>+ New Group</Button>
      </div>

      {groups.length > 0 && (
        <Input
          placeholder="Search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🔗</p>
          <p className="text-gray-500 font-medium">No groups yet</p>
          <p className="text-gray-400 text-sm mt-1">Group similar products to combine their stock counting.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase())).map((group) => {
            const members = products.filter(p => p.group_id === group.id);
            const totalStock = members.reduce((sum, p) => sum + Number(p.current_stock), 0);
            const status = getStockStatus(totalStock, Number(group.min_stock));

            return (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="hover:border-blue-200 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{group.name}</h3>
                      <p className="text-sm text-gray-500">
                        {members.length} product{members.length !== 1 ? 's' : ''} · min {group.min_stock}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gray-900">{totalStock}</span>
                      <Badge className={getStockBadgeColor(status)}>
                        {status === 'out' ? 'Out' : status === 'low' ? 'Low' : 'OK'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="New Product Group">
        <form onSubmit={handleCreate} className="space-y-3">
          <Input
            label="Group Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Shampoo"
            autoFocus
            required
          />
          <Input
            label="Min Stock"
            type="number"
            min="0"
            step="1"
            value={newMinStock}
            onChange={(e) => setNewMinStock(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              Create
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
