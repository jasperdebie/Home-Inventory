# Ontwerp — module "Taken" (terugkerende taken)

Datum: 2026-09-25
Status: ter review

## Doel

Een gedeelde lijst van zaken die we op vaste tijden moeten doen, zodat niets
vergeten wordt: huishoudtaken (badkamer poetsen, beddengoed), onderhoud (filter
dampkap, ontkalken, CV-ketel), vaste afspraken/deadlines (vuilnis buitenzetten,
huur betalen) en administratie (meterstanden doorgeven). De app toont wat
vandaag moet, wat te laat is en wat eraan komt, en bewaart wanneer een taak
gedaan werd.

## Afbakening

In scope:
- Terugkerende taken met een **vast schema** of een **interval vanaf de laatste
  keer**, per taak te kiezen.
- Afvinken, overslaan, uitstellen, ongedaan maken van de laatste gebeurtenis.
- Historiek per taak, categorieën (vaste lijst), notitie per taak.
- Taken stopzetten (archiveren) en verwijderen.

Buiten scope (bewust):
- Toewijzen aan personen of beurtrollen — het is één gedeelde lijst.
- Pushmeldingen — de app toont het enkel op het scherm.
- Eenmalige taken zonder herhaling.
- Zelf categorieën aanmaken (vaste lijst in de code).
- Schema's als "laatste vrijdag van de maand" of "elke 2e dinsdag".
- Taken tonen op het tv-dashboard (`/tv-dashboard`) — volgt in een latere stap;
  `next_due` maakt dat eenvoudig.

## 1. Plek in de app

- Nieuwe tegel op het hub-scherm (`src/app/page.tsx`): 🔁 **Taken**, teal
  kleurtint, route `/tasks`.
- `/tasks` en `/tasks/*` worden in `src/components/layout/AppShell.tsx`
  toegevoegd aan de routes zonder standaard navigatie (zoals `/people`).
- Volgt de patronen van de module "Personen":
  - Pagina's onder `src/app/tasks`
  - API onder `src/app/api/tasks`
  - Hooks in `src/lib/hooks` (`useTasks`, `useTask`)
  - Gedeelde types en pure logica in `src/lib/tasks/shared.ts`, tests in
    `src/lib/tasks/shared.test.ts` (draait met `npm test`)
  - Componenten in `src/components/tasks`, met de bestaande UI-componenten uit
    `src/components/ui` (Card, Button, Input, Dialog, Spinner, Badge, Toast)
  - Databasetoegang via `sql` uit `src/lib/db.ts`
- Nieuwe migratie `supabase/migrations/026_tasks.sql`. Er is geen script dat
  migraties automatisch uitvoert: de gebruiker voert dit bestand zelf uit op de
  Postgres-database.

## 2. Datamodel (migratie `026_tasks.sql`)

### Tabel `tasks`
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `title` TEXT NOT NULL
- `category` TEXT NOT NULL DEFAULT 'household'
  CHECK (category IN ('household', 'maintenance', 'appointment', 'admin', 'other'))
- `notes` TEXT (optioneel)
- `schedule_type` TEXT NOT NULL CHECK (schedule_type IN ('fixed', 'interval'))
- `every_n` INT NOT NULL DEFAULT 1 CHECK (every_n >= 1)
- `unit` TEXT NOT NULL CHECK (unit IN ('day', 'week', 'month', 'year'))
- `weekdays` SMALLINT[] (enkel bij `fixed` + `week`; ISO-nummering 1 = maandag …
  7 = zondag; minstens één waarde)
- `month_day` SMALLINT CHECK (month_day BETWEEN 1 AND 31) (enkel bij `fixed` +
  `month`)
- `start_date` DATE NOT NULL — eerste keer, en vertrekpunt om "elke N" te tellen
- `next_due` DATE NOT NULL — opgeslagen volgende vervaldatum
- `archived` BOOLEAN NOT NULL DEFAULT FALSE
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Tabel `task_events` (historiek)
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `task_id` UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
- `kind` TEXT NOT NULL CHECK (kind IN ('done', 'skipped'))
- `event_date` DATE NOT NULL — dag waarop het gebeurde (volgens de klok van het
  toestel)
- `due_date` DATE NOT NULL — de vervaldatum op dat moment (nodig voor
  ongedaan maken)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

Uitstellen past enkel `next_due` aan en schrijft geen `task_events`-rij.

### Indexes
- `idx_tasks_next_due` ON tasks(next_due) WHERE archived = FALSE
- `idx_task_events_task` ON task_events(task_id, created_at DESC)

### RLS
Open policies (`FOR ALL USING (true) WITH CHECK (true)`) op beide tabellen,
identiek aan migratie 025. PIN-authenticatie gebeurt op app-niveau.

### Categorieën (vaste lijst in `shared.ts`)
| waarde | label | icoon |
|---|---|---|
| `household` | Huishouden | 🧹 |
| `maintenance` | Onderhoud | 🔧 |
| `appointment` | Afspraken | 📅 |
| `admin` | Administratie | 📄 |
| `other` | Overig | 📌 |

