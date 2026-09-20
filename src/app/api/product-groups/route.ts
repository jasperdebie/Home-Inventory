import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, min_stock::float8 AS min_stock,
             extra_needed::float8 AS extra_needed,
             is_bought, is_low_prio, created_at
      FROM product_groups
      ORDER BY name ASC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Product groups query failed', error);
    return NextResponse.json({ error: 'Failed to load product groups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    const [row] = await sql`
      INSERT INTO product_groups (name, min_stock)
      VALUES (${body.name.trim()}, ${Number(body.min_stock ?? 1)})
      RETURNING id, name, min_stock::float8 AS min_stock,
                extra_needed::float8 AS extra_needed,
                is_bought, is_low_prio, created_at
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error('Create product group failed', error);
    return NextResponse.json({ error: 'Failed to create product group' }, { status: 500 });
  }
}
