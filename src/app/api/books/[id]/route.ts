import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const { title, author, isbn, genre, read, bought, lent, lent_to, notes, wishlist } = body;

  if (title !== undefined && !title?.trim()) {
    return NextResponse.json(
      { error: 'Title cannot be empty' },
      { status: 400 }
    );
  }

  if (author !== undefined && !author?.trim()) {
    return NextResponse.json(
      { error: 'Author cannot be empty' },
      { status: 400 }
    );
  }

  const updateData: any = {};
  if (title !== undefined) updateData.title = title.trim();
  if (author !== undefined) updateData.author = author.trim();
  if (isbn !== undefined) updateData.isbn = isbn?.trim() || null;
  if (genre !== undefined) updateData.genre = genre?.trim() || null;
  if (read !== undefined) updateData.read = read;
  if (bought !== undefined) updateData.bought = bought;
  if (lent !== undefined) updateData.lent = lent;
  if (lent_to !== undefined) updateData.lent_to = lent && lent_to?.trim() ? lent_to.trim() : null;
  if (notes !== undefined) updateData.notes = notes?.trim() || null;
  if (wishlist !== undefined) updateData.wishlist = wishlist;

  const { data, error } = await supabase
    .from('books')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