## 3. Herhaalregels (pure functies in `shared.ts`)

Alle datums zijn `YYYY-MM-DD`-strings in lokale tijd, zoals in
`src/lib/people/shared.ts`. "Een maand/jaar erbij" clampt naar de laatste dag
van de doelmaand (31 jan + 1 maand = 28/29 feb; 29 feb + 1 jaar = 28 feb).

### Occurrences van een vast schema (`fixed`)
Een datum D ≥ `start_date` is een schemadag als:
- `day`: het aantal dagen tussen `start_date` en D deelbaar is door `every_n`.
- `week`: de ISO-weekdag van D in `weekdays` zit, en het aantal weken tussen de
  maandag van de week van `start_date` en de maandag van de week van D deelbaar
  is door `every_n`.
- `month`: D de `month_day` is van zijn maand (of de laatste dag van de maand
  als die korter is), en het aantal maanden tussen de maand van `start_date`
  en die van D deelbaar is door `every_n`.
- `year`: D dezelfde dag+maand heeft als `start_date` (29 feb → 28 feb in
  niet-schrikkeljaren), en het aantal jaren ertussen deelbaar is door `every_n`.

Hulpfunctie: `nextOccurrence(task, after)` = eerste schemadag strikt ná `after`
(en ≥ `start_date`); `firstOccurrence(task, from)` = eerste schemadag op of na
`from`.

### Eerste `next_due` bij aanmaken
- `fixed`: `firstOccurrence(task, start_date)`.
- `interval`: `start_date`.

### Afvinken (`done`) op datum `date`, huidige vervaldatum `due`
- `fixed`: `nextOccurrence(task, max(due, date))`.
  - Vuilnis moet dinsdag, afgevinkt donderdag → volgende dinsdag.
  - Afgevinkt maandag (dag vóór vervaldatum) → dinsdag van de week erna.
- `interval`: `date + every_n × unit`.

### Overslaan (`skipped`) op datum `date`
- `fixed`: `nextOccurrence(task, max(due, date))` (zelfde als afvinken).
- `interval`: `max(due, date) + every_n × unit`.

### Uitstellen
`next_due` wordt de gekozen datum (snelkeuzes +1 dag, +3 dagen, +1 week, of een
eigen datum). De datum moet ≥ vandaag zijn. Bij `fixed` loopt het ritme daarna
gewoon verder via `nextOccurrence`.

### Ongedaan maken
Verwijdert de meest recente `task_events`-rij (op `created_at`) en zet
`next_due` terug op de `due_date` van die rij. Enkel de laatste gebeurtenis kan
ongedaan gemaakt worden.

### Schema wijzigen
Als `schedule_type`, `every_n`, `unit`, `weekdays`, `month_day` of `start_date`
verandert, wordt `next_due` herberekend:
- `fixed`: `firstOccurrence(task, max(today, start_date))`.
- `interval`: als er een `done`-gebeurtenis is: `laatste done event_date +
  every_n × unit`, anders `start_date`.

### Weer activeren
Bij `archived` true → false wordt `next_due` herberekend met dezelfde regels als
bij "Schema wijzigen", en daarna begrensd op minstens `today`. Zo verschijnt een
lang gestopte taak niet meteen als "te laat" (ook niet bij een interval, waar de
laatste keer + N nog in het verleden kan liggen).

### Schema in gewone taal (`describeSchedule(task)`)
Voorbeelden:
- fixed/day/1 → "elke dag"; fixed/day/3 → "om de 3 dagen"
- fixed/week/1 [2] → "elke dinsdag"; fixed/week/1 [1,4] → "elke maandag en
  donderdag"; fixed/week/2 [6] → "om de 2 weken op zaterdag"
- fixed/month/1 day 1 → "elke 1e van de maand"; fixed/month/3 day 15 → "om de
  3 maanden op de 15e"
- fixed/year/1 → "elk jaar op 12 maart"
- interval/week/2 → "2 weken na de vorige keer"; interval/day/1 → "1 dag na de
  vorige keer"

## 4. Schermen / UX

Stijl volgt de bestaande modules (Tailwind, Nederlandse teksten,
mobiel-vriendelijk), in een teal kleurtint.

### Overzicht `/tasks`
- Header met terugknop naar de hub, titel "Taken" en knop **+ Taak**.
- Filterknoppen per categorie: Alles, 🧹, 🔧, 📅, 📄, 📌.
- Vier groepen op basis van `next_due` t.o.v. vandaag (lege groepen worden niet
  getoond):
  1. **Te laat** (vóór vandaag) — rood, label "3 dagen te laat"
  2. **Vandaag**
  3. **Komende 7 dagen** (1 t/m 7 dagen vanaf vandaag) — label met dag, bv.
     "do 2 okt"
  4. **Later** (meer dan 7 dagen) — label met datum
