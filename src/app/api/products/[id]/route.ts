import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const [current] = await sql`SELECT * FROM products WHERE id = ${id}`;
    if (!current) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const [updated] = await sql`
      UPDATE products
      SET
        name = ${body.name !== undefined ? String(body.name).trim() : current.name},
        category_id = ${body.category_id !== undefined ? body.category_id || null : current.category_id},
        group_id = ${body.group_id !== undefined ? body.group_id || null : current.group_id},
        unit = ${body.unit !== undefined ? String(body.unit) : current.unit},
        barcode = ${body.barcode !== undefined ? (body.barcode ? String(body.barcode).trim() : null) : current.barcode},
        min_stock = ${body.min_stock !== undefined ? Number(body.min_stock) : current.min_stock},
        extra_needed = ${body.extra_needed !== undefined ? Number(body.extra_needed) : current.extra_needed},
        notes = ${body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : current.notes},
        expires_at = ${body.expires_at !== undefined ? body.expires_at || null : current.expires_at},
        is_archived = ${body.is_archived !== undefined ? Boolean(body.is_archived) : current.is_archived},
        is_low_prio = ${body.is_low_prio !== undefined ? Boolean(body.is_low_prio) : current.is_low_prio},
        is_bought = ${body.is_bought !== undefined ? Boolean(body.is_bought) : current.is_bought}
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update product failed', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await sql`DELETE FROM products WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete product failed', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
