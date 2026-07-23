# Personen & Herinneringen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een nieuwe module `/people` waarmee je per persoon bijhoudt wat je moet meenemen, vragen, welke events/verjaardagen eraan komen, plus cadeau-ideeën, groepen/families en een historiek — met een "binnenkort"-overzicht dat over alle personen heen waarschuwt.

**Architecture:** Volgt exact de bestaande module-patronen van dit project. Alle datum-/sorteerlogica zit als pure functies in `src/lib/people/shared.ts` (unit-getest met `node:test`). De data komt uit Supabase via API-routes onder `src/app/api/people`. Client-hooks (`usePeople`, `usePerson`, `usePeopleGroups`) halen de data op; de pagina's (`/people`, `/people/[id]`) en componenten renderen ze met de bestaande UI-componenten uit `src/components/ui`.

**Tech Stack:** Next.js 16 (App Router, webpack), React 19, TypeScript 5, Supabase (`@supabase/ssr`), Tailwind v4, Node.js test runner (`node --test`).

## Global Constraints

- Taal van alle UI-teksten: **Nederlands**.
- Supabase-server client altijd via `import { createClient } from '@/lib/supabase/server'` in API-routes; browser via `fetch` op `/api/...` in hooks.
- Nieuwe migratie is genummerd **`025_people.sql`** en gebruikt **open RLS-policies** (`USING (true)` / `WITH CHECK (true)`), net als alle bestaande tabellen. PIN-auth zit al in `src/middleware.ts` — niks aan doen.
- Datumformaat overal `YYYY-MM-DD` (string), datumberekening in **lokale tijd**, dag-precisie. Gebruik de bestaande helper-stijl `toDateKey(date: Date): string`.
- UI opgebouwd met bestaande componenten: `Card`, `Button`, `Input`, `Dialog`, `Spinner`, `Badge`, `useToast` uit `src/components/ui`.
- Geen nieuwe npm-dependencies. Tests draaien met `node --test` (Node 24 heeft TypeScript type-stripping standaard aan).
- Reminder-types zijn exact `'bring' | 'ask' | 'event'`. Verjaardag is GEEN reminder-type maar een veld op `people`.

---

## File Structure

**Nieuw:**
- `supabase/migrations/025_people.sql` — 4 tabellen (`people_groups`, `people`, `people_reminders`, `people_gift_ideas`) + indexes + RLS.
- `src/lib/people/shared.ts` — types + pure datum-/sorteer-/historieklogica (server + client).
- `src/lib/people/shared.test.ts` — unit-tests voor de pure logica.
- `src/app/api/people/route.ts` — GET (lijst + groepen), POST (persoon).
- `src/app/api/people/[id]/route.ts` — GET detail, PATCH, DELETE.
- `src/app/api/people/groups/route.ts` — GET, POST.
- `src/app/api/people/groups/[id]/route.ts` — PATCH, DELETE.
- `src/app/api/people/[id]/reminders/route.ts` — POST.
- `src/app/api/people/reminders/[id]/route.ts` — PATCH, DELETE.
- `src/app/api/people/[id]/gift-ideas/route.ts` — POST.
- `src/app/api/people/gift-ideas/[id]/route.ts` — PATCH, DELETE.
- `src/lib/hooks/usePeopleGroups.ts`, `src/lib/hooks/usePeople.ts`, `src/lib/hooks/usePerson.ts`.
- `src/app/people/page.tsx` — lijst + binnenkort + groepsfilter.
- `src/app/people/[id]/page.tsx` — persoon-detail.
- `src/components/people/UpcomingList.tsx`, `PersonCard.tsx`, `PersonFormDialog.tsx`, `GroupManagerDialog.tsx`, `ReminderSection.tsx`, `ReminderFormDialog.tsx`, `GiftIdeaSection.tsx`, `HistorySection.tsx`.

**Gewijzigd:**
- `src/components/layout/AppShell.tsx` — `/people` als self-contained route toevoegen.
- `src/app/page.tsx` — tegel voor de nieuwe module.
- `package.json` — `test`-script.

---

## Task 1: Gedeelde types & pure logica (`shared.ts`) met unit-tests

Dit is de foutgevoelige kern (datumberekening, sortering, historiek). Volledig testbaar zonder DB.

**Files:**
- Create: `src/lib/people/shared.ts`
- Test: `src/lib/people/shared.test.ts`
- Modify: `package.json` (test-script)

**Interfaces:**
- Produces (gebruikt door alle latere tasks):
  - Types: `ReminderType`, `ReminderTypeDef`, `PersonGroup`, `Reminder`, `GiftIdea`, `Person`, `RawDatedItem`, `PersonSummary`, `UpcomingEntry`, `HistoryEntry`, `SortMode`.
  - Constanten: `REMINDER_TYPES: ReminderTypeDef[]`, `UPCOMING_WINDOW_DAYS = 30`.
  - Functies: `toDateKey(d: Date): string`, `reminderDef(t: ReminderType): ReminderTypeDef`, `nextOccurrence(dateKey: string, recurring: boolean, today: Date): string`, `rollForwardAnnual(dateKey: string, today: Date): string`, `daysUntil(dateKey: string, today: Date): number`, `personNextDate(p: PersonSummary, today: Date): string | null`, `comparePeopleByDate(a: PersonSummary, b: PersonSummary, today: Date): number`, `buildUpcoming(people: PersonSummary[], today: Date, windowDays?: number): UpcomingEntry[]`, `buildHistory(reminders: Reminder[], giftIdeas: GiftIdea[]): HistoryEntry[]`.

- [ ] **Step 1: Schrijf de falende tests**

