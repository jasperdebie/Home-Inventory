import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { title, author, isbn, genre, read, bought, lent, lent_to, notes, wishlist, condition, hardcover, first_edition, rating } = body;

  if (!title?.trim() || !author?.trim()) {
    return NextResponse.json(
      { error: 'Title and author are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('books')
    .insert([
      {
        title: title.trim(),
        author: author.trim(),
        isbn: isbn?.trim() || null,
        genre: genre?.trim() || null,
        read: read || false,
        bought: bought || false,
        lent: lent || false,
        lent_to: lent && lent_to?.trim() ? lent_to.trim() : null,
        notes: notes?.trim() || null,
        wishlist: wishlist || false,
        condition: condition?.trim() || null,
        hardcover: hardcover || false,
        first_edition: first_edition || false,
        rating: rating ?? null,
      },
    ])
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data[0], { status: 201 });
}
