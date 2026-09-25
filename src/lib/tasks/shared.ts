// Gedeelde types en pure logica voor de module "Taken".
// Geen imports en geen 'use client': API-routes, hooks én node:test laden dit bestand.
// Datums zijn 'YYYY-MM-DD'-strings; rekenen gebeurt in UTC-dagen zodat zomertijd niet meespeelt.

export type TaskCategory = 'household' | 'maintenance' | 'appointment' | 'admin' | 'other';
export type ScheduleType = 'fixed' | 'interval';
export type ScheduleUnit = 'day' | 'week' | 'month' | 'year';
export type TaskEventKind = 'done' | 'skipped';
export type DueGroup = 'overdue' | 'today' | 'soon' | 'later';

export interface TaskCategoryDef {
  category: TaskCategory;
  label: string;
  icon: string;
}

export const TASK_CATEGORIES: TaskCategoryDef[] = [
  { category: 'household', label: 'Huishouden', icon: '🧹' },
  { category: 'maintenance', label: 'Onderhoud', icon: '🔧' },
  { category: 'appointment', label: 'Afspraken', icon: '📅' },
  { category: 'admin', label: 'Administratie', icon: '📄' },
  { category: 'other', label: 'Overig', icon: '📌' },
];

export function categoryDef(category: TaskCategory): TaskCategoryDef {
  return TASK_CATEGORIES.find((c) => c.category === category) ?? TASK_CATEGORIES[TASK_CATEGORIES.length - 1];
}

export const SCHEDULE_UNITS: ScheduleUnit[] = ['day', 'week', 'month', 'year'];

export const UNIT_LABELS: Record<ScheduleUnit, { one: string; many: string }> = {
  day: { one: 'dag', many: 'dagen' },
  week: { one: 'week', many: 'weken' },
  month: { one: 'maand', many: 'maanden' },
  year: { one: 'jaar', many: 'jaar' },
};

export const WEEKDAY_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
const WEEKDAY_NAMES = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const MONTH_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

export const DUE_GROUPS: { group: DueGroup; label: string }[] = [
  { group: 'overdue', label: 'Te laat' },
  { group: 'today', label: 'Vandaag' },
  { group: 'soon', label: 'Komende 7 dagen' },
  { group: 'later', label: 'Later' },
];

export interface TaskSchedule {
  schedule_type: ScheduleType;
  every_n: number;
  unit: ScheduleUnit;
  weekdays: number[] | null; // ISO: 1 = maandag … 7 = zondag
  month_day: number | null; // 1–31
  start_date: string;
}

export interface Task extends TaskSchedule {
  id: string;
  title: string;
  category: TaskCategory;
  notes: string | null;
  next_due: string;
  archived: boolean;
  created_at: string;
  last_done: string | null;
}

export interface TaskEvent {
  id: string;
  task_id: string;
  kind: TaskEventKind;
  event_date: string;
  due_date: string;
  created_at: string;
}

// ─── Datumhulpjes ────────────────────────────────────────────

const DAY_MS = 86400000;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parts(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y, m, d];
}

