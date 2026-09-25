# Taken (terugkerende taken) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een nieuwe module `/tasks` met terugkerende taken (vast schema of interval vanaf de laatste keer), afvinken, overslaan, uitstellen, ongedaan maken, historiek, categorieën en notities.

**Architecture:** Volgt de module "Personen". Alle datum- en schemalogica zit als pure functies in `src/lib/tasks/shared.ts`, invoervalidatie en patch-logica in `src/lib/tasks/validate.ts`; beide zijn unit-getest met `node:test`. API-routes onder `src/app/api/tasks` doen enkel databasewerk via `sql` uit `src/lib/db.ts` en roepen die pure functies aan. Client-hooks (`useTasks`, `useTask`) gebruiken een kleine `tasksApi` in `src/lib/tasks/client.ts`; pagina's en componenten gebruiken de bestaande UI-componenten.

**Tech Stack:** Next.js 16 (App Router, webpack), React 19, TypeScript 5, Postgres via `postgres` (porsager), Tailwind v4, Node 24 test runner (`node --test`, type-stripping).

**Spec:** `docs/superpowers/specs/2026-09-25-recurring-tasks-design.md`

## Global Constraints

- Alle UI-teksten en foutmeldingen in het **Nederlands**.
- Datums overal als `'YYYY-MM-DD'`-string. SQL-queries casten `DATE`-kolommen met `::text`.
- "Vandaag" komt altijd van de client (`today` / `date` in de request body), nooit van de server.
- `src/lib/tasks/shared.ts` en `src/lib/tasks/validate.ts` hebben **geen** `@/`-imports en geen React: `node --test` moet ze rechtstreeks kunnen laden. Onderlinge imports met expliciete extensie (`'./shared.ts'`). Enkel "erasable" TypeScript (geen `enum`, geen `namespace`).
- Migratie `supabase/migrations/026_tasks.sql`, open RLS-policies zoals `025_people.sql`. De gebruiker voert de migratie zelf uit op Postgres.
- Categorieën exact: `household` 🧹 Huishouden, `maintenance` 🔧 Onderhoud, `appointment` 📅 Afspraken, `admin` 📄 Administratie, `other` 📌 Overig.
- Weekdagen ISO: 1 = maandag … 7 = zondag.
- UI met bestaande componenten uit `src/components/ui` (`Card`, `Button`, `Input`, `Dialog`, `Spinner`, `useToast`), teal kleurtint.
- Geen nieuwe npm-dependencies.
- Tests: `npm test` (= `node --test 'src/**/*.test.ts'`). Type-check: `npx tsc --noEmit`.
- De dev-server moet met `WATCHPACK_POLLING=true` draaien (project staat op `/mnt/c`, bestandswijzigingen komen anders niet door).

## Review Focus

1. **Enkel de titel of notitie bewerken mag `next_due` niet verschuiven.** Een schema-wijziging herberekent; andere velden niet. → test in Task 2 (`applyTaskPatch` behoudt `next_due`).
2. **Uitstellen van een taak die al te laat is**: "+1 dag" moet morgen zijn, niet de dag na de oude (verlopen) datum. → test in Task 1 (`postponeOptions`).
3. **Onmogelijke datums en ongeldige id's**: `2026-02-30` wordt geweigerd; `/tasks/abc` geeft "niet gevonden", geen serverfout. → tests in Task 1 (`isDateKey`) en Task 2 (`isUuid`), 404-pad in Task 4.
4. **Maandelijks op de 31e en jaarlijks op 29 februari** slaan nooit een maand/jaar over en crashen niet. → tests in Task 1.
5. **Twee keer snel op "✓ Gedaan" tikken** registreert maar één keer. → knop is uitgeschakeld tijdens de actie; browsercheck in Task 7.

---

## File Structure

**Nieuw:**
- `src/lib/tasks/shared.ts` — types, categorieën, datumhulpjes, schemalogica, labels (server + client + tests).
- `src/lib/tasks/shared.test.ts` — unit-tests voor `shared.ts`.
- `src/lib/tasks/validate.ts` — `parseTaskInput`, `parseEventInput`, `applyTaskPatch`, `scheduleChanged`, `isUuid`.
- `src/lib/tasks/validate.test.ts` — unit-tests voor `validate.ts`.
- `supabase/migrations/026_tasks.sql` — tabellen `tasks`, `task_events`, indexes, RLS.
- `src/lib/tasks/queries.ts` — server-only SELECT-helpers (`findTasks`, `findTask`, `findEvents`, `weekdaysParam`).
- `src/app/api/tasks/route.ts` — GET lijst, POST nieuw.
- `src/app/api/tasks/[id]/route.ts` — GET detail, PATCH, DELETE.
- `src/app/api/tasks/[id]/complete/route.ts` — POST afvinken/overslaan.
- `src/app/api/tasks/[id]/undo/route.ts` — POST ongedaan maken.
- `src/lib/tasks/client.ts` — `tasksApi` (fetch-wrappers die een foutmelding of `null` teruggeven).
- `src/lib/hooks/useTasks.ts`, `src/lib/hooks/useTask.ts`.
- `src/components/tasks/TaskFormDialog.tsx`, `PostponeDialog.tsx`, `TaskRow.tsx`, `TaskHistory.tsx`.
- `src/app/tasks/page.tsx` — overzicht.
- `src/app/tasks/[id]/page.tsx` — detail.

**Wijzigen:**
- `src/app/page.tsx` — tegel "Taken".
- `src/components/layout/AppShell.tsx` — `/tasks` zonder standaard navigatie.

---

### Task 1: Pure datum- en schemalogica

**Files:**
- Create: `src/lib/tasks/shared.ts`
- Test: `src/lib/tasks/shared.test.ts`

**Interfaces:**
- Consumes: niets.
- Produces (gebruikt door alle latere taken):
  - types `TaskCategory`, `ScheduleType`, `ScheduleUnit`, `TaskEventKind`, `TaskSchedule`, `Task`, `TaskEvent`, `DueGroup`
  - `TASK_CATEGORIES`, `categoryDef(c)`, `SCHEDULE_UNITS`, `UNIT_LABELS`, `WEEKDAY_SHORT`, `DUE_GROUPS`
  - `toDateKey(d: Date)`, `todayKey()`, `isDateKey(v): v is string`, `addDays(k, n)`, `daysBetween(from, to)`, `addMonths(k, n)`, `addUnits(k, n, unit)`, `isoWeekday(k)`, `maxKey(a, b)`
  - `isOccurrence(s, k)`, `firstOccurrence(s, from)`, `nextOccurrence(s, after)`
  - `initialNextDue(s)`, `recomputeNextDue(s, today, lastDone)`, `reactivatedNextDue(s, today, lastDone)`, `nextDueAfterEvent(s, kind, due, date)`, `followingDue(s, due)`
  - `postponeOptions(nextDue, today): { label: string; date: string }[]`
  - `describeSchedule(s)`, `dueGroup(nextDue, today)`, `dueLabel(nextDue, today)`, `formatShortDate(k, today?)`, `formatLongDate(k)`, `compareTasks(a, b)`

Kalender-ankers voor de tests: 2026-09-24 is een donderdag, 2026-09-01 en 2026-09-29 zijn dinsdagen, 2026-09-28 is een maandag.

- [ ] **Step 1: Write the failing test**

