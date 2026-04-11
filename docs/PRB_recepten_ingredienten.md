# PRB: Recepten & Ingrediënten

## Overzicht

Gebruikers kunnen recepten aanmaken met een lijst van benodigde producten (ingrediënten). Vanuit een recept kun je met één klik alle ontbrekende ingrediënten toevoegen aan de boodschappenlijst. Bonus: bij het "koken" van een recept wordt de voorraad automatisch afgetrokken.

---

## Fase 1: Database Schema

**Nieuwe tabellen** (migratie `008_recipes.sql`):

```sql
-- Recepten
recipes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,            -- optionele beschrijving/instructies
  servings    INT DEFAULT 4,   -- standaard aantal porties
  image_url   TEXT,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
)

-- Ingrediënten per recept
recipe_ingredients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,  -- link naar bestaand product (optioneel)
  name        TEXT NOT NULL,    -- ingrediënt naam (fallback als geen product_id)
  quantity    NUMERIC NOT NULL DEFAULT 1,
  unit        TEXT,             -- stuks, gram, ml, etc.
  UNIQUE(recipe_id, product_id) -- voorkom dubbele ingrediënten
)
```

**Waarom `product_id` nullable?** Niet elk ingrediënt hoeft een product uit de inventaris te zijn (bijv. "snufje zout"). Alleen gelinkte ingrediënten worden meegenomen bij voorraadberekeningen.

**Trigger:** `updated_at` automatisch bijwerken op `recipes` (zelfde patroon als `products`).

**RLS:** Zelfde open beleid als andere tabellen (PIN-auth op app-niveau).

---

## Fase 2: TypeScript Types

In `src/lib/supabase/types.ts`:

```typescript
interface Recipe {
  id: string
  name: string
  description: string | null
  servings: number
  image_url: string | null
  is_archived: boolean
  created_at: string
  updated_at: string
}

interface RecipeIngredient {
  id: string
  recipe_id: string
  product_id: string | null
  name: string
  quantity: number
  unit: string | null
}

interface RecipeWithIngredients extends Recipe {
  recipe_ingredients: (RecipeIngredient & {
    product?: ProductWithCategory | null
  })[]
}
```

---

## Fase 3: Data Hook

Nieuw bestand: `src/lib/hooks/useRecipes.ts`

| Functie | Beschrijving |
|---------|-------------|
| `fetchRecipes()` | Alle niet-gearchiveerde recepten ophalen |
| `fetchRecipe(id)` | Enkel recept met ingrediënten + product-relaties |
| `createRecipe(data)` | Recept + ingrediënten in één keer aanmaken |
| `updateRecipe(id, data)` | Recept en ingrediënten bijwerken |
| `deleteRecipe(id)` | Soft delete (archive) |
| `getMissingIngredients(recipe)` | Berekent welke ingrediënten onder voorraad zijn |
| `addMissingToShoppingList(recipe)` | Voegt ontbrekende ingrediënten toe aan boodschappenlijst |
| `cookRecipe(recipe, servings?)` | Trek voorraad af via `stock_changes` (type: `'consume'`) |

### Boodschappenlijst-integratie — twee paden

1. **Gelinkt product (`product_id` aanwezig):** Vergelijk `recipe_ingredient.quantity` met `product.current_stock`. Als onvoldoende → markeer als "needed".
2. **Niet-gelinkt ingrediënt:** Maak een `shopping_items` record aan (ad-hoc lijst, al bestaand).

> **Aanbeveling:** Gebruik de bestaande `shopping_items` tabel voor ALLE ontbrekende ingrediënten (ook gelinkte). Voeg een `recipe_id` kolom toe aan `shopping_items` zodat je kunt groeperen per recept. Dit is het simpelste pad en werkt met de bestaande shopping UI.

---

## Fase 4: Pagina's & Routes

| Route | Doel |
|-------|------|
| `/recipes` | Overzicht van alle recepten (grid, zoekbaar) |
| `/recipes/new` | Nieuw recept aanmaken |
| `/recipes/[id]` | Recept detail: ingrediënten, kook-knop, boodschappenlijst-knop |
| `/recipes/[id]/edit` | Recept bewerken |

---

## Fase 5: Components

```
src/components/recipes/
├── RecipeGrid.tsx          -- Grid van receptkaarten met zoekfunctie
├── RecipeCard.tsx          -- Kaart met naam, # ingrediënten, portie-info
├── RecipeForm.tsx          -- Formulier: naam, beschrijving, porties, ingrediënten
├── IngredientRow.tsx       -- Eén ingrediënt-rij (quantity, unit, naam/product-picker)
├── IngredientSearch.tsx    -- Zoek/selecteer bestaand product OF typ vrij
├── MissingIngredients.tsx  -- Toont ontbrekende ingrediënten + "Voeg toe" knop
└── CookDialog.tsx          -- Bevestigingsdialog: porties aanpassen, voorraad aftrekken
```

### IngredientSearch

Het slimste component:
- Zoekt in bestaande `products` tabel
- Gebruiker kan een bestaand product selecteren (→ `product_id` wordt ingevuld)
- Of een vrije tekst invullen (→ alleen `name` wordt opgeslagen)
- Hergebruik het `SearchableSelect` patroon dat al bestaat

---

## Fase 6: Navigatie

- Voeg **"Recepten"** toe aan `BottomNav.tsx` en `Sidebar.tsx`
- Icoon: 📖 of kook-icoon
- Volgorde: Home, Products, Groups, **Recipes**, Shopping, Scanner

---

## Fase 7: "Kook" Functionaliteit (Bonus)

Bij het klikken op **"Kook dit recept"**:

1. Toon `CookDialog` met aanpasbaar aantal porties (standaard: recept's `servings`)
2. Bereken per ingrediënt: `af te trekken = ingredient.quantity × (gekozen_porties / recept.servings)`
3. Per gelinkt ingrediënt: maak een `stock_changes` record aan met:
   - `change_type: 'consume'`
   - `note: 'Gekookt: [receptnaam]'`
4. Toon samenvatting van wat er is afgetrokken
5. Waarschuw als een ingrediënt onvoldoende voorraad heeft (maar blokkeer niet)

---

## Implementatievolgorde

| Stap | Wat | Complexiteit |
|------|-----|-------------|
| 1 | Database migratie | Laag |
| 2 | TypeScript types | Laag |
| 3 | `useRecipes` hook (CRUD basis) | Medium |
| 4 | `/recipes` pagina + `RecipeGrid` + `RecipeCard` | Medium |
| 5 | `/recipes/new` + `RecipeForm` + `IngredientRow` + `IngredientSearch` | Hoog |
| 6 | `/recipes/[id]` detail pagina | Medium |
| 7 | `/recipes/[id]/edit` | Laag (hergebruik form) |
| 8 | Navigatie uitbreiden | Laag |
| 9 | `getMissingIngredients` + `addMissingToShoppingList` | Medium |
| 10 | `MissingIngredients` component + shopping integratie | Medium |
| 11 | `cookRecipe` + `CookDialog` (bonus) | Medium |

---

## Open vragen / beslissingen

1. **Shopping integratie:** Voegen we een `recipe_id` kolom toe aan `shopping_items`, of houden we het simpel zonder groepering?
2. **Afbeeldingen:** Willen we een afbeelding per recept? (Zo ja: Supabase Storage nodig)
3. **Porties schalen:** Moet de ingrediëntenlijst dynamisch schalen als je porties aanpast in de detail-view?
4. **Tags/categorieën:** Willen we recepten categoriseren (bijv. ontbijt, lunch, diner, snack)?
