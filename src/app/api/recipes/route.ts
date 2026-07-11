import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const VALID_CATEGORIES = ['hapje', 'voorgerecht', 'hoofdgerecht', 'dessert'] as const;

const VALID_RATINGS = ['zeer_goed', 'goed', 'matig', 'minder', 'slecht'] as const;

const INGREDIENTS_QUERY = `
  *,
  recipe_ingredients (
    *,
    cookbook_product:cookbook_products (*)
  ),
  recipe_equipment (
    *,
    cookbook_equipment:cookbook_equipment (*)
  ),
  recipe_components!fk_recipe_components_parent (
    *,
    child_recipe:recipes!fk_recipe_components_child (
      id, title, category, servings, prep_time, image_url
    )
  )
` as const;

async function upsertCookbookProduct(supabase: Awaited<ReturnType<typeof createClient>>, name: string) {
  const normalized = name.trim().toLowerCase();
  const { data: existing } = await supabase
    .from('cookbook_products')
    .select('id')
    .eq('name_normalized', normalized)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created } = await supabase
    .from('cookbook_products')
    .insert([{ name: name.trim(), name_normalized: normalized }])
    .select('id')
    .single();

  return created?.id as string | null;
}

async function upsertCookbookEquipment(supabase: Awaited<ReturnType<typeof createClient>>, name: string) {
  const normalized = name.trim().toLowerCase();
  const { data: existing } = await supabase
    .from('cookbook_equipment')
    .select('id')
    .eq('name_normalized', normalized)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created } = await supabase
    .from('cookbook_equipment')
    .insert([{ name: name.trim(), name_normalized: normalized }])
    .select('id')
    .single();

  return created?.id as string | null;
}

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('recipes')
    .select(INGREDIENTS_QUERY)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { title, category, preparation, servings, prep_time, extra_time, extra_time_label, image_url, tags, source, notes, is_favorite, is_made, rating, ingredients, equipment, components } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Titel is verplicht' }, { status: 400 });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Geldige categorie is verplicht' }, { status: 400 });
  }
  if (rating != null && rating !== '' && !VALID_RATINGS.includes(rating)) {
    return NextResponse.json({ error: 'Ongeldige beoordeling' }, { status: 400 });
  }

  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert([{
      title: title.trim(),
      category,
      preparation: preparation?.trim() ?? '',
      servings: Number(servings) || 4,
      prep_time: prep_time ? Number(prep_time) : null,
      extra_time: extra_time?.trim() || null,
      extra_time_label: extra_time_label?.trim() || null,
      image_url: image_url?.trim() || null,
      tags: Array.isArray(tags) ? tags : [],
      source: source?.trim() || null,
      notes: notes?.trim() || null,
      is_favorite: Boolean(is_favorite),
      is_made: Boolean(is_made),
      rating: rating || null,
    }])
    .select()
    .single();

  if (recipeError) {
    return NextResponse.json({ error: recipeError.message }, { status: 500 });
  }

  if (Array.isArray(ingredients) && ingredients.length > 0) {
    const rows = await Promise.all(
      ingredients
        .filter((ing: { name?: string }) => ing.name?.trim())
        .map(async (ing: { name: string; cookbook_product_id?: string | null; quantity?: number | null; unit?: string | null }, index: number) => {
          const productId = ing.cookbook_product_id
            ?? await upsertCookbookProduct(supabase, ing.name);
          return {
            recipe_id: recipe.id,
            cookbook_product_id: productId ?? null,
            name: ing.name.trim(),
            quantity: ing.quantity ?? null,
            unit: ing.unit?.trim() || null,
            sort_order: index,
          };
        })
    );

    if (rows.length > 0) {
      const { error: ingError } = await supabase.from('recipe_ingredients').insert(rows);
      if (ingError) {
        return NextResponse.json({ error: ingError.message }, { status: 500 });
      }
    }
  }

  if (Array.isArray(equipment) && equipment.length > 0) {
    const rows = await Promise.all(
      equipment
        .filter((eq: { name?: string }) => eq.name?.trim())
        .map(async (eq: { name: string; cookbook_equipment_id?: string | null; quantity?: number | null }, index: number) => {
          const equipmentId = eq.cookbook_equipment_id
            ?? await upsertCookbookEquipment(supabase, eq.name);
          return {
            recipe_id: recipe.id,
            cookbook_equipment_id: equipmentId ?? null,
            name: eq.name.trim(),
            quantity: eq.quantity ?? null,
            sort_order: index,
          };
        })
    );

    if (rows.length > 0) {
      const { error: eqError } = await supabase.from('recipe_equipment').insert(rows);
      if (eqError) {
        return NextResponse.json({ error: eqError.message }, { status: 500 });
      }
    }
  }

  if (Array.isArray(components) && components.length > 0) {
    const rows = components
      .filter((c: { child_recipe_id?: string }) => c.child_recipe_id)
      .map((c: { child_recipe_id: string; label?: string | null }, index: number) => ({
        recipe_id: recipe.id,
        child_recipe_id: c.child_recipe_id,
        label: c.label?.trim() || null,
        sort_order: index,
      }));

    if (rows.length > 0) {
      const { error: compError } = await supabase.from('recipe_components').insert(rows);
      if (compError) {
        return NextResponse.json({ error: compError.message }, { status: 500 });
      }
    }
  }

  const { data: full, error: fullError } = await supabase
    .from('recipes')
    .select(INGREDIENTS_QUERY)
    .eq('id', recipe.id)
    .single();

  if (fullError) {
    return NextResponse.json({ error: fullError.message }, { status: 500 });
  }

  return NextResponse.json(full, { status: 201 });
}
