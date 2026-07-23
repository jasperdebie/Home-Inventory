'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PersonSummary, PersonGroup } from '@/lib/people/shared';
import type { PersonRow } from '@/lib/supabase/types';

export function usePeople() {
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [groups, setGroups] = useState<PersonGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/people');
      if (!res.ok) return;
      const data: { groups: PersonGroup[]; people: PersonSummary[] } = await res.json();
      setGroups(data.groups);
      setPeople(data.people);
    } catch {
      /* netwerkfout */
    }
  }, []);

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  const createPerson = useCallback(
    async (name: string, groupId: string | null): Promise<PersonRow | null> => {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, group_id: groupId }),
      });
      if (!res.ok) return null;
      const person = await res.json();
      await refetch();
      return person;
    },
    [refetch],
  );

  const createGroup = useCallback(
    async (name: string) => {
      const res = await fetch('/api/people/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) await refetch();
    },
    [refetch],
  );

  const renameGroup = useCallback(
    async (id: string, name: string) => {
      const res = await fetch(`/api/people/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) await refetch();
    },
    [refetch],
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/people/groups/${id}`, { method: 'DELETE' });
      if (res.ok) await refetch();
    },
    [refetch],
  );

  return { loading, people, groups, refetch, createPerson, createGroup, renameGroup, deleteGroup };
}
