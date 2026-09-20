import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { PersonSummary, RawDatedItem, ReminderType } from '@/lib/people/shared';

export async function GET() {
  try {
    const [groups, peopleRows, reminders] = await Promise.all([
      sql`SELECT * FROM people_groups ORDER BY name ASC`,
      sql`SELECT id, name, group_id, birthday::text AS birthday, birthday_has_year, notes, created_at FROM people ORDER BY name ASC`,
      sql`SELECT id, person_id, type, text, due_date::text AS due_date, recurs_annually, done, done_at, sort_order, created_at FROM people_reminders WHERE done = FALSE`,
    ]);

    const groupNameById = new Map(groups.map((g) => [g.id as string, g.name as string]));
    const byPerson = new Map<string, any[]>();

    for (const r of reminders) {
      const personId = r.person_id as string;
      const list = byPerson.get(personId) ?? [];
      list.push(r);
      byPerson.set(personId, list);
    }

    const people: PersonSummary[] = peopleRows.map((p: any) => {
      const personReminders = byPerson.get(p.id) ?? [];
      const open_counts: Record<ReminderType, number> = { bring: 0, ask: 0, event: 0 };
      const dated_items: RawDatedItem[] = [];

      if (p.birthday) {
        dated_items.push({
          kind: 'birthday',
          label: 'Verjaardag',
          date: p.birthday as string,
          recurring: true,
        });
      }

      for (const r of personReminders) {
        open_counts[r.type as ReminderType] += 1;
        if (r.due_date) {
          dated_items.push({
            kind: 'reminder',
            reminderType: r.type as ReminderType,
            label: r.text,
            date: String(r.due_date),
            recurring: r.type === 'event' && r.recurs_annually,
          });
        }
      }

      return {
        id: p.id,
        name: p.name,
        group_id: p.group_id,
        group_name: p.group_id ? groupNameById.get(p.group_id) ?? null : null,
        birthday: (p.birthday as string | null) ?? null,
        birthday_has_year: p.birthday_has_year,
        notes: p.notes,
        created_at: p.created_at,
        open_counts,
        dated_items,
      };
    });

    return NextResponse.json({ groups, people });
  } catch (error) {
    console.error('People query failed', error);
    return NextResponse.json({ error: 'Failed to load people' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, group_id } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }

  try {
    const [row] = await sql`
      INSERT INTO people (name, group_id)
      VALUES (${name.trim()}, ${group_id || null})
      RETURNING *
    `;
    return NextResponse.json(row);
  } catch (error) {
    console.error('Create person failed', error);
    return NextResponse.json({ error: 'Failed to create person' }, { status: 500 });
  }
}
