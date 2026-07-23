'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { usePeople } from '@/lib/hooks/usePeople';
import { buildUpcoming, comparePeopleByDate, type SortMode } from '@/lib/people/shared';
import { UpcomingList } from '@/components/people/UpcomingList';
import { PersonCard } from '@/components/people/PersonCard';
import { PersonFormDialog } from '@/components/people/PersonFormDialog';
import { GroupManagerDialog } from '@/components/people/GroupManagerDialog';

export default function PeoplePage() {
  const { loading, people, groups, createPerson, createGroup, renameGroup, deleteGroup } = usePeople();
  const [sort, setSort] = useState<SortMode>('name');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [personDialog, setPersonDialog] = useState(false);
  const [groupDialog, setGroupDialog] = useState(false);

  const today = useMemo(() => new Date(), []);
  const upcoming = useMemo(() => buildUpcoming(people, today), [people, today]);

  const visible = useMemo(() => {
    const filtered = groupFilter ? people.filter((p) => p.group_id === groupFilter) : people;
    const sorted = [...filtered];
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => comparePeopleByDate(a, b, today));
    return sorted;
  }, [people, groupFilter, sort, today]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 bg-rose-50/40">
      <div className="mx-auto w-full max-w-[780px] space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Terug" className="text-gray-400 hover:text-gray-600 text-xl">
              ←
            </Link>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-xl">
              🎁
            </span>
            <h1 className="text-2xl font-bold text-rose-900">Personen</h1>
          </div>
          <Button size="sm" onClick={() => setPersonDialog(true)}>
            + Persoon
          </Button>
        </header>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Binnenkort</h2>
          <UpcomingList entries={upcoming} />
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
              >
                <option value="name">Sorteer op naam</option>
                <option value="date">Sorteer op datum</option>
              </select>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
              >
                <option value="">Alle groepen</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setGroupDialog(true)}>
              Groepen
            </Button>
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">Nog geen personen. Voeg er een toe.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visible.map((p) => (
                <PersonCard key={p.id} person={p} today={today} />
              ))}
            </div>
          )}
        </section>
      </div>

      <PersonFormDialog
        open={personDialog}
        groups={groups}
        onClose={() => setPersonDialog(false)}
        onSubmit={async (name, groupId) => {
          await createPerson(name, groupId);
        }}
      />
      <GroupManagerDialog
        open={groupDialog}
        groups={groups}
        onClose={() => setGroupDialog(false)}
        onCreate={createGroup}
        onRename={renameGroup}
        onDelete={deleteGroup}
      />
    </div>
  );
}
