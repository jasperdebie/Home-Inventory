import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { loadRecipes } from '@/lib/recipes/db';

const VALID_CATEGORIES = ['hapje', 'voorgerecht', 'hoofdgerecht', 'tussendoortje', 'dessert', 'drankjes'] as const;
const VALID_RATINGS = ['zeer_goed', 'goed', 'matig', 'minder', 'slecht'] as const;

function isValidRating5(value: unknown): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [recipe] = await loadRecipes(id);
    if (!recipe) {
      return NextResponse.json({ error: 'Recept niet gevonden' }, { status: 404 });
    }
    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Recipe query failed', error);
    return NextResponse.json({ error: 'Recept laden mislukt' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const {
    title, category, preparation, servings, prep_time, extra_time, extra_time_label,
    image_url, tags, source, notes, storage, is_favorite, is_made, rating,
    star_rating, health_rating, ingredients, equipment, components,
  } = body;

  if (title !== undefined && !title?.trim()) {
    return NextResponse.json({ error: 'Titel mag niet leeg zijn' }, { status: 400 });
  }
  if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Ongeldige categorie' }, { status: 400 });
  }
  if (rating !== undefined && rating != null && rating !== '' && !VALID_RATINGS.includes(rating)) {
    return NextResponse.json({ error: 'Ongeldige beoordeling' }, { status: 400 });
  }
  if (star_rating !== undefined && star_rating != null && !isValidRating5(star_rating)) {
    return NextResponse.json({ error: 'Ongeldige sterrenbeoordeling' }, { status: 400 });
  }
  if (health_rating !== undefined && health_rating != null && !isValidRating5(health_rating)) {
    return NextResponse.json({ error: 'Ongeldige gezondheidsbeoordeling' }, { status: 400 });
  }

  try {
    const updated = await sql.begin(async (tx) => {
      const [current] = await tx`SELECT * FROM recipes WHERE id = ${id}`;
      if (!current) return false;

      const nextTags = tags !== undefined
        ? (Array.isArray(tags) ? tags.map(String) : [])
        : current.tags;

      await tx`
        UPDATE recipes
        SET
          title = ${title !== undefined ? title.trim() : current.title},
          category = ${category !== undefined ? category : current.category},
          preparation = ${preparation !== undefined ? preparation.trim() : current.preparation},
          servings = ${servings !== undefined ? Number(servings) || 4 : current.servings},
          prep_time = ${prep_time !== undefined ? (prep_time ? Number(prep_time) : null) : current.prep_time},
          extra_time = ${extra_time !== undefined ? extra_time?.trim() || null : current.extra_time},
          extra_time_label = ${extra_time_label !== undefined ? extra_time_label?.trim() || null : current.extra_time_label},
          image_url = ${image_url !== undefined ? image_url?.trim() || null : current.image_url},
          tags = ${tx.array(nextTags as string[])},
          source = ${source !== undefined ? source?.trim() || null : current.source},
          notes = ${notes !== undefined ? notes?.trim() || null : current.notes},
          storage = ${storage !== undefined ? storage?.trim() || null : current.storage},
          is_favorite = ${is_favorite !== undefined ? Boolean(is_favorite) : current.is_favorite},
          is_made = ${is_made !== undefined ? Boolean(is_made) : current.is_made},
          rating = ${rating !== undefined ? rating || null : current.rating},
          star_rating = ${star_rating !== undefined ? (star_rating != null ? Number(star_rating) : null) : current.star_rating},
          health_rating = ${health_rating !== undefined ? (health_rating != null ? Number(health_rating) : null) : current.health_rating}
        WHERE id = ${id}
      `;

      if (Array.isArray(ingredients)) {
        await tx`DELETE FROM recipe_ingredients WHERE recipe_id = ${id}`;

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
              ${id}, ${productId}, ${ing.name.trim()},
              ${ing.quantity ?? null}, ${ing.unit?.trim() || null}, ${sortOrder}
            )
          `;
          sortOrder += 1;
        }
      }

      if (Array.isArray(equipment)) {
        await tx`DELETE FROM recipe_equipment WHERE recipe_id = ${id}`;

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
              ${id}, ${equipmentId}, ${eq.name.trim()},
              ${eq.quantity ?? null}, ${sortOrder}
            )
          `;
          sortOrder += 1;
        }
      }

      if (Array.isArray(components)) {
        await tx`DELETE FROM recipe_components WHERE recipe_id = ${id}`;

        let sortOrder = 0;
        for (const component of components) {
          if (!component?.child_recipe_id || component.child_recipe_id === id) continue;

          await tx`
            INSERT INTO recipe_components (
              recipe_id, child_recipe_id, label, sort_order
            )
            VALUES (
              ${id}, ${component.child_recipe_id},
              ${component.label?.trim() || null}, ${sortOrder}
            )
            ON CONFLICT (recipe_id, child_recipe_id) DO NOTHING
          `;
          sortOrder += 1;
        }
      }

      return true;
    });

    if (!updated) {
      return NextResponse.json({ error: 'Recept niet gevonden' }, { status: 404 });
    }

    const [full] = await loadRecipes(id);
    return NextResponse.json(full);
  } catch (error) {
    console.error('Update recipe failed', error);
    return NextResponse.json({ error: 'Recept bijwerken mislukt' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await sql`DELETE FROM recipes WHERE id = ${id}`;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete recipe failed', error);
    return NextResponse.json({ error: 'Recept verwijderen mislukt' }, { status: 500 });
  }
}
