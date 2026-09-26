# Huishoudens met adres — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Personen koppelen aan een huishouden met één gedeeld adres, met medebewoners en een Route-knop op de persoonspagina en een huishoudfilter op de lijst.

**Architecture:** Nieuwe tabel `people_households` + kolom `people.household_id` (migratie 027). Pure helpers (`formatAddress`, `hasAddress`, `mapsRouteUrl`, `parseHouseholdInput`) in `src/lib/people/shared.ts`, getest met `node:test`. Bestaande people-API-routes krijgen huishoudgegevens; nieuwe routes onder `src/app/api/people/households`. Hooks `usePeople`/`usePerson` geven huishoudens door; een nieuwe `HouseholdSection` met `HouseholdFormDialog` staat op de persoonspagina.

**Tech Stack:** Next.js 16 (App Router, webpack), React 19, TypeScript 5, Postgres via `postgres` (porsager), Tailwind v4, Node 24 test runner.

**Spec:** `docs/superpowers/specs/2026-09-26-people-households-design.md`

## Global Constraints

- UI-teksten en foutmeldingen in het **Nederlands**.
- `src/lib/people/shared.ts` blijft zonder imports en zonder React (wordt door `node --test` geladen).
- Migratie `supabase/migrations/027_people_households.sql`, open RLS-policy zoals 025. De gebruiker voert ze zelf uit.
- Adresvelden `street`, `house_number`, `postal_code`, `city` zijn optioneel en worden getrimd; leeg → `NULL`. `house_number` is tekst.
- Route-URL exact: `https://www.google.com/maps/dir/?api=1&destination=` + `encodeURIComponent(formatAddress(h) + ", België")`.
- Groepen blijven ongewijzigd; groep en huishouden staan los van elkaar.
- Bestaande UI-componenten uit `src/components/ui`, rozetint zoals de rest van de module. Geen nieuwe dependencies.
- Tests: `npm test`. Type-check: `npx tsc --noEmit` (met `&& echo tsc ok` in `task-done`, anders faalt het script op lege uitvoer).
- Dev-server draait met `WATCHPACK_POLLING=true` op poort 3000; de database is vanuit WSL niet bereikbaar, dus API's worden in de browser gemockt.

## Review Focus

