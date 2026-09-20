import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const rows = await sql`
      SELECT *
      FROM books
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Books query failed', error);
    return NextResponse.json({ error: 'Failed to load books' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    title, author, isbn, genre, read, bought, lent, lent_to,
    notes, wishlist, condition, hardcover, first_edition, rating,
  } = body;

  if (!title?.trim() || !author?.trim()) {
    return NextResponse.json(
      { error: 'Title and author are required' },
      { status: 400 }
    );
  }

  try {
    const [row] = await sql`
      INSERT INTO books (
        title, author, isbn, genre, read, bought, lent, lent_to,
        notes, wishlist, condition, hardcover, first_edition, rating
      )
      VALUES (
        ${title.trim()},
        ${author.trim()},
        ${isbn?.trim() || null},
        ${genre?.trim() || null},
        ${Boolean(read)},
        ${Boolean(bought)},
        ${Boolean(lent)},
        ${lent && lent_to?.trim() ? lent_to.trim() : null},
        ${notes?.trim() || null},
        ${Boolean(wishlist)},
        ${condition?.trim() || null},
        ${Boolean(hardcover)},
        ${Boolean(first_edition)},
        ${rating ?? null}
      )
      RETURNING *
    `;

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error('Create book failed', error);
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }
}
