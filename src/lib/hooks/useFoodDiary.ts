'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Complaint,
  DayLog,
  FoodItem,
  ItemInput,
  LibraryItem,
  MealSlot,
  MEAL_SLOTS,
} from '@/lib/food-diary/shared';

// Re-export gedeelde types/constanten zodat bestaande imports blijven werken.
export { MEAL_SLOTS, toDateKey } from '@/lib/food-diary/shared';
export type {
  Complaint,
  DayLog,
  FoodItem,
  ItemInput,
  ItemType,
  LibraryItem,
  MealSlot,
  MealSlotDef,
} from '@/lib/food-diary/shared';

function emptyDay(date: string): DayLog {
  const meals = {} as Record<MealSlot, FoodItem[]>;
  const complaints = {} as Record<MealSlot, Complaint[]>;
  for (const { slot } of MEAL_SLOTS) {
    meals[slot] = [];
    complaints[slot] = [];
  }
  return { date, meals, complaints };
}

function dayHasItems(day: DayLog): boolean {
  return MEAL_SLOTS.some(({ slot }) => day.meals[slot].length > 0);
}

function dayHasAnyComplaint(day: DayLog): boolean {
  return MEAL_SLOTS.some(({ slot }) => day.complaints[slot].length > 0);
}

// ─── Hook ────────────────────────────────────────────────────────────────
// Alle data komt uit Supabase via de /api/food-diary routes. De hook houdt
// een client-side cache bij: geladen dagen, de bibliotheek en welke dagen
// eten/klachten hebben (voor het maandoverzicht).

export function useFoodDiary() {
  const [days, setDays] = useState<Record<string, DayLog>>({});
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [foodDates, setFoodDates] = useState<Set<string>>(new Set());
  const [complaintDates, setComplaintDates] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Voorkom dubbele fetches voor dezelfde dag.
  const inflightDays = useRef<Set<string>>(new Set());
  const loadedDays = useRef<Set<string>>(new Set());

  // ─── Laden ───────────────────────────────────────────────────────────

  const refetchLibrary = useCallback(async () => {
    try {
      const res = await fetch('/api/food-diary/library');
      if (res.ok) setLibrary(await res.json());
    } catch {
      /* offline / netwerkfout */
    }
  }, []);

  useEffect(() => {
    refetchLibrary().finally(() => setLoaded(true));
  }, [refetchLibrary]);

  const setDateFlag = useCallback(
    (dateKey: string, hasFood: boolean, hasComplaints: boolean) => {
      setFoodDates((prev) => {
        if (hasFood === prev.has(dateKey)) return prev;
        const next = new Set(prev);
        if (hasFood) next.add(dateKey);
        else next.delete(dateKey);
        return next;
      });
      setComplaintDates((prev) => {
        if (hasComplaints === prev.has(dateKey)) return prev;
        const next = new Set(prev);
        if (hasComplaints) next.add(dateKey);
        else next.delete(dateKey);
        return next;
      });
    },
    []
  );

  const refetchDay = useCallback(
    async (dateKey: string) => {
      try {
        const res = await fetch(`/api/food-diary?date=${dateKey}`);
        if (!res.ok) return;
        const day: DayLog = await res.json();
        setDays((prev) => ({ ...prev, [dateKey]: day }));
        loadedDays.current.add(dateKey);
        setDateFlag(dateKey, dayHasItems(day), dayHasAnyComplaint(day));
      } catch {
        /* netwerkfout */
      }
    },
    [setDateFlag]
  );

  /** Laad een dag als die nog niet in de cache zit. */
  const ensureDay = useCallback(
    (dateKey: string) => {
      if (loadedDays.current.has(dateKey) || inflightDays.current.has(dateKey)) return;
      inflightDays.current.add(dateKey);
      refetchDay(dateKey).finally(() => inflightDays.current.delete(dateKey));
    },
    [refetchDay]
  );

  /** Laad de samenvatting (welke dagen eten/klachten) voor een periode. */
  const ensureMonth = useCallback(async (from: string, to: string) => {
    try {
      const res = await fetch(`/api/food-diary?from=${from}&to=${to}`);
      if (!res.ok) return;
      const data: { foodDates: string[]; complaintDates: string[] } = await res.json();

      const outsideRange = (d: string) => d < from || d > to;
      setFoodDates((prev) => {
        const next = new Set([...prev].filter(outsideRange));
        for (const d of data.foodDates) next.add(d);
        return next;
      });
      setComplaintDates((prev) => {
        const next = new Set([...prev].filter(outsideRange));
        for (const d of data.complaintDates) next.add(d);
        return next;
      });
    } catch {
      /* netwerkfout */
    }
  }, []);

  // ─── Item-acties ───────────────────────────────────────────────────────

  const addItem = useCallback(
    async (dateKey: string, slot: MealSlot, input: ItemInput) => {
      const res = await fetch('/api/food-diary/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateKey, slot, ...input }),
      });
      if (!res.ok) return;
      await refetchDay(dateKey);
      if (input.saveToLibrary) await refetchLibrary();
    },
    [refetchDay, refetchLibrary]
  );

  const updateItem = useCallback(
    async (dateKey: string, _slot: MealSlot, itemId: string, input: ItemInput) => {
      const res = await fetch(`/api/food-diary/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) return;
      await refetchDay(dateKey);
      if (input.saveToLibrary) await refetchLibrary();
    },
    [refetchDay, refetchLibrary]
  );

  const removeItem = useCallback(
    async (dateKey: string, _slot: MealSlot, itemId: string) => {
      const res = await fetch(`/api/food-diary/items/${itemId}`, { method: 'DELETE' });
      if (!res.ok) return;
      await refetchDay(dateKey);
    },
    [refetchDay]
  );

  // ─── Klachten ──────────────────────────────────────────────────────────

  const addComplaint = useCallback(
    async (dateKey: string, slot: MealSlot, description: string) => {
      const res = await fetch('/api/food-diary/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateKey, slot, description }),
      });
      if (!res.ok) return;
      await refetchDay(dateKey);
    },
    [refetchDay]
  );

  const removeComplaint = useCallback(
    async (dateKey: string, _slot: MealSlot, complaintId: string) => {
      const res = await fetch(`/api/food-diary/complaints/${complaintId}`, { method: 'DELETE' });
      if (!res.ok) return;
      await refetchDay(dateKey);
    },
    [refetchDay]
  );

  // ─── Bibliotheek ─────────────────────────────────────────────────────────

  const removeLibraryItem = useCallback(async (id: string) => {
    const res = await fetch(`/api/food-diary/library/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    setLibrary((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // ─── Afgeleide info ──────────────────────────────────────────────────────

  const getDay = useCallback(
    (dateKey: string): DayLog => days[dateKey] ?? emptyDay(dateKey),
    [days]
  );

  const dayHasFood = useCallback((dateKey: string) => foodDates.has(dateKey), [foodDates]);
  const dayHasComplaints = useCallback(
    (dateKey: string) => complaintDates.has(dateKey),
    [complaintDates]
  );

  return {
    loaded,
    library,
    getDay,
    ensureDay,
    ensureMonth,
    addItem,
    updateItem,
    removeItem,
    addComplaint,
    removeComplaint,
    removeLibraryItem,
    dayHasFood,
    dayHasComplaints,
  };
}
