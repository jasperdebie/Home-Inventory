import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim().toLowerCase() ?? '';

  let query = supabase
    .from('cookbook_equipment')
    .select('*')
    .order('name', { ascending: true })
    .limit(20);

  if (q) {
    query = query.ilike('name_normalized', `%${q}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