Create `src/lib/people/shared.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextOccurrence,
  rollForwardAnnual,
  daysUntil,
  personNextDate,
  comparePeopleByDate,
  buildUpcoming,
  buildHistory,
  toDateKey,
  type PersonSummary,
  type Reminder,
  type GiftIdea,
} from './shared.ts';

const TODAY = new Date(2026, 6, 23); // 2026-07-23 (lokale tijd)

function person(overrides: Partial<PersonSummary>): PersonSummary {
  return {
    id: 'p', name: 'Naam', group_id: null, group_name: null,
    birthday: null, birthday_has_year: true, notes: null,
    created_at: '2026-01-01T00:00:00Z',
    open_counts: { bring: 0, ask: 0, event: 0 },
    dated_items: [],
    ...overrides,
  };
}

test('toDateKey formatteert lokale datum', () => {
  assert.equal(toDateKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('nextOccurrence: niet-terugkerend geeft de datum zelf terug', () => {
  assert.equal(nextOccurrence('2026-08-01', false, TODAY), '2026-08-01');
  assert.equal(nextOccurrence('2020-01-01', false, TODAY), '2020-01-01');
});

test('nextOccurrence: terugkerend, later dit jaar', () => {
  assert.equal(nextOccurrence('1990-09-10', true, TODAY), '2026-09-10');
});

test('nextOccurrence: terugkerend, al voorbij dit jaar -> volgend jaar', () => {
  assert.equal(nextOccurrence('1990-03-10', true, TODAY), '2027-03-10');
});

test('nextOccurrence: terugkerend vandaag telt als vandaag', () => {
  assert.equal(nextOccurrence('1990-07-23', true, TODAY), '2026-07-23');
});

test('nextOccurrence: 29 feb in niet-schrikkeljaar rolt naar 1 maart', () => {
  assert.equal(nextOccurrence('2000-02-29', true, TODAY), '2027-03-01');
});

test('rollForwardAnnual: strikt na vandaag', () => {
  assert.equal(rollForwardAnnual('2026-07-23', TODAY), '2027-07-23');
  assert.equal(rollForwardAnnual('1990-12-31', TODAY), '2026-12-31');
});

test('daysUntil telt hele dagen', () => {
  assert.equal(daysUntil('2026-07-23', TODAY), 0);
  assert.equal(daysUntil('2026-07-25', TODAY), 2);
  assert.equal(daysUntil('2026-07-20', TODAY), -3);
});

test('personNextDate: kleinste eerstvolgende datum; leeg = null', () => {
  assert.equal(personNextDate(person({}), TODAY), null);
  const p = person({
    dated_items: [
      { kind: 'birthday', label: 'Verjaardag', date: '1990-12-01', recurring: true },
      { kind: 'reminder', reminderType: 'event', label: 'Feest', date: '2026-08-05', recurring: false },
    ],
  });
  assert.equal(personNextDate(p, TODAY), '2026-08-05');
});

test('comparePeopleByDate: personen zonder datum achteraan', () => {
  const withDate = person({ id: 'a', name: 'Anna', dated_items: [
    { kind: 'birthday', label: 'Verjaardag', date: '1990-08-01', recurring: true },
  ] });
  const without = person({ id: 'b', name: 'Bram' });
  assert.ok(comparePeopleByDate(withDate, without, TODAY) < 0);
  assert.ok(comparePeopleByDate(without, withDate, TODAY) > 0);
});

test('buildUpcoming: binnen venster, gesorteerd, overdue eerst', () => {
  const people = [
    person({ id: 'a', name: 'Anna', dated_items: [
      { kind: 'reminder', reminderType: 'event', label: 'Gemist', date: '2026-07-20', recurring: false },
    ] }),
    person({ id: 'b', name: 'Bram', dated_items: [
      { kind: 'birthday', label: 'Verjaardag', date: '1990-08-10', recurring: true },
    ] }),
    person({ id: 'c', name: 'Cato', dated_items: [
      { kind: 'reminder', reminderType: 'event', label: 'Ver weg', date: '2026-12-01', recurring: false },
    ] }),
  ];
  const up = buildUpcoming(people, TODAY, 30);
  assert.deepEqual(up.map((e) => e.personName), ['Anna', 'Bram']); // Cato valt buiten 30 dagen
  assert.equal(up[0].daysUntil, -3);
});

test('buildHistory: alleen afgehandelde items, nieuwste eerst', () => {
  const reminders: Reminder[] = [
    { id: 'r1', person_id: 'p', type: 'bring', text: 'Wijn', due_date: null, recurs_annually: false, done: true, done_at: '2026-05-01T10:00:00Z', sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
    { id: 'r2', person_id: 'p', type: 'ask', text: 'Open', due_date: null, recurs_annually: false, done: false, done_at: null, sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
  ];
  const gifts: GiftIdea[] = [
    { id: 'g1', person_id: 'p', text: 'Boek', given: true, given_at: '2026-06-01T10:00:00Z', created_at: '2026-01-01T00:00:00Z' },
  ];
  const hist = buildHistory(reminders, gifts);
  assert.deepEqual(hist.map((h) => h.id), ['g1', 'r1']); // juni voor mei
});
```

- [ ] **Step 2: Draai de tests, verifieer dat ze falen**

Run: `node --test src/lib/people/shared.test.ts`
Expected: FAIL — module `./shared.ts` bestaat nog niet ("Cannot find module").

- [ ] **Step 3: Implementeer `shared.ts`**

Create `src/lib/people/shared.ts`:

```ts
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
```

- [ ] **Step 4: Draai de tests, verifieer dat ze slagen**

Run: `node --test src/lib/people/shared.test.ts`
Expected: PASS — alle tests groen.

- [ ] **Step 5: Voeg een test-script toe aan `package.json`**

Wijzig het `"scripts"`-blok in `package.json` (voeg de `test`-regel toe):

```json
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint",
    "test": "node --test 'src/**/*.test.ts'"
  },
```

- [ ] **Step 6: Verifieer het script en commit**

Run: `npm test`
Expected: PASS — dezelfde tests groen via het script.

```bash
git add src/lib/people/shared.ts src/lib/people/shared.test.ts package.json
git commit -m "feat(people): gedeelde types en pure datum-/historieklogica met tests"
```

---

## Task 2: Databasemigratie `025_people.sql` + Supabase-types

**Files:**
- Create: `supabase/migrations/025_people.sql`
- Modify: `src/lib/supabase/types.ts` (types toevoegen achteraan)

**Interfaces:**
- Consumes: niks.
- Produces: tabellen `people_groups`, `people`, `people_reminders`, `people_gift_ideas` in Supabase; TS-types `PersonGroupRow`, `PersonRow`, `PersonReminderRow`, `PersonGiftIdeaRow`.

- [ ] **Step 1: Schrijf de migratie**

Create `supabase/migrations/025_people.sql`:

