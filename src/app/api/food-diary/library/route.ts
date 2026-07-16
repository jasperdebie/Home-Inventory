import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isValidType, upsertLibraryItem } from '../helpers';

// GET — volledige bibliotheek
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('food_diary_library')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    comment: row.comment ?? undefined,
    ingredients: row.ingredients ?? undefined,
  }));

  return NextResponse.json(items);
}

// POST — item rechtstreeks in de bibliotheek bewaren
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { name, type, comment, ingredients } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'Ongeldig type' }, { status: 400 });
  }

  await upsertLibraryItem(supabase, { name, type, comment, ingredients });

  return NextResponse.json({ success: true });
}
