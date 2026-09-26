'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Household, HouseholdInput } from '@/lib/people/shared';

interface Props {
  open: boolean;
  initial: Household | null;
  suggestedName: string;
  onClose: () => void;
  onSubmit: (input: HouseholdInput) => Promise<string | null>;
  onDelete?: () => Promise<string | null>;
}

const EMPTY = { name: '', street: '', house_number: '', postal_code: '', city: '' };
type FormState = typeof EMPTY;

export function HouseholdFormDialog({ open, initial, suggestedName, onClose, onSubmit, onDelete }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? {
            name: initial.name,
            street: initial.street ?? '',
            house_number: initial.house_number ?? '',
            postal_code: initial.postal_code ?? '',
            city: initial.city ?? '',
          }
        : { ...EMPTY, name: suggestedName },
    );
    setError(null);
  }, [open, initial, suggestedName]);

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const finish = async (action: () => Promise<string | null>) => {
    setSaving(true);
    const err = await action();
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Naam is verplicht');
      return;
    }
    finish(() =>
      onSubmit({
        name: form.name.trim(),
        street: form.street.trim() || null,
        house_number: form.house_number.trim() || null,
        postal_code: form.postal_code.trim() || null,
        city: form.city.trim() || null,
      }),
    );
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (!window.confirm('Huishouden verwijderen? De bewoners blijven bestaan, maar hebben dan geen huishouden meer.')) return;
    finish(onDelete);
  };

  return (
    <Dialog open={open} onClose={onClose} title={initial ? 'Huishouden bewerken' : 'Nieuw huishouden'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Input label="Naam" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <Input label="Straat" value={form.street} onChange={(e) => set('street', e.target.value)} />
          <Input label="Nr." value={form.house_number} onChange={(e) => set('house_number', e.target.value)} />
        </div>
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          <Input
            label="Postcode"
            inputMode="numeric"
            value={form.postal_code}
            onChange={(e) => set('postal_code', e.target.value)}
          />
          <Input label="Gemeente" value={form.city} onChange={(e) => set('city', e.target.value)} />
        </div>
        {initial && <p className="text-xs text-gray-500">Wijzigingen gelden voor iedereen in dit huishouden.</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {initial && onDelete ? (
            <Button type="button" variant="danger" size="sm" disabled={saving} onClick={handleDelete}>
              Huishouden verwijderen
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" loading={saving}>
              {initial ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
