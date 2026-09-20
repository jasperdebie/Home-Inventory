import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const productId = request.nextUrl.searchParams.get('productId');
  const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? 20);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;

  try {
    const rows = productId
      ? await sql`
          SELECT id, product_id, quantity_change::float8 AS quantity_change, change_type, note, created_at
          FROM stock_changes
          WHERE product_id = ${productId}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT id, product_id, quantity_change::float8 AS quantity_change, change_type, note, created_at
          FROM stock_changes
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Stock changes query failed', error);
    return NextResponse.json({ error: 'Failed to load stock changes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const quantity = Number(body.quantity_change);

  if (!body.product_id || !Number.isFinite(quantity)) {
    return NextResponse.json({ error: 'Invalid stock change' }, { status: 400 });
  }

  try {
    const [row] = await sql`
      INSERT INTO stock_changes (product_id, quantity_change, change_type, note)
      VALUES (
        ${body.product_id},
        ${quantity},
        ${body.change_type},
        ${body.note?.trim() || null}
      )
      RETURNING id, product_id, quantity_change::float8 AS quantity_change, change_type, note, created_at
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error('Create stock change failed', error);
    return NextResponse.json({ error: 'Failed to add stock change' }, { status: 500 });
  }
}
