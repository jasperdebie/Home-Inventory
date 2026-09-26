import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { parseHouseholdInput } from '@/lib/people/shared';

export async function POST(request: NextRequest) {
  const parsed = parseHouseholdInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const h = parsed.value;

  try {
    const [row] = await sql`
      INSERT INTO people_households (name, street, house_number, postal_code, city)
      VALUES (${h.name}, ${h.street}, ${h.house_number}, ${h.postal_code}, ${h.city})
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error('Create household failed', error);
    return NextResponse.json({ error: 'Huishouden opslaan mislukt' }, { status: 500 });
  }
}