function toDays(key: string): number {
  const [y, m, d] = parts(key);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

function fromDays(days: number): string {
  const dt = new Date(days * DAY_MS);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return fromDays(toDays(value)) === value;
}

export function addDays(key: string, n: number): string {
  return fromDays(toDays(key) + n);
}

export function daysBetween(from: string, to: string): number {
  return toDays(to) - toDays(from);
}

export function maxKey(a: string, b: string): string {
  return a > b ? a : b;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonths(key: string, n: number): string {
  const [y, m, d] = parts(key);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${pad(nm)}-${pad(Math.min(d, daysInMonth(ny, nm)))}`;
}

export function addUnits(key: string, n: number, unit: ScheduleUnit): string {
  switch (unit) {
    case 'day':
      return addDays(key, n);
    case 'week':
      return addDays(key, 7 * n);
    case 'month':
      return addMonths(key, n);
    case 'year':
      return addMonths(key, 12 * n);
  }
}

export function isoWeekday(key: string): number {
  const dow = new Date(toDays(key) * DAY_MS).getUTCDay();
  return dow === 0 ? 7 : dow;
}

function mondayOf(key: string): number {
  return toDays(key) - (isoWeekday(key) - 1);
}

// ─── Schema ──────────────────────────────────────────────────

export function isOccurrence(s: TaskSchedule, key: string): boolean {
  if (key < s.start_date) return false;
  const [y, m, d] = parts(key);
  const [sy, sm, sd] = parts(s.start_date);
  switch (s.unit) {
    case 'day':
      return daysBetween(s.start_date, key) % s.every_n === 0;
    case 'week': {
      if (!s.weekdays?.includes(isoWeekday(key))) return false;
      const weeks = (mondayOf(key) - mondayOf(s.start_date)) / 7;
      return weeks % s.every_n === 0;
    }
    case 'month': {
      const target = Math.min(s.month_day ?? sd, daysInMonth(y, m));
      const months = y * 12 + m - (sy * 12 + sm);
      return d === target && months % s.every_n === 0;
    }
    case 'year': {
      const target = Math.min(sd, daysInMonth(y, sm));
      return m === sm && d === target && (y - sy) % s.every_n === 0;
    }
  }
}

/** Eerste schemadag op of na `from` (en niet vóór de startdatum). Enkel voor vaste schema's. */
export function firstOccurrence(s: TaskSchedule, from: string): string {
  let key = maxKey(from, s.start_date);
  const limit = 370 * s.every_n + 31;
  for (let i = 0; i <= limit; i++) {
    if (isOccurrence(s, key)) return key;
    key = addDays(key, 1);
  }
  throw new Error('Geen volgende datum gevonden voor dit schema');
}

export function nextOccurrence(s: TaskSchedule, after: string): string {
  return firstOccurrence(s, addDays(after, 1));
}

export function initialNextDue(s: TaskSchedule): string {
  return s.schedule_type === 'fixed' ? firstOccurrence(s, s.start_date) : s.start_date;
}

export function recomputeNextDue(s: TaskSchedule, today: string, lastDone: string | null): string {
  if (s.schedule_type === 'fixed') return firstOccurrence(s, maxKey(today, s.start_date));
  return lastDone ? addUnits(lastDone, s.every_n, s.unit) : s.start_date;
}

export function reactivatedNextDue(s: TaskSchedule, today: string, lastDone: string | null): string {
  return maxKey(today, recomputeNextDue(s, today, lastDone));
}

export function nextDueAfterEvent(s: TaskSchedule, kind: TaskEventKind, due: string, date: string): string {
  if (s.schedule_type === 'fixed') return nextOccurrence(s, maxKey(due, date));
  const base = kind === 'done' ? date : maxKey(due, date);
  return addUnits(base, s.every_n, s.unit);
}

/** De vervaldatum ná `due` als je de taak op `due` zelf zou afvinken (voor het live voorbeeld). */
export function followingDue(s: TaskSchedule, due: string): string {
  return s.schedule_type === 'fixed' ? nextOccurrence(s, due) : addUnits(due, s.every_n, s.unit);
}

export function postponeOptions(nextDue: string, today: string): { label: string; date: string }[] {
  const base = maxKey(nextDue, today);
  return [
    { label: '+1 dag', date: addDays(base, 1) },
    { label: '+3 dagen', date: addDays(base, 3) },
    { label: '+1 week', date: addDays(base, 7) },
  ];
}

// ─── Labels ──────────────────────────────────────────────────

function joinNl(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

export function describeSchedule(s: TaskSchedule): string {
  const n = s.every_n;
  if (s.schedule_type === 'interval') {
    const unit = UNIT_LABELS[s.unit];
    return `${n} ${n === 1 ? unit.one : unit.many} na de vorige keer`;
  }
  const [, sm, sd] = parts(s.start_date);
  switch (s.unit) {
    case 'day':
      return n === 1 ? 'elke dag' : `om de ${n} dagen`;
    case 'week': {
      const days = joinNl([...(s.weekdays ?? [])].sort((a, b) => a - b).map((w) => WEEKDAY_NAMES[w - 1]));
      return n === 1 ? `elke ${days}` : `om de ${n} weken op ${days}`;
    }
    case 'month': {
      const md = s.month_day ?? sd;
      return n === 1 ? `elke ${md}e van de maand` : `om de ${n} maanden op de ${md}e`;
    }
    case 'year': {
      const date = `${sd} ${MONTH_NAMES[sm - 1]}`;
      return n === 1 ? `elk jaar op ${date}` : `om de ${n} jaar op ${date}`;
    }
  }
}

export function dueGroup(nextDue: string, today: string): DueGroup {
  const diff = daysBetween(today, nextDue);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  if (diff <= 7) return 'soon';
  return 'later';
}

export function formatShortDate(key: string, today?: string): string {
  const [y, m, d] = parts(key);
  const base = `${WEEKDAY_SHORT[isoWeekday(key) - 1]} ${d} ${MONTH_SHORT[m - 1]}`;
  return today && parts(today)[0] !== y ? `${base} ${y}` : base;
}

export function formatLongDate(key: string): string {
  const [y, m, d] = parts(key);
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

export function dueLabel(nextDue: string, today: string): string {
  const diff = daysBetween(today, nextDue);
  if (diff < 0) return `${-diff} ${diff === -1 ? 'dag' : 'dagen'} te laat`;
  if (diff === 0) return 'Vandaag';
  if (diff === 1) return 'Morgen';
  return formatShortDate(nextDue, today);
}

export function compareTasks(a: Pick<Task, 'next_due' | 'title'>, b: Pick<Task, 'next_due' | 'title'>): number {
  if (a.next_due !== b.next_due) return a.next_due < b.next_due ? -1 : 1;
  return a.title.localeCompare(b.title);
}
