'use client';

import { useState } from 'react';
import { buildHistory, type Reminder, type GiftIdea } from '@/lib/people/shared';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function HistorySection({
  reminders,
  giftIdeas,
}: {
  reminders: Reminder[];
  giftIdeas: GiftIdea[];
}) {
  const [open, setOpen] = useState(false);
  const history = buildHistory(reminders, giftIdeas);
  if (history.length === 0) return null;

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="text-sm font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
      >
        {open ? '▾' : '▸'} Historiek ({history.length})
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {history.map((h) => (
            <li key={`${h.kind}-${h.id}`} className="flex items-center gap-2 text-sm text-gray-600">
              <span>{h.icon}</span>
              <span className="flex-1 min-w-0 truncate">{h.label}</span>
              <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(h.date)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