- Binnen elke groep gesorteerd op `next_due`, dan op titel.
- Per taak: categorie-icoon, titel, `describeSchedule`, vervallabel; rechts een
  knop **✓ Gedaan** en een **⋯**-menu met Overslaan, Uitstellen, Bewerken.
  Tikken op de taak zelf opent de detailpagina.
- Onderaan een link "Gestopte taken (N)" die de gearchiveerde taken toont
  (met knop om ze weer te activeren).
- Lege staat: "Nog geen taken. Voeg er een toe."

### Detail `/tasks/[id]`
- Titel, categorie, `describeSchedule`, volgende keer, notitie.
- Knoppen: ✓ Gedaan, Overslaan, Uitstellen, Bewerken, Stopzetten (of Weer
  activeren), Verwijderen (met bevestiging, want de historiek verdwijnt mee).
- Historiek, nieuwste eerst: "✓ Gedaan op 12 maart 2025", "⏭ Overgeslagen op
  …". Bij de bovenste regel een knop **Ongedaan maken**.

### Formulier (dialoog, voor nieuw en bewerken)
- Titel (verplicht), categorie, notitie.
- Schakelaar **Vast schema / Vanaf laatst gedaan**.
- "Elke [N] [dagen / weken / maanden / jaren]".
  - Vast + weken: aan te tikken weekdagen ma … zo (minstens één).
  - Vast + maanden: dagnummer 1–31 (standaard de dag van de startdatum).
- Startdatum (standaard vandaag).
- Live voorbeeld onder het formulier: "Volgende keer: di 30 sep, daarna di 7
  okt" (de eerste twee occurrences, berekend met dezelfde functies als de
  server).

### Uitstellen (kleine dialoog)
Snelkeuzes +1 dag, +3 dagen, +1 week, en een datumveld.

## 5. API

Alle datums in responses als `YYYY-MM-DD` (`::text` in de query). Dat voorkomt
dat Postgres `DATE` als volledige tijdstempel in JSON belandt.

| endpoint | body / query | doet |
|---|---|---|
| `GET /api/tasks` | `?archived=1` optioneel | actieve (standaard) of gearchiveerde taken, met `last_done` (laatste `done` event_date) |
| `POST /api/tasks` | taakvelden | valideert, berekent eerste `next_due` (hangt enkel af van `start_date`), maakt aan |
| `GET /api/tasks/[id]` | — | taak + historiek (nieuwste eerst) |
| `PATCH /api/tasks/[id]` | gewijzigde velden, `today` | bewerken, uitstellen (`next_due`), archiveren (`archived`); herberekent `next_due` bij een schemawijziging |
| `DELETE /api/tasks/[id]` | — | verwijdert taak (+ historiek via cascade) |
| `POST /api/tasks/[id]/complete` | `{ kind: 'done' \| 'skipped', date }` | in één transactie: event toevoegen + nieuwe `next_due` |
| `POST /api/tasks/[id]/undo` | — | in één transactie: laatste event verwijderen + `next_due` terugzetten |

"Vandaag" komt altijd van de client (`today` / `date`), omdat de server in een
andere tijdzone kan draaien dan het toestel.

### Validatie (400 met Nederlandse foutmelding)
- `title` niet leeg.
- `every_n` geheel getal ≥ 1.
- `schedule_type`, `unit`, `category` binnen de toegestane waarden.
- `fixed` + `week`: `weekdays` niet leeg, waarden 1–7.
- `fixed` + `month`: `month_day` 1–31.
- `start_date`, `date`, `today`, `next_due`: geldige `YYYY-MM-DD`; uitstellen
  naar een datum vóór `today` wordt geweigerd.
- Velden die bij het gekozen schema niet horen (`weekdays`, `month_day`) worden
  op NULL gezet.

## 6. Foutafhandeling in de UI
- Hooks laden na elke wijziging opnieuw (zoals `usePeople`).
- Mislukte acties tonen een toast met foutmelding en herladen de gegevens.
- Formulier toont validatiefouten van de API bij het betreffende veld of
  bovenaan de dialoog.

## 7. Testen
- **Unit-tests** (`src/lib/tasks/shared.test.ts`, `node --test`):
  - vast/dag om de 3 dagen; vast/week met meerdere weekdagen; vast/week om de 2
    weken; vast/maand met dag 31 in februari en in april; vast/jaar met 29 feb;
  - afvinken te laat en te vroeg (vast); interval afvinken; overslaan (vast en
    interval, met vervaldatum in verleden en toekomst);
  - maand/jaar optellen met clamping;
  - `firstOccurrence` wanneer `start_date` zelf geen schemadag is;
  - `describeSchedule` voor de voorbeelden in §3.
- **Handmatige/browsertest** van `/tasks`, detail en formulier (Playwright met
  gemockte API-responses, zoals bij het tv-dashboard), op gsm- en
  tabletformaat.
- `npx tsc --noEmit` schoon.
