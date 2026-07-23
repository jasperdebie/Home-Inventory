'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import {
  personNextDate,
  daysUntil,
  REMINDER_TYPES,
  type PersonSummary,
} from '@/lib/people/shared';
import { relativeDayLabel } from './UpcomingList';

export function PersonCard({ person, today }: { person: PersonSummary; today: Date }) {
  const next = personNextDate(person, today);
  const nextLabel = next ? relativeDayLabel(daysUntil(next, today)) : null;

  return (
    <Link
      href={`/people/${person.id}`}
      className="block bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-rose-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{person.name}</h3>
          {person.group_name && (
            <span className="text-xs text-gray-500">{person.group_name}</span>
          )}
        </div>
        {nextLabel && (
          <span className="text-xs font-medium text-rose-600 whitespace-nowrap">{nextLabel}</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REMINDER_TYPES.map((rt) =>
          person.open_counts[rt.type] > 0 ? (
            <Badge key={rt.type}>
              {rt.icon} {person.open_counts[rt.type]}
            </Badge>
          ) : null,
        )}
      </div>
    </Link>
  );
}
