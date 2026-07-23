import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const [personRes, remindersRes, giftsRes] = await Promise.all([
    supabase.from('people').select('*, people_groups(name)').eq('id', id).maybeSingle(),
    supabase
      .from('people_reminders')
      .select('*')
      .eq('person_id', id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('people_gift_ideas')
      .select('*')
      .eq('person_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (personRes.error) return NextResponse.json({ error: personRes.error.message }, { status: 500 });
  if (!personRes.data) return NextResponse.json({ error: 'Persoon niet gevonden' }, { status: 404 });
  if (remindersRes.error) return NextResponse.json({ error: remindersRes.error.message }, { status: 500 });
  if (giftsRes.error) return NextResponse.json({ error: giftsRes.error.message }, { status: 500 });

  const { people_groups, ...person } = personRes.data as Record<string, unknown> & {
    people_groups: { name: string } | null;
  };

  return NextResponse.json({
    person,
    group_name: people_groups?.name ?? null,
    reminders: remindersRes.data ?? [],
    giftIdeas: giftsRes.data ?? [],
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const update: Record<string, unknown> = {};
  if ('name' in body) {
    if (!body.name?.trim()) return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
    update.name = body.name.trim();
  }
  if ('group_id' in body) update.group_id = body.group_id || null;
  if ('notes' in body) update.notes = body.notes?.trim() || null;
  if ('birthday' in body) {
    if (body.birthday && !DATE_RE.test(body.birthday)) {
      return NextResponse.json({ error: 'Ongeldige verjaardag' }, { status: 400 });
    }
    update.birthday = body.birthday || null;
  }
  if ('birthday_has_year' in body) update.birthday_has_year = !!body.birthday_has_year;

  const { data, error } = await supabase
    .from('people')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  // Reminders en gift ideas verdwijnen mee via ON DELETE CASCADE.
  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
