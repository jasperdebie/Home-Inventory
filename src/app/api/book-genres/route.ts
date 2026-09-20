import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const rows = await sql`
      SELECT *
      FROM book_genres
      ORDER BY is_default DESC, name ASC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Book genres query failed', error);
    return NextResponse.json({ error: 'Failed to load genres' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: 'Genre name is required' }, { status: 400 });
  }

  try {
    const [row] = await sql`
      INSERT INTO book_genres (name, is_default)
      VALUES (${name}, FALSE)
      RETURNING *
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Genre already exists' }, { status: 409 });
    }
    console.error('Create book genre failed', error);
    return NextResponse.json({ error: 'Failed to create genre' }, { status: 500 });
  }
}
