import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rollForwardAnnual } from '@/lib/people/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  if ('due_date' in body) {
    if (body.due_date && !DATE_RE.test(body.due_date)) {
      return NextResponse.json({ error: 'Ongeldige datum' }, { status: 400 });
    }
    update.due_date = body.due_date || null;
  }
  if ('recurs_annually' in body) update.recurs_annually = !!body.recurs_annually;

  // Afvinken: terugkerend event rolt door naar volgend jaar i.p.v. te archiveren.
  if ('done' in body) {
    if (body.done === true) {
      const { data: current, error: readErr } = await supabase
        .from('people_reminders')
        .select('type, recurs_annually, due_date')
        .eq('id', id)
        .maybeSingle();
      if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });

      if (current && current.type === 'event' && current.recurs_annually && current.due_date) {
        update.due_date = rollForwardAnnual(current.due_date as string, new Date());
        update.done = false;
        update.done_at = null;
      } else {
        update.done = true;
        update.done_at = new Date().toISOString();
      }
    } else {
      update.done = false;
      update.done_at = null;
    }
  }

  const { data, error } = await supabase
    .from('people_reminders')
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
  const { error } = await supabase.from('people_reminders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