1. **Filters die niemand opleveren** (groep + huishouden zonder overlap): de lijst toont "Geen personen voor deze filter.", niet "Nog geen personen. Voeg er een toe." → browsercheck in Task 5.
2. **Onvolledig adres** (enkel gemeente, straat zonder nummer, enkel spaties): nette weergave zonder losse komma's; geen Route-knop als er niets is. → unit-tests in Task 1, browsercheck in Task 5.
3. **Bijzondere tekens in het adres** (é, ', &): de Maps-URL is correct gecodeerd. → unit-test in Task 1.
4. **Huishouden verwijderen** laat de personen bestaan; ze verliezen enkel hun huishouden. → `ON DELETE SET NULL` in Task 2, live test in Task 6.
5. **Ongeldig of onbekend huishouden-id** (in de URL of bij het koppelen van een persoon) geeft 404/400, geen serverfout. → Task 2 (UUID-check en FK-foutcodes), curl-check.

---

## File Structure

**Nieuw:**
- `src/lib/people/households.test.ts` — unit-tests voor de huishoud-helpers.
- `supabase/migrations/027_people_households.sql`
- `src/app/api/people/households/route.ts` — POST.
- `src/app/api/people/households/[id]/route.ts` — PATCH, DELETE.
- `src/components/people/HouseholdFormDialog.tsx`
- `src/components/people/HouseholdSection.tsx`

**Wijzigen:**
- `src/lib/people/shared.ts` — types + helpers; `Person.household_id`.
- `src/lib/people/shared.test.ts` — testhelper krijgt `household_id: null`.
- `src/lib/supabase/types.ts` — `PersonRow.household_id`.
- `src/app/api/people/route.ts` — `households` + `household_id`.
- `src/app/api/people/[id]/route.ts` — `household`, `housemates`, PATCH `household_id`.
- `src/lib/hooks/usePeople.ts`, `src/lib/hooks/usePerson.ts`
- `src/app/people/[id]/page.tsx`, `src/app/people/page.tsx`

---

### Task 1: Huishoud-helpers

**Files:**
- Modify: `src/lib/people/shared.ts` (onderaan toevoegen)
- Test: `src/lib/people/households.test.ts`

**Interfaces:**
- Consumes: niets.
- Produces: types `HouseholdAddress`, `Household`, `HouseholdInput`, `Housemate`; functies `formatAddress(a: HouseholdAddress): string`, `hasAddress(a: HouseholdAddress): boolean`, `mapsRouteUrl(a: HouseholdAddress): string`, `parseHouseholdInput(body: unknown): { ok: true; value: HouseholdInput } | { ok: false; error: string }`.

- [ ] **Step 1: Write the failing test**

Maak `src/lib/people/households.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAddress, hasAddress, mapsRouteUrl, parseHouseholdInput, type HouseholdAddress } from './shared.ts';

function addr(overrides: Partial<HouseholdAddress>): HouseholdAddress {
  return { street: null, house_number: null, postal_code: null, city: null, ...overrides };
}

test('formatAddress: volledig adres', () => {
  assert.equal(formatAddress(addr({ street: 'Kerkstraat', house_number: '12', postal_code: '9000', city: 'Gent' })), 'Kerkstraat 12, 9000 Gent');
});

test('formatAddress: onvolledige adressen zonder losse komma of spatie', () => {
  assert.equal(formatAddress(addr({ street: 'Kerkstraat' })), 'Kerkstraat');
  assert.equal(formatAddress(addr({ city: 'Gent' })), 'Gent');
  assert.equal(formatAddress(addr({ postal_code: '9000', city: 'Gent' })), '9000 Gent');
  assert.equal(formatAddress(addr({ street: 'Kerkstraat', city: 'Gent' })), 'Kerkstraat, Gent');
  assert.equal(formatAddress(addr({ street: '  ', city: '  ' })), '');
  assert.equal(formatAddress(addr({})), '');
});

test('hasAddress', () => {
  assert.equal(hasAddress(addr({})), false);
  assert.equal(hasAddress(addr({ street: '   ' })), false);
  assert.equal(hasAddress(addr({ city: 'Gent' })), true);
});

test('mapsRouteUrl codeert bijzondere tekens en voegt België toe', () => {
  const url = mapsRouteUrl(addr({ street: "Rue de l'Église", house_number: '5 & 7', postal_code: '1000', city: 'Brussel' }));
  assert.equal(
    url,
    'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent("Rue de l'Église 5 & 7, 1000 Brussel, België"),
  );
  assert.ok(url.includes('%26'));
  assert.ok(!url.includes(' '));
});

test('parseHouseholdInput trimt en zet lege velden op null', () => {
  assert.deepEqual(parseHouseholdInput({ name: '  Familie Janssen ', street: ' Kerkstraat ', house_number: '', postal_code: '9000', city: '   ' }), {
    ok: true,
    value: { name: 'Familie Janssen', street: 'Kerkstraat', house_number: null, postal_code: '9000', city: null },
  });
});

test('parseHouseholdInput weigert een lege naam of ongeldige invoer', () => {
  assert.deepEqual(parseHouseholdInput({ name: '  ' }), { ok: false, error: 'Naam is verplicht' });
  assert.deepEqual(parseHouseholdInput(null), { ok: false, error: 'Ongeldige invoer' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/people/households.test.ts`
Expected: FAIL — `formatAddress` (en de andere) bestaan niet (`SyntaxError`/`does not provide an export named`).

- [ ] **Step 3: Write minimal implementation**

Voeg onderaan `src/lib/people/shared.ts` toe:

```ts
// ─── Huishoudens ─────────────────────────────────────────────

export interface HouseholdAddress {
  street: string | null;
  house_number: string | null;
  postal_code: string | null;
  city: string | null;
}

export interface Household extends HouseholdAddress {
  id: string;
  name: string;
  created_at: string;
}

export interface HouseholdInput extends HouseholdAddress {
  name: string;
}

export interface Housemate {
  id: string;
  name: string;
}

function cleanPart(value: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** "Kerkstraat 12, 9000 Gent"; lege delen vallen weg. */
export function formatAddress(a: HouseholdAddress): string {
  const line1 = [cleanPart(a.street), cleanPart(a.house_number)].filter(Boolean).join(' ');
  const line2 = [cleanPart(a.postal_code), cleanPart(a.city)].filter(Boolean).join(' ');
  return [line1, line2].filter(Boolean).join(', ');
}

export function hasAddress(a: HouseholdAddress): boolean {
  return formatAddress(a) !== '';
}

export function mapsRouteUrl(a: HouseholdAddress): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${formatAddress(a)}, België`)}`;
}

export function parseHouseholdInput(
  body: unknown,
): { ok: true; value: HouseholdInput } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Ongeldige invoer' };
  const b = body as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name) return { ok: false, error: 'Naam is verplicht' };
  const field = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    ok: true,
    value: {
      name,
      street: field(b.street),
      house_number: field(b.house_number),
      postal_code: field(b.postal_code),
      city: field(b.city),
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS, alle tests (ook de bestaande) groen.

- [ ] **Step 5: Commit**

```bash
git add src/lib/people/shared.ts src/lib/people/households.test.ts
git commit -m "feat(people): helpers voor huishoudadres met tests"
```

---

### Task 2: Migratie, types en API

**Files:**
- Create: `supabase/migrations/027_people_households.sql`
- Create: `src/app/api/people/households/route.ts`
- Create: `src/app/api/people/households/[id]/route.ts`
- Modify: `src/lib/people/shared.ts` (`Person`)
- Modify: `src/lib/people/shared.test.ts` (testhelper `person`)
- Modify: `src/lib/supabase/types.ts` (`PersonRow`)
- Modify: `src/app/api/people/route.ts`
- Modify: `src/app/api/people/[id]/route.ts`

**Interfaces:**
- Consumes: `parseHouseholdInput`, `Household` (Task 1).
- Produces:
  - `Person.household_id: string | null` (en dus ook op `PersonSummary`)
  - `GET /api/people` → `{ groups, households: Household[], people }`
  - `GET /api/people/[id]` → `{ person, group_name, reminders, giftIdeas, household: Household | null, housemates: Housemate[] }`
  - `PATCH /api/people/[id]` accepteert `household_id: string | null`; onbekend/ongeldig → `400 { error: 'Onbekend huishouden' }`
  - `POST /api/people/households` → `201 Household` / `400 { error }`
  - `PATCH /api/people/households/[id]` → `Household` / `400` / `404`
  - `DELETE /api/people/households/[id]` → `{ success: true }` / `404`

- [ ] **Step 1: Write the migration**

Maak `supabase/migrations/027_people_households.sql`:

```sql
-- ============================================================
-- 027_people_households.sql
-- Huishoudens met één gedeeld adres; een persoon zit in hoogstens
-- één huishouden (los van de groepen).
-- Open beleid: PIN-authenticatie wordt afgehandeld op app-niveau.
-- ============================================================

