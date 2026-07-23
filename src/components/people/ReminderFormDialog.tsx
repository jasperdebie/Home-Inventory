'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { REMINDER_TYPES, type ReminderType } from '@/lib/people/shared';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    type: ReminderType;
    text: string;
    due_date: string | null;
    recurs_annually: boolean;
  }) => Promise<void>;
}

export function ReminderFormDialog({ open, onClose, onSubmit }: Props) {
  const [type, setType] = useState<ReminderType>('bring');
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurs, setRecurs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setType('bring');
    setText('');
    setDueDate('');
    setRecurs(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (type === 'event' && !dueDate) {
      setError('Een event heeft een datum nodig.');
      return;
    }
    setSaving(true);
    await onSubmit({
      type,
      text: text.trim(),
      due_date: dueDate || null,
      recurs_annually: type === 'event' ? recurs : false,
    });
    setSaving(false);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Nieuwe herinnering">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <div className="flex gap-2">
            {REMINDER_TYPES.map((rt) => (
              <button
                key={rt.type}
                type="button"
                onClick={() => setType(rt.type)}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                  type === rt.type
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                {rt.icon} {rt.label}
              </button>
            ))}
          </div>
        </div>

        <Input label="Details" value={text} onChange={(e) => setText(e.target.value)} autoFocus />

        <Input
          label={type === 'event' ? 'Datum' : 'Datum (optioneel)'}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          error={error || undefined}
        />

        {type === 'event' && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={recurs} onChange={(e) => setRecurs(e.target.checked)} />
            Elk jaar herhalen op dezelfde dag
          </label>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" loading={saving} disabled={!text.trim()}>
            Toevoegen
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
