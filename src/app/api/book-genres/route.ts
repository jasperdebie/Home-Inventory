import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('book_genres')
    .select('*')
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: 'Genre name is required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('book_genres')
    .insert([{ name: name.trim(), is_default: false }])
    .select();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Genre already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data[0], { status: 201 });
}
