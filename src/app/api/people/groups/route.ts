import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM people_groups ORDER BY name ASC`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('People groups query failed', error);
    return NextResponse.json({ error: 'Failed to load groups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }

  try {
    const [row] = await sql`
      INSERT INTO people_groups (name)
      VALUES (${name.trim()})
      RETURNING *
    `;
    return NextResponse.json(row);
  } catch (error) {
    console.error('Create people group failed', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
