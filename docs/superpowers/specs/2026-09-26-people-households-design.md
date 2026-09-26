# Ontwerp — huishoudens met adres in "Personen"

Datum: 2026-09-26
Status: ter review

## Doel

Personen die samenwonen als één huishouden koppelen, zodat hun adres maar één
keer ingevuld wordt. Op de persoonspagina zie je het adres, met wie iemand
samenwoont, en een knop om de route te openen in Google Maps. In de lijst kun je
filteren per huishouden.

## Afbakening

In scope:
- Nieuw begrip **huishouden** naast de bestaande groepen. Een persoon zit in
  maximaal één groep én in maximaal één huishouden; die twee staan los van
  elkaar.
- Adres met aparte velden (straat, huisnummer, postcode, gemeente), enkel op het
  huishouden. Wie alleen woont, krijgt een huishouden van één persoon.
- Huishouden kiezen, aanmaken, bewerken en verwijderen vanuit de persoonspagina.
- Medebewoners en een Route-knop op de persoonspagina.
- Filter per huishouden op de lijstpagina.

Buiten scope (bewust):
- Een apart beheerscherm voor huishoudens.
- Een eigen adres op een persoon.
- Land (België wordt verondersteld), telefoonnummer of andere gedeelde gegevens.
- Het adres tonen op de personenkaart in de lijst of op het tv-dashboard.
- Groepen wijzigen of omzetten.

## 1. Datamodel (migratie `supabase/migrations/027_people_households.sql`)

### Tabel `people_households`
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `name` TEXT NOT NULL — bv. "Familie Janssen", "Jan"
- `street` TEXT (optioneel)
- `house_number` TEXT (optioneel; tekst want "12A" of "3 bus 2")
- `postal_code` TEXT (optioneel)
- `city` TEXT (optioneel)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

### Wijziging aan `people`
- `household_id` UUID REFERENCES people_households(id) ON DELETE SET NULL
- Index `idx_people_household` ON people(household_id) WHERE household_id IS NOT NULL

### RLS
Open policy op `people_households`, zoals migratie 025.

De gebruiker voert de migratie zelf uit op Postgres.

## 2. Pure helpers (in `src/lib/people/shared.ts`, met tests)

- Type `Household { id; name; street; house_number; postal_code; city; created_at }`
  (adresvelden `string | null`).
- `Person` krijgt `household_id: string | null`.
- `formatAddress(h): string` — "Straat 12, 9000 Gent". Lege delen vallen weg
  zonder losse komma's of spaties: enkel straat → "Straat"; enkel gemeente →
  "Gent"; postcode + gemeente → "9000 Gent"; alles leeg → "".
- `hasAddress(h): boolean` — true als `formatAddress(h)` niet leeg is.
- `mapsRouteUrl(h): string` —
  `https://www.google.com/maps/dir/?api=1&destination=` +
  `encodeURIComponent(formatAddress(h) + ", België")`.

## 3. API

Alle wijzigingen volgen de stijl van de bestaande people-routes (`sql` uit
`@/lib/db`, Nederlandse foutmeldingen).

| endpoint | wijziging |
|---|---|
| `GET /api/people` | response krijgt ook `households: Household[]` (op naam gesorteerd); elke persoon krijgt `household_id` |
| `GET /api/people/[id]` | response krijgt ook `household: Household \| null` en `housemates: { id, name }[]` (andere personen met hetzelfde `household_id`, op naam) |
| `PATCH /api/people/[id]` | accepteert `household_id` (string of null), zoals `group_id` |
| `POST /api/people/households` | nieuw: `{ name, street?, house_number?, postal_code?, city? }` → aangemaakt huishouden |
| `PATCH /api/people/households/[id]` | nieuw: zelfde velden, gedeeltelijk |
| `DELETE /api/people/households/[id]` | nieuw: verwijdert; personen houden `household_id = NULL` via de FK |

Validatie (400): `name` na trimmen niet leeg. Adresvelden worden getrimd; leeg
wordt NULL. Een onbekend `household_id` bij PATCH van een persoon geeft 400
"Onbekend huishouden" (FK-fout afvangen). Een ongeldig id in de URL van de
households-routes geeft 404.

## 4. Schermen

### Persoonspagina `/people/[id]` — nieuwe kaart "Huishouden"
Onder het bestaande groepsveld.

- **Geen huishouden**: keuzelijst "Geen huishouden" + bestaande huishoudens, en
  een knop **+ Nieuw huishouden**.
- **Wel een huishouden**:
  - naam van het huishouden en het adres (`formatAddress`), of "Nog geen adres"
  - knop **🧭 Route** (enkel als `hasAddress`), opent `mapsRouteUrl` in een
    nieuw tabblad
  - "Woont samen met: Els, Lotte" met links naar hun pagina (weggelaten als er
    geen medebewoners zijn)
  - keuzelijst om een ander huishouden te kiezen of "Geen huishouden"
  - knop **Bewerken**
- **+ Nieuw huishouden** opent de dialoog leeg, met als voorstel voor de naam de
  naam van de persoon. Na opslaan wordt de persoon meteen aan dat huishouden
  gekoppeld.
- **Dialoog huishouden** (nieuw en bewerken): naam (verplicht), straat,
  huisnummer, postcode, gemeente. Bij bewerken staat erbij: "Wijzigingen gelden
  voor iedereen in dit huishouden." en een knop **Huishouden verwijderen**
  (met bevestiging: "De bewoners blijven bestaan, maar hebben dan geen
  huishouden meer.").

### Lijstpagina `/people`
Naast de groepsfilter een tweede keuzelijst "Alle huishoudens" + elk
huishouden. Beide filters werken samen (EN).

## 5. Foutafhandeling
- Mislukte acties tonen een toast (zoals de rest van de module) en laden de
  gegevens opnieuw.
- De dialoog toont een validatiefout ("Naam is verplicht") bovenaan en sluit
  niet.

## 6. Testen
- Unit-tests (`src/lib/people/shared.test.ts`): `formatAddress` voor volledig,
  enkel straat, enkel gemeente, postcode + gemeente, straat zonder nummer,
  alles leeg; `hasAddress`; `mapsRouteUrl` codeert spaties en komma's.
- Browsertest met gemockte API op gsm- en tabletformaat: kaart zonder en met
  huishouden, medebewoners-links, Route-link, nieuw huishouden koppelt de
  persoon, bewerken, verwijderen, filter op de lijstpagina.
- `npm test` en `npx tsc --noEmit` groen.
- Live test door de gebruiker na het uitvoeren van migratie 027.