CREATE TABLE people_households (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  street       TEXT,
  house_number TEXT,
  postal_code  TEXT,
  city         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE people
  ADD COLUMN household_id UUID REFERENCES people_households(id) ON DELETE SET NULL;

CREATE INDEX idx_people_household ON people(household_id) WHERE household_id IS NOT NULL;

ALTER TABLE people_households ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on people_households" ON people_households FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Extend the types**

In `src/lib/people/shared.ts`, in `interface Person`, vervang

```ts
  group_id: string | null;
  birthday: string | null; // YYYY-MM-DD
```

door

```ts
  group_id: string | null;
  household_id: string | null;
  birthday: string | null; // YYYY-MM-DD
```

In `src/lib/people/shared.test.ts`, in de helper `person`, vervang

```ts
    id: 'p', name: 'Naam', group_id: null, group_name: null,
```

door

```ts
    id: 'p', name: 'Naam', group_id: null, household_id: null, group_name: null,
```

In `src/lib/supabase/types.ts`, in `PersonRow`, voeg na `group_id: string | null;` toe:

```ts
  household_id: string | null;
```

- [ ] **Step 3: Update `GET /api/people`**

In `src/app/api/people/route.ts`:

Vervang

```ts
    const [groups, peopleRows, reminders] = await Promise.all([
      sql`SELECT * FROM people_groups ORDER BY name ASC`,
      sql`SELECT id, name, group_id, birthday::text AS birthday, birthday_has_year, notes, created_at FROM people ORDER BY name ASC`,
```

door

```ts
    const [groups, households, peopleRows, reminders] = await Promise.all([
      sql`SELECT * FROM people_groups ORDER BY name ASC`,
      sql`SELECT * FROM people_households ORDER BY name ASC`,
      sql`SELECT id, name, group_id, household_id, birthday::text AS birthday, birthday_has_year, notes, created_at FROM people ORDER BY name ASC`,
```

Vervang

```ts
        group_name: p.group_id ? groupNameById.get(p.group_id) ?? null : null,
```

door

```ts
        group_name: p.group_id ? groupNameById.get(p.group_id) ?? null : null,
        household_id: p.household_id ?? null,
```

Vervang

```ts
    return NextResponse.json({ groups, people });
```

door

```ts
    return NextResponse.json({ groups, households, people });
```

- [ ] **Step 4: Update `GET` and `PATCH /api/people/[id]`**

In `src/app/api/people/[id]/route.ts`:

In de GET-query, vervang

```ts
        p.group_id,
        p.birthday::text AS birthday,
```

door

```ts
        p.group_id,
        p.household_id,
        p.birthday::text AS birthday,
```

Vervang

```ts
    const [reminders, giftIdeas] = await Promise.all([
```

door

```ts
    const [reminders, giftIdeas, householdRows, housemates] = await Promise.all([
```

en voeg in die `Promise.all`-array, na de tweede query (`people_gift_ideas`) en vóór de sluitende `]);`, toe:

```ts
      person.household_id
        ? sql`SELECT * FROM people_households WHERE id = ${person.household_id}`
        : Promise.resolve([]),
      person.household_id
        ? sql`SELECT id, name FROM people WHERE household_id = ${person.household_id} AND id <> ${id} ORDER BY name ASC`
        : Promise.resolve([]),
```

Vervang

```ts
      reminders,
      giftIdeas,
    });
```

door

```ts
      reminders,
      giftIdeas,
      household: householdRows[0] ?? null,
      housemates,
    });
```

In de PATCH-query, vervang

```ts
        group_id = ${'group_id' in body ? body.group_id || null : current.group_id},
```

door

```ts
        group_id = ${'group_id' in body ? body.group_id || null : current.group_id},
        household_id = ${'household_id' in body ? body.household_id || null : current.household_id},
```

In de `catch` van PATCH, vervang

```ts
    console.error('Update person failed', error);
```

door

```ts
    const code = (error as { code?: string }).code;
    if ('household_id' in body && (code === '23503' || code === '22P02')) {
      return NextResponse.json({ error: 'Onbekend huishouden' }, { status: 400 });
    }
    console.error('Update person failed', error);
```

(`23503` = foreign key violation, `22P02` = ongeldige UUID-tekst.)

- [ ] **Step 5: Write the households routes**

Maak `src/app/api/people/households/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { parseHouseholdInput } from '@/lib/people/shared';

export async function POST(request: NextRequest) {
  const parsed = parseHouseholdInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const h = parsed.value;

  try {
    const [row] = await sql`
      INSERT INTO people_households (name, street, house_number, postal_code, city)
      VALUES (${h.name}, ${h.street}, ${h.house_number}, ${h.postal_code}, ${h.city})
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error('Create household failed', error);
    return NextResponse.json({ error: 'Huishouden opslaan mislukt' }, { status: 500 });
  }
}
```

Maak `src/app/api/people/households/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { parseHouseholdInput } from '@/lib/people/shared';

