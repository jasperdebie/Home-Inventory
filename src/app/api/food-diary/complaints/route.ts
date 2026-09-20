import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isValidDate, isValidSlot } from '../helpers';

export async function POST(request: NextRequest) {
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

  try {
    const [row] = await sql`
      INSERT INTO food_diary_complaints (log_date, slot, description)
      VALUES (${date}, ${slot}, ${description.trim()})
      RETURNING id, description
    `;

    return NextResponse.json({ id: row.id, description: row.description });
  } catch (error) {
    console.error('Create complaint failed', error);
    return NextResponse.json({ error: 'Klacht toevoegen mislukt' }, { status: 500 });
  }
}
