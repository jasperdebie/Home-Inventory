# Ontwerp — module "Personen & Herinneringen"

Datum: 2026-07-23
Status: goedgekeurd (klaar voor implementatieplan)

## Doel

Voorkomen dat we bij een bezoek aan iemand vergeten om iets mee te nemen (kado),
iets te vragen ("hoe ging het met X"), of te feliciteren met een verjaardag /
behaalde mijlpaal. De module houdt per persoon bij wat er speelt en toont
proactief wat er binnenkort aankomt.

## 1. Concept & plek in de app

Een nieuwe module in de bestaande hub (naast Home Inventory, Book Library,
Kookboek, Eetdagboek).

- Nieuwe tegel op het hub-scherm (`src/app/page.tsx`), route `/people`.
- Kleur/icoon in lijn met de bestaande tegels: 🎁 in rozetint (rose).
- Volgt exact de bestaande patronen:
  - Pagina's onder `src/app/people`
  - API onder `src/app/api/people`
  - Hooks in `src/lib/hooks`
  - Gedeelde logica/types in `src/lib/people/shared.ts`
  - Nieuwe genummerde migratie `supabase/migrations/025_people.sql`
- Open RLS-policies zoals de rest van het project (PIN-authenticatie wordt op
  app-niveau afgehandeld, niet in de database).
- Persoon-centrisch model (lijst van personen met herinneringen eronder), met
  een aanvullend "binnenkort"-overzicht dat over alle personen heen kijkt.

## 2. Datamodel (migratie `025_people.sql`)

### Tabel `people`
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `name` TEXT NOT NULL
- `birthday` DATE (optioneel)
- `birthday_has_year` BOOLEAN NOT NULL DEFAULT true — als false telt alleen
  dag+maand (jaar onbekend)
- `notes` TEXT (optioneel) — algemeen notitieveld (allergieën, partner/kinderen,
  voorkeuren)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Tabel `people_reminders`
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `person_id` UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE
- `type` TEXT NOT NULL CHECK (type IN ('bring', 'ask', 'event'))
  - 🎁 `bring` = Meenemen, ❓ `ask` = Vragen, 📅 `event` = Event
  - Verjaardag is géén reminder-type; die staat als veld op de persoon zelf
    (voorkomt dubbele invoer en past bij "jaarlijks terugkerend").
- `text` TEXT NOT NULL — vrije details (hybride keuze: vast type + vrij tekstveld)
- `due_date` DATE (optioneel voor bring/ask, verplicht voor event — afgedwongen
  in de API)
- `recurs_annually` BOOLEAN NOT NULL DEFAULT false — vooral voor events; een
  terugkerend event rolt jaarlijks door op dezelfde dag+maand
- `done` BOOLEAN NOT NULL DEFAULT false
- `done_at` TIMESTAMPTZ (optioneel)
- `sort_order` INT NOT NULL DEFAULT 0
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Tabel `people_gift_ideas`
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `person_id` UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE
- `text` TEXT NOT NULL
- `given` BOOLEAN NOT NULL DEFAULT false
- `given_at` TIMESTAMPTZ (optioneel) — afgehandelde ideeën vormen later vanzelf
  een "historiek"
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Indexes
- `idx_people_reminders_person` ON people_reminders(person_id)
- `idx_people_reminders_due` ON people_reminders(due_date)
- `idx_people_gift_ideas_person` ON people_gift_ideas(person_id)
- `idx_people_birthday` ON people(birthday)

### RLS
Open policies (SELECT/INSERT/UPDATE/DELETE met USING/CHECK true) op alle drie de
tabellen, identiek aan de bestaande modules.

### Bewuste keuzes
- Verjaardag als veld op de persoon (niet als reminder-type).
- Afvinken (`done` / `given`) i.p.v. verwijderen als gewone flow; verwijderen
  blijft mogelijk.
- Terugkerende items (verjaardag + events met `recurs_annually`) blijven
  bestaan en rollen door naar de eerstvolgende occurrence.

## 3. Schermen / UX

Stijl volgt de bestaande modules (Tailwind, dezelfde knop-/kaart-stijlen,
Nederlandse teksten, mobiel-vriendelijk).

### Startscherm module (`/people`)
Twee zones onder elkaar:

1. **"Binnenkort"-blok (bovenaan)** — over alle personen heen: verjaardagen,
   events (incl. terugkerende) en reminders met een `due_date` die binnen het
   venster (30 dagen) vallen. Elk item toont persoon + type-icoon + "over X
   dagen". Dit is het anti-vergeet-vangnet.
2. **Personenlijst** — kaart/rij per persoon met naam, eerstvolgende relevante
   datum en badges met aantallen open items (bv. 🎁 2, ❓ 1). Bovenaan:
   - Sorteerknop: *op naam* (default) ↔ *op eerstvolgende datum*.
   - "+ Persoon"-knop.

