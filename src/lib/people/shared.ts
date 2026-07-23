// Gedeelde types en pure logica voor de module "Personen & Herinneringen".
// Bewust géén 'use client': zowel API-routes (server) als hooks (client)
// importeren hieruit. Alle datumberekening is puur en in lokale tijd.

export type ReminderType = 'bring' | 'ask' | 'event';

export interface ReminderTypeDef {
  type: ReminderType;
  label: string;
  icon: string;
}

export const REMINDER_TYPES: ReminderTypeDef[] = [
  { type: 'bring', label: 'Meenemen', icon: '🎁' },
  { type: 'ask', label: 'Vragen', icon: '❓' },
  { type: 'event', label: 'Event', icon: '📅' },
];

export function reminderDef(type: ReminderType): ReminderTypeDef {
  return REMINDER_TYPES.find((r) => r.type === type) ?? REMINDER_TYPES[0];
}

export const UPCOMING_WINDOW_DAYS = 30;

export type SortMode = 'name' | 'date';

export interface PersonGroup {
  id: string;
  name: string;
  created_at: string;
}

export interface Reminder {
  id: string;
  person_id: string;
  type: ReminderType;
  text: string;
  due_date: string | null; // YYYY-MM-DD
  recurs_annually: boolean;
  done: boolean;
  done_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface GiftIdea {
  id: string;
  person_id: string;
  text: string;
  given: boolean;
  given_at: string | null;
  created_at: string;
}

export interface Person {
  id: string;
  name: string;
  group_id: string | null;
  birthday: string | null; // YYYY-MM-DD
  birthday_has_year: boolean;
  notes: string | null;
  created_at: string;
}

/** Datum-dragend item van één persoon, gebruikt voor sortering + "binnenkort". */
export interface RawDatedItem {
  kind: 'birthday' | 'reminder';
  reminderType?: ReminderType;
  label: string;
  date: string; // YYYY-MM-DD (ruwe opgeslagen datum)
  recurring: boolean;
}

/** Persoon zoals teruggegeven door GET /api/people (lijstweergave). */
export interface PersonSummary extends Person {
  group_name: string | null;
  open_counts: Record<ReminderType, number>;
  dated_items: RawDatedItem[];
}

export interface UpcomingEntry {
  personId: string;
  personName: string;
  kind: 'birthday' | 'reminder';
  reminderType?: ReminderType;
  label: string;
  date: string;
  nextDate: string;
  daysUntil: number;
  recurring: boolean;
}

export interface HistoryEntry {
  id: string;
  kind: 'reminder' | 'gift';
  icon: string;
  label: string;
  date: string; // ISO timestamp (done_at / given_at)
}

/** Formatteer een Date naar 'YYYY-MM-DD' (lokale tijd). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Eerstvolgende occurrence van een datum.
 * - recurring=false: de datum zelf (kan in het verleden liggen = achterstallig).
 * - recurring=true : dag+maand geprojecteerd op het eerstvolgende jaar >= vandaag.
 *   29 feb rolt in een niet-schrikkeljaar naar 1 maart (JS Date-gedrag).
 */
export function nextOccurrence(dateKey: string, recurring: boolean, today: Date): string {
  if (!recurring) return dateKey;
  const [, m, d] = dateKey.split('-').map(Number);
  const todayKey = toDateKey(today);
  let cand = new Date(today.getFullYear(), m - 1, d);
  if (toDateKey(cand) < todayKey) cand = new Date(today.getFullYear() + 1, m - 1, d);
  return toDateKey(cand);
}

/** Volgende jaarlijkse occurrence STRIKT na vandaag (voor doorrollen bij afvinken). */
export function rollForwardAnnual(dateKey: string, today: Date): string {
  const [, m, d] = dateKey.split('-').map(Number);
  const todayKey = toDateKey(today);
  let year = today.getFullYear();
  let cand = new Date(year, m - 1, d);
  while (toDateKey(cand) <= todayKey) {
    year += 1;
    cand = new Date(year, m - 1, d);
  }
  return toDateKey(cand);
}

/** Hele dagen tussen vandaag en dateKey (negatief = in het verleden). */
export function daysUntil(dateKey: string, today: Date): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - base.getTime()) / 86400000);
}

/** Kleinste eerstvolgende datum over alle datum-items van een persoon; null als geen. */
export function personNextDate(p: PersonSummary, today: Date): string | null {
  const dates = p.dated_items.map((it) => nextOccurrence(it.date, it.recurring, today));
  if (dates.length === 0) return null;
  dates.sort();
  return dates[0];
}

/** Comparator: op eerstvolgende datum oplopend; personen zonder datum achteraan. */
export function comparePeopleByDate(a: PersonSummary, b: PersonSummary, today: Date): number {
  const da = personNextDate(a, today);
  const db = personNextDate(b, today);
  if (da === null && db === null) return a.name.localeCompare(b.name);
  if (da === null) return 1;
  if (db === null) return -1;
  if (da === db) return a.name.localeCompare(b.name);
  return da < db ? -1 : 1;
}

/** "Binnenkort": alle datum-items binnen het venster (incl. overdue), oplopend. */
export function buildUpcoming(
  people: PersonSummary[],
  today: Date,
  windowDays: number = UPCOMING_WINDOW_DAYS,
): UpcomingEntry[] {
  const entries: UpcomingEntry[] = [];
  for (const p of people) {
    for (const it of p.dated_items) {
      const nextDate = nextOccurrence(it.date, it.recurring, today);
      const du = daysUntil(nextDate, today);
      if (du <= windowDays) {
        entries.push({
          personId: p.id,
          personName: p.name,
          kind: it.kind,
          reminderType: it.reminderType,
          label: it.label,
          date: it.date,
          nextDate,
          daysUntil: du,
          recurring: it.recurring,
        });
      }
    }
  }
  entries.sort((a, b) => a.daysUntil - b.daysUntil || a.personName.localeCompare(b.personName));
  return entries;
}

/** Huidige leeftijd in jaren op basis van geboortedatum (lokale tijd). */
export function currentAge(birthday: string, today: Date): number {
  const [y, m, d] = birthday.split('-').map(Number);
  let age = today.getFullYear() - y;
  const hadBirthdayThisYear =
    today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d);
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

/** Historiek: afgehandelde reminders + gegeven cadeau-ideeën, nieuwste eerst. */
export function buildHistory(reminders: Reminder[], giftIdeas: GiftIdea[]): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  for (const r of reminders) {
    if (r.done && r.done_at) {
      out.push({ id: r.id, kind: 'reminder', icon: reminderDef(r.type).icon, label: r.text, date: r.done_at });
    }
  }
  for (const g of giftIdeas) {
    if (g.given && g.given_at) {
      out.push({ id: g.id, kind: 'gift', icon: '🎁', label: g.text, date: g.given_at });
    }
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}
