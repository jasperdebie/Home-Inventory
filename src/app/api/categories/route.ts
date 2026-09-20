import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, icon, sort_order
      FROM categories
      ORDER BY sort_order ASC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Categories query failed', error);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}
