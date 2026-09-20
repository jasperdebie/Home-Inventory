import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? '';

  try {
    const rows = q
      ? await sql`
          SELECT *
          FROM cookbook_products
          WHERE name_normalized ILIKE ${'%' + q + '%'}
          ORDER BY name ASC
          LIMIT 20
        `
      : await sql`
          SELECT *
          FROM cookbook_products
          ORDER BY name ASC
          LIMIT 20
        `;

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Cookbook products query failed', error);
    return NextResponse.json({ error: 'Failed to load cookbook products' }, { status: 500 });
  }
}
