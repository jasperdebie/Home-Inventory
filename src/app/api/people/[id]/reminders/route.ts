import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ReminderType } from '@/lib/people/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES: ReminderType[] = ['bring', 'ask', 'event'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const { type, text, due_date, recurs_annually } = body;

  if (!TYPES.includes(type)) {
    return NextResponse.json({ error: 'Ongeldig type' }, { status: 400 });
  }
  if (!text?.trim()) {
    return NextResponse.json({ error: 'Tekst is verplicht' }, { status: 400 });
  }
  if (due_date && !DATE_RE.test(due_date)) {
    return NextResponse.json({ error: 'Ongeldige datum' }, { status: 400 });
  }
  if (type === 'event' && !due_date) {
    return NextResponse.json({ error: 'Een event heeft een datum nodig' }, { status: 400 });
  }
  const recurring = type === 'event' ? !!recurs_annually : false;

  // Volgende sort_order binnen dit type bepalen.
  const { data: last } = await supabase
    .from('people_reminders')
    .select('sort_order')
    .eq('person_id', id)
    .eq('type', type)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = last ? (last.sort_order as number) + 1 : 0;

  const { data, error } = await supabase
    .from('people_reminders')
    .insert([
      {
        person_id: id,
        type,
        text: text.trim(),
        due_date: due_date || null,
        recurs_annually: recurring,
        sort_order,
      },
    ])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
