'use client';

import { Button } from '@/components/ui/Button';
import { formatLongDate, type TaskEvent } from '@/lib/tasks/shared';

interface Props {
  events: TaskEvent[];
  busy: boolean;
  onUndo: () => void;
}

export function TaskHistory({ events, busy, onUndo }: Props) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">Nog niets gedaan.</p>;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {events.map((e, i) => (
        <li key={e.id} className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm text-gray-800">
            {e.kind === 'done' ? '✓ Gedaan' : '⏭ Overgeslagen'} op {formatLongDate(e.event_date)}
          </span>
          {i === 0 && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={onUndo}>
              Ongedaan maken
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
