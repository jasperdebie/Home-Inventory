import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isValidType, upsertLibraryItem } from '../helpers';

export async function GET() {
  try {
    const rows = await sql`
      SELECT *
      FROM food_diary_library
      ORDER BY name ASC
    `;

    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      comment: row.comment ?? undefined,
      ingredients: row.ingredients ?? undefined,
    }));

    return NextResponse.json(items);
  } catch (error) {
    console.error('Food diary library query failed', error);
    return NextResponse.json({ error: 'Bibliotheek laden mislukt' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, type, comment, ingredients } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'Ongeldig type' }, { status: 400 });
  }

  try {
    await upsertLibraryItem({ name, type, comment, ingredients });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Create library item failed', error);
    return NextResponse.json({ error: 'Bibliotheekitem opslaan mislukt' }, { status: 500 });
  }
}
