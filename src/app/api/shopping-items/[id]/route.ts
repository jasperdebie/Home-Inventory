import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const [current] = await sql`SELECT * FROM shopping_items WHERE id = ${id}`;
    if (!current) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    const [row] = await sql`
      UPDATE shopping_items
      SET
        name = ${body.name !== undefined ? String(body.name).trim() : current.name},
        is_checked = ${body.is_checked !== undefined ? Boolean(body.is_checked) : current.is_checked}
      WHERE id = ${id}
      RETURNING id, name, is_checked, created_at
    `;
    return NextResponse.json(row);
  } catch (error) {
    console.error('Update shopping item failed', error);
    return NextResponse.json({ error: 'Failed to update shopping item' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await sql`DELETE FROM shopping_items WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete shopping item failed', error);
    return NextResponse.json({ error: 'Failed to delete shopping item' }, { status: 500 });
  }
}
