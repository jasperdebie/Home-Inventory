import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [row] = await sql`SELECT * FROM books WHERE id = ${id}`;
    if (!row) return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    return NextResponse.json(row);
  } catch (error) {
    console.error('Book query failed', error);
    return NextResponse.json({ error: 'Failed to load book' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (body.title !== undefined && !body.title?.trim()) {
    return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
  }
  if (body.author !== undefined && !body.author?.trim()) {
    return NextResponse.json({ error: 'Author cannot be empty' }, { status: 400 });
  }

  try {
    const [current] = await sql`SELECT * FROM books WHERE id = ${id}`;
    if (!current) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

    const [row] = await sql`
      UPDATE books
      SET
        title = ${body.title !== undefined ? body.title.trim() : current.title},
        author = ${body.author !== undefined ? body.author.trim() : current.author},
        isbn = ${body.isbn !== undefined ? body.isbn?.trim() || null : current.isbn},
        genre = ${body.genre !== undefined ? body.genre?.trim() || null : current.genre},
        read = ${body.read !== undefined ? Boolean(body.read) : current.read},
        bought = ${body.bought !== undefined ? Boolean(body.bought) : current.bought},
        lent = ${body.lent !== undefined ? Boolean(body.lent) : current.lent},
        lent_to = ${body.lent_to !== undefined
          ? ((body.lent ?? current.lent) && body.lent_to?.trim() ? body.lent_to.trim() : null)
          : current.lent_to},
        notes = ${body.notes !== undefined ? body.notes?.trim() || null : current.notes},
        wishlist = ${body.wishlist !== undefined ? Boolean(body.wishlist) : current.wishlist},
        condition = ${body.condition !== undefined ? body.condition?.trim() || null : current.condition},
        hardcover = ${body.hardcover !== undefined ? Boolean(body.hardcover) : current.hardcover},
        first_edition = ${body.first_edition !== undefined ? Boolean(body.first_edition) : current.first_edition},
        rating = ${body.rating !== undefined ? body.rating ?? null : current.rating}
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(row);
  } catch (error) {
    console.error('Update book failed', error);
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await sql`DELETE FROM books WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete book failed', error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
