'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCategories } from '@/lib/hooks/useCategories';
import { useProducts } from '@/lib/hooks/useProducts';
import { useToast } from '@/components/ui/Toast';
import { UNITS } from '@/lib/constants';

interface ProductFormProps {
  initialBarcode?: string;
  initialName?: string;
}

export function ProductForm({ initialBarcode, initialName }: ProductFormProps) {
  const router = useRouter();
  const { categories } = useCategories();
  const { createProduct } = useProducts();
  const { toast } = useToast();

  const [name, setName] = useState(initialName || '');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [barcode, setBarcode] = useState(initialBarcode || '');
  const [minStock, setMinStock] = useState('1');
  const [initialStock, setInitialStock] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await createProduct({
        name: name.trim(),
        category_id: categoryId || null,
        unit,
        barcode: barcode.trim() || null,
        min_stock: Number(minStock) || 1,
        notes: notes.trim() || null,
        initial_stock: Number(initialStock) || 0,
      });
      toast(`Added ${name.trim()}`);
      router.push('/products');
    } catch (err) {
      toast('Failed to add product', 'error');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Product Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g., Whole Milk"
        required
        autoFocus
      />

      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">No category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="w-full">
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <Input
          label="Barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Scan or type"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Min Stock"
          type="number"
          min="0"
          step="1"
          value={minStock}
          onChange={(e) => setMinStock(e.target.value)}
        />
        <Input
          label="Initial Stock"
          type="number"
          min="0"
          step="1"
          value={initialStock}
          onChange={(e) => setInitialStock(e.target.value)}
        />
      </div>

      <Input
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes"
      />

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" loading={saving} className="flex-1">
          Add Product
        </Button>
      </div>
    </form>
  );
}