Maak `src/lib/tasks/shared.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addMonths, addUnits, isDateKey, isoWeekday,
  firstOccurrence, nextOccurrence, initialNextDue, recomputeNextDue, reactivatedNextDue,
  nextDueAfterEvent, followingDue, postponeOptions,
  describeSchedule, dueGroup, dueLabel, formatLongDate, compareTasks,
  type TaskSchedule,
} from './shared.ts';

function sched(overrides: Partial<TaskSchedule>): TaskSchedule {
  return {
    schedule_type: 'fixed', every_n: 1, unit: 'week',
    weekdays: null, month_day: null, start_date: '2026-09-24',
    ...overrides,
  };
}

test('addMonths clampt naar de laatste dag van de maand', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2028-01-31', 1), '2028-02-29');
  assert.equal(addMonths('2026-11-15', 3), '2027-02-15');
});

test('addUnits voor week en jaar (29 feb → 28 feb)', () => {
  assert.equal(addUnits('2026-09-24', 2, 'week'), '2026-10-08');
  assert.equal(addUnits('2028-02-29', 1, 'year'), '2029-02-28');
});

test('isDateKey weigert onmogelijke of slecht geformatteerde datums', () => {
  assert.equal(isDateKey('2026-02-28'), true);
  assert.equal(isDateKey('2026-02-30'), false);
  assert.equal(isDateKey('26-1-1'), false);
  assert.equal(isDateKey(''), false);
  assert.equal(isDateKey(null), false);
});

test('isoWeekday: donderdag = 4, zondag = 7', () => {
  assert.equal(isoWeekday('2026-09-24'), 4);
  assert.equal(isoWeekday('2026-09-27'), 7);
});

test('vast: om de 3 dagen', () => {
  const s = sched({ unit: 'day', every_n: 3 });
  assert.equal(firstOccurrence(s, '2026-09-25'), '2026-09-27');
});

test('vast: meerdere weekdagen (ma + do)', () => {
  const s = sched({ weekdays: [1, 4] });
  assert.equal(initialNextDue(s), '2026-09-24');
  assert.equal(nextOccurrence(s, '2026-09-24'), '2026-09-28');
  assert.equal(nextOccurrence(s, '2026-09-28'), '2026-10-01');
});

test('vast: om de 2 weken op zaterdag', () => {
  const s = sched({ every_n: 2, weekdays: [6] });
  assert.equal(initialNextDue(s), '2026-09-26');
  assert.equal(nextOccurrence(s, '2026-09-26'), '2026-10-10');
});

test('vast: startdatum die zelf geen schemadag is', () => {
  const s = sched({ weekdays: [2] });
  assert.equal(initialNextDue(s), '2026-09-29');
});

test('vast: maandelijks op de 31e slaat geen maand over', () => {
  const s = sched({ unit: 'month', month_day: 31, start_date: '2026-01-31' });
  assert.equal(nextOccurrence(s, '2026-01-31'), '2026-02-28');
  assert.equal(nextOccurrence(s, '2026-02-28'), '2026-03-31');
  assert.equal(nextOccurrence(s, '2026-03-31'), '2026-04-30');
});

test('vast: om de 3 maanden op de 15e', () => {
  const s = sched({ unit: 'month', every_n: 3, month_day: 15 });
  assert.equal(initialNextDue(s), '2026-12-15');
});

test('vast: jaarlijks op 29 februari', () => {
  const s = sched({ unit: 'year', start_date: '2028-02-29' });
  assert.equal(nextOccurrence(s, '2028-02-29'), '2029-02-28');
  assert.equal(nextOccurrence(s, '2031-12-01'), '2032-02-29');
});

test('vast: weekschema zonder weekdagen gooit een fout', () => {
  assert.throws(() => firstOccurrence(sched({ weekdays: [] }), '2026-09-24'));
});

test('afvinken vast schema: te laat en te vroeg', () => {
  const vuilnis = sched({ weekdays: [2], start_date: '2026-09-01' });
  assert.equal(nextDueAfterEvent(vuilnis, 'done', '2026-09-22', '2026-09-24'), '2026-09-29');
  assert.equal(nextDueAfterEvent(vuilnis, 'done', '2026-09-29', '2026-09-28'), '2026-10-06');
});

test('afvinken interval: vanaf de dag dat het gedaan werd', () => {
  const badkamer = sched({ schedule_type: 'interval', unit: 'day', every_n: 7 });
  assert.equal(nextDueAfterEvent(badkamer, 'done', '2026-10-10', '2026-10-12'), '2026-10-19');
  assert.equal(nextDueAfterEvent(badkamer, 'done', '2026-10-10', '2026-10-08'), '2026-10-15');
});

test('overslaan: interval vanaf de laatste van vervaldatum en vandaag', () => {
  const s = sched({ schedule_type: 'interval', unit: 'day', every_n: 7 });
  assert.equal(nextDueAfterEvent(s, 'skipped', '2026-09-20', '2026-09-24'), '2026-10-01');
  assert.equal(nextDueAfterEvent(s, 'skipped', '2026-09-30', '2026-09-24'), '2026-10-07');
});

test('overslaan: vast schema zoals afvinken', () => {
  const vuilnis = sched({ weekdays: [2], start_date: '2026-09-01' });
  assert.equal(nextDueAfterEvent(vuilnis, 'skipped', '2026-09-22', '2026-09-24'), '2026-09-29');
});

test('recomputeNextDue na schemawijziging', () => {
  assert.equal(recomputeNextDue(sched({ weekdays: [2], start_date: '2026-09-01' }), '2026-09-24', null), '2026-09-29');
  const interval = sched({ schedule_type: 'interval', every_n: 2, start_date: '2026-08-01' });
  assert.equal(recomputeNextDue(interval, '2026-09-24', '2026-09-10'), '2026-09-24');
  assert.equal(recomputeNextDue(interval, '2026-09-24', null), '2026-08-01');
});

test('reactivatedNextDue is nooit vóór vandaag', () => {
  const s = sched({ schedule_type: 'interval', unit: 'month', start_date: '2025-12-01' });
  assert.equal(reactivatedNextDue(s, '2026-09-24', '2026-01-01'), '2026-09-24');
});

test('followingDue voor het live voorbeeld', () => {
  assert.equal(followingDue(sched({ weekdays: [2] }), '2026-09-29'), '2026-10-06');
  assert.equal(followingDue(sched({ schedule_type: 'interval', unit: 'month' }), '2026-01-31'), '2026-02-28');
});

test('postponeOptions vertrekt vanaf vandaag als de taak al te laat is', () => {
  assert.deepEqual(postponeOptions('2026-09-20', '2026-09-24'), [
    { label: '+1 dag', date: '2026-09-25' },
    { label: '+3 dagen', date: '2026-09-27' },
    { label: '+1 week', date: '2026-10-01' },
  ]);
  assert.deepEqual(postponeOptions('2026-09-30', '2026-09-24').map((o) => o.date), ['2026-10-01', '2026-10-03', '2026-10-07']);
});

test('describeSchedule in gewone taal', () => {
  assert.equal(describeSchedule(sched({ unit: 'day' })), 'elke dag');
  assert.equal(describeSchedule(sched({ unit: 'day', every_n: 3 })), 'om de 3 dagen');
  assert.equal(describeSchedule(sched({ weekdays: [2] })), 'elke dinsdag');
  assert.equal(describeSchedule(sched({ weekdays: [4, 1] })), 'elke maandag en donderdag');
  assert.equal(describeSchedule(sched({ every_n: 2, weekdays: [6] })), 'om de 2 weken op zaterdag');
  assert.equal(describeSchedule(sched({ unit: 'month', month_day: 1 })), 'elke 1e van de maand');
  assert.equal(describeSchedule(sched({ unit: 'month', every_n: 3, month_day: 15 })), 'om de 3 maanden op de 15e');
  assert.equal(describeSchedule(sched({ unit: 'year', start_date: '2026-03-12' })), 'elk jaar op 12 maart');
  assert.equal(describeSchedule(sched({ schedule_type: 'interval', every_n: 2 })), '2 weken na de vorige keer');
  assert.equal(describeSchedule(sched({ schedule_type: 'interval', unit: 'day' })), '1 dag na de vorige keer');
});

test('dueGroup en dueLabel', () => {
  const today = '2026-09-24';
  assert.equal(dueGroup('2026-09-21', today), 'overdue');
  assert.equal(dueLabel('2026-09-21', today), '3 dagen te laat');
  assert.equal(dueLabel('2026-09-23', today), '1 dag te laat');
  assert.equal(dueGroup(today, today), 'today');
  assert.equal(dueLabel(today, today), 'Vandaag');
  assert.equal(dueLabel('2026-09-25', today), 'Morgen');
  assert.equal(dueGroup('2026-10-01', today), 'soon');
  assert.equal(dueLabel('2026-10-01', today), 'do 1 okt');
  assert.equal(dueGroup('2026-10-02', today), 'later');
  assert.equal(dueLabel('2026-10-02', today), 'vr 2 okt');
  assert.equal(dueLabel('2027-01-05', today), 'di 5 jan 2027');
});

test('formatLongDate', () => {
  assert.equal(formatLongDate('2025-03-12'), '12 maart 2025');
});

test('compareTasks: op datum, dan op titel', () => {
  const list = [
    { next_due: '2026-09-25', title: 'B' },
    { next_due: '2026-09-24', title: 'Z' },
    { next_due: '2026-09-25', title: 'A' },
  ];
  assert.deepEqual([...list].sort(compareTasks).map((t) => t.title), ['Z', 'A', 'B']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/tasks/shared.test.ts`
Expected: FAIL met `Cannot find module '.../src/lib/tasks/shared.ts'`.

- [ ] **Step 3: Write minimal implementation**

Maak `src/lib/tasks/shared.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/tasks/shared.test.ts`
Expected: PASS, alle tests groen.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tasks/shared.ts src/lib/tasks/shared.test.ts
git commit -m "feat(tasks): gedeelde types en pure schemalogica met tests"
```

---

### Task 2: Invoervalidatie en patch-logica

**Files:**
- Create: `src/lib/tasks/validate.ts`
- Test: `src/lib/tasks/validate.test.ts`

**Interfaces:**
- Consumes: uit `./shared.ts`: `TASK_CATEGORIES`, `SCHEDULE_UNITS`, `isDateKey`, `recomputeNextDue`, `reactivatedNextDue`, types `Task`, `TaskSchedule`, `TaskCategory`, `ScheduleUnit`, `TaskEventKind`.
- Produces:
  - `interface TaskInput extends TaskSchedule { title: string; category: TaskCategory; notes: string | null }`
  - `type TaskPatch = Partial<TaskInput> & { next_due?: string; archived?: boolean }`
  - `type Result<T> = { ok: true; value: T } | { ok: false; error: string }`
  - `parseTaskInput(body: unknown): Result<TaskInput>`
  - `parseEventInput(body: unknown): Result<{ kind: TaskEventKind; date: string }>`
  - `scheduleChanged(a: TaskSchedule, b: TaskSchedule): boolean`
  - `applyTaskPatch(current: Task, body: unknown): Result<{ input: TaskInput; next_due: string; archived: boolean }>`
  - `isUuid(value: string): boolean`

- [ ] **Step 1: Write the failing test**

Maak `src/lib/tasks/validate.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyTaskPatch, isUuid, parseEventInput, parseTaskInput } from './validate.ts';
import type { Task } from './shared.ts';

