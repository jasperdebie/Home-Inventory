'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { HouseholdFormDialog } from '@/components/people/HouseholdFormDialog';
import {
  formatAddress, hasAddress, mapsRouteUrl,
  type Household, type HouseholdInput, type Housemate,
} from '@/lib/people/shared';

interface Props {
  personName: string;
  household: Household | null;
  housemates: Housemate[];
  households: Household[];
  onSelect: (householdId: string | null) => void;
  onCreate: (input: HouseholdInput) => Promise<string | null>;
  onUpdate: (input: HouseholdInput) => Promise<string | null>;
  onDelete: () => Promise<string | null>;
}

export function HouseholdSection({
  personName, household, housemates, households, onSelect, onCreate, onUpdate, onDelete,
}: Props) {
  const [dialog, setDialog] = useState<'new' | 'edit' | null>(null);

  return (
    <div>
      <label htmlFor="household-select" className="mb-1 block text-sm font-medium text-gray-700">
        Huishouden
      </label>
      <div className="flex gap-2">
        <select
          id="household-select"
          value={household?.id ?? ''}
          onChange={(e) => onSelect(e.target.value || null)}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
        >
          <option value="">Geen huishouden</option>
          {households.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" size="sm" onClick={() => setDialog('new')}>
          + Nieuw huishouden
        </Button>
      </div>

      {household && (
        <div className="mt-3 space-y-2 rounded-lg border border-rose-100 bg-rose-50/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{household.name}</p>
              <p className="text-sm text-gray-600">{hasAddress(household) ? formatAddress(household) : 'Nog geen adres'}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDialog('edit')}>
              Bewerken
            </Button>
          </div>
          {hasAddress(household) && (
            <a
              href={mapsRouteUrl(household)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              🧭 Route
            </a>
          )}
          {housemates.length > 0 && (
            <p className="text-sm text-gray-600">
              Woont samen met:{' '}
              {housemates.map((m, i) => (
                <span key={m.id}>
                  {i > 0 && ', '}
                  <Link href={`/people/${m.id}`} className="text-rose-700 hover:underline">
                    {m.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      <HouseholdFormDialog
        open={dialog !== null}
        initial={dialog === 'edit' ? household : null}
        suggestedName={personName}
        onClose={() => setDialog(null)}
        onSubmit={dialog === 'edit' ? onUpdate : onCreate}
        onDelete={dialog === 'edit' ? onDelete : undefined}
      />
    </div>
  );
}
