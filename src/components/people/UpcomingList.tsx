'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { reminderDef, type UpcomingEntry } from '@/lib/people/shared';

export function relativeDayLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} dagen te laat`;
  if (days === 0) return 'Vandaag';
  if (days === 1) return 'Morgen';
  return `Over ${days} dagen`;
}

function entryIcon(entry: UpcomingEntry): string {
  if (entry.kind === 'birthday') return '🎂';
  return entry.reminderType ? reminderDef(entry.reminderType).icon : '📅';
}

export function UpcomingList({ entries }: { entries: UpcomingEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <p className="text-sm text-gray-500">Niks op de planning de komende weken.</p>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <ul className="divide-y divide-gray-100">
        {entries.map((e, i) => (
          <li key={`${e.personId}-${e.kind}-${e.label}-${i}`}>
            <Link
              href={`/people/${e.personId}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-xl">{entryIcon(e)}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-gray-900 truncate">{e.personName}</span>
                <span className="block text-sm text-gray-500 truncate">
                  {e.kind === 'birthday' ? 'Verjaardag' : e.label}
                </span>
              </span>
              <span
                className={`text-sm font-medium whitespace-nowrap ${
                  e.daysUntil < 0 ? 'text-red-600' : 'text-rose-600'
                }`}
              >
                {relativeDayLabel(e.daysUntil)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
