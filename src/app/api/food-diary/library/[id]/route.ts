import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await sql`DELETE FROM food_diary_library WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete library item failed', error);
    return NextResponse.json({ error: 'Bibliotheekitem verwijderen mislukt' }, { status: 500 });
  }
}
