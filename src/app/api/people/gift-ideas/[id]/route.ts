import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const update: Record<string, unknown> = {};
  if ('text' in body) {
    if (!body.text?.trim()) return NextResponse.json({ error: 'Tekst is verplicht' }, { status: 400 });
    update.text = body.text.trim();
  }
  if ('given' in body) {
    update.given = !!body.given;
    update.given_at = body.given ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from('people_gift_ideas')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from('people_gift_ideas').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
