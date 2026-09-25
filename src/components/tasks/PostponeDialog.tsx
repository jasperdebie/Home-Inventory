'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatShortDate, postponeOptions, todayKey, type Task } from '@/lib/tasks/shared';

interface Props {
  task: Task | null;
  onClose: () => void;
  onSubmit: (date: string) => Promise<string | null>;
}

export function PostponeDialog({ task, onClose, onSubmit }: Props) {
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCustom('');
    setError(null);
  }, [task]);

  if (!task) return null;
  const today = todayKey();

  const submit = async (date: string) => {
    setSaving(true);
    const err = await onSubmit(date);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Dialog open onClose={onClose} title={`Uitstellen: ${task.title}`}>
      <div className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid grid-cols-3 gap-2">
          {postponeOptions(task.next_due, today).map((o) => (
            <button
              key={o.label}
              type="button"
              disabled={saving}
              onClick={() => submit(o.date)}
              className="rounded-lg border border-gray-300 px-2 py-3 text-center hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="block font-medium text-gray-900">{o.label}</span>
              <span className="block text-xs text-gray-500">{formatShortDate(o.date, today)}</span>
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (custom) submit(custom);
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1">
            <Input
              label="Of kies een datum"
              type="date"
              min={today}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </div>
          <Button type="submit" loading={saving} disabled={!custom}>
            Uitstellen
          </Button>
        </form>
      </div>
    </Dialog>
  );
}
