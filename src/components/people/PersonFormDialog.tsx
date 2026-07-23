'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { PersonGroup } from '@/lib/people/shared';

interface Props {
  open: boolean;
  groups: PersonGroup[];
  onClose: () => void;
  onSubmit: (name: string, groupId: string | null) => Promise<void>;
}

export function PersonFormDialog({ open, groups, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSubmit(name.trim(), groupId || null);
    setSaving(false);
    setName('');
    setGroupId('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Nieuwe persoon">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Naam" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Groep (optioneel)</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">Geen groep</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" loading={saving} disabled={!name.trim()}>
            Toevoegen
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