```sql
-- ============================================================
-- 025_people.sql
-- Module "Personen & Herinneringen"
-- Bijhouden per persoon: meenemen / vragen / events, verjaardagen,
-- cadeau-ideeën, groepen (families) en (afgeleide) historiek.
-- Open beleid: PIN-authenticatie wordt afgehandeld op app-niveau.
-- ============================================================

-- ─── Groepen / families ─────────────────────────────────────
CREATE TABLE people_groups (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Personen ───────────────────────────────────────────────
CREATE TABLE people (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  group_id          UUID        REFERENCES people_groups(id) ON DELETE SET NULL,
  birthday          DATE,
  birthday_has_year BOOLEAN     NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Herinneringen per persoon ──────────────────────────────
CREATE TABLE people_reminders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID        NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN ('bring', 'ask', 'event')),
  text            TEXT        NOT NULL,
  due_date        DATE,
  recurs_annually BOOLEAN     NOT NULL DEFAULT FALSE,
  done            BOOLEAN     NOT NULL DEFAULT FALSE,
  done_at         TIMESTAMPTZ,
  sort_order      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Cadeau-ideeën per persoon ──────────────────────────────
CREATE TABLE people_gift_ideas (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id  UUID        NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  text       TEXT        NOT NULL,
  given      BOOLEAN     NOT NULL DEFAULT FALSE,
  given_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────
CREATE INDEX idx_people_group             ON people(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_people_birthday          ON people(birthday);
CREATE INDEX idx_people_reminders_person  ON people_reminders(person_id);
CREATE INDEX idx_people_reminders_due     ON people_reminders(due_date);
CREATE INDEX idx_people_gift_ideas_person ON people_gift_ideas(person_id);

-- ─── Row Level Security (open, zoals de rest van het project) ─
ALTER TABLE people_groups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE people            ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_reminders  ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_gift_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on people_groups"     ON people_groups     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on people"            ON people            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on people_reminders"  ON people_reminders  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on people_gift_ideas" ON people_gift_ideas FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Voeg de rijtypes toe aan `src/lib/supabase/types.ts`**

Voeg onderaan `src/lib/supabase/types.ts` toe:

```ts
export type PersonGroupRow = {
  id: string;
  name: string;
  created_at: string;
};

export type PersonRow = {
  id: string;
  name: string;
  group_id: string | null;
  birthday: string | null;
  birthday_has_year: boolean;
  notes: string | null;
  created_at: string;
};

export type PersonReminderRow = {
  id: string;
  person_id: string;
  type: 'bring' | 'ask' | 'event';
  text: string;
  due_date: string | null;
  recurs_annually: boolean;
  done: boolean;
  done_at: string | null;
  sort_order: number;
  created_at: string;
};

export type PersonGiftIdeaRow = {
  id: string;
  person_id: string;
  text: string;
  given: boolean;
  given_at: string | null;
  created_at: string;
};
```

- [ ] **Step 3: Pas de migratie toe op Supabase**

Deze repo bewaart migraties als losse SQL-bestanden. Voer `supabase/migrations/025_people.sql` uit tegen de database (Supabase SQL Editor, of `supabase db push` als de CLI gekoppeld is).

- [ ] **Step 4: Verifieer dat de tabellen bestaan**

Run in de Supabase SQL Editor:
```sql
select table_name from information_schema.tables
where table_name in ('people_groups','people','people_reminders','people_gift_ideas');
```
Expected: 4 rijen.

- [ ] **Step 5: Verifieer dat de build de nieuwe types accepteert en commit**

Run: `npx tsc --noEmit`
Expected: geen fouten in `src/lib/supabase/types.ts`.

```bash
git add supabase/migrations/025_people.sql src/lib/supabase/types.ts
git commit -m "feat(people): databasemigratie en Supabase-rijtypes"
```

---

## Task 3: API — personenlijst, persoon aanmaken & groepen

**Files:**
- Create: `src/app/api/people/route.ts`
- Create: `src/app/api/people/groups/route.ts`
- Create: `src/app/api/people/groups/[id]/route.ts`

**Interfaces:**
- Consumes: types uit `@/lib/people/shared` (`PersonSummary`, `RawDatedItem`, `ReminderType`).
- Produces:
  - `GET /api/people` → `{ groups: PersonGroup[]; people: PersonSummary[] }`.
  - `POST /api/people` body `{ name: string; group_id?: string | null }` → `PersonRow`.
  - `GET /api/people/groups` → `PersonGroup[]`.
  - `POST /api/people/groups` body `{ name: string }` → `PersonGroup`.
  - `PATCH /api/people/groups/[id]` body `{ name: string }` → `PersonGroup`.
  - `DELETE /api/people/groups/[id]` → `{ success: true }`.

- [ ] **Step 1: Implementeer `GET`/`POST` voor personen**

Create `src/app/api/people/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { PersonSummary, RawDatedItem, ReminderType } from '@/lib/people/shared';

// GET — alle groepen + alle personen met counts en datum-items voor de lijst.
export async function GET() {
  const supabase = await createClient();

  const [groupsRes, peopleRes, remindersRes] = await Promise.all([
    supabase.from('people_groups').select('*').order('name', { ascending: true }),
    supabase.from('people').select('*').order('name', { ascending: true }),
    supabase.from('people_reminders').select('*').eq('done', false),
  ]);

  if (groupsRes.error) return NextResponse.json({ error: groupsRes.error.message }, { status: 500 });
  if (peopleRes.error) return NextResponse.json({ error: peopleRes.error.message }, { status: 500 });
  if (remindersRes.error) return NextResponse.json({ error: remindersRes.error.message }, { status: 500 });

  const groups = groupsRes.data ?? [];
  const groupNameById = new Map(groups.map((g) => [g.id, g.name as string]));

  // Openstaande reminders groeperen per persoon.
  const byPerson = new Map<string, typeof remindersRes.data>();
  for (const r of remindersRes.data ?? []) {
    const list = byPerson.get(r.person_id) ?? [];
    list.push(r);
    byPerson.set(r.person_id, list);
  }

  const people: PersonSummary[] = (peopleRes.data ?? []).map((p) => {
    const reminders = byPerson.get(p.id) ?? [];
    const open_counts: Record<ReminderType, number> = { bring: 0, ask: 0, event: 0 };
    const dated_items: RawDatedItem[] = [];

    if (p.birthday) {
      dated_items.push({ kind: 'birthday', label: 'Verjaardag', date: p.birthday, recurring: true });
    }
    for (const r of reminders) {
      open_counts[r.type as ReminderType] += 1;
      if (r.due_date) {
        dated_items.push({
          kind: 'reminder',
          reminderType: r.type as ReminderType,
          label: r.text,
          date: r.due_date,
          recurring: r.type === 'event' && r.recurs_annually,
        });
      }
    }

    return {
      id: p.id,
      name: p.name,
      group_id: p.group_id,
      group_name: p.group_id ? groupNameById.get(p.group_id) ?? null : null,
      birthday: p.birthday,
      birthday_has_year: p.birthday_has_year,
      notes: p.notes,
      created_at: p.created_at,
      open_counts,
      dated_items,
    };
  });

  return NextResponse.json({ groups, people });
}

