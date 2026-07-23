import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const { text } = body;
  if (!text?.trim()) {
    return NextResponse.json({ error: 'Tekst is verplicht' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('people_gift_ideas')
    .insert([{ person_id: id, text: text.trim() }])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
