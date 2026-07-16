// Gedeelde types en constanten voor het eetdagboek.
// Bewust géén 'use client', zodat zowel API-routes (server) als de hook
// (client) hieruit kunnen importeren.

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

export const MEAL_SLOT_VALUES = MEAL_SLOTS.map((m) => m.slot);

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

/** Formatteer een Date naar 'YYYY-MM-DD' (lokale tijd). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