// POST — nieuwe persoon.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { name, group_id } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('people')
    .insert([{ name: name.trim(), group_id: group_id || null }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 2: Implementeer groepen `GET`/`POST`**

Create `src/app/api/people/groups/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('people_groups')
    .select('*')
    .order('name', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { name } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('people_groups')
    .insert([{ name: name.trim() }])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Implementeer groepen `PATCH`/`DELETE`**

Create `src/app/api/people/groups/[id]/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const { name } = body;
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('people_groups')
    .update({ name: name.trim() })
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  // Personen behouden; group_id wordt NULL via ON DELETE SET NULL.
  const { error } = await supabase.from('people_groups').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Verifieer types en commit**

Run: `npx tsc --noEmit`
Expected: geen fouten.

```bash
git add src/app/api/people/route.ts src/app/api/people/groups
git commit -m "feat(people): API voor personenlijst en groepen"
```

---

## Task 4: API — persoon-detail, reminders & cadeau-ideeën

**Files:**
- Create: `src/app/api/people/[id]/route.ts`
- Create: `src/app/api/people/[id]/reminders/route.ts`
- Create: `src/app/api/people/reminders/[id]/route.ts`
- Create: `src/app/api/people/[id]/gift-ideas/route.ts`
- Create: `src/app/api/people/gift-ideas/[id]/route.ts`

**Interfaces:**
- Consumes: types `Person`, `Reminder`, `GiftIdea`, `ReminderType`, functie `rollForwardAnnual`, `toDateKey` uit `@/lib/people/shared`.
- Produces:
  - `GET /api/people/[id]` → `{ person: Person; group_name: string | null; reminders: Reminder[]; giftIdeas: GiftIdea[] }`.
  - `PATCH /api/people/[id]` body `{ name?, group_id?, birthday?, birthday_has_year?, notes? }` → `PersonRow`.
  - `DELETE /api/people/[id]` → `{ success: true }`.
  - `POST /api/people/[id]/reminders` body `{ type: ReminderType; text: string; due_date?: string | null; recurs_annually?: boolean }` → `Reminder`.
  - `PATCH /api/people/reminders/[id]` body `{ text?, due_date?, recurs_annually?, done? }` → `Reminder`.
  - `DELETE /api/people/reminders/[id]` → `{ success: true }`.
  - `POST /api/people/[id]/gift-ideas` body `{ text: string }` → `GiftIdea`.
  - `PATCH /api/people/gift-ideas/[id]` body `{ text?, given? }` → `GiftIdea`.
  - `DELETE /api/people/gift-ideas/[id]` → `{ success: true }`.

- [ ] **Step 1: Implementeer persoon-detail `GET`/`PATCH`/`DELETE`**

Create `src/app/api/people/[id]/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const [personRes, remindersRes, giftsRes] = await Promise.all([
    supabase.from('people').select('*, people_groups(name)').eq('id', id).maybeSingle(),
    supabase
      .from('people_reminders')
      .select('*')
      .eq('person_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('people_gift_ideas')
      .select('*')
      .eq('person_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (personRes.error) return NextResponse.json({ error: personRes.error.message }, { status: 500 });
  if (!personRes.data) return NextResponse.json({ error: 'Persoon niet gevonden' }, { status: 404 });
  if (remindersRes.error) return NextResponse.json({ error: remindersRes.error.message }, { status: 500 });
  if (giftsRes.error) return NextResponse.json({ error: giftsRes.error.message }, { status: 500 });

  const { people_groups, ...person } = personRes.data as Record<string, unknown> & {
    people_groups: { name: string } | null;
  };

  return NextResponse.json({
    person,
    group_name: people_groups?.name ?? null,
    reminders: remindersRes.data ?? [],
    giftIdeas: giftsRes.data ?? [],
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const update: Record<string, unknown> = {};
  if ('name' in body) {
    if (!body.name?.trim()) return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
    update.name = body.name.trim();
  }
  if ('group_id' in body) update.group_id = body.group_id || null;
  if ('notes' in body) update.notes = body.notes?.trim() || null;
  if ('birthday' in body) {
    if (body.birthday && !DATE_RE.test(body.birthday)) {
      return NextResponse.json({ error: 'Ongeldige verjaardag' }, { status: 400 });
    }
    update.birthday = body.birthday || null;
  }
  if ('birthday_has_year' in body) update.birthday_has_year = !!body.birthday_has_year;

  const { data, error } = await supabase
    .from('people')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  // Reminders en gift ideas verdwijnen mee via ON DELETE CASCADE.
  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Implementeer reminder-`POST` (nieuw)**

Create `src/app/api/people/[id]/reminders/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ReminderType } from '@/lib/people/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES: ReminderType[] = ['bring', 'ask', 'event'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const { type, text, due_date, recurs_annually } = body;

  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: 'Ongeldig type' }, { status: 400 });
  }
  if (!text?.trim()) {
    return NextResponse.json({ error: 'Tekst is verplicht' }, { status: 400 });
  }
  if (due_date && !DATE_RE.test(due_date)) {
    return NextResponse.json({ error: 'Ongeldige datum' }, { status: 400 });
  }
  if (type === 'event' && !due_date) {
    return NextResponse.json({ error: 'Een event heeft een datum nodig' }, { status: 400 });
  }
  const recurring = type === 'event' ? !!recurs_annually : false;

  // Volgende sort_order binnen dit type bepalen.
  const { data: last } = await supabase
    .from('people_reminders')
    .select('sort_order')
    .eq('person_id', id)
    .eq('type', type)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = last ? (last.sort_order as number) + 1 : 0;

  const { data, error } = await supabase
    .from('people_reminders')
    .insert([
      {
        person_id: id,
        type,
        text: text.trim(),
        due_date: due_date || null,
        recurs_annually: recurring,
        sort_order,
      },
    ])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 3: Implementeer reminder-`PATCH`/`DELETE` (incl. doorrollen)**