const VALID = {
  title: '  Vuilnis buiten  ',
  category: 'household',
  notes: '',
  schedule_type: 'fixed',
  every_n: 1,
  unit: 'week',
  weekdays: [4, 2, 2],
  month_day: 15,
  start_date: '2026-09-01',
};

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: '5f0c6f5e-2b1a-4d7e-9c3b-1a2b3c4d5e6f',
    title: 'Vuilnis', category: 'household', notes: null,
    schedule_type: 'fixed', every_n: 1, unit: 'week', weekdays: [2], month_day: null,
    start_date: '2026-09-01', next_due: '2026-09-29', archived: false,
    created_at: '2026-09-01T10:00:00Z', last_done: '2026-09-22',
    ...overrides,
  };
}

test('parseTaskInput: trimt, ontdubbelt en sorteert weekdagen, zet overbodige velden op null', () => {
  const r = parseTaskInput(VALID);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.value.title, 'Vuilnis buiten');
  assert.deepEqual(r.value.weekdays, [2, 4]);
  assert.equal(r.value.month_day, null);
  assert.equal(r.value.notes, null);
});

test('parseTaskInput: weigert ongeldige invoer met Nederlandse melding', () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ ...VALID, title: '   ' }, 'Titel is verplicht'],
    [{ ...VALID, category: 'x' }, 'Ongeldige categorie'],
    [{ ...VALID, schedule_type: 'x' }, 'Kies een soort schema'],
    [{ ...VALID, unit: 'x' }, 'Ongeldige periode'],
    [{ ...VALID, every_n: 0 }, '"Elke" moet een geheel getal tussen 1 en 999 zijn'],
    [{ ...VALID, every_n: 1.5 }, '"Elke" moet een geheel getal tussen 1 en 999 zijn'],
    [{ ...VALID, start_date: '2026-02-30' }, 'Ongeldige startdatum'],
    [{ ...VALID, weekdays: [] }, 'Kies minstens één weekdag'],
    [{ ...VALID, weekdays: [0] }, 'Ongeldige weekdag'],
    [{ ...VALID, unit: 'month', month_day: 32 }, 'Dag van de maand moet tussen 1 en 31 liggen'],
  ];
  for (const [input, error] of cases) {
    assert.deepEqual(parseTaskInput(input), { ok: false, error });
  }
  assert.deepEqual(parseTaskInput(null), { ok: false, error: 'Ongeldige invoer' });
});

test('parseTaskInput: interval negeert weekdagen en dag van de maand', () => {
  const r = parseTaskInput({ ...VALID, schedule_type: 'interval', weekdays: [], month_day: 99 });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.weekdays, null);
    assert.equal(r.value.month_day, null);
  }
});

test('parseEventInput', () => {
  assert.deepEqual(parseEventInput({ kind: 'done', date: '2026-09-24' }), { ok: true, value: { kind: 'done', date: '2026-09-24' } });
  assert.deepEqual(parseEventInput({ kind: 'x', date: '2026-09-24' }), { ok: false, error: 'Ongeldige actie' });
  assert.deepEqual(parseEventInput({ kind: 'done', date: 'gisteren' }), { ok: false, error: 'Ongeldige datum' });
});

test('applyTaskPatch: enkel titel wijzigen laat next_due ongemoeid', () => {
  const r = applyTaskPatch(task(), { title: 'Restafval buiten' });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.input.title, 'Restafval buiten');
    assert.equal(r.value.next_due, '2026-09-29');
  }
});

test('applyTaskPatch: schemawijziging herberekent vanaf vandaag', () => {
  const r = applyTaskPatch(task(), { weekdays: [5], today: '2026-09-24' });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.next_due, '2026-09-25');
});

test('applyTaskPatch: schemawijziging zonder today wordt geweigerd', () => {
  assert.deepEqual(applyTaskPatch(task(), { weekdays: [5] }), { ok: false, error: 'Datum van vandaag ontbreekt' });
});

test('applyTaskPatch: uitstellen', () => {
  const ok = applyTaskPatch(task(), { next_due: '2026-10-01', today: '2026-09-24' });
  assert.equal(ok.ok && ok.value.next_due, '2026-10-01');
  assert.deepEqual(
    applyTaskPatch(task(), { next_due: '2026-09-23', today: '2026-09-24' }),
    { ok: false, error: 'Uitstellen kan enkel naar vandaag of later' },
  );
});

test('applyTaskPatch: weer activeren zet next_due op minstens vandaag', () => {
  const r = applyTaskPatch(
    task({ archived: true, schedule_type: 'interval', unit: 'month', weekdays: null, next_due: '2026-02-01', last_done: '2026-01-01' }),
    { archived: false, today: '2026-09-24' },
  );
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.archived, false);
    assert.equal(r.value.next_due, '2026-09-24');
  }
});

test('applyTaskPatch: archiveren moet een boolean zijn', () => {
  assert.deepEqual(applyTaskPatch(task(), { archived: 'ja' }), { ok: false, error: 'Ongeldige waarde voor gestopt' });
});