type Ctx = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound() {
  return NextResponse.json({ error: 'Huishouden niet gevonden' }, { status: 404 });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return notFound();
  const body = await request.json().catch(() => null);

  try {
    const [current] = await sql`SELECT * FROM people_households WHERE id = ${id}`;
    if (!current) return notFound();

    const parsed = parseHouseholdInput({ ...current, ...(typeof body === 'object' && body ? body : {}) });
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const h = parsed.value;

    const [row] = await sql`
      UPDATE people_households
      SET name = ${h.name}, street = ${h.street}, house_number = ${h.house_number},
          postal_code = ${h.postal_code}, city = ${h.city}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(row);
  } catch (error) {
    console.error('Update household failed', error);
    return NextResponse.json({ error: 'Huishouden opslaan mislukt' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return notFound();

  try {
    const rows = await sql`DELETE FROM people_households WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) return notFound();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete household failed', error);
    return NextResponse.json({ error: 'Huishouden verwijderen mislukt' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Verify**

Run: `npm test && npx tsc --noEmit && echo tsc ok`
Expected: alle tests groen, `tsc ok`.

Run:
```bash
for m in PATCH DELETE; do curl -s -m 90 -o /dev/null -w "$m households/abc -> %{http_code}\n" -X $m -H 'Content-Type: application/json' -d '{}' --cookie "home-inventory-auth=authenticated" http://localhost:3000/api/people/households/abc; done
```
Expected: beide `404` (werkt zonder database: de UUID-check komt vóór de query).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/027_people_households.sql src/app/api/people src/lib/people/shared.ts src/lib/people/shared.test.ts src/lib/supabase/types.ts
git commit -m "feat(people): migratie en API voor huishoudens"
```

---

### Task 3: Hooks

**Files:**
- Modify: `src/lib/hooks/usePeople.ts` (volledig vervangen)
- Modify: `src/lib/hooks/usePerson.ts`

**Interfaces:**
- Consumes: `Household`, `HouseholdInput`, `Housemate` (Task 1); API uit Task 2.
- Produces:
  - `usePeople()` → bestaande velden + `households: Household[]`, `createHousehold(input: HouseholdInput): Promise<{ household: Household | null; error: string | null }>`, `updateHousehold(id: string, input: HouseholdInput): Promise<string | null>`, `deleteHousehold(id: string): Promise<string | null>`
  - `usePerson(id)` → bestaande velden + `household: Household | null`, `housemates: Housemate[]`; `updatePerson` accepteert ook `household_id`.

- [ ] **Step 1: Replace `usePeople`**

Vervang de volledige inhoud van `src/lib/hooks/usePeople.ts` door:

```ts
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
```

- [ ] **Step 2: Extend `usePerson`**

In `src/lib/hooks/usePerson.ts`:

Vervang

```ts
import type { Person, Reminder, GiftIdea, ReminderType } from '@/lib/people/shared';
```

door

```ts
import type { Person, Reminder, GiftIdea, ReminderType, Household, Housemate } from '@/lib/people/shared';
```

Vervang

```ts
  const [giftIdeas, setGiftIdeas] = useState<GiftIdea[]>([]);
```

door

```ts
  const [giftIdeas, setGiftIdeas] = useState<GiftIdea[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);
  const [housemates, setHousemates] = useState<Housemate[]>([]);
```

Vervang

```ts
      const data: { person: Person; group_name: string | null; reminders: Reminder[]; giftIdeas: GiftIdea[] } =
        await res.json();
```

door

```ts
      const data: {
        person: Person;
        group_name: string | null;
        reminders: Reminder[];
        giftIdeas: GiftIdea[];
        household: Household | null;
        housemates: Housemate[];
      } = await res.json();
```

Vervang

```ts
      setGiftIdeas(data.giftIdeas);
```

door

```ts
      setGiftIdeas(data.giftIdeas);
      setHousehold(data.household);
      setHousemates(data.housemates);
```

Vervang

```ts
    async (patch: Partial<Pick<Person, 'name' | 'group_id' | 'birthday' | 'birthday_has_year' | 'notes'>>) => {
```

door

```ts
    async (patch: Partial<Pick<Person, 'name' | 'group_id' | 'household_id' | 'birthday' | 'birthday_has_year' | 'notes'>>) => {
```

Vervang

```ts
    loading, person, groupName, reminders, giftIdeas, refetch,
```

door

```ts
    loading, person, groupName, reminders, giftIdeas, household, housemates, refetch,
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && echo tsc ok`
Expected: `tsc ok`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/hooks/usePeople.ts src/lib/hooks/usePerson.ts
git commit -m "feat(people): huishoudens in usePeople en usePerson"
```

---

### Task 4: Componenten

**Files:**
- Create: `src/components/people/HouseholdFormDialog.tsx`
- Create: `src/components/people/HouseholdSection.tsx`

**Interfaces:**
- Consumes: `formatAddress`, `hasAddress`, `mapsRouteUrl`, types (Task 1).
- Produces:
  - `<HouseholdFormDialog open initial={Household | null} suggestedName onClose onSubmit={(input: HouseholdInput) => Promise<string | null>} onDelete?={() => Promise<string | null>} />`
  - `<HouseholdSection personName household={Household | null} housemates households onSelect={(householdId: string | null) => void} onCreate onUpdate onDelete />` — `onCreate`/`onUpdate` krijgen een `HouseholdInput`, alle drie geven `Promise<string | null>`.

- [ ] **Step 1: Write the dialog**

Maak `src/components/people/HouseholdFormDialog.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Household, HouseholdInput } from '@/lib/people/shared';

interface Props {
  open: boolean;
  initial: Household | null;
  suggestedName: string;
  onClose: () => void;
  onSubmit: (input: HouseholdInput) => Promise<string | null>;
  onDelete?: () => Promise<string | null>;
}

const EMPTY = { name: '', street: '', house_number: '', postal_code: '', city: '' };
type FormState = typeof EMPTY;

export function HouseholdFormDialog({ open, initial, suggestedName, onClose, onSubmit, onDelete }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      initial
        ? {
            name: initial.name,
            street: initial.street ?? '',
            house_number: initial.house_number ?? '',
            postal_code: initial.postal_code ?? '',
            city: initial.city ?? '',
          }
        : { ...EMPTY, name: suggestedName },
    );
    setError(null);
  }, [open, initial, suggestedName]);

  const set = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const finish = async (action: () => Promise<string | null>) => {
    setSaving(true);
    const err = await action();
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Naam is verplicht');
      return;
    }
    finish(() =>
      onSubmit({
        name: form.name.trim(),
        street: form.street.trim() || null,
        house_number: form.house_number.trim() || null,
        postal_code: form.postal_code.trim() || null,
        city: form.city.trim() || null,
      }),
    );
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (!window.confirm('Huishouden verwijderen? De bewoners blijven bestaan, maar hebben dan geen huishouden meer.')) return;
    finish(onDelete);
  };

  return (
    <Dialog open={open} onClose={onClose} title={initial ? 'Huishouden bewerken' : 'Nieuw huishouden'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Input label="Naam" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <Input label="Straat" value={form.street} onChange={(e) => set('street', e.target.value)} />
          <Input label="Nr." value={form.house_number} onChange={(e) => set('house_number', e.target.value)} />
        </div>
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          <Input
            label="Postcode"
            inputMode="numeric"
            value={form.postal_code}
            onChange={(e) => set('postal_code', e.target.value)}
          />
          <Input label="Gemeente" value={form.city} onChange={(e) => set('city', e.target.value)} />
        </div>
        {initial && <p className="text-xs text-gray-500">Wijzigingen gelden voor iedereen in dit huishouden.</p>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {initial && onDelete ? (
            <Button type="button" variant="danger" size="sm" disabled={saving} onClick={handleDelete}>
              Huishouden verwijderen
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuleren
            </Button>
            <Button type="submit" loading={saving}>
              {initial ? 'Opslaan' : 'Toevoegen'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
```

- [ ] **Step 2: Write the section**

Maak `src/components/people/HouseholdSection.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { HouseholdFormDialog } from '@/components/people/HouseholdFormDialog';
import {
  formatAddress, hasAddress, mapsRouteUrl,
  type Household, type HouseholdInput, type Housemate,
} from '@/lib/people/shared';

interface Props {
  personName: string;
  household: Household | null;
  housemates: Housemate[];
  households: Household[];
  onSelect: (householdId: string | null) => void;
  onCreate: (input: HouseholdInput) => Promise<string | null>;
  onUpdate: (input: HouseholdInput) => Promise<string | null>;
  onDelete: () => Promise<string | null>;
}

export function HouseholdSection({
  personName, household, housemates, households, onSelect, onCreate, onUpdate, onDelete,
}: Props) {
  const [dialog, setDialog] = useState<'new' | 'edit' | null>(null);

  return (
    <div>
      <label htmlFor="household-select" className="mb-1 block text-sm font-medium text-gray-700">
        Huishouden
      </label>
      <div className="flex gap-2">
        <select
          id="household-select"
          value={household?.id ?? ''}
          onChange={(e) => onSelect(e.target.value || null)}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
        >
          <option value="">Geen huishouden</option>
          {households.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <Button type="button" variant="secondary" size="sm" onClick={() => setDialog('new')}>
          + Nieuw huishouden
        </Button>
      </div>

      {household && (
        <div className="mt-3 space-y-2 rounded-lg border border-rose-100 bg-rose-50/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{household.name}</p>
              <p className="text-sm text-gray-600">{hasAddress(household) ? formatAddress(household) : 'Nog geen adres'}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDialog('edit')}>
              Bewerken
            </Button>
          </div>
          {hasAddress(household) && (
            <a
              href={mapsRouteUrl(household)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
            >
              🧭 Route
            </a>
          )}
          {housemates.length > 0 && (
            <p className="text-sm text-gray-600">
              Woont samen met:{' '}
              {housemates.map((m, i) => (
                <span key={m.id}>
                  {i > 0 && ', '}
                  <Link href={`/people/${m.id}`} className="text-rose-700 hover:underline">
                    {m.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      <HouseholdFormDialog
        open={dialog !== null}
        initial={dialog === 'edit' ? household : null}
        suggestedName={personName}
        onClose={() => setDialog(null)}
        onSubmit={dialog === 'edit' ? onUpdate : onCreate}
        onDelete={dialog === 'edit' ? onDelete : undefined}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && echo tsc ok`
Expected: `tsc ok`.

- [ ] **Step 4: Commit**

```bash
git add src/components/people/HouseholdFormDialog.tsx src/components/people/HouseholdSection.tsx
git commit -m "feat(people): componenten voor huishouden en adres"
```

---

### Task 5: Pagina's koppelen

**Files:**
- Modify: `src/app/people/[id]/page.tsx`
- Modify: `src/app/people/page.tsx`

**Interfaces:**
- Consumes: `usePeople` (households + acties) en `usePerson` (household, housemates, refetch, updatePerson) uit Task 3; `HouseholdSection` uit Task 4.
- Produces: werkende schermen.

- [ ] **Step 1: Persoonspagina**

In `src/app/people/[id]/page.tsx`:

Voeg bij de imports toe:

```tsx
import { HouseholdSection } from '@/components/people/HouseholdSection';
```

Vervang

```tsx
  const { groups } = usePeople();
  const {
    loading, person, groupName, reminders, giftIdeas,
```

door

```tsx
  const { groups, households, createHousehold, updateHousehold, deleteHousehold } = usePeople();
  const {
    loading, person, groupName, reminders, giftIdeas, household, housemates, refetch,
```

Voeg in de eerste `<Card className="space-y-3">`, direct na de afsluitende `</div>` van het groepsveld (het blok met `Huidige groep:`), toe:

```tsx
          <HouseholdSection
            personName={person.name}
            household={household}
            housemates={housemates}
            households={households}
            onSelect={(householdId) => updatePerson({ household_id: householdId })}
            onCreate={async (input) => {
              const { household: created, error } = await createHousehold(input);
              if (error || !created) return error ?? 'Opslaan mislukt';
              await updatePerson({ household_id: created.id });
              return null;
            }}
            onUpdate={async (input) => {
              if (!household) return 'Geen huishouden gekozen';
              const error = await updateHousehold(household.id, input);
              await refetch();
              return error;
            }}
            onDelete={async () => {
              if (!household) return null;
              const error = await deleteHousehold(household.id);
              await refetch();
              return error;
            }}
          />
```

- [ ] **Step 2: Lijstpagina**

In `src/app/people/page.tsx`:

Vervang

```tsx
  const { loading, people, groups, createPerson, createGroup, renameGroup, deleteGroup } = usePeople();
```

door

```tsx
  const { loading, people, groups, households, createPerson, createGroup, renameGroup, deleteGroup } = usePeople();
```

Vervang

```tsx
  const [groupFilter, setGroupFilter] = useState<string>('');
```

door

```tsx
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [householdFilter, setHouseholdFilter] = useState<string>('');
```

Vervang

```tsx
    const filtered = groupFilter ? people.filter((p) => p.group_id === groupFilter) : people;
```

door

```tsx
    const filtered = people.filter(
      (p) => (!groupFilter || p.group_id === groupFilter) && (!householdFilter || p.household_id === householdFilter),
    );
```

en vervang in de dependency-array van diezelfde `useMemo`

```tsx
  }, [people, groupFilter, sort, today]);
```

door

```tsx
  }, [people, groupFilter, householdFilter, sort, today]);
```

Voeg direct na de afsluitende `</select>` van de groepsfilter (de select met `<option value="">Alle groepen</option>`) toe:

```tsx
              {households.length > 0 && (
                <select
                  value={householdFilter}
                  onChange={(e) => setHouseholdFilter(e.target.value)}
                  aria-label="Filter op huishouden"
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900"
                >
                  <option value="">Alle huishoudens</option>
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              )}
```

Vervang

```tsx
          {visible.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">Nog geen personen. Voeg er een toe.</p>
          ) : (
```

door

```tsx
          {visible.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              {people.length === 0 ? 'Nog geen personen. Voeg er een toe.' : 'Geen personen voor deze filter.'}
            </p>
          ) : (
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit && echo tsc ok`
Expected: `tsc ok`.

- [ ] **Step 4: Browser check with mocked API**

Playwright, cookie `home-inventory-auth=authenticated`, viewport 390×844 en 1024×768. Mocks:
- `GET **/api/people` → groepen `[{id:'g1',name:'Vrienden'}]`, huishoudens `[{id:'h1',name:'Familie Janssen',street:'Kerkstraat',house_number:'12',postal_code:'9000',city:'Gent'},{id:'h2',name:'Tom',street:null,house_number:null,postal_code:null,city:'Brugge'}]`, personen Jan (h1, g1), Els (h1, geen groep), Tom (h2, g1), Lotte (geen huishouden) — alle met de velden van `PersonSummary` (`open_counts`, `dated_items: []`).
- `GET **/api/people/<jan-id>` → `{ person: Jan, group_name: 'Vrienden', reminders: [], giftIdeas: [], household: h1, housemates: [{id: <els-id>, name:'Els'}] }`.
- `GET **/api/people/<lotte-id>` → idem met `household: null, housemates: []`.
- `POST **/api/people/households` → `201` met een nieuw huishouden `h3`; tel de aanroepen.
- `PATCH **/api/people/<lotte-id>` → `200`; bewaar de body.

Controleer:
- Jan: "Familie Janssen", "Kerkstraat 12, 9000 Gent", link "🧭 Route" met `href` = `https://www.google.com/maps/dir/?api=1&destination=Kerkstraat%2012%2C%209000%20Gent%2C%20Belgi%C3%AB`, "Woont samen met: Els" met link naar Els.
- Lotte: keuzelijst "Geen huishouden", geen adresblok; "+ Nieuw huishouden" opent de dialoog met naam "Lotte"; opslaan → 1 POST, daarna PATCH met body `{"household_id":"h3"}`.
- Dialoog met lege naam → melding "Naam is verplicht", dialoog blijft open.
- Een huishouden met enkel gemeente (Tom): "Brugge", wel Route-knop.
- Lijst: filter "Familie Janssen" → Jan en Els; groep "Vrienden" + huishouden "Familie Janssen" → enkel Jan; groep "Vrienden" + een huishouden zonder leden uit die groep → "Geen personen voor deze filter." (Review Focus 1).
- Geen consolefouten; op 390×844 geen horizontaal scrollen.

- [ ] **Step 5: Commit**

```bash
git add "src/app/people/[id]/page.tsx" src/app/people/page.tsx
git commit -m "feat(people): huishouden op persoonspagina en filter in de lijst"
```

---

### Task 6: Eindcontrole en live test

**Files:** geen nieuwe; eventueel fixes.

**Interfaces:**
- Consumes: alles hierboven.
- Produces: geteste functie op de echte database.

- [ ] **Step 1: Volledige checks**

Run: `npm test && npx tsc --noEmit && echo tsc ok && npm run build`
Expected: tests groen, `tsc ok`, build geslaagd met de routes `/api/people/households` en `/api/people/households/[id]`.

- [ ] **Step 2: Migratie door de gebruiker**

Vraag de gebruiker om `supabase/migrations/027_people_households.sql` uit te voeren op Postgres. Wacht op bevestiging.

- [ ] **Step 3: Live test door de gebruiker**

Na pushen en herstarten op de server laat je de gebruiker controleren:
1. Bij een persoon "+ Nieuw huishouden" met adres → persoon is gekoppeld, adres en Route zichtbaar; Route opent Google Maps op het juiste adres.
2. Tweede persoon via de keuzelijst aan hetzelfde huishouden koppelen → beide zien elkaar bij "Woont samen met".
3. Adres bewerken bij de ene persoon → ook zichtbaar bij de andere.
4. Filter per huishouden op de lijst.
5. Huishouden verwijderen → beide personen bestaan nog, zonder huishouden (Review Focus 4).

- [ ] **Step 4: Commit eventuele fixes**

Enkel als de controles een fix nodig maakten: stage de gewijzigde bestanden bij naam en commit met `fix(people): …`. Anders geen commit.
