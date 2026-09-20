import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, is_checked, created_at
      FROM shopping_items
      ORDER BY created_at ASC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Shopping items query failed', error);
    return NextResponse.json({ error: 'Failed to load shopping items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  try {
    const [row] = await sql`
      INSERT INTO shopping_items (name)
      VALUES (${body.name.trim()})
      RETURNING id, name, is_checked, created_at
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error('Create shopping item failed', error);
    return NextResponse.json({ error: 'Failed to create shopping item' }, { status: 500 });
  }
}
