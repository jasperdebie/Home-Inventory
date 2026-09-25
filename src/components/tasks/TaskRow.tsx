'use client';

import { useState } from 'react';
import Link from 'next/link';
import { categoryDef, describeSchedule, dueGroup, dueLabel, type Task } from '@/lib/tasks/shared';

interface Props {
  task: Task;
  today: string;
  busy: boolean;
  onDone: () => void;
  onSkip: () => void;
  onPostpone: () => void;
  onEdit: () => void;
}

export function TaskRow({ task, today, busy, onDone, onSkip, onPostpone, onEdit }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const overdue = dueGroup(task.next_due, today) === 'overdue';

  const pick = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <li className="relative flex items-center gap-3 px-4 py-3">
      <span className="text-2xl">{categoryDef(task.category).icon}</span>
      <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
        <span className="block truncate font-medium text-gray-900">{task.title}</span>
        <span className="block truncate text-sm text-gray-500">
          <span className={`font-medium ${overdue ? 'text-red-600' : 'text-teal-700'}`}>
            {dueLabel(task.next_due, today)}
          </span>
          {' · '}
          {describeSchedule(task)}
        </span>
      </Link>
      <button
        type="button"
        onClick={onDone}
        disabled={busy}
        className="whitespace-nowrap rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        ✓ Gedaan
      </button>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        disabled={busy}
        aria-label="Meer acties"
        className="rounded-full px-2 py-1 text-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
      >
        ⋯
      </button>
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Menu sluiten"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-4 top-12 z-20 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <button type="button" onClick={() => pick(onSkip)} className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">
              ⏭ Overslaan
            </button>
            <button type="button" onClick={() => pick(onPostpone)} className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">
              ⏰ Uitstellen
            </button>
            <button type="button" onClick={() => pick(onEdit)} className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">
              ✏️ Bewerken
            </button>
          </div>
        </>
      )}
    </li>
  );
}
