import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const [person] = await sql`
      SELECT p.*, g.name AS group_name
      FROM people p
      LEFT JOIN people_groups g ON g.id = p.group_id
      WHERE p.id = ${id}
    `;

    if (!person) {
      return NextResponse.json({ error: 'Persoon niet gevonden' }, { status: 404 });
    }

    const [reminders, giftIdeas] = await Promise.all([
      sql`
        SELECT *
        FROM people_reminders
        WHERE person_id = ${id}
        ORDER BY sort_order ASC, created_at ASC
      `,
      sql`
        SELECT *
        FROM people_gift_ideas
        WHERE person_id = ${id}
        ORDER BY created_at ASC
      `,
    ]);

    const { group_name, ...personData } = person;

    return NextResponse.json({
      person: personData,
      group_name: group_name ?? null,
      reminders,
      giftIdeas,
    });
  } catch (error) {
    console.error('Person query failed', error);
    return NextResponse.json({ error: 'Failed to load person' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if ('name' in body && !body.name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }
  if ('birthday' in body && body.birthday && !DATE_RE.test(body.birthday)) {
    return NextResponse.json({ error: 'Ongeldige verjaardag' }, { status: 400 });
  }

  try {
    const [current] = await sql`SELECT * FROM people WHERE id = ${id}`;
    if (!current) {
      return NextResponse.json({ error: 'Persoon niet gevonden' }, { status: 404 });
    }

    const [row] = await sql`
      UPDATE people
      SET
        name = ${'name' in body ? body.name.trim() : current.name},
        group_id = ${'group_id' in body ? body.group_id || null : current.group_id},
        notes = ${'notes' in body ? body.notes?.trim() || null : current.notes},
        birthday = ${'birthday' in body ? body.birthday || null : current.birthday},
        birthday_has_year = ${'birthday_has_year' in body ? Boolean(body.birthday_has_year) : current.birthday_has_year}
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(row);
  } catch (error) {
    console.error('Update person failed', error);
    return NextResponse.json({ error: 'Failed to update person' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await sql`DELETE FROM people WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete person failed', error);
    return NextResponse.json({ error: 'Failed to delete person' }, { status: 500 });
  }
}
