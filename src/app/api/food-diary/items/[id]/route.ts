import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isValidType, upsertLibraryItem } from '../../helpers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, type, comment, ingredients, saveToLibrary } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'Ongeldig type' }, { status: 400 });
  }

  try {
    const [row] = await sql`
      UPDATE food_diary_items
      SET
        name = ${name.trim()},
        type = ${type},
        comment = ${comment?.trim() || null},
        ingredients = ${ingredients?.trim() || null}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!row) {
      return NextResponse.json({ error: 'Item niet gevonden' }, { status: 404 });
    }

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
    console.error('Update food diary item failed', error);
    return NextResponse.json({ error: 'Item bijwerken mislukt' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await sql`DELETE FROM food_diary_items WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete food diary item failed', error);
    return NextResponse.json({ error: 'Item verwijderen mislukt' }, { status: 500 });
  }
}
