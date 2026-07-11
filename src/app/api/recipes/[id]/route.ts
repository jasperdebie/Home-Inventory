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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from('recipes')
    .select(INGREDIENTS_QUERY)
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const { title, category, preparation, servings, prep_time, extra_time, extra_time_label, image_url, tags, source, notes, is_favorite, is_made, rating, ingredients, equipment, components } = body;

  if (title !== undefined && !title?.trim()) {
    return NextResponse.json({ error: 'Titel mag niet leeg zijn' }, { status: 400 });
  }
  if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Ongeldige categorie' }, { status: 400 });
  }
  if (rating !== undefined && rating != null && rating !== '' && !VALID_RATINGS.includes(rating)) {
    return NextResponse.json({ error: 'Ongeldige beoordeling' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined)       updateData.title       = title.trim();
  if (category !== undefined)    updateData.category    = category;
  if (preparation !== undefined) updateData.preparation = preparation.trim();
  if (servings !== undefined)    updateData.servings    = Number(servings) || 4;
  if (prep_time !== undefined)   updateData.prep_time   = prep_time ? Number(prep_time) : null;
  if (extra_time !== undefined)  updateData.extra_time  = extra_time?.trim() || null;
  if (extra_time_label !== undefined) updateData.extra_time_label = extra_time_label?.trim() || null;
  if (image_url !== undefined)   updateData.image_url   = image_url?.trim() || null;
  if (tags !== undefined)        updateData.tags        = Array.isArray(tags) ? tags : [];
  if (source !== undefined)      updateData.source      = source?.trim() || null;
  if (notes !== undefined)       updateData.notes       = notes?.trim() || null;
  if (is_favorite !== undefined) updateData.is_favorite = Boolean(is_favorite);
  if (is_made !== undefined)     updateData.is_made     = Boolean(is_made);
  if (rating !== undefined)      updateData.rating      = rating || null;

  const { error: updateError } = await supabase
    .from('recipes')
    .update(updateData)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Replace ingredients if provided
  if (Array.isArray(ingredients)) {
    const { error: deleteError } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('recipe_id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const rows = await Promise.all(
      ingredients
        .filter((ing: { name?: string }) => ing.name?.trim())
        .map(async (ing: { name: string; cookbook_product_id?: string | null; quantity?: number | null; unit?: string | null }, index: number) => {
          const productId = ing.cookbook_product_id
            ?? await upsertCookbookProduct(supabase, ing.name);
          return {
            recipe_id: id,
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

  // Replace equipment if provided
  if (Array.isArray(equipment)) {
    const { error: deleteError } = await supabase
      .from('recipe_equipment')
      .delete()
      .eq('recipe_id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const rows = await Promise.all(
      equipment
        .filter((eq: { name?: string }) => eq.name?.trim())
        .map(async (eq: { name: string; cookbook_equipment_id?: string | null; quantity?: number | null }, index: number) => {
          const equipmentId = eq.cookbook_equipment_id
            ?? await upsertCookbookEquipment(supabase, eq.name);
          return {
            recipe_id: id,
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

  // Replace sub-recipes (components) if provided
  if (Array.isArray(components)) {
    const { error: deleteError } = await supabase
      .from('recipe_components')
      .delete()
      .eq('recipe_id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    const rows = components
      .filter((c: { child_recipe_id?: string }) => c.child_recipe_id && c.child_recipe_id !== id)
      .map((c: { child_recipe_id: string; label?: string | null }, index: number) => ({
        recipe_id: id,
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
    .eq('id', id)
    .single();

  if (fullError) {
    return NextResponse.json({ error: fullError.message }, { status: 500 });
  }

  return NextResponse.json(full);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase.from('recipes').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
