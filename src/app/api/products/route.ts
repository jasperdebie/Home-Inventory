import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  const barcode = request.nextUrl.searchParams.get('barcode');
  try {
    const rows = await sql`
      SELECT
        p.id,
        p.name,
        p.category_id,
        p.group_id,
        p.unit,
        p.barcode,
        p.min_stock::float8 AS min_stock,
        p.extra_needed::float8 AS extra_needed,
        p.current_stock::float8 AS current_stock,
        p.image_url,
        p.notes,
        p.expires_at,
        p.is_archived,
        p.is_bought,
        p.is_low_prio,
        p.created_at,
        p.updated_at,
        CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object(
          'id', c.id,
          'name', c.name,
          'icon', c.icon,
          'sort_order', c.sort_order
        ) END AS category,
        CASE WHEN g.id IS NULL THEN NULL ELSE json_build_object(
          'id', g.id,
          'name', g.name,
          'min_stock', g.min_stock::float8,
          'extra_needed', g.extra_needed::float8,
          'is_bought', g.is_bought,
          'is_low_prio', g.is_low_prio,
          'created_at', g.created_at
        ) END AS product_group
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN product_groups g ON g.id = p.group_id
      WHERE p.is_archived = FALSE
        ${id ? sql`AND p.id = ${id}` : barcode ? sql`AND p.barcode = ${barcode}` : sql``}
      ORDER BY p.name ASC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Products query failed', error);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    name,
    category_id = null,
    group_id = null,
    unit = 'pcs',
    barcode = null,
    min_stock = 1,
    notes = null,
    expires_at = null,
    is_low_prio = false,
    initial_stock = 0,
  } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    const result = await sql.begin(async (tx) => {
      const [product] = await tx`
        INSERT INTO products (
          name, category_id, group_id, unit, barcode, min_stock,
          current_stock, notes, expires_at, is_low_prio
        )
        VALUES (
          ${name.trim()}, ${category_id || null}, ${group_id || null}, ${unit || 'pcs'},
          ${barcode?.trim() || null}, ${Number(min_stock) || 0}, 0,
          ${notes?.trim() || null}, ${expires_at || null}, ${Boolean(is_low_prio)}
        )
        RETURNING id
      `;

      const initial = Number(initial_stock) || 0;
      if (initial > 0) {
        await tx`
          INSERT INTO stock_changes (product_id, quantity_change, change_type)
          VALUES (${product.id}, ${initial}, 'initial')
        `;
      }

      const [updated] = await tx`
        SELECT
          p.*,
          p.min_stock::float8 AS min_stock,
          p.extra_needed::float8 AS extra_needed,
          p.current_stock::float8 AS current_stock
        FROM products p
        WHERE p.id = ${product.id}
      `;
      return updated;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Create product failed', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
