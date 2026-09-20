import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { text } = body;

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Tekst is verplicht' }, { status: 400 });
  }

  try {
    const [row] = await sql`
      INSERT INTO people_gift_ideas (person_id, text)
      VALUES (${id}, ${text.trim()})
      RETURNING *
    `;
    return NextResponse.json(row);
  } catch (error) {
    console.error('Create gift idea failed', error);
    return NextResponse.json({ error: 'Failed to create gift idea' }, { status: 500 });
  }
}
