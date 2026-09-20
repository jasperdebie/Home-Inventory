import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const [current] = await sql`SELECT * FROM product_groups WHERE id = ${id}`;
    if (!current) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    const [row] = await sql`
      UPDATE product_groups
      SET
        name = ${body.name !== undefined ? String(body.name).trim() : current.name},
        min_stock = ${body.min_stock !== undefined ? Number(body.min_stock) : current.min_stock},
        extra_needed = ${body.extra_needed !== undefined ? Number(body.extra_needed) : current.extra_needed},
        is_low_prio = ${body.is_low_prio !== undefined ? Boolean(body.is_low_prio) : current.is_low_prio},
        is_bought = ${body.is_bought !== undefined ? Boolean(body.is_bought) : current.is_bought}
      WHERE id = ${id}
      RETURNING id, name, min_stock::float8 AS min_stock,
                extra_needed::float8 AS extra_needed,
                is_bought, is_low_prio, created_at
    `;
    return NextResponse.json(row);
  } catch (error) {
    console.error('Update product group failed', error);
    return NextResponse.json({ error: 'Failed to update product group' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await sql`DELETE FROM product_groups WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete product group failed', error);
    return NextResponse.json({ error: 'Failed to delete product group' }, { status: 500 });
  }
}
