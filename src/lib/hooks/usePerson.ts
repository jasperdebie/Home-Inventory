'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Person, Reminder, GiftIdea, ReminderType, Household, Housemate } from '@/lib/people/shared';

interface ReminderInput {
  type: ReminderType;
  text: string;
  due_date?: string | null;
  recurs_annually?: boolean;
}

export function usePerson(id: string) {
  const [person, setPerson] = useState<Person | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [giftIdeas, setGiftIdeas] = useState<GiftIdea[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [housemates, setHousemates] = useState<Housemate[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/people/${id}`);
      if (!res.ok) return;
      const data: {
        person: Person;
        group_name: string | null;
        reminders: Reminder[];
        giftIdeas: GiftIdea[];
        household: Household | null;
        housemates: Housemate[];
      } = await res.json();
      setPerson(data.person);
      setGroupName(data.group_name);
      setReminders(data.reminders);
      setGiftIdeas(data.giftIdeas);
      setHousehold(data.household);
      setHousemates(data.housemates);
    } catch {
      /* netwerkfout */
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  const updatePerson = useCallback(
    async (
      patch: Partial<Pick<Person, 'name' | 'group_id' | 'household_id' | 'birthday' | 'birthday_has_year' | 'notes'>>,
    ): Promise<string | null> => {
      try {
        const res = await fetch(`/api/people/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const data = res.ok ? null : await res.json().catch(() => null);
        await refetch();
        if (res.ok) return null;
        return data && typeof data.error === 'string' ? data.error : 'Opslaan mislukt';
      } catch {
        return 'Geen verbinding met de server';
      }
    },
    [id, refetch],
  );

  const deletePerson = useCallback(async (): Promise<boolean> => {
    const res = await fetch(`/api/people/${id}`, { method: 'DELETE' });
    return res.ok;
  }, [id]);

  const addReminder = useCallback(
    async (input: ReminderInput) => {
      const res = await fetch(`/api/people/${id}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) await refetch();
    },
    [id, refetch],
  );

  const updateReminder = useCallback(
    async (rid: string, patch: Partial<Pick<Reminder, 'text' | 'due_date' | 'recurs_annually' | 'done'>>) => {
      const res = await fetch(`/api/people/reminders/${rid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) await refetch();
    },
    [refetch],
  );

  const deleteReminder = useCallback(
    async (rid: string) => {
      const res = await fetch(`/api/people/reminders/${rid}`, { method: 'DELETE' });
      if (res.ok) await refetch();
    },
    [refetch],
  );

  const addGiftIdea = useCallback(
    async (text: string) => {
      const res = await fetch(`/api/people/${id}/gift-ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) await refetch();
    },
    [id, refetch],
  );

  const updateGiftIdea = useCallback(
    async (gid: string, patch: Partial<Pick<GiftIdea, 'text' | 'given'>>) => {
      const res = await fetch(`/api/people/gift-ideas/${gid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) await refetch();
    },
    [refetch],
  );

  const deleteGiftIdea = useCallback(
    async (gid: string) => {
      const res = await fetch(`/api/people/gift-ideas/${gid}`, { method: 'DELETE' });
      if (res.ok) await refetch();
    },
    [refetch],
  );

  return {
    loading, person, groupName, reminders, giftIdeas, household, housemates, refetch,
    updatePerson, deletePerson,
    addReminder, updateReminder, deleteReminder,
    addGiftIdea, updateGiftIdea, deleteGiftIdea,
  };
}
