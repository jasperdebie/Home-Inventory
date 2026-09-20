import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { loadRecipes } from '@/lib/recipes/db';

const VALID_CATEGORIES = ['hapje', 'voorgerecht', 'hoofdgerecht', 'tussendoortje', 'dessert', 'drankjes'] as const;
const VALID_RATINGS = ['zeer_goed', 'goed', 'matig', 'minder', 'slecht'] as const;

function isValidRating5(value: unknown): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

export async function GET() {
  try {
    return NextResponse.json(await loadRecipes());
  } catch (error) {
    console.error('Recipes query failed', error);
    return NextResponse.json({ error: 'Recepten laden mislukt' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    title, category, preparation, servings, prep_time, extra_time, extra_time_label,
    image_url, tags, source, notes, storage, is_favorite, is_made, rating,
    star_rating, health_rating, ingredients, equipment, components,
  } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Titel is verplicht' }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Geldige categorie is verplicht' }, { status: 400 });
  }
  if (rating != null && rating !== '' && !VALID_RATINGS.includes(rating)) {
    return NextResponse.json({ error: 'Ongeldige beoordeling' }, { status: 400 });
  }
  if (star_rating != null && !isValidRating5(star_rating)) {
    return NextResponse.json({ error: 'Ongeldige sterrenbeoordeling' }, { status: 400 });
  }
  if (health_rating != null && !isValidRating5(health_rating)) {
    return NextResponse.json({ error: 'Ongeldige gezondheidsbeoordeling' }, { status: 400 });
  }

  try {
    const recipeId = await sql.begin(async (tx) => {
      const recipeTags = Array.isArray(tags) ? tags.map(String) : [];

      const [recipe] = await tx`
        INSERT INTO recipes (
          title, category, preparation, servings, prep_time, extra_time,
          extra_time_label, image_url, tags, source, notes, storage,
          is_favorite, is_made, rating, star_rating, health_rating
        )
        VALUES (
          ${title.trim()},
          ${category},
          ${preparation?.trim() ?? ''},
          ${Number(servings) || 4},
          ${prep_time ? Number(prep_time) : null},
          ${extra_time?.trim() || null},
          ${extra_time_label?.trim() || null},
          ${image_url?.trim() || null},
          ${tx.array(recipeTags)},
          ${source?.trim() || null},
          ${notes?.trim() || null},
          ${storage?.trim() || null},
          ${Boolean(is_favorite)},
          ${Boolean(is_made)},
          ${rating || null},
          ${star_rating != null ? Number(star_rating) : null},
          ${health_rating != null ? Number(health_rating) : null}
        )
        RETURNING id
      `;

      if (Array.isArray(ingredients)) {
        let sortOrder = 0;
        for (const ing of ingredients) {
          if (!ing?.name?.trim()) continue;

          let productId = ing.cookbook_product_id || null;
          if (!productId) {
            const normalized = ing.name.trim().toLowerCase();
            const [product] = await tx`
              INSERT INTO cookbook_products (name, name_normalized)
              VALUES (${ing.name.trim()}, ${normalized})
              ON CONFLICT (name_normalized)
              DO UPDATE SET name = cookbook_products.name
              RETURNING id
            `;
            productId = product.id;
          }

          await tx`
            INSERT INTO recipe_ingredients (
              recipe_id, cookbook_product_id, name, quantity, unit, sort_order
            )
            VALUES (
              ${recipe.id}, ${productId}, ${ing.name.trim()},
              ${ing.quantity ?? null}, ${ing.unit?.trim() || null}, ${sortOrder}
            )
          `;
          sortOrder += 1;
        }
      }

      if (Array.isArray(equipment)) {
        let sortOrder = 0;
        for (const eq of equipment) {
          if (!eq?.name?.trim()) continue;

          let equipmentId = eq.cookbook_equipment_id || null;
          if (!equipmentId) {
            const normalized = eq.name.trim().toLowerCase();
            const [equipmentRow] = await tx`
              INSERT INTO cookbook_equipment (name, name_normalized)
              VALUES (${eq.name.trim()}, ${normalized})
              ON CONFLICT (name_normalized)
              DO UPDATE SET name = cookbook_equipment.name
              RETURNING id
            `;
            equipmentId = equipmentRow.id;
          }

          await tx`
            INSERT INTO recipe_equipment (
              recipe_id, cookbook_equipment_id, name, quantity, sort_order
            )
            VALUES (
              ${recipe.id}, ${equipmentId}, ${eq.name.trim()},
              ${eq.quantity ?? null}, ${sortOrder}
            )
          `;
          sortOrder += 1;
        }
      }

      if (Array.isArray(components)) {
        let sortOrder = 0;
        for (const component of components) {
          if (!component?.child_recipe_id) continue;
          await tx`
            INSERT INTO recipe_components (
              recipe_id, child_recipe_id, label, sort_order
            )
            VALUES (
              ${recipe.id}, ${component.child_recipe_id},
              ${component.label?.trim() || null}, ${sortOrder}
            )
            ON CONFLICT (recipe_id, child_recipe_id) DO NOTHING
          `;
          sortOrder += 1;
        }
      }

      return recipe.id as string;
    });

    const [full] = await loadRecipes(recipeId);
    return NextResponse.json(full, { status: 201 });
  } catch (error) {
    console.error('Create recipe failed', error);
    return NextResponse.json({ error: 'Recept aanmaken mislukt' }, { status: 500 });
  }
}
