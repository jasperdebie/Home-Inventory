import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { ReminderType } from '@/lib/people/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES: ReminderType[] = ['bring', 'ask', 'event'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  const recurring = type === 'event' ? Boolean(recurs_annually) : false;

  try {
    const [{ next_sort_order }] = await sql`
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order
      FROM people_reminders
      WHERE person_id = ${id} AND type = ${type}
    `;

    const [row] = await sql`
      INSERT INTO people_reminders (
        person_id, type, text, due_date, recurs_annually, sort_order
      )
      VALUES (
        ${id}, ${type}, ${text.trim()}, ${due_date || null},
        ${recurring}, ${Number(next_sort_order)}
      )
      RETURNING *
    `;

    return NextResponse.json(row);
  } catch (error) {
    console.error('Create reminder failed', error);
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}
