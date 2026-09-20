import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if ('text' in body && !body.text?.trim()) {
    return NextResponse.json({ error: 'Tekst is verplicht' }, { status: 400 });
  }

  try {
    const [current] = await sql`SELECT * FROM people_gift_ideas WHERE id = ${id}`;
    if (!current) {
      return NextResponse.json({ error: 'Cadeau-idee niet gevonden' }, { status: 404 });
    }

    const nextGiven = 'given' in body ? Boolean(body.given) : current.given;
    const nextGivenAt = 'given' in body
      ? (body.given ? new Date() : null)
      : current.given_at;

    const [row] = await sql`
      UPDATE people_gift_ideas
      SET
        text = ${'text' in body ? body.text.trim() : current.text},
        given = ${nextGiven},
        given_at = ${nextGivenAt}
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(row);
  } catch (error) {
    console.error('Update gift idea failed', error);
    return NextResponse.json({ error: 'Failed to update gift idea' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await sql`DELETE FROM people_gift_ideas WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete gift idea failed', error);
    return NextResponse.json({ error: 'Failed to delete gift idea' }, { status: 500 });
  }
}
