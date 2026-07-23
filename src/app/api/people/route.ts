import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { PersonSummary, RawDatedItem, ReminderType } from '@/lib/people/shared';

// GET — alle groepen + alle personen met counts en datum-items voor de lijst.
export async function GET() {
  const supabase = await createClient();

  const [groupsRes, peopleRes, remindersRes] = await Promise.all([
    supabase.from('people_groups').select('*').order('name', { ascending: true }),
    supabase.from('people').select('*').order('name', { ascending: true }),
    supabase.from('people_reminders').select('*').eq('done', false),
  ]);

  if (groupsRes.error) return NextResponse.json({ error: groupsRes.error.message }, { status: 500 });
  if (peopleRes.error) return NextResponse.json({ error: peopleRes.error.message }, { status: 500 });
  if (remindersRes.error) return NextResponse.json({ error: remindersRes.error.message }, { status: 500 });

  const groups = groupsRes.data ?? [];
  const groupNameById = new Map(groups.map((g) => [g.id, g.name as string]));

  // Openstaande reminders groeperen per persoon.
  const byPerson = new Map<string, typeof remindersRes.data>();
  for (const r of remindersRes.data ?? []) {
    const list = byPerson.get(r.person_id) ?? [];
    list.push(r);
    byPerson.set(r.person_id, list);
  }

  const people: PersonSummary[] = (peopleRes.data ?? []).map((p) => {
    const reminders = byPerson.get(p.id) ?? [];
    const open_counts: Record<ReminderType, number> = { bring: 0, ask: 0, event: 0 };
    const dated_items: RawDatedItem[] = [];

    if (p.birthday) {
      dated_items.push({ kind: 'birthday', label: 'Verjaardag', date: p.birthday, recurring: true });
    }
    for (const r of reminders) {
      open_counts[r.type as ReminderType] += 1;
      if (r.due_date) {
        dated_items.push({
          kind: 'reminder',
          reminderType: r.type as ReminderType,
          label: r.text,
          date: r.due_date,
          recurring: r.type === 'event' && r.recurs_annually,
        });
      }
    }

    return {
      id: p.id,
      name: p.name,
      group_id: p.group_id,
      group_name: p.group_id ? groupNameById.get(p.group_id) ?? null : null,
      birthday: p.birthday,
      birthday_has_year: p.birthday_has_year,
      notes: p.notes,
      created_at: p.created_at,
      open_counts,
      dated_items,
    };
  });

  return NextResponse.json({ groups, people });
}

// POST — nieuwe persoon.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();
  const { name, group_id } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('people')
    .insert([{ name: name.trim(), group_id: group_id || null }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