test('isUuid', () => {
  assert.equal(isUuid('5f0c6f5e-2b1a-4d7e-9c3b-1a2b3c4d5e6f'), true);
  assert.equal(isUuid('abc'), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/tasks/validate.test.ts`
Expected: FAIL met `Cannot find module '.../src/lib/tasks/validate.ts'`.

- [ ] **Step 3: Write minimal implementation**

Maak `src/lib/tasks/validate.ts`:

```ts
// Invoervalidatie en patch-logica voor de API van "Taken". Puur, zodat node:test het kan laden.
import {
  SCHEDULE_UNITS, TASK_CATEGORIES, isDateKey, reactivatedNextDue, recomputeNextDue,
  type ScheduleUnit, type Task, type TaskCategory, type TaskEventKind, type TaskSchedule,
} from './shared.ts';

export interface TaskInput extends TaskSchedule {
  title: string;
  category: TaskCategory;
  notes: string | null;
}

export type TaskPatch = Partial<TaskInput> & { next_due?: string; archived?: boolean };

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

const EDITABLE_FIELDS = [
  'title', 'category', 'notes', 'schedule_type', 'every_n', 'unit', 'weekdays', 'month_day', 'start_date',
] as const;

const SCHEDULE_FIELDS = ['schedule_type', 'every_n', 'unit', 'weekdays', 'month_day', 'start_date'] as const;

export function parseTaskInput(body: unknown): Result<TaskInput> {
  if (typeof body !== 'object' || body === null) return fail('Ongeldige invoer');
  const b = body as Record<string, unknown>;

  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title) return fail('Titel is verplicht');

  const category = b.category ?? 'household';
  if (!TASK_CATEGORIES.some((c) => c.category === category)) return fail('Ongeldige categorie');

  const scheduleType = b.schedule_type;
  if (scheduleType !== 'fixed' && scheduleType !== 'interval') return fail('Kies een soort schema');

  if (!SCHEDULE_UNITS.includes(b.unit as ScheduleUnit)) return fail('Ongeldige periode');
  const unit = b.unit as ScheduleUnit;

  const everyN = Number(b.every_n);
  if (!Number.isInteger(everyN) || everyN < 1 || everyN > 999) {
    return fail('"Elke" moet een geheel getal tussen 1 en 999 zijn');
  }

  if (!isDateKey(b.start_date)) return fail('Ongeldige startdatum');

  let weekdays: number[] | null = null;
  if (scheduleType === 'fixed' && unit === 'week') {
    if (!Array.isArray(b.weekdays) || b.weekdays.length === 0) return fail('Kies minstens één weekdag');
    if (!b.weekdays.every((w) => Number.isInteger(w) && w >= 1 && w <= 7)) return fail('Ongeldige weekdag');
    weekdays = [...new Set(b.weekdays as number[])].sort((x, y) => x - y);
  }

  let monthDay: number | null = null;
  if (scheduleType === 'fixed' && unit === 'month') {
    const md = Number(b.month_day);
    if (!Number.isInteger(md) || md < 1 || md > 31) return fail('Dag van de maand moet tussen 1 en 31 liggen');
    monthDay = md;
  }

  const notes = typeof b.notes === 'string' && b.notes.trim() ? b.notes.trim() : null;

  return {
    ok: true,
    value: {
      title,
      category: category as TaskCategory,
      notes,
      schedule_type: scheduleType,
      every_n: everyN,
      unit,
      weekdays,
      month_day: monthDay,
      start_date: b.start_date,
    },
  };
}

export function parseEventInput(body: unknown): Result<{ kind: TaskEventKind; date: string }> {
  if (typeof body !== 'object' || body === null) return fail('Ongeldige invoer');
  const b = body as Record<string, unknown>;
  if (b.kind !== 'done' && b.kind !== 'skipped') return fail('Ongeldige actie');
  if (!isDateKey(b.date)) return fail('Ongeldige datum');
  return { ok: true, value: { kind: b.kind, date: b.date } };
}

export function scheduleChanged(a: TaskSchedule, b: TaskSchedule): boolean {
  return SCHEDULE_FIELDS.some((f) => JSON.stringify(a[f]) !== JSON.stringify(b[f]));
}

export function applyTaskPatch(
  current: Task,
  body: unknown,
): Result<{ input: TaskInput; next_due: string; archived: boolean }> {
  if (typeof body !== 'object' || body === null) return fail('Ongeldige invoer');
  const b = body as Record<string, unknown>;

  const merged: Record<string, unknown> = { ...current };
  for (const field of EDITABLE_FIELDS) {
    if (field in b) merged[field] = b[field];
  }
  const parsed = parseTaskInput(merged);
  if (!parsed.ok) return parsed;
  const input = parsed.value;

  let archived = current.archived;
  if ('archived' in b) {
    if (typeof b.archived !== 'boolean') return fail('Ongeldige waarde voor gestopt');
    archived = b.archived;
  }

  const changed = scheduleChanged(current, input);
  const reactivated = current.archived && !archived;
  const postponed = 'next_due' in b;

  let today = '';
  if (changed || reactivated || postponed) {
    const t = b.today;
    if (!isDateKey(t)) return fail('Datum van vandaag ontbreekt');
    today = t;
  }

  let nextDue = current.next_due;
  if (changed) nextDue = recomputeNextDue(input, today, current.last_done);
  if (reactivated) nextDue = reactivatedNextDue(input, today, current.last_done);
  if (postponed) {
    const d = b.next_due;
    if (!isDateKey(d) || d < today) return fail('Uitstellen kan enkel naar vandaag of later');
    nextDue = d;
  }

  return { ok: true, value: { input, next_due: nextDue, archived } };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, ook de bestaande tests van `src/lib/people/shared.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tasks/validate.ts src/lib/tasks/validate.test.ts
git commit -m "feat(tasks): invoervalidatie en patch-logica met tests"
```

---

### Task 3: Migratie, queries en `/api/tasks`

**Files:**
- Create: `supabase/migrations/026_tasks.sql`
- Create: `src/lib/tasks/queries.ts`
- Create: `src/app/api/tasks/route.ts`

**Interfaces:**
- Consumes: `initialNextDue`, types `Task`, `TaskEvent` (Task 1); `parseTaskInput` (Task 2); `sql` uit `@/lib/db`.
- Produces:
  - `findTasks(archived: boolean): Promise<Task[]>`
  - `findTask(id: string): Promise<Task | null>`
  - `findEvents(taskId: string): Promise<TaskEvent[]>`
  - `weekdaysParam(weekdays: number[] | null)`: `sql.array(weekdays, 21)` of `null`, om in een `sql`-template in de kolom `weekdays` te zetten
  - `GET /api/tasks[?archived=1]` → `Task[]`; `POST /api/tasks` → `201 Task` of `400 { error }`

- [ ] **Step 1: Write the migration**

Maak `supabase/migrations/026_tasks.sql`:

```sql
-- ============================================================
-- 026_tasks.sql
-- Module "Taken": terugkerende taken met vast schema of interval,
-- plus historiek (afgevinkt / overgeslagen).
-- Open beleid: PIN-authenticatie wordt afgehandeld op app-niveau.
-- ============================================================

CREATE TABLE tasks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  category      TEXT        NOT NULL DEFAULT 'household'
                CHECK (category IN ('household', 'maintenance', 'appointment', 'admin', 'other')),
  notes         TEXT,
  schedule_type TEXT        NOT NULL CHECK (schedule_type IN ('fixed', 'interval')),
  every_n       INT         NOT NULL DEFAULT 1 CHECK (every_n >= 1),
  unit          TEXT        NOT NULL CHECK (unit IN ('day', 'week', 'month', 'year')),
  weekdays      SMALLINT[],
  month_day     SMALLINT    CHECK (month_day BETWEEN 1 AND 31),
  start_date    DATE        NOT NULL,
  next_due      DATE        NOT NULL,
  archived      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_events (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  kind       TEXT        NOT NULL CHECK (kind IN ('done', 'skipped')),
  event_date DATE        NOT NULL,
  due_date   DATE        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_next_due     ON tasks(next_due) WHERE archived = FALSE;
CREATE INDEX idx_task_events_task   ON task_events(task_id, created_at DESC);

ALTER TABLE tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on tasks"       ON tasks       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on task_events" ON task_events FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Write the query helpers**

Maak `src/lib/tasks/queries.ts`:

```ts
import { sql } from '@/lib/db';
import type { Task, TaskEvent } from '@/lib/tasks/shared';

function taskColumns() {
  return sql`
    t.id, t.title, t.category, t.notes, t.schedule_type, t.every_n, t.unit, t.weekdays, t.month_day,
    t.start_date::text AS start_date,
    t.next_due::text AS next_due,
    t.archived, t.created_at,
    (SELECT MAX(e.event_date)::text FROM task_events e WHERE e.task_id = t.id AND e.kind = 'done') AS last_done
  `;
}

export async function findTasks(archived: boolean): Promise<Task[]> {
  return sql<Task[]>`
    SELECT ${taskColumns()}
    FROM tasks t
    WHERE t.archived = ${archived}
    ORDER BY t.next_due ASC, t.title ASC
  `;
}

export async function findTask(id: string): Promise<Task | null> {
  const [task] = await sql<Task[]>`SELECT ${taskColumns()} FROM tasks t WHERE t.id = ${id}`;
  return task ?? null;
}

export async function findEvents(taskId: string): Promise<TaskEvent[]> {
  return sql<TaskEvent[]>`
    SELECT id, task_id, kind, event_date::text AS event_date, due_date::text AS due_date, created_at
    FROM task_events
    WHERE task_id = ${taskId}
    ORDER BY created_at DESC
  `;
}

// 21 = OID van smallint, zodat Postgres de array als SMALLINT[] ontvangt.
export function weekdaysParam(weekdays: number[] | null) {
  return weekdays ? sql.array(weekdays, 21) : null;
}
```

- [ ] **Step 3: Write the route**

Maak `src/app/api/tasks/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { initialNextDue } from '@/lib/tasks/shared';
import { parseTaskInput } from '@/lib/tasks/validate';
import { findTask, findTasks, weekdaysParam } from '@/lib/tasks/queries';

export async function GET(request: NextRequest) {
  const archived = request.nextUrl.searchParams.get('archived') === '1';
  try {
    return NextResponse.json(await findTasks(archived));
  } catch (error) {
    console.error('Tasks query failed', error);
    return NextResponse.json({ error: 'Taken laden mislukt' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const parsed = parseTaskInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const t = parsed.value;

  try {
    const [row] = await sql`
      INSERT INTO tasks (title, category, notes, schedule_type, every_n, unit, weekdays, month_day, start_date, next_due)
      VALUES (
        ${t.title}, ${t.category}, ${t.notes}, ${t.schedule_type}, ${t.every_n}, ${t.unit},
        ${weekdaysParam(t.weekdays)}, ${t.month_day}, ${t.start_date}, ${initialNextDue(t)}
      )
      RETURNING id
    `;
    return NextResponse.json(await findTask(row.id as string), { status: 201 });
  } catch (error) {
    console.error('Create task failed', error);
    return NextResponse.json({ error: 'Taak opslaan mislukt' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: geen fouten.

Controleer of de database bereikbaar is: `curl -s --cookie "home-inventory-auth=authenticated" http://localhost:3000/api/db-health`.
- Geeft dat `{"ok":true,...}` en is `026_tasks.sql` al uitgevoerd, test dan live:
  ```bash
  curl -s -X POST --cookie "home-inventory-auth=authenticated" -H 'Content-Type: application/json' \
    -d '{"title":"Test vuilnis","schedule_type":"fixed","every_n":1,"unit":"week","weekdays":[2],"start_date":"2026-09-01"}' \
    http://localhost:3000/api/tasks
  ```
  Expected: JSON met `"next_due":"2026-09-01"` en `"weekdays":[2]`. Verwijder de testtaak nadien via `DELETE /api/tasks/<id>` (Task 4) of in de database.
- Anders (database niet bereikbaar vanuit WSL): enkel `tsc`. De live-test gebeurt in Task 9 samen met de gebruiker.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/026_tasks.sql src/lib/tasks/queries.ts src/app/api/tasks/route.ts
git commit -m "feat(tasks): databasemigratie en API voor takenlijst"
```

---

### Task 4: API voor één taak, afvinken en ongedaan maken

**Files:**
- Create: `src/app/api/tasks/[id]/route.ts`
- Create: `src/app/api/tasks/[id]/complete/route.ts`
- Create: `src/app/api/tasks/[id]/undo/route.ts`

**Interfaces:**
- Consumes: `nextDueAfterEvent` (Task 1); `applyTaskPatch`, `parseEventInput`, `isUuid` (Task 2); `findTask`, `findEvents`, `weekdaysParam` (Task 3).
- Produces:
  - `GET /api/tasks/[id]` → `{ task: Task; events: TaskEvent[] }` of `404 { error: 'Taak niet gevonden' }`
  - `PATCH /api/tasks/[id]` body `TaskPatch & { today?: string }` → `Task` / `400` / `404`
  - `DELETE /api/tasks/[id]` → `{ ok: true }` / `404`
  - `POST /api/tasks/[id]/complete` body `{ kind, date }` → `Task` / `400` / `404`
  - `POST /api/tasks/[id]/undo` → `Task` / `400 { error: 'Er is niets om ongedaan te maken' }` / `404`

- [ ] **Step 1: Write the detail route**

Maak `src/app/api/tasks/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { applyTaskPatch, isUuid } from '@/lib/tasks/validate';
import { findEvents, findTask, weekdaysParam } from '@/lib/tasks/queries';

type Ctx = { params: Promise<{ id: string }> };

function notFound() {
  return NextResponse.json({ error: 'Taak niet gevonden' }, { status: 404 });
}

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  try {
    const task = await findTask(id);
    if (!task) return notFound();
    return NextResponse.json({ task, events: await findEvents(id) });
  } catch (error) {
    console.error('Task query failed', error);
    return NextResponse.json({ error: 'Taak laden mislukt' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await request.json().catch(() => null);

  try {
    const current = await findTask(id);
    if (!current) return notFound();

    const result = applyTaskPatch(current, body);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    const { input: t, next_due, archived } = result.value;

    await sql`
      UPDATE tasks SET
        title = ${t.title},
        category = ${t.category},
        notes = ${t.notes},
        schedule_type = ${t.schedule_type},
        every_n = ${t.every_n},
        unit = ${t.unit},
        weekdays = ${weekdaysParam(t.weekdays)},
        month_day = ${t.month_day},
        start_date = ${t.start_date},
        next_due = ${next_due},
        archived = ${archived}
      WHERE id = ${id}
    `;
    return NextResponse.json(await findTask(id));
  } catch (error) {
    console.error('Update task failed', error);
    return NextResponse.json({ error: 'Taak opslaan mislukt' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  try {
    const rows = await sql`DELETE FROM tasks WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) return notFound();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete task failed', error);
    return NextResponse.json({ error: 'Taak verwijderen mislukt' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Write the complete route**

Maak `src/app/api/tasks/[id]/complete/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { nextDueAfterEvent } from '@/lib/tasks/shared';
import { isUuid, parseEventInput } from '@/lib/tasks/validate';
import { findTask } from '@/lib/tasks/queries';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Taak niet gevonden' }, { status: 404 });

  const parsed = parseEventInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { kind, date } = parsed.value;

  try {
    const task = await findTask(id);
    if (!task) return NextResponse.json({ error: 'Taak niet gevonden' }, { status: 404 });
    if (task.archived) return NextResponse.json({ error: 'Deze taak is gestopt' }, { status: 400 });

    const nextDue = nextDueAfterEvent(task, kind, task.next_due, date);
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO task_events (task_id, kind, event_date, due_date)
        VALUES (${id}, ${kind}, ${date}, ${task.next_due})
      `;
      await tx`UPDATE tasks SET next_due = ${nextDue} WHERE id = ${id}`;
    });
    return NextResponse.json(await findTask(id));
  } catch (error) {
    console.error('Complete task failed', error);
    return NextResponse.json({ error: 'Afvinken mislukt' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Write the undo route**

Maak `src/app/api/tasks/[id]/undo/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isUuid } from '@/lib/tasks/validate';
import { findTask } from '@/lib/tasks/queries';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Taak niet gevonden' }, { status: 404 });

  try {
    const task = await findTask(id);
    if (!task) return NextResponse.json({ error: 'Taak niet gevonden' }, { status: 404 });

    const [last] = await sql`
      SELECT id, due_date::text AS due_date
      FROM task_events
      WHERE task_id = ${id}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (!last) return NextResponse.json({ error: 'Er is niets om ongedaan te maken' }, { status: 400 });

    await sql.begin(async (tx) => {
      await tx`DELETE FROM task_events WHERE id = ${last.id}`;
      await tx`UPDATE tasks SET next_due = ${last.due_date} WHERE id = ${id}`;
    });
    return NextResponse.json(await findTask(id));
  } catch (error) {
    console.error('Undo task event failed', error);
    return NextResponse.json({ error: 'Ongedaan maken mislukt' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: geen fouten.

Run: `curl -s -o /dev/null -w "%{http_code}\n" --cookie "home-inventory-auth=authenticated" http://localhost:3000/api/tasks/abc`
Expected: `404`. Dit werkt ook zonder database, want `isUuid` weigert het id vóór er een query gebeurt.

Is de database bereikbaar en de migratie uitgevoerd, test dan met de testtaak uit Task 3 (`<id>`): `complete` met `{"kind":"done","date":"2026-09-01"}` → `next_due` `2026-09-08`; daarna `undo` → `next_due` weer `2026-09-01`; daarna `DELETE` → `{"ok":true}`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/tasks/[id]"
git commit -m "feat(tasks): API voor detail, afvinken, overslaan en ongedaan maken"
```

---

### Task 5: Client-API en hooks

**Files:**
- Create: `src/lib/tasks/client.ts`
- Create: `src/lib/hooks/useTasks.ts`
- Create: `src/lib/hooks/useTask.ts`

**Interfaces:**
- Consumes: `todayKey`, types `Task`, `TaskEvent`, `TaskEventKind` (Task 1); types `TaskInput`, `TaskPatch` (Task 2); endpoints uit Task 3–4.
- Produces:
  - `tasksApi.create(input) / update(id, patch) / complete(id, kind) / undo(id) / remove(id)`: elk `Promise<string | null>` (foutmelding of `null` bij succes). `update` en `complete` voegen `today`/`date` = `todayKey()` toe.
  - `useTasks(archived = false)` → `{ tasks, loading, refetch, createTask(input), updateTask(id, patch), completeTask(id, kind) }`, acties geven `Promise<string | null>`.
  - `useTask(id)` → `{ task, events, loading, notFound, refetch, updateTask(patch), completeTask(kind), undo(), deleteTask() }`, acties geven `Promise<string | null>`.

- [ ] **Step 1: Write the client API**

Maak `src/lib/tasks/client.ts`:

```ts
import { todayKey, type TaskEventKind } from '@/lib/tasks/shared';
import type { TaskInput, TaskPatch } from '@/lib/tasks/validate';

async function send(url: string, method: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data && typeof data.error === 'string' ? data.error : 'Er ging iets mis';
  } catch {
    return 'Geen verbinding met de server';
  }
}

export const tasksApi = {
  create: (input: TaskInput) => send('/api/tasks', 'POST', input),
  update: (id: string, patch: TaskPatch) => send(`/api/tasks/${id}`, 'PATCH', { ...patch, today: todayKey() }),
  complete: (id: string, kind: TaskEventKind) =>
    send(`/api/tasks/${id}/complete`, 'POST', { kind, date: todayKey() }),
  undo: (id: string) => send(`/api/tasks/${id}/undo`, 'POST'),
  remove: (id: string) => send(`/api/tasks/${id}`, 'DELETE'),
};
```

- [ ] **Step 2: Write `useTasks`**

Maak `src/lib/hooks/useTasks.ts`:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Task, TaskEventKind } from '@/lib/tasks/shared';
import type { TaskInput, TaskPatch } from '@/lib/tasks/validate';
import { tasksApi } from '@/lib/tasks/client';

export function useTasks(archived = false) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(archived ? '/api/tasks?archived=1' : '/api/tasks');
      if (res.ok) setTasks(await res.json());
    } catch {
      /* netwerkfout */
    }
  }, [archived]);

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  const run = useCallback(
    async (action: Promise<string | null>) => {
      const error = await action;
      await refetch();
      return error;
    },
    [refetch],
  );

  const createTask = useCallback((input: TaskInput) => run(tasksApi.create(input)), [run]);
  const updateTask = useCallback((id: string, patch: TaskPatch) => run(tasksApi.update(id, patch)), [run]);
  const completeTask = useCallback((id: string, kind: TaskEventKind) => run(tasksApi.complete(id, kind)), [run]);

  return { tasks, loading, refetch, createTask, updateTask, completeTask };
}
```

- [ ] **Step 3: Write `useTask`**

Maak `src/lib/hooks/useTask.ts`:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Task, TaskEvent, TaskEventKind } from '@/lib/tasks/shared';
import type { TaskPatch } from '@/lib/tasks/validate';
import { tasksApi } from '@/lib/tasks/client';

export function useTask(id: string) {
  const [task, setTask] = useState<Task | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return;
      const data: { task: Task; events: TaskEvent[] } = await res.json();
      setTask(data.task);
      setEvents(data.events);
    } catch {
      /* netwerkfout */
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  const run = useCallback(
    async (action: Promise<string | null>) => {
      const error = await action;
      await refetch();
      return error;
    },
    [refetch],
  );

  const updateTask = useCallback((patch: TaskPatch) => run(tasksApi.update(id, patch)), [id, run]);
  const completeTask = useCallback((kind: TaskEventKind) => run(tasksApi.complete(id, kind)), [id, run]);
  const undo = useCallback(() => run(tasksApi.undo(id)), [id, run]);
  const deleteTask = useCallback(() => tasksApi.remove(id), [id]);

  return { task, events, loading, notFound, refetch, updateTask, completeTask, undo, deleteTask };
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: geen fouten.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tasks/client.ts src/lib/hooks/useTasks.ts src/lib/hooks/useTask.ts
git commit -m "feat(tasks): client-API en hooks useTasks en useTask"
```

---

### Task 6: Formulier en uitsteldialoog

**Files:**
- Create: `src/components/tasks/TaskFormDialog.tsx`
- Create: `src/components/tasks/PostponeDialog.tsx`

**Interfaces:**
- Consumes: uit Task 1: `TASK_CATEGORIES`, `SCHEDULE_UNITS`, `UNIT_LABELS`, `WEEKDAY_SHORT`, `followingDue`, `formatShortDate`, `initialNextDue`, `isoWeekday`, `recomputeNextDue`, `postponeOptions`, `todayKey`, types. Uit Task 2: `parseTaskInput`, `scheduleChanged`, `TaskInput`.
- Produces:
  - `<TaskFormDialog open initial={Task | null} onClose onSubmit={(input: TaskInput) => Promise<string | null>} />`: sluit enkel bij succes, toont anders de foutmelding bovenaan.
  - `<PostponeDialog task={Task | null} onClose onSubmit={(date: string) => Promise<string | null>} />`: open zodra `task` niet `null` is.

- [ ] **Step 1: Write the form**

Maak `src/components/tasks/TaskFormDialog.tsx`:

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  SCHEDULE_UNITS, TASK_CATEGORIES, UNIT_LABELS, WEEKDAY_SHORT,
  followingDue, formatShortDate, initialNextDue, isoWeekday, recomputeNextDue, todayKey,
  type ScheduleType, type ScheduleUnit, type Task, type TaskCategory,
} from '@/lib/tasks/shared';
import { parseTaskInput, scheduleChanged, type TaskInput } from '@/lib/tasks/validate';

interface Props {
  open: boolean;
  initial: Task | null;
  onClose: () => void;
  onSubmit: (input: TaskInput) => Promise<string | null>;
}

interface FormState {
  title: string;
  category: TaskCategory;
  notes: string;
  schedule_type: ScheduleType;
  every_n: string;
  unit: ScheduleUnit;
  weekdays: number[];
  month_day: string;
  start_date: string;
}

function emptyForm(): FormState {
  const today = todayKey();
  return {
    title: '', category: 'household', notes: '',
    schedule_type: 'fixed', every_n: '1', unit: 'week',
    weekdays: [isoWeekday(today)], month_day: String(Number(today.slice(8))), start_date: today,
  };
}

function formFromTask(t: Task): FormState {
  return {
    title: t.title, category: t.category, notes: t.notes ?? '',
    schedule_type: t.schedule_type, every_n: String(t.every_n), unit: t.unit,
    weekdays: t.weekdays ?? [isoWeekday(t.start_date)],
    month_day: String(t.month_day ?? Number(t.start_date.slice(8))),
    start_date: t.start_date,
  };
}

function previewDates(initial: Task | null, input: TaskInput): [string, string] | null {
  try {
    const first = !initial
      ? initialNextDue(input)
      : scheduleChanged(initial, input)
        ? recomputeNextDue(input, todayKey(), initial.last_done)
        : initial.next_due;
    return [first, followingDue(input, first)];
  } catch {
    return null;
  }
}

const FIELD_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500';

export function TaskFormDialog({ open, initial, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initial ? formFromTask(initial) : emptyForm());
    setError(null);
  }, [open, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const parsed = useMemo(
    () => parseTaskInput({ ...form, every_n: Number(form.every_n), month_day: Number(form.month_day) }),
    [form],
  );
  const dates = parsed.ok ? previewDates(initial, parsed.value) : null;
  const today = todayKey();

  const toggleWeekday = (w: number) =>
    set('weekdays', form.weekdays.includes(w) ? form.weekdays.filter((x) => x !== w) : [...form.weekdays, w]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    const err = await onSubmit(parsed.value);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  };

  const n = Number(form.every_n);
  const fixedWeek = form.schedule_type === 'fixed' && form.unit === 'week';
  const fixedMonth = form.schedule_type === 'fixed' && form.unit === 'month';

  return (
    <Dialog open={open} onClose={onClose} title={initial ? 'Taak bewerken' : 'Nieuwe taak'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <Input label="Titel" value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Categorie</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value as TaskCategory)}
            className={FIELD_CLASS}
          >
            {TASK_CATEGORIES.map((c) => (
              <option key={c.category} value={c.category}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
          {(['fixed', 'interval'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => set('schedule_type', type)}
              aria-pressed={form.schedule_type === type}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                form.schedule_type === type ? 'bg-white text-teal-800 shadow-sm' : 'text-gray-600'
              }`}
            >
              {type === 'fixed' ? 'Vast schema' : 'Vanaf laatst gedaan'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Elke</span>
          <input
            type="number"
            min={1}
            max={999}
            value={form.every_n}
            onChange={(e) => set('every_n', e.target.value)}
            aria-label="Aantal"
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
          <select
            value={form.unit}
            onChange={(e) => set('unit', e.target.value as ScheduleUnit)}
            aria-label="Periode"
            className={FIELD_CLASS}
          >
            {SCHEDULE_UNITS.map((u) => (
              <option key={u} value={u}>
                {n === 1 ? UNIT_LABELS[u].one : UNIT_LABELS[u].many}
              </option>
            ))}
          </select>
        </div>

        {fixedWeek && (
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_SHORT.map((label, i) => {
              const w = i + 1;
              const on = form.weekdays.includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => toggleWeekday(w)}
                  aria-pressed={on}
                  className={`h-10 w-10 rounded-full text-sm font-medium ${
                    on ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {fixedMonth && (
          <Input
            label="Dag van de maand"
            type="number"
            min={1}
            max={31}
            value={form.month_day}
            onChange={(e) => set('month_day', e.target.value)}
          />
        )}

        <Input
          label="Startdatum"
          type="date"
          value={form.start_date}
          onChange={(e) => set('start_date', e.target.value)}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Notitie (optioneel)</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            className={FIELD_CLASS}
          />
        </div>

        {dates && (
          <p className="text-sm text-teal-800">
            Volgende keer: {formatShortDate(dates[0], today)}, daarna {formatShortDate(dates[1], today)}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Opslaan' : 'Toevoegen'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write the postpone dialog**

Maak `src/components/tasks/PostponeDialog.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { formatShortDate, postponeOptions, todayKey, type Task } from '@/lib/tasks/shared';

interface Props {
  task: Task | null;
  onClose: () => void;
  onSubmit: (date: string) => Promise<string | null>;
}

export function PostponeDialog({ task, onClose, onSubmit }: Props) {
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCustom('');
    setError(null);
  }, [task]);

  if (!task) return null;
  const today = todayKey();

  const submit = async (date: string) => {
    setSaving(true);
    const err = await onSubmit(date);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Dialog open onClose={onClose} title={`Uitstellen: ${task.title}`}>
      <div className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid grid-cols-3 gap-2">
          {postponeOptions(task.next_due, today).map((o) => (
            <button
              key={o.label}
              type="button"
              disabled={saving}
              onClick={() => submit(o.date)}
              className="rounded-lg border border-gray-300 px-2 py-3 text-center hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="block font-medium text-gray-900">{o.label}</span>
              <span className="block text-xs text-gray-500">{formatShortDate(o.date, today)}</span>
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (custom) submit(custom);
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1">
            <Input
              label="Of kies een datum"
              type="date"
              min={today}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </div>
          <Button type="submit" loading={saving} disabled={!custom}>
            Uitstellen
          </Button>
        </form>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: geen fouten.

- [ ] **Step 4: Commit**

```bash
git add src/components/tasks/TaskFormDialog.tsx src/components/tasks/PostponeDialog.tsx
git commit -m "feat(tasks): formulier met live voorbeeld en uitsteldialoog"
```

---

### Task 7: Overzichtspagina, tegel en route

**Files:**
- Create: `src/components/tasks/TaskRow.tsx`
- Create: `src/app/tasks/page.tsx`
- Modify: `src/app/page.tsx` (tegel toevoegen na de tegel "Personen", vóór de sluitende `</div>` van de grid)
- Modify: `src/components/layout/AppShell.tsx:16-23` (route `/tasks` zonder standaard navigatie)

**Interfaces:**
- Consumes: `useTasks` (Task 5); `TaskFormDialog`, `PostponeDialog` (Task 6); uit Task 1: `DUE_GROUPS`, `TASK_CATEGORIES`, `categoryDef`, `compareTasks`, `describeSchedule`, `dueGroup`, `dueLabel`, `todayKey`, types.
- Produces: `<TaskRow task today busy onDone onSkip onPostpone onEdit />` en de pagina `/tasks`.

- [ ] **Step 1: Write `TaskRow`**

Maak `src/components/tasks/TaskRow.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { categoryDef, describeSchedule, dueGroup, dueLabel, type Task } from '@/lib/tasks/shared';

interface Props {
  task: Task;
  today: string;
  busy: boolean;
  onDone: () => void;
  onSkip: () => void;
  onPostpone: () => void;
  onEdit: () => void;
}

export function TaskRow({ task, today, busy, onDone, onSkip, onPostpone, onEdit }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const overdue = dueGroup(task.next_due, today) === 'overdue';

  const pick = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <li className="relative flex items-center gap-3 px-4 py-3">
      <span className="text-2xl">{categoryDef(task.category).icon}</span>
      <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
        <span className="block truncate font-medium text-gray-900">{task.title}</span>
        <span className="block truncate text-sm text-gray-500">
          <span className={`font-medium ${overdue ? 'text-red-600' : 'text-teal-700'}`}>
            {dueLabel(task.next_due, today)}
          </span>
          {' · '}
          {describeSchedule(task)}
        </span>
      </Link>
      <button
        type="button"
        onClick={onDone}
        disabled={busy}
        className="whitespace-nowrap rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        ✓ Gedaan
      </button>
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        disabled={busy}
        aria-label="Meer acties"
        className="rounded-full px-2 py-1 text-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
      >
        ⋯
      </button>
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Menu sluiten"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-4 top-12 z-20 w-40 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <button type="button" onClick={() => pick(onSkip)} className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">
              ⏭ Overslaan
            </button>
            <button type="button" onClick={() => pick(onPostpone)} className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">
              ⏰ Uitstellen
            </button>
            <button type="button" onClick={() => pick(onEdit)} className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50">
              ✏️ Bewerken
            </button>
          </div>
        </>
      )}
    </li>
  );
}
```

- [ ] **Step 2: Write the overview page**

Maak `src/app/tasks/page.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useTasks } from '@/lib/hooks/useTasks';
import { TaskRow } from '@/components/tasks/TaskRow';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { PostponeDialog } from '@/components/tasks/PostponeDialog';
import {
  DUE_GROUPS, TASK_CATEGORIES, categoryDef, compareTasks, dueGroup, todayKey,
  type Task, type TaskCategory, type TaskEventKind,
} from '@/lib/tasks/shared';

export default function TasksPage() {
  const { tasks, loading, refetch, createTask, updateTask, completeTask } = useTasks();
  const archived = useTasks(true);
  const { toast } = useToast();
  const [filter, setFilter] = useState<TaskCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [postponing, setPostponing] = useState<Task | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const today = todayKey();

  const groups = useMemo(() => {
    const visible = filter ? tasks.filter((t) => t.category === filter) : tasks;
    return DUE_GROUPS.map((g) => ({
      ...g,
      tasks: visible.filter((t) => dueGroup(t.next_due, today) === g.group).sort(compareTasks),
    })).filter((g) => g.tasks.length > 0);
  }, [tasks, filter, today]);

  const complete = async (task: Task, kind: TaskEventKind) => {
    setBusyId(task.id);
    const error = await completeTask(task.id, kind);
    setBusyId(null);
    if (error) toast(error, 'error');
    else toast(kind === 'done' ? `✓ ${task.title}` : `⏭ ${task.title} overgeslagen`);
  };

  const reactivate = async (task: Task) => {
    setBusyId(task.id);
    const error = await archived.updateTask(task.id, { archived: false });
    await refetch();
    setBusyId(null);
    if (error) toast(error, 'error');
    else toast(`${task.title} is weer actief`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
    }`;

  return (
    <div className="min-h-screen bg-teal-50/40 px-4 py-6">
      <div className="mx-auto w-full max-w-[780px] space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Terug" className="text-xl text-gray-400 hover:text-gray-600">
              ←
            </Link>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-xl">🔁</span>
            <h1 className="text-2xl font-bold text-teal-900">Taken</h1>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Taak
          </Button>
        </header>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilter(null)} className={chipClass(filter === null)}>
            Alles
          </button>
          {TASK_CATEGORIES.map((c) => (
            <button
              key={c.category}
              type="button"
              onClick={() => setFilter(c.category)}
              className={chipClass(filter === c.category)}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {tasks.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500">Nog geen taken. Voeg er een toe.</p>
          </Card>
        ) : groups.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500">Geen taken in deze categorie.</p>
          </Card>
        ) : (
          groups.map((g) => (
            <section key={g.group} className="space-y-2">
              <h2
                className={`text-sm font-semibold uppercase tracking-wide ${
                  g.group === 'overdue' ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                {g.label} ({g.tasks.length})
              </h2>
              <Card padding={false}>
                <ul className="divide-y divide-gray-100">
                  {g.tasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      today={today}
                      busy={busyId === t.id}
                      onDone={() => complete(t, 'done')}
                      onSkip={() => complete(t, 'skipped')}
                      onPostpone={() => setPostponing(t)}
                      onEdit={() => {
                        setEditing(t);
                        setFormOpen(true);
                      }}
                    />
                  ))}
                </ul>
              </Card>
            </section>
          ))
        )}

        {archived.tasks.length > 0 && (
          <section className="space-y-2">
            <button
              type="button"
              onClick={() => setShowArchived((s) => !s)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {showArchived ? '▾' : '▸'} Gestopte taken ({archived.tasks.length})
            </button>
            {showArchived && (
              <Card padding={false}>
                <ul className="divide-y divide-gray-100">
                  {archived.tasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-2xl opacity-50">{categoryDef(t.category).icon}</span>
                      <Link href={`/tasks/${t.id}`} className="min-w-0 flex-1 truncate text-gray-500">
                        {t.title}
                      </Link>
                      <Button size="sm" variant="secondary" disabled={busyId === t.id} onClick={() => reactivate(t)}>
                        Weer activeren
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        )}
      </div>

      <TaskFormDialog
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => (editing ? updateTask(editing.id, input) : createTask(input))}
      />
      <PostponeDialog
        task={postponing}
        onClose={() => setPostponing(null)}
        onSubmit={(date) => (postponing ? updateTask(postponing.id, { next_due: date }) : Promise.resolve(null))}
      />
    </div>
  );
}
```

- [ ] **Step 3: Add the hub tile**

In `src/app/page.tsx`, voeg direct na de afsluitende `</Link>` van de tegel "Personen" (de `Link` met `href="/people"`) toe:

```tsx
          <Link
            href="/tasks"
            className="group rounded-2xl border border-teal-200 bg-teal-50 p-8 min-h-48 flex flex-col justify-between transition-all hover:bg-teal-100 hover:border-teal-300"
          >
            <span className="text-4xl">🔁</span>
            <div>
              <h2 className="text-2xl font-semibold text-teal-900">Taken</h2>
              <p className="text-sm text-teal-700 mt-2">Wat er dagelijks, wekelijks of maandelijks moet gebeuren.</p>
            </div>
          </Link>
```

- [ ] **Step 4: Add the route to `AppShell`**

In `src/components/layout/AppShell.tsx`, voeg onder de regel met `const isTvDashboard = ...` toe:

```tsx
  const isTasks = pathname === '/tasks' || pathname.startsWith('/tasks/');
```

en vervang

```tsx
  if (isBookLibrary || isCookbook || isFoodDiary || isPeople || isTvDashboard) {
```

door

```tsx
  if (isBookLibrary || isCookbook || isFoodDiary || isPeople || isTvDashboard || isTasks) {
```

- [ ] **Step 5: Verify types**

Run: `npx tsc --noEmit`
Expected: geen fouten.

- [ ] **Step 6: Browser check with mocked API**

Controleer dat de dev-server draait: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login` → `200`. Anders: `WATCHPACK_POLLING=true npm run dev` op de achtergrond starten.

Met de Playwright-browser (cookie `home-inventory-auth=authenticated` op `localhost`, klok vast op `2026-09-24T14:00:00`, viewport 390×844 en daarna 1024×768), mock:
- `GET **/api/tasks` → vijf taken: één met `next_due` `2026-09-21` (te laat), één `2026-09-24`, één `2026-09-27`, één `2026-10-20`, alle met geldige schemavelden (bv. `schedule_type: 'fixed', unit: 'week', weekdays: [2], every_n: 1, start_date: '2026-09-01'`), `archived: false`, `last_done: null`, categorieën gemengd.
- `GET **/api/tasks?archived=1` → één gestopte taak.
- `POST **/api/tasks/*/complete` → na 1 seconde vertraging `200` met de taak, en tel het aantal aanroepen.

Controleer:
- Groepen in volgorde "Te laat (1)", "Vandaag (1)", "Komende 7 dagen (1)", "Later (1)"; "3 dagen te laat" in rood.
- Filterknop 🔧 toont enkel onderhoudstaken; "Alles" toont weer alles.
- **Twee keer snel op "✓ Gedaan"** van dezelfde taak: precies **1** aanroep van `complete` (Review Focus 5).
- ⋯-menu opent en toont Overslaan, Uitstellen, Bewerken; klik buiten het menu sluit het.
- "+ Taak" opent het formulier; kies "Vast schema", weekdagen ma en do: het voorbeeld toont "Volgende keer: …, daarna …". Vink alle weekdagen uit en klik Toevoegen: melding "Kies minstens één weekdag".
- Uitstellen van de te-late taak: "+1 dag" toont "vr 25 sep".
- "Gestopte taken (1)" klapt open met de knop "Weer activeren".
- Op 390×844 past een taakrij zonder horizontaal scrollen.
- Geen consolefouten.
- De tegel "Taken" staat op `/` naast de andere vijf.

- [ ] **Step 7: Commit**

```bash
git add src/components/tasks/TaskRow.tsx src/app/tasks/page.tsx src/app/page.tsx src/components/layout/AppShell.tsx
git commit -m "feat(tasks): overzichtspagina, tegel op de hub en route in AppShell"
```

---

### Task 8: Detailpagina met historiek

**Files:**
- Create: `src/components/tasks/TaskHistory.tsx`
- Create: `src/app/tasks/[id]/page.tsx`

**Interfaces:**
- Consumes: `useTask` (Task 5); `TaskFormDialog`, `PostponeDialog` (Task 6); uit Task 1: `categoryDef`, `describeSchedule`, `dueGroup`, `dueLabel`, `formatLongDate`, `todayKey`, type `TaskEvent`.
- Produces: `<TaskHistory events busy onUndo />` en de pagina `/tasks/[id]`.

- [ ] **Step 1: Write `TaskHistory`**

Maak `src/components/tasks/TaskHistory.tsx`:

```tsx
'use client';

import { Button } from '@/components/ui/Button';
import { formatLongDate, type TaskEvent } from '@/lib/tasks/shared';

interface Props {
  events: TaskEvent[];
  busy: boolean;
  onUndo: () => void;
}

export function TaskHistory({ events, busy, onUndo }: Props) {
  if (events.length === 0) {
    return <p className="text-sm text-gray-500">Nog niets gedaan.</p>;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {events.map((e, i) => (
        <li key={e.id} className="flex items-center justify-between gap-3 py-2">
          <span className="text-sm text-gray-800">
            {e.kind === 'done' ? '✓ Gedaan' : '⏭ Overgeslagen'} op {formatLongDate(e.event_date)}
          </span>
          {i === 0 && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={onUndo}>
              Ongedaan maken
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Write the detail page**

Maak `src/app/tasks/[id]/page.tsx`:

```tsx
'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useTask } from '@/lib/hooks/useTask';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { PostponeDialog } from '@/components/tasks/PostponeDialog';
import { TaskHistory } from '@/components/tasks/TaskHistory';
import { categoryDef, describeSchedule, dueGroup, dueLabel, formatLongDate, todayKey } from '@/lib/tasks/shared';

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { task, events, loading, notFound, updateTask, completeTask, undo, deleteTask } = useTask(id);
  const [formOpen, setFormOpen] = useState(false);
  const [postponing, setPostponing] = useState(false);
  const [busy, setBusy] = useState(false);

  const act = async (action: () => Promise<string | null>, success: string) => {
    setBusy(true);
    const error = await action();
    setBusy(false);
    if (error) toast(error, 'error');
    else toast(success);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound || !task) {
    return (
      <div className="min-h-screen bg-teal-50/40 px-4 py-6">
        <div className="mx-auto w-full max-w-[780px] space-y-4">
          <Link href="/tasks" className="text-teal-700 hover:underline">
            ← Terug naar taken
          </Link>
          <Card>
            <p className="text-gray-600">Taak niet gevonden.</p>
          </Card>
        </div>
      </div>
    );
  }

  const today = todayKey();
  const cat = categoryDef(task.category);
  const overdue = dueGroup(task.next_due, today) === 'overdue';

  const handleDelete = async () => {
    if (!window.confirm(`"${task.title}" en de volledige historiek verwijderen?`)) return;
    setBusy(true);
    const error = await deleteTask();
    setBusy(false);
    if (error) {
      toast(error, 'error');
      return;
    }
    toast('Taak verwijderd');
    router.push('/tasks');
  };

  return (
    <div className="min-h-screen bg-teal-50/40 px-4 py-6">
      <div className="mx-auto w-full max-w-[780px] space-y-6">
        <header className="flex items-center gap-3">
          <Link href="/tasks" aria-label="Terug" className="text-xl text-gray-400 hover:text-gray-600">
            ←
          </Link>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-xl">{cat.icon}</span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-teal-900">{task.title}</h1>
            <p className="text-sm text-gray-500">
              {cat.label}
              {task.archived && ' · gestopt'}
            </p>
          </div>
        </header>

        <Card className="space-y-3">
          <p className="text-gray-800">{describeSchedule(task)}</p>
          {!task.archived && (
            <p className={`font-medium ${overdue ? 'text-red-600' : 'text-teal-700'}`}>
              Volgende keer: {dueLabel(task.next_due, today)}{' '}
              <span className="font-normal text-gray-500">({formatLongDate(task.next_due)})</span>
            </p>
          )}
          {task.notes && <p className="whitespace-pre-wrap text-sm text-gray-600">{task.notes}</p>}
          <div className="flex flex-wrap gap-2 pt-2">
            {!task.archived && (
              <>
                <Button disabled={busy} onClick={() => act(() => completeTask('done'), `✓ ${task.title}`)}>
                  ✓ Gedaan
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => act(() => completeTask('skipped'), 'Overgeslagen')}>
                  ⏭ Overslaan
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => setPostponing(true)}>
                  ⏰ Uitstellen
                </Button>
              </>
            )}
            <Button variant="secondary" disabled={busy} onClick={() => setFormOpen(true)}>
              ✏️ Bewerken
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                act(() => updateTask({ archived: !task.archived }), task.archived ? 'Taak weer actief' : 'Taak gestopt')
              }
            >
              {task.archived ? '▶ Weer activeren' : '⏸ Stopzetten'}
            </Button>
            <Button variant="danger" disabled={busy} onClick={handleDelete}>
              🗑 Verwijderen
            </Button>
          </div>
        </Card>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Historiek</h2>
          <Card>
            <TaskHistory events={events} busy={busy} onUndo={() => act(undo, 'Ongedaan gemaakt')} />
          </Card>
        </section>
      </div>

      <TaskFormDialog open={formOpen} initial={task} onClose={() => setFormOpen(false)} onSubmit={(input) => updateTask(input)} />
      <PostponeDialog
        task={postponing ? task : null}
        onClose={() => setPostponing(false)}
        onSubmit={(date) => updateTask({ next_due: date })}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: geen fouten.

- [ ] **Step 4: Browser check with mocked API**

Mock (zelfde cookie en klok als Task 7):
- `GET **/api/tasks/5f0c6f5e-2b1a-4d7e-9c3b-1a2b3c4d5e6f` → `{ task: {…, notes: 'Filter type X'}, events: [ {kind:'done', event_date:'2026-09-15', …}, {kind:'skipped', event_date:'2026-09-08', …} ] }`.
- `GET **/api/tasks/00000000-0000-4000-8000-000000000000` → `404 { error: 'Taak niet gevonden' }`.

Controleer:
- Detail toont schema in gewone taal, "Volgende keer: …", de notitie en de historiek "✓ Gedaan op 15 september 2026", "⏭ Overgeslagen op 8 september 2026"; "Ongedaan maken" staat enkel bij de bovenste regel.
- "Bewerken" opent het formulier ingevuld met de huidige waarden.
- `/tasks/00000000-0000-4000-8000-000000000000` en `/tasks/abc` tonen "Taak niet gevonden." met een link terug (Review Focus 3). Voor `/tasks/abc` geeft de echte API al 404 via `isUuid`.
- Geen consolefouten.

- [ ] **Step 5: Commit**

```bash
git add src/components/tasks/TaskHistory.tsx "src/app/tasks/[id]/page.tsx"
git commit -m "feat(tasks): detailpagina met historiek en acties"
```

---

### Task 9: Eindcontrole en live test met de database

**Files:** geen nieuwe; eventueel kleine fixes uit de controles.

**Interfaces:**
- Consumes: alles hierboven.
- Produces: een geteste module op de echte database.

- [ ] **Step 1: Volledige checks**

Run: `npm test && npx tsc --noEmit`
Expected: alle tests groen, geen typefouten.

Run: `timeout 300 npx eslint src/lib/tasks src/app/tasks src/app/api/tasks src/components/tasks src/lib/hooks/useTasks.ts src/lib/hooks/useTask.ts`
Expected: geen fouten. Loopt het vast (time-out), meld dat eerlijk in plaats van het als geslaagd te rapporteren.

- [ ] **Step 2: Migratie door de gebruiker**

Vraag de gebruiker om `supabase/migrations/026_tasks.sql` uit te voeren op de Postgres-database (bv. `psql "$DATABASE_URL" -f supabase/migrations/026_tasks.sql` vanaf een machine die de database bereikt). Wacht op bevestiging.

- [ ] **Step 3: Live test**

Als `GET /api/db-health` `ok: true` geeft (vanuit WSL of via de gebruiker in de browser): maak via de UI een taak "Test vuilnis" (vast, elke dinsdag), vink af, maak ongedaan, stel uit met "+1 dag", zet stop, activeer weer en verwijder ze. Controleer na elke stap de datum op het scherm tegen de regels in spec §3.
Is de database vanuit WSL niet bereikbaar, vraag de gebruiker om dezelfde stappen in zijn browser te doen en de uitkomst te melden.

- [ ] **Step 4: Commit eventuele fixes**

Enkel als de controles hierboven een fix nodig maakten: stage de gewijzigde bestanden bij naam en commit met een bericht in de stijl `fix(tasks): …` dat beschrijft wat er misliep. Werd er niets gerepareerd, dan geen commit.
