import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isValidType, upsertLibraryItem } from '../../helpers';

// PATCH — item bewerken
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { name, type, comment, ingredients, saveToLibrary } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'Ongeldig type' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('food_diary_items')
    .update({
      name: name.trim(),
      type,
      comment: comment?.trim() || null,
      ingredients: ingredients?.trim() || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (saveToLibrary) {
    await upsertLibraryItem(supabase, { name, type, comment, ingredients });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    type: data.type,
    comment: data.comment ?? undefined,
    ingredients: data.ingredients ?? undefined,
  });
}

// DELETE — item verwijderen
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.from('food_diary_items').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
