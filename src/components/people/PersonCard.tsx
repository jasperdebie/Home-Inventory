'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import {
  personNextDate,
  daysUntil,
  REMINDER_TYPES,
  missingInfo,
  type Household,
  type PersonSummary,
} from '@/lib/people/shared';
import { relativeDayLabel } from './UpcomingList';

export function PersonCard({
  person,
  household,
  today,
}: {
  person: PersonSummary;
  household: Household | null;
  today: Date;
}) {
  const next = personNextDate(person, today);
  const subtitle = [person.group_name, household?.name].filter(Boolean).join(' · ');
  const missing = missingInfo(person, household);
  const nextLabel = next ? relativeDayLabel(daysUntil(next, today)) : null;

  return (
    <Link
      href={`/people/${person.id}`}
      className="block bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-rose-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{person.name}</h3>
          {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
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
        {missing.map((m) => (
          <span
            key={m.key}
            title={m.label}
            aria-label={m.label}
            className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-400"
          >
            {m.icon} ?
          </span>
        ))}
      </div>
    </Link>
  );
}
