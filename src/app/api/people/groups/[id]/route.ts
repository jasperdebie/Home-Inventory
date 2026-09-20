import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 });
  }

  try {
    const [row] = await sql`
      UPDATE people_groups
      SET name = ${body.name.trim()}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(row);
  } catch (error) {
    console.error('Update people group failed', error);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await sql`DELETE FROM people_groups WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete people group failed', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
