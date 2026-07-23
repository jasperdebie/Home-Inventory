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
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function GroupManagerDialog({ open, groups, onClose, onCreate, onRename, onDelete }: Props) {
  const [newName, setNewName] = useState('');

  return (
    <Dialog open={open} onClose={onClose} title="Groepen beheren">
      <div className="space-y-4">
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center gap-2">
              <Input
                defaultValue={g.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== g.name) onRename(g.id, v);
                }}
              />
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => onDelete(g.id)}
                aria-label={`Groep ${g.name} verwijderen`}
              >
                🗑
              </Button>
            </li>
          ))}
          {groups.length === 0 && <li className="text-sm text-gray-500">Nog geen groepen.</li>}
        </ul>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            await onCreate(newName.trim());
            setNewName('');
          }}
          className="flex items-center gap-2 border-t border-gray-100 pt-4"
        >
          <Input
            placeholder="Nieuwe groep"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button type="submit" disabled={!newName.trim()}>
            +
          </Button>
        </form>

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Sluiten
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
