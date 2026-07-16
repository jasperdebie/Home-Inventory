'use client';

import { useCallback, useEffect, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────

export type MealSlot =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner'
  | 'evening_snack';

export type ItemType = 'food' | 'drink';

export interface MealSlotDef {
  slot: MealSlot;
  label: string;
  icon: string;
}

/** De zes vaste eetmomenten, in vaste volgorde. */
export const MEAL_SLOTS: MealSlotDef[] = [
  { slot: 'breakfast', label: 'Ontbijt', icon: '🌅' },
  { slot: 'morning_snack', label: 'Tussendoortjes voormiddag', icon: '🍎' },
  { slot: 'lunch', label: 'Middageten', icon: '🍽️' },
  { slot: 'afternoon_snack', label: 'Tussendoortjes namiddag', icon: '🍪' },
  { slot: 'dinner', label: 'Avondeten', icon: '🍲' },
  { slot: 'evening_snack', label: 'Tussendoortjes avond', icon: '🌙' },
];

export interface FoodItem {
  id: string;
  name: string;
  type: ItemType;
  comment?: string;
  ingredients?: string;
}

export interface Complaint {
  id: string;
  description: string;
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  meals: Record<MealSlot, FoodItem[]>;
  complaints: Record<MealSlot, Complaint[]>;
}

export interface LibraryItem {
  id: string;
  name: string;
  type: ItemType;
  comment?: string;
  ingredients?: string;
}

/** Invoer bij het loggen/bewerken van een item. */
export interface ItemInput {
  name: string;
  type: ItemType;
  comment?: string;
  ingredients?: string;
  saveToLibrary?: boolean;
}

// ─── Storage helpers ─────────────────────────────────────────────────────

const DAYS_KEY = 'eet-tracker:days';
const LIBRARY_KEY = 'eet-tracker:library';

function emptyMeals(): Record<MealSlot, FoodItem[]> {
  return {
    breakfast: [],
    morning_snack: [],
    lunch: [],
    afternoon_snack: [],
    dinner: [],
    evening_snack: [],
  };
}

function emptyComplaints(): Record<MealSlot, Complaint[]> {
  return {
    breakfast: [],
    morning_snack: [],
    lunch: [],
    afternoon_snack: [],
    dinner: [],
    evening_snack: [],
  };
}

function emptyDay(date: string): DayLog {
  return { date, meals: emptyMeals(), complaints: emptyComplaints() };
}

/** Normaliseer een geladen dag zodat alle slots zeker bestaan. */
function normalizeDay(date: string, raw: Partial<DayLog> | undefined): DayLog {
  const base = emptyDay(date);
  if (!raw) return base;
  for (const { slot } of MEAL_SLOTS) {
    base.meals[slot] = raw.meals?.[slot] ?? [];
    base.complaints[slot] = raw.complaints?.[slot] ?? [];
  }
  return base;
}

function readDays(): Record<string, DayLog> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(DAYS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, DayLog>) : {};
  } catch {
    return {};
  }
}

function readLibrary(): LibraryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    return raw ? (JSON.parse(raw) as LibraryItem[]) : [];
  } catch {
    return [];
  }
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Formatteer een Date naar 'YYYY-MM-DD' (lokale tijd). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Hook ────────────────────────────────────────────────────────────────