Create `src/app/api/people/reminders/[id]/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rollForwardAnnual, toDateKey } from '@/lib/people/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const update: Record<string, unknown> = {};
  if ('text' in body) {
    if (!body.text?.trim()) return NextResponse.json({ error: 'Tekst is verplicht' }, { status: 400 });
    update.text = body.text.trim();
  }
  if ('due_date' in body) {
    if (body.due_date && !DATE_RE.test(body.due_date)) {
      return NextResponse.json({ error: 'Ongeldige datum' }, { status: 400 });
    }
    update.due_date = body.due_date || null;
  }
  if ('recurs_annually' in body) update.recurs_annually = !!body.recurs_annually;

  // Afvinken: terugkerend event rolt door naar volgend jaar i.p.v. te archiveren.
  if ('done' in body) {
    if (body.done === true) {
      const { data: current, error: readErr } = await supabase
        .from('people_reminders')
        .select('type, recurs_annually, due_date')
        .eq('id', id)
        .maybeSingle();
      if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });

      if (current && current.type === 'event' && current.recurs_annually && current.due_date) {
        update.due_date = rollForwardAnnual(current.due_date as string, new Date());
        update.done = false;
        update.done_at = null;
      } else {
        update.done = true;
        update.done_at = new Date().toISOString();
      }
    } else {
      update.done = false;
      update.done_at = null;
    }
  }

  const { data, error } = await supabase
    .from('people_reminders')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from('people_reminders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

> Noot: `toDateKey` wordt geïmporteerd zodat `rollForwardAnnual` uit dezelfde module komt; beide zitten in `shared.ts`. De import van `toDateKey` mag weg als je linter over "unused" klaagt — maar `rollForwardAnnual` gebruikt het intern, dus alleen `rollForwardAnnual` importeren volstaat. Gebruik in dit bestand enkel `import { rollForwardAnnual } from '@/lib/people/shared';`.

- [ ] **Step 4: Corrigeer de import in reminders/[id]/route.ts**

Wijzig de importregel in `src/app/api/people/reminders/[id]/route.ts` naar exact:

```ts
import { rollForwardAnnual } from '@/lib/people/shared';
```

- [ ] **Step 5: Implementeer cadeau-ideeën `POST`**

Create `src/app/api/people/[id]/gift-ideas/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const { text } = body;
  if (!text?.trim()) {
    return NextResponse.json({ error: 'Tekst is verplicht' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('people_gift_ideas')
    .insert([{ person_id: id, text: text.trim() }])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
```

- [ ] **Step 6: Implementeer cadeau-ideeën `PATCH`/`DELETE`**

Create `src/app/api/people/gift-ideas/[id]/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const update: Record<string, unknown> = {};
  if ('text' in body) {
    if (!body.text?.trim()) return NextResponse.json({ error: 'Tekst is verplicht' }, { status: 400 });
    update.text = body.text.trim();
  }
  if ('given' in body) {
    update.given = !!body.given;
    update.given_at = body.given ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from('people_gift_ideas')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from('people_gift_ideas').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 7: Verifieer types en commit**

Run: `npx tsc --noEmit`
Expected: geen fouten.

```bash
git add src/app/api/people
git commit -m "feat(people): API voor persoon-detail, reminders en cadeau-ideeen"
```

---

## Task 5: Client-hooks

**Files:**
- Create: `src/lib/hooks/usePeople.ts`
- Create: `src/lib/hooks/usePerson.ts`

**Interfaces:**
- Consumes: alle API-endpoints uit Task 3 & 4; types uit `@/lib/people/shared`.
- Produces:
  - `usePeople()` → `{ loading, people: PersonSummary[], groups: PersonGroup[], refetch(): Promise<void>, createPerson(name: string, groupId: string | null): Promise<PersonRow | null>, createGroup(name: string): Promise<void>, renameGroup(id: string, name: string): Promise<void>, deleteGroup(id: string): Promise<void> }`.
  - `usePerson(id: string)` → `{ loading, person: Person | null, groupName: string | null, reminders: Reminder[], giftIdeas: GiftIdea[], refetch(): Promise<void>, updatePerson(patch): Promise<void>, deletePerson(): Promise<boolean>, addReminder(input): Promise<void>, updateReminder(rid, patch): Promise<void>, deleteReminder(rid): Promise<void>, addGiftIdea(text): Promise<void>, updateGiftIdea(gid, patch): Promise<void>, deleteGiftIdea(gid): Promise<void> }`.

- [ ] **Step 1: Implementeer `usePeople`**

Create `src/lib/hooks/usePeople.ts`:

```ts
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
```

- [ ] **Step 2: Implementeer `usePerson`**

Create `src/lib/hooks/usePerson.ts`:

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Person, Reminder, GiftIdea, ReminderType } from '@/lib/people/shared';

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
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/people/${id}`);
      if (!res.ok) return;
      const data: { person: Person; group_name: string | null; reminders: Reminder[]; giftIdeas: GiftIdea[] } =
        await res.json();
      setPerson(data.person);
      setGroupName(data.group_name);
      setReminders(data.reminders);
      setGiftIdeas(data.giftIdeas);
    } catch {
      /* netwerkfout */
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  const updatePerson = useCallback(
    async (patch: Partial<Pick<Person, 'name' | 'group_id' | 'birthday' | 'birthday_has_year' | 'notes'>>) => {
      const res = await fetch(`/api/people/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) await refetch();
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
    loading, person, groupName, reminders, giftIdeas, refetch,
    updatePerson, deletePerson,
    addReminder, updateReminder, deleteReminder,
    addGiftIdea, updateGiftIdea, deleteGiftIdea,
  };
}
```

- [ ] **Step 3: Verifieer types en commit**

Run: `npx tsc --noEmit`
Expected: geen fouten.

```bash
git add src/lib/hooks/usePeople.ts src/lib/hooks/usePerson.ts
git commit -m "feat(people): client-hooks usePeople en usePerson"
```

---

## Task 6: Lijstpagina `/people` + componenten (binnenkort, kaarten, persoon-/groepsdialogen)

**Files:**
- Create: `src/components/people/UpcomingList.tsx`
- Create: `src/components/people/PersonCard.tsx`
- Create: `src/components/people/PersonFormDialog.tsx`
- Create: `src/components/people/GroupManagerDialog.tsx`
- Create: `src/app/people/page.tsx`

**Interfaces:**
- Consumes: `usePeople` (Task 5), `buildUpcoming`, `comparePeopleByDate`, `personNextDate`, `daysUntil`, `reminderDef`, `REMINDER_TYPES`, types uit `@/lib/people/shared`; UI-componenten.
- Produces: functionele lijstpagina op route `/people`.

- [ ] **Step 1: Helper voor "over X dagen"-tekst + `UpcomingList`**

Create `src/components/people/UpcomingList.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { reminderDef, type UpcomingEntry } from '@/lib/people/shared';

