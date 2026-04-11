'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner';
import { useCategories } from '@/lib/hooks/useCategories';
import { useProductGroups } from '@/lib/hooks/useProductGroups';
import { useProducts } from '@/lib/hooks/useProducts';
import { useToast } from '@/components/ui/Toast';
import { UNITS } from '@/lib/constants';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

interface ProductFormProps {
  initialBarcode?: string;
  initialName?: string;
}

export function ProductForm({ initialBarcode, initialName }: ProductFormProps) {
  const router = useRouter();
  const { categories } = useCategories();
  const { groups } = useProductGroups();
  const { products, createProduct } = useProducts();
  const { toast } = useToast();

  const [name, setName] = useState(initialName || '');
  const [categoryId, setCategoryId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [barcode, setBarcode] = useState(initialBarcode || '');
  const [barcodeError, setBarcodeError] = useState('');
  const [minStock, setMinStock] = useState(initialBarcode ? '0' : '1');
  const [initialStock, setInitialStock] = useState(initialBarcode ? '1' : '0');
  const [notes, setNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isLowPrio, setIsLowPrio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBarcode(value);
    if (value.trim() && products.some(p => p.barcode === value.trim())) {
      setBarcodeError('This barcode is already in use by another product.');
    } else {
      setBarcodeError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const trimmedBarcode = barcode.trim() || null;
    if (trimmedBarcode && products.some(p => p.barcode === trimmedBarcode)) {
      setBarcodeError('This barcode is already in use by another product.');
      return;
    }

    setSaving(true);
    try {
      await createProduct({
        name: name.trim(),
        category_id: categoryId || null,
        group_id: groupId || null,
        unit,
        barcode: trimmedBarcode,
        min_stock: Number(minStock) >= 0 ? Number(minStock) : 0,
        notes: notes.trim() || null,
        expires_at: expiresAt || null,
        is_low_prio: isLowPrio,
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
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
        <div className="flex gap-2">
          <Input
            value={barcode}
            onChange={handleBarcodeChange}
            placeholder="Scan or type"
            error={barcodeError}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => setScannerOpen(!scannerOpen)}
            aria-label="Scan barcode"
            className="shrink-0 px-3"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2" />
              <path d="M17 3h2a2 2 0 0 1 2 2v2" />
              <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
              <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="7" y1="8" x2="17" y2="8" />
              <line x1="7" y1="16" x2="17" y2="16" />
            </svg>
          </Button>
        </div>
      </div>

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

      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">Product Group</label>
        <SearchableSelect
          value={groupId}
          onChange={setGroupId}
          options={groups.map(g => ({ value: g.id, label: `🔗 ${g.name}` }))}
          placeholder="Search groups..."
          emptyLabel="No group"
        />
      </div>

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

      {scannerOpen && (
        <div className="rounded-xl overflow-hidden">
          <BarcodeScanner
            onScan={(scanned) => {
              setBarcode(scanned);
              setScannerOpen(false);
              if (products.some(p => p.barcode === scanned)) {
                setBarcodeError('This barcode is already in use by another product.');
              } else {
                setBarcodeError('');
              }
            }}
            active={scannerOpen}
          />
        </div>
      )}

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
        label="Expires"
        type="date"
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.target.value)}
      />

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isLowPrio}
          onChange={(e) => setIsLowPrio(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm font-medium text-gray-700">Low priority</span>
      </label>

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