export function useFoodDiary() {
  const [days, setDays] = useState<Record<string, DayLog>>({});
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Eenmalig laden uit localStorage.
  useEffect(() => {
    setDays(readDays());
    setLibrary(readLibrary());
    setLoaded(true);
  }, []);

  // Persisteren bij wijziging.
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(DAYS_KEY, JSON.stringify(days));
    } catch {
      /* opslag vol of niet beschikbaar */
    }
  }, [days, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
    } catch {
      /* opslag vol of niet beschikbaar */
    }
  }, [library, loaded]);

  const getDay = useCallback(
    (dateKey: string): DayLog => normalizeDay(dateKey, days[dateKey]),
    [days]
  );

  // ─── Item-acties ───────────────────────────────────────────────────────

  const addItem = useCallback((dateKey: string, slot: MealSlot, input: ItemInput) => {
    const item: FoodItem = {
      id: makeId(),
      name: input.name.trim(),
      type: input.type,
      comment: input.comment?.trim() || undefined,
      ingredients: input.ingredients?.trim() || undefined,
    };

    setDays((prev) => {
      const day = normalizeDay(dateKey, prev[dateKey]);
      return {
        ...prev,
        [dateKey]: { ...day, meals: { ...day.meals, [slot]: [...day.meals[slot], item] } },
      };
    });

    if (input.saveToLibrary) {
      setLibrary((prev) => {
        const exists = prev.some(
          (l) => l.name.toLowerCase() === item.name.toLowerCase() && l.type === item.type
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            id: makeId(),
            name: item.name,
            type: item.type,
            comment: item.comment,
            ingredients: item.ingredients,
          },
        ];
      });
    }
  }, []);

  const updateItem = useCallback(
    (dateKey: string, slot: MealSlot, itemId: string, input: ItemInput) => {
      setDays((prev) => {
        const day = normalizeDay(dateKey, prev[dateKey]);
        const items = day.meals[slot].map((it) =>
          it.id === itemId
            ? {
                ...it,
                name: input.name.trim(),
                type: input.type,
                comment: input.comment?.trim() || undefined,
                ingredients: input.ingredients?.trim() || undefined,
              }
            : it
        );
        return { ...prev, [dateKey]: { ...day, meals: { ...day.meals, [slot]: items } } };
      });

      if (input.saveToLibrary) {
        setLibrary((prev) => {
          const name = input.name.trim();
          const exists = prev.some(
            (l) => l.name.toLowerCase() === name.toLowerCase() && l.type === input.type
          );
          if (exists) return prev;
          return [
            ...prev,
            {
              id: makeId(),
              name,
              type: input.type,
              comment: input.comment?.trim() || undefined,
              ingredients: input.ingredients?.trim() || undefined,
            },
          ];
        });
      }
    },
    []
  );

  const removeItem = useCallback((dateKey: string, slot: MealSlot, itemId: string) => {
    setDays((prev) => {
      const day = normalizeDay(dateKey, prev[dateKey]);
      return {
        ...prev,
        [dateKey]: {
          ...day,
          meals: { ...day.meals, [slot]: day.meals[slot].filter((it) => it.id !== itemId) },
        },
      };
    });
  }, []);

  // ─── Klachten ──────────────────────────────────────────────────────────

  const addComplaint = useCallback((dateKey: string, slot: MealSlot, description: string) => {
    const complaint: Complaint = { id: makeId(), description: description.trim() };
    setDays((prev) => {
      const day = normalizeDay(dateKey, prev[dateKey]);
      return {
        ...prev,
        [dateKey]: {
          ...day,
          complaints: { ...day.complaints, [slot]: [...day.complaints[slot], complaint] },
        },
      };
    });
  }, []);

  const removeComplaint = useCallback((dateKey: string, slot: MealSlot, complaintId: string) => {
    setDays((prev) => {
      const day = normalizeDay(dateKey, prev[dateKey]);
      return {
        ...prev,
        [dateKey]: {
          ...day,
          complaints: {
            ...day.complaints,
            [slot]: day.complaints[slot].filter((c) => c.id !== complaintId),
          },
        },
      };
    });
  }, []);

  // ─── Bibliotheek ─────────────────────────────────────────────────────────

  const removeLibraryItem = useCallback((id: string) => {
    setLibrary((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // ─── Afgeleide info ──────────────────────────────────────────────────────

  /** Heeft een dag minstens één gelogd item? */
  const dayHasFood = useCallback(
    (dateKey: string): boolean => {
      const day = days[dateKey];
      if (!day?.meals) return false;
      return MEAL_SLOTS.some(({ slot }) => (day.meals[slot]?.length ?? 0) > 0);
    },
    [days]
  );

  /** Heeft een dag minstens één klacht? */
  const dayHasComplaints = useCallback(
    (dateKey: string): boolean => {
      const day = days[dateKey];
      if (!day?.complaints) return false;
      return MEAL_SLOTS.some(({ slot }) => (day.complaints[slot]?.length ?? 0) > 0);
    },
    [days]
  );

  return {
    loaded,
    library,
    getDay,
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
