'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  REMINDER_TYPES,
  reminderDef,
  daysUntil,
  type Reminder,
} from '@/lib/people/shared';
import { relativeDayLabel } from './UpcomingList';

interface Props {
  reminders: Reminder[];
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

function DueLabel({ reminder, today }: { reminder: Reminder; today: Date }) {
  if (!reminder.due_date) return null;
  const days = daysUntil(reminder.due_date, today);
  return (
    <span className={`text-xs ${days < 0 ? 'text-red-600' : 'text-gray-500'}`}>
      {relativeDayLabel(days)}
      {reminder.type === 'event' && reminder.recurs_annually ? ' · jaarlijks' : ''}
    </span>
  );
}

export function ReminderSection({ reminders, onToggle, onDelete, onAdd }: Props) {
  const today = new Date();
  const [showDone, setShowDone] = useState(false);
  const open = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Herinneringen</h2>
        <Button size="sm" variant="secondary" onClick={onAdd}>
          + Herinnering
        </Button>
      </div>

      {REMINDER_TYPES.map((rt) => {
        const items = open.filter((r) => r.type === rt.type);
        if (items.length === 0) return null;
        return (
          <Card key={rt.type} padding={false}>
            <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-100">
              {rt.icon} {rt.label}
            </div>
            <ul className="divide-y divide-gray-100">
              {items.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onToggle(r.id, true)}
                    aria-label="Afvinken"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-gray-900">{r.text}</span>
                    <DueLabel reminder={r} today={today} />
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(r.id)}
                    className="text-gray-300 hover:text-red-500"
                    aria-label="Verwijderen"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      {open.length === 0 && (
        <p className="text-sm text-gray-500">Geen openstaande herinneringen.</p>
      )}

      {done.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowDone((s) => !s)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showDone ? '▾' : '▸'} Afgehandeld ({done.length})
          </button>
          {showDone && (
            <ul className="mt-2 space-y-1">
              {done.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-sm text-gray-400">
                  <input type="checkbox" checked readOnly onClick={() => onToggle(r.id, false)} />
                  <span className="line-through">
                    {reminderDef(r.type).icon} {r.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