### Persoon-detail (`/people/[id]`)
Alles van één persoon op één scherm:
- Kop: naam, verjaardag (met "over X dagen" indien gezet), notitieveld
  (inline bewerkbaar).
- **Herinneringen**, gegroepeerd per type (Meenemen / Vragen / Event): elk met
  afvink-checkbox, tekst, evt. datum + terugkerend-indicator. "+ Herinnering"
  opent een klein formulier (type, tekst, optionele/verplichte datum,
  terugkerend-vinkje voor events).
- **Cadeau-ideeën** — aparte lijst, elk met "gegeven"-vinkje. "+ Idee".
- Afgevinkte/afgehandelde items onder een inklapbaar "Afgehandeld"-kopje
  (zichtbaar maar uit de weg).

## 4. Sortering & "binnenkort"-logica

Eén centrale, pure berekening in `src/lib/people/shared.ts`, gebruikt door zowel
de lijst-sortering als het "binnenkort"-blok, zodat de regels identiek zijn.

### Eerstvolgende-datum-regel
- Terugkerende items (verjaardag + events met `recurs_annually`): neem dag+maand,
  plak het huidige jaar erop; is die datum al voorbij vandaag → volgend jaar.
  Resultaat is altijd de eerstvolgende occurrence.
- Eenmalige events/reminders: de `due_date` zelf. Voorbije, niet-afgevinkte
  eenmalige items blijven zichtbaar als "achterstallig".

### Sortering personenlijst
- *Op naam*: alfabetisch (default).
- *Op eerstvolgende datum*: per persoon de kleinste eerstvolgende datum over al
  zijn verjaardag/events/reminders; personen zonder enige datum komen achteraan.

### "Binnenkort"-blok
- Alle datum-dragende items (verjaardagen, events, reminders met `due_date`)
  waarvan de eerstvolgende datum binnen 30 dagen (incl. vandaag) valt,
  oplopend gesorteerd.
- Afgevinkte eenmalige items tellen niet mee; terugkerende tellen mee op hun
  volgende occurrence.

### Afvinken van terugkerende events
- Terugkerend event afvinken = "dit jaar afgehandeld" → rolt automatisch door
  naar volgend jaar (reminder blijft bestaan).
- Eenmalig event/reminder afvinken → verdwijnt uit de actieve lijst
  (naar "Afgehandeld").

Alle datumberekening in lokale tijd, dag-precisie, zodat "over X dagen" klopt
zonder tijdzone-verrassingen.

## 5. API & testing

### API-routes
Volgen het bestaande patroon (`createClient()` uit `@/lib/supabase/server`,
`NextResponse`, validatie + nette foutmeldingen).

- `src/app/api/people/route.ts`
  - `GET`: alle personen met data voor lijst + "binnenkort" (verjaardag,
    reminders met datum, counts van open items/gift ideas).
  - `POST`: nieuwe persoon.
- `src/app/api/people/[id]/route.ts`
  - `GET`: volledig detail (persoon + reminders + gift ideas).
  - `PATCH`: naam / verjaardag (+ `birthday_has_year`) / notities.
  - `DELETE`: persoon + cascade.
- `src/app/api/people/[id]/reminders/route.ts`
  - `POST`: nieuwe reminder. Validatie: `type` ∈ {bring, ask, event};
    `due_date` verplicht als type = event; `recurs_annually` alleen zinvol bij
    event.
- `src/app/api/people/reminders/[id]/route.ts`
  - `PATCH`: tekst / datum / afvinken (bij terugkerend event: doorrollen).
  - `DELETE`.
- `src/app/api/people/[id]/gift-ideas/route.ts`
  - `POST`: nieuw idee.
- `src/app/api/people/gift-ideas/[id]/route.ts`
  - `PATCH`: tekst / "gegeven".
  - `DELETE`.

### Hooks
Client-side, patroon van `useFoodDiary` e.d.:
- `usePeople` — lijst + sortering + "binnenkort".
- `usePerson(id)` — detail + mutaties.

### Gedeelde helper `src/lib/people/shared.ts`
- TypeScript-types (Person, Reminder, GiftIdea, ReminderType, sorteeropties).
- Pure "eerstvolgende-datum"-berekening.
- "Binnenkort"-venster (30 dagen).
- Type-labels/iconen.

### Testing
Geen bestaand testframework (enkel `eslint`). De datumlogica is de enige echt
foutgevoelige kern.
- `shared.ts` puur en zonder side-effects houden.
- Lichte unit-tests via Node's ingebouwde `node:test` (geen extra dependency)
  voor de randgevallen: schrikkeljaar (29/02), jaarwissel, datum die vandaag al
  voorbij is, personen zonder datum.
- Rest handmatig verifiëren in de dev-omgeving.

## Bewust buiten scope (later mogelijk)
- Automatische historiek van gegeven kado's/afgehandelde items.
- Groepen/familie-tags (hergebruik van bestaand "groups"-concept).
- Push-notificaties (PWA via serwist — technisch mogelijk, maar aparte klus).
