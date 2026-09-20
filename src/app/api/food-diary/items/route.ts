import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isValidDate, isValidSlot, isValidType, upsertLibraryItem } from '../helpers';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, slot, name, type, comment, ingredients, saveToLibrary } = body;

  if (!isValidDate(date)) {
    return NextResponse.json({ error: 'Ongeldige datum' }, { status: 400 });
  }
  if (!isValidSlot(slot)) {
    return NextResponse.json({ error: 'Ongeldig eetmoment' }, { status: 400 });
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'Ongeldig type' }, { status: 400 });
  }

  try {
    const [{ next_sort_order }] = await sql`
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order
      FROM food_diary_items
      WHERE log_date = ${date} AND slot = ${slot}
    `;

    const [row] = await sql`
      INSERT INTO food_diary_items (
        log_date, slot, name, type, comment, ingredients, sort_order
      )
      VALUES (
        ${date}, ${slot}, ${name.trim()}, ${type},
        ${comment?.trim() || null}, ${ingredients?.trim() || null},
        ${Number(next_sort_order)}
      )
      RETURNING *
    `;

    if (saveToLibrary) {
      await upsertLibraryItem({ name, type, comment, ingredients });
    }

    return NextResponse.json({
      id: row.id,
      name: row.name,
      type: row.type,
      comment: row.comment ?? undefined,
      ingredients: row.ingredients ?? undefined,
    });
  } catch (error) {
    console.error('Create food diary item failed', error);
    return NextResponse.json({ error: 'Item toevoegen mislukt' }, { status: 500 });
  }
}