export function relativeDayLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} dagen te laat`;
  if (days === 0) return 'Vandaag';
  if (days === 1) return 'Morgen';
  return `Over ${days} dagen`;
}

function entryIcon(entry: UpcomingEntry): string {
  if (entry.kind === 'birthday') return '🎂';
  return entry.reminderType ? reminderDef(entry.reminderType).icon : '📅';
}

export function UpcomingList({ entries }: { entries: UpcomingEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card>
        <p className="text-sm text-gray-500">Niks op de planning de komende weken.</p>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <ul className="divide-y divide-gray-100">
        {entries.map((e, i) => (
          <li key={`${e.personId}-${e.kind}-${e.label}-${i}`}>
            <Link
              href={`/people/${e.personId}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <span className="text-xl">{entryIcon(e)}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-medium text-gray-900 truncate">{e.personName}</span>
                <span className="block text-sm text-gray-500 truncate">
                  {e.kind === 'birthday' ? 'Verjaardag' : e.label}
                </span>
              </span>
              <span
                className={`text-sm font-medium whitespace-nowrap ${
                  e.daysUntil < 0 ? 'text-red-600' : 'text-rose-600'
                }`}
              >
                {relativeDayLabel(e.daysUntil)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
```

- [ ] **Step 2: `PersonCard`**

Create `src/components/people/PersonCard.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import {
  personNextDate,
  daysUntil,
  REMINDER_TYPES,
  type PersonSummary,
} from '@/lib/people/shared';
import { relativeDayLabel } from './UpcomingList';

export function PersonCard({ person, today }: { person: PersonSummary; today: Date }) {
  const next = personNextDate(person, today);
  const nextLabel = next ? relativeDayLabel(daysUntil(next, today)) : null;

  return (
    <Link
      href={`/people/${person.id}`}
      className="block bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-rose-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{person.name}</h3>
          {person.group_name && (
            <span className="text-xs text-gray-500">{person.group_name}</span>
          )}
        </div>
        {nextLabel && (
          <span className="text-xs font-medium text-rose-600 whitespace-nowrap">{nextLabel}</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {REMINDER_TYPES.map((rt) =>
          person.open_counts[rt.type] > 0 ? (
            <Badge key={rt.type}>
              {rt.icon} {person.open_counts[rt.type]}
            </Badge>
          ) : null,
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: `PersonFormDialog` (nieuwe persoon)**

Create `src/components/people/PersonFormDialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { PersonGroup } from '@/lib/people/shared';

interface Props {
  open: boolean;
  groups: PersonGroup[];
  onClose: () => void;
  onSubmit: (name: string, groupId: string | null) => Promise<void>;
}

export function PersonFormDialog({ open, groups, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSubmit(name.trim(), groupId || null);
    setSaving(false);
    setName('');
    setGroupId('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Nieuwe persoon">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Naam" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Groep (optioneel)</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="">Geen groep</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" loading={saving} disabled={!name.trim()}>
            Toevoegen
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 4: `GroupManagerDialog` (groepen beheren)**

Create `src/components/people/GroupManagerDialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { PersonGroup } from '@/lib/people/shared';

interface Props {
  open: boolean;
  groups: PersonGroup[];
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function GroupManagerDialog({ open, groups, onClose, onCreate, onRename, onDelete }: Props) {
  const [newName, setNewName] = useState('');

  return (
    <Dialog open={open} onClose={onClose} title="Groepen beheren">
      <div className="space-y-4">
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center gap-2">
              <Input
                defaultValue={g.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== g.name) onRename(g.id, v);
                }}
              />
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => onDelete(g.id)}
                aria-label={`Groep ${g.name} verwijderen`}
              >
                🗑
              </Button>
            </li>
          ))}
          {groups.length === 0 && <li className="text-sm text-gray-500">Nog geen groepen.</li>}
        </ul>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            await onCreate(newName.trim());
            setNewName('');
          }}
          className="flex items-center gap-2 border-t border-gray-100 pt-4"
        >
          <Input
            placeholder="Nieuwe groep"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button type="submit" disabled={!newName.trim()}>
            +
          </Button>
        </form>

        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Sluiten
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 5: De lijstpagina `/people`**

Create `src/app/people/page.tsx`:

```tsx
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
```

- [ ] **Step 6: Verifieer types en commit**

Run: `npx tsc --noEmit`
Expected: geen fouten.

```bash
git add src/components/people/UpcomingList.tsx src/components/people/PersonCard.tsx src/components/people/PersonFormDialog.tsx src/components/people/GroupManagerDialog.tsx src/app/people/page.tsx
git commit -m "feat(people): lijstpagina met binnenkort-overzicht, kaarten en groepen"
```

---

## Task 7: Detailpagina `/people/[id]` + secties (reminders, cadeau-ideeën, historiek)

**Files:**
- Create: `src/components/people/ReminderFormDialog.tsx`
- Create: `src/components/people/ReminderSection.tsx`
- Create: `src/components/people/GiftIdeaSection.tsx`
- Create: `src/components/people/HistorySection.tsx`
- Create: `src/app/people/[id]/page.tsx`

**Interfaces:**
- Consumes: `usePerson` (Task 5), `usePeople` (voor groepskeuze in detail), `buildHistory`, `REMINDER_TYPES`, `reminderDef`, types uit `@/lib/people/shared`; UI-componenten; `relativeDayLabel` uit `UpcomingList`.
- Produces: functionele detailpagina op route `/people/[id]`.

- [ ] **Step 1: `ReminderFormDialog` (nieuwe herinnering)**

Create `src/components/people/ReminderFormDialog.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { REMINDER_TYPES, type ReminderType } from '@/lib/people/shared';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    type: ReminderType;
    text: string;
    due_date: string | null;
    recurs_annually: boolean;
  }) => Promise<void>;
}

export function ReminderFormDialog({ open, onClose, onSubmit }: Props) {
  const [type, setType] = useState<ReminderType>('bring');
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurs, setRecurs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setType('bring');
    setText('');
    setDueDate('');
    setRecurs(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (type === 'event' && !dueDate) {
      setError('Een event heeft een datum nodig.');
      return;
    }
    setSaving(true);
    await onSubmit({
      type,
      text: text.trim(),
      due_date: dueDate || null,
      recurs_annually: type === 'event' ? recurs : false,
    });
    setSaving(false);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Nieuwe herinnering">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <div className="flex gap-2">
            {REMINDER_TYPES.map((rt) => (
              <button
                key={rt.type}
                type="button"
                onClick={() => setType(rt.type)}
                className={`flex-1 px-3 py-2 rounded-lg border text-sm ${
                  type === rt.type
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                {rt.icon} {rt.label}
              </button>
            ))}
          </div>
        </div>

        <Input label="Details" value={text} onChange={(e) => setText(e.target.value)} autoFocus />

        <Input
          label={type === 'event' ? 'Datum' : 'Datum (optioneel)'}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          error={error || undefined}
        />

        {type === 'event' && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={recurs} onChange={(e) => setRecurs(e.target.checked)} />
            Elk jaar herhalen op dezelfde dag
          </label>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" loading={saving} disabled={!text.trim()}>
            Toevoegen
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 2: `ReminderSection` (per type, met afvinken + afgehandeld)**

Create `src/components/people/ReminderSection.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  REMINDER_TYPES,
  reminderDef,
  daysUntil,
  type Reminder,
} from '@/lib/people/shared';
import { relativeDayLabel } from './UpcomingList';

interface Props {
  reminders: Reminder[];
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

function DueLabel({ reminder, today }: { reminder: Reminder; today: Date }) {
  if (!reminder.due_date) return null;
  const days = daysUntil(reminder.due_date, today);
  return (
    <span className={`text-xs ${days < 0 ? 'text-red-600' : 'text-gray-500'}`}>
      {relativeDayLabel(days)}
      {reminder.type === 'event' && reminder.recurs_annually ? ' · jaarlijks' : ''}
    </span>
  );
}

export function ReminderSection({ reminders, onToggle, onDelete, onAdd }: Props) {
  const today = new Date();
  const [showDone, setShowDone] = useState(false);
  const open = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Herinneringen</h2>
        <Button size="sm" variant="secondary" onClick={onAdd}>
          + Herinnering
        </Button>
      </div>

      {REMINDER_TYPES.map((rt) => {
        const items = open.filter((r) => r.type === rt.type);
        if (items.length === 0) return null;
        return (
          <Card key={rt.type} padding={false}>
            <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b border-gray-100">
              {rt.icon} {rt.label}
            </div>
            <ul className="divide-y divide-gray-100">
              {items.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onToggle(r.id, true)}
                    aria-label="Afvinken"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-gray-900">{r.text}</span>
                    <DueLabel reminder={r} today={today} />
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(r.id)}
                    className="text-gray-300 hover:text-red-500"
                    aria-label="Verwijderen"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      {open.length === 0 && (
        <p className="text-sm text-gray-500">Geen openstaande herinneringen.</p>
      )}

      {done.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowDone((s) => !s)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showDone ? '▾' : '▸'} Afgehandeld ({done.length})
          </button>
          {showDone && (
            <ul className="mt-2 space-y-1">
              {done.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-sm text-gray-400">
                  <input type="checkbox" checked readOnly onClick={() => onToggle(r.id, false)} />
                  <span className="line-through">
                    {reminderDef(r.type).icon} {r.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: `GiftIdeaSection`**

Create `src/components/people/GiftIdeaSection.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { GiftIdea } from '@/lib/people/shared';

interface Props {
  giftIdeas: GiftIdea[];
  onAdd: (text: string) => void;
  onToggle: (id: string, given: boolean) => void;
  onDelete: (id: string) => void;
}

export function GiftIdeaSection({ giftIdeas, onAdd, onToggle, onDelete }: Props) {
  const [text, setText] = useState('');
  const open = giftIdeas.filter((g) => !g.given);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Cadeau-ideeën</h2>
      <Card padding={false}>
        <ul className="divide-y divide-gray-100">
          {open.map((g) => (
            <li key={g.id} className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={false}
                onChange={() => onToggle(g.id, true)}
                aria-label="Als gegeven markeren"
              />
              <span className="flex-1 min-w-0 text-gray-900">{g.text}</span>
              <button
                type="button"
                onClick={() => onDelete(g.id)}
                className="text-gray-300 hover:text-red-500"
                aria-label="Verwijderen"
              >
                🗑
              </button>
            </li>
          ))}
          {open.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-500">Nog geen ideeën.</li>
          )}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            onAdd(text.trim());
            setText('');
          }}
          className="flex items-center gap-2 px-4 py-3 border-t border-gray-100"
        >
          <Input placeholder="Nieuw idee" value={text} onChange={(e) => setText(e.target.value)} />
          <Button type="submit" disabled={!text.trim()}>
            +
          </Button>
        </form>
      </Card>
    </section>
  );
}
```

- [ ] **Step 4: `HistorySection`**

Create `src/components/people/HistorySection.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { buildHistory, type Reminder, type GiftIdea } from '@/lib/people/shared';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function HistorySection({
  reminders,
  giftIdeas,
}: {
  reminders: Reminder[];
  giftIdeas: GiftIdea[];
}) {
  const [open, setOpen] = useState(false);
  const history = buildHistory(reminders, giftIdeas);
  if (history.length === 0) return null;

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="text-sm font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
      >
        {open ? '▾' : '▸'} Historiek ({history.length})
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {history.map((h) => (
            <li key={`${h.kind}-${h.id}`} className="flex items-center gap-2 text-sm text-gray-600">
              <span>{h.icon}</span>
              <span className="flex-1 min-w-0 truncate">{h.label}</span>
              <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(h.date)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 5: De detailpagina `/people/[id]`**

Create `src/app/people/[id]/page.tsx`:

```tsx
'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { usePerson } from '@/lib/hooks/usePerson';
import { usePeople } from '@/lib/hooks/usePeople';
import { ReminderSection } from '@/components/people/ReminderSection';
import { ReminderFormDialog } from '@/components/people/ReminderFormDialog';
import { GiftIdeaSection } from '@/components/people/GiftIdeaSection';
import { HistorySection } from '@/components/people/HistorySection';

export default function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { groups } = usePeople();
  const {
    loading, person, groupName, reminders, giftIdeas,
    updatePerson, deletePerson,
    addReminder, updateReminder, deleteReminder,
    addGiftIdea, updateGiftIdea, deleteGiftIdea,
  } = usePerson(id);

  const [reminderDialog, setReminderDialog] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <p className="text-gray-500">Persoon niet gevonden.</p>
        <Link href="/people" className="text-rose-600">
          ← Terug naar personen
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 bg-rose-50/40">
      <div className="mx-auto w-full max-w-[780px] space-y-6">
        <header className="flex items-center gap-3">
          <Link href="/people" aria-label="Terug" className="text-gray-400 hover:text-gray-600 text-xl">
            ←
          </Link>
          <h1 className="text-2xl font-bold text-rose-900 flex-1 truncate">{person.name}</h1>
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              if (!confirm(`${person.name} verwijderen?`)) return;
              const ok = await deletePerson();
              if (ok) {
                toast(`${person.name} verwijderd`);
                router.push('/people');
              } else {
                toast('Verwijderen mislukt', 'error');
              }
            }}
          >
            Verwijderen
          </Button>
        </header>

        <Card className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Groep</label>
            <select
              value={person.group_id ?? ''}
              onChange={(e) => updatePerson({ group_id: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
            >
              <option value="">Geen groep</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {groupName && person.group_id && (
              <p className="mt-1 text-xs text-gray-400">Huidige groep: {groupName}</p>
            )}
          </div>

          <Input
            label="Verjaardag"
            type="date"
            defaultValue={person.birthday ?? ''}
            onBlur={(e) => {
              if ((e.target.value || null) !== person.birthday) {
                updatePerson({ birthday: e.target.value || null });
              }
            }}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notities</label>
            <textarea
              defaultValue={person.notes ?? ''}
              onBlur={(e) => {
                if ((e.target.value.trim() || null) !== person.notes) {
                  updatePerson({ notes: e.target.value });
                }
              }}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="Allergieën, partner, voorkeuren…"
            />
          </div>
        </Card>

        <ReminderSection
          reminders={reminders}
          onToggle={(rid, done) => updateReminder(rid, { done })}
          onDelete={deleteReminder}
          onAdd={() => setReminderDialog(true)}
        />

        <GiftIdeaSection
          giftIdeas={giftIdeas}
          onAdd={addGiftIdea}
          onToggle={(gid, given) => updateGiftIdea(gid, { given })}
          onDelete={deleteGiftIdea}
        />

        <HistorySection reminders={reminders} giftIdeas={giftIdeas} />
      </div>

      <ReminderFormDialog
        open={reminderDialog}
        onClose={() => setReminderDialog(false)}
        onSubmit={addReminder}
      />
    </div>
  );
}
```

- [ ] **Step 6: Verifieer types en commit**

Run: `npx tsc --noEmit`
Expected: geen fouten.

```bash
git add src/components/people/ReminderFormDialog.tsx src/components/people/ReminderSection.tsx src/components/people/GiftIdeaSection.tsx src/components/people/HistorySection.tsx "src/app/people/[id]/page.tsx"
git commit -m "feat(people): detailpagina met reminders, cadeau-ideeen en historiek"
```

---

## Task 8: Integratie — AppShell-route & hub-tegel

**Files:**
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: bestaande pagina's `/people` en `/people/[id]`.
- Produces: `/people` gebruikt de self-contained shell (alleen `ToastProvider`); een tegel op de landingspagina.

- [ ] **Step 1: Voeg `/people` toe aan de self-contained routes in AppShell**

Wijzig in `src/components/layout/AppShell.tsx`:

Voeg na de `isFoodDiary`-regel toe:
```tsx
  const isPeople = pathname === '/people' || pathname.startsWith('/people/');
```

En pas de conditie aan van:
```tsx
  if (isBookLibrary || isCookbook || isFoodDiary) {
    return <ToastProvider>{children}</ToastProvider>;
  }
```
naar:
```tsx
  if (isBookLibrary || isCookbook || isFoodDiary || isPeople) {
    return <ToastProvider>{children}</ToastProvider>;
  }
```

- [ ] **Step 2: Voeg de hub-tegel toe op de landingspagina**

Wijzig `src/app/page.tsx`: voeg binnen de `<div className="grid ...">` (na de food-diary `Link`) toe:

```tsx
          <Link
            href="/people"
            className="group rounded-2xl border border-rose-200 bg-rose-50 p-8 min-h-48 flex flex-col justify-between transition-all hover:bg-rose-100 hover:border-rose-300"
          >
            <span className="text-4xl">🎁</span>
            <div>
              <h2 className="text-2xl font-semibold text-rose-900">Personen</h2>
              <p className="text-sm text-rose-700 mt-2">
                Onthoud verjaardagen, cadeaus en wat je wil vragen of meenemen.
              </p>
            </div>
          </Link>
```

- [ ] **Step 3: Verifieer build en tests**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: geen typefouten, geen lint-fouten, tests groen.

- [ ] **Step 4: Handmatige eindtest in de dev-omgeving**

Run: `npm run dev`
Controleer in de browser (na PIN-login):
1. Hub toont de nieuwe tegel "Personen"; klik → `/people`.
2. Maak een groep aan (knop "Groepen"), maak een persoon aan met die groep.
3. Open de persoon: zet een verjaardag (vandaag + een paar dagen), voeg per type een herinnering toe (event met datum → verplicht; vink "elk jaar herhalen" aan), voeg een cadeau-idee toe.
4. Vink een cadeau-idee af als "gegeven" → verschijnt in Historiek.
5. Vink een terugkerend event af → datum rolt door naar volgend jaar (blijft open).
6. Vink een eenmalige "meenemen"-herinnering af → verdwijnt naar "Afgehandeld".
7. Terug op `/people`: "Binnenkort" toont de verjaardag/events; sorteer op datum werkt; groepsfilter werkt.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppShell.tsx src/app/page.tsx
git commit -m "feat(people): route in AppShell en tegel op de hub"
```

---

## Self-Review Checklist (uitgevoerd door de planner)

**Spec-dekking:**
- Persoon-centrisch model + sortering op naam/datum → Task 1 (`comparePeopleByDate`), Task 6 (lijst).
- Hybride reminder-types (bring/ask/event + vrij tekstveld) → Task 2 (schema), Task 4 (API), Task 7 (form).
- Verjaardag als veld, optioneel jaar → Task 2 (`birthday`, `birthday_has_year`), Task 7 (detail).
- Event met verplichte datum + jaarlijks herhalen → Task 4 (validatie + `rollForwardAnnual`), Task 7 (form).
- Afvinken i.p.v. verwijderen, terugkerend doorrollen → Task 1 (`rollForwardAnnual`), Task 4 (PATCH), Task 7.
- "Binnenkort"-overzicht (30 dagen, incl. overdue) → Task 1 (`buildUpcoming`), Task 6.
- Cadeau-ideeën per persoon → Task 2/4/7.
- Notitieveld → Task 2/4/7.
- Groepen/families → Task 2/3/6/7.
- Historiek (afgeleid) → Task 1 (`buildHistory`), Task 7.
- Open RLS, genummerde migratie, NL-teksten, bestaande UI-componenten → Global Constraints + Task 2/6/7.
- Unit-tests datumlogica (node:test) → Task 1.

**Placeholder-scan:** geen TBD/TODO; alle stappen bevatten volledige code en concrete commando's.

**Type-consistentie:** functienamen en types (`PersonSummary`, `Reminder`, `GiftIdea`, `buildUpcoming`, `buildHistory`, `rollForwardAnnual`, `personNextDate`, `comparePeopleByDate`, `reminderDef`) zijn identiek gebruikt in Task 1 (definitie), 3–7 (consumptie). API-contracten in Task 3/4 komen overeen met de hooks in Task 5 en het gebruik in Task 6/7.
