import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isValidDate, isValidSlot, isValidType, upsertLibraryItem } from '../helpers';

// POST — nieuw item loggen
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { date, slot, name, type, comment, ingredients, saveToLibrary } = body;

  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'Ongeldige datum' }, { status: 400 });
  }
  if (!isValidSlot(slot)) {
    return NextResponse.json({ error: 'Ongeldig eetmoment' }, { status: 400 });
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'Ongeldig type' }, { status: 400 });
  }

  // Volgende sort_order binnen dit eetmoment bepalen.
  const { data: last } = await supabase
    .from('food_diary_items')
    .select('sort_order')
    .eq('log_date', date)
    .eq('slot', slot)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const sort_order = last ? (last.sort_order as number) + 1 : 0;

  const { data, error } = await supabase
    .from('food_diary_items')
    .insert([
      {
        log_date: date,
        slot,
        name: name.trim(),
        type,
        comment: comment?.trim() || null,
        ingredients: ingredients?.trim() || null,
        sort_order,
      },
    ])
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
