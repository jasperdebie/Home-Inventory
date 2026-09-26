'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Household, HouseholdInput, PersonSummary, PersonGroup } from '@/lib/people/shared';
import type { PersonRow } from '@/lib/supabase/types';

async function errorOf(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  return data && typeof data.error === 'string' ? data.error : 'Er ging iets mis';
}

export function usePeople() {
  const [people, setPeople] = useState<PersonSummary[]>([]);
  const [groups, setGroups] = useState<PersonGroup[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch('/api/people');
      if (!res.ok) return;
      const data: { groups: PersonGroup[]; households: Household[]; people: PersonSummary[] } = await res.json();
      setGroups(data.groups);
      setHouseholds(data.households);
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

  const createHousehold = useCallback(
    async (input: HouseholdInput): Promise<{ household: Household | null; error: string | null }> => {
      try {
        const res = await fetch('/api/people/households', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) return { household: null, error: await errorOf(res) };
        const household: Household = await res.json();
        await refetch();
        return { household, error: null };
      } catch {
        return { household: null, error: 'Geen verbinding met de server' };
      }
    },
    [refetch],
  );

  const updateHousehold = useCallback(
    async (id: string, input: HouseholdInput): Promise<string | null> => {
      try {
        const res = await fetch(`/api/people/households/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        const error = res.ok ? null : await errorOf(res);
        await refetch();
        return error;
      } catch {
        return 'Geen verbinding met de server';
      }
    },
    [refetch],
  );

  const deleteHousehold = useCallback(
    async (id: string): Promise<string | null> => {
      try {
        const res = await fetch(`/api/people/households/${id}`, { method: 'DELETE' });
        const error = res.ok ? null : await errorOf(res);
        await refetch();
        return error;
      } catch {
        return 'Geen verbinding met de server';
      }
    },
    [refetch],
  );

  return {
    loading, people, groups, households, refetch,
    createPerson, createGroup, renameGroup, deleteGroup,
    createHousehold, updateHousehold, deleteHousehold,
  };
}
