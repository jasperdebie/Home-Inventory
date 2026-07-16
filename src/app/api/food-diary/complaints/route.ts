import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { isValidDate, isValidSlot } from '../helpers';

// POST — klacht toevoegen bij een eetmoment
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { date, slot, description } = body;

  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'Ongeldige datum' }, { status: 400 });
  }
  if (!isValidSlot(slot)) {
    return NextResponse.json({ error: 'Ongeldig eetmoment' }, { status: 400 });
  }
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Omschrijving is verplicht' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('food_diary_complaints')
    .insert([{ log_date: date, slot, description: description.trim() }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, description: data.description });
}
