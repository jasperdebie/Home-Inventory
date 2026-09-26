import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { parseHouseholdInput } from '@/lib/people/shared';

type Ctx = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function notFound() {
  return NextResponse.json({ error: 'Huishouden niet gevonden' }, { status: 404 });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return notFound();
  const body = await request.json().catch(() => null);

  try {
    const [current] = await sql`SELECT * FROM people_households WHERE id = ${id}`;
    if (!current) return notFound();

    const parsed = parseHouseholdInput({ ...current, ...(typeof body === 'object' && body ? body : {}) });
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const h = parsed.value;

    const [row] = await sql`
      UPDATE people_households
      SET name = ${h.name}, street = ${h.street}, house_number = ${h.house_number},
          postal_code = ${h.postal_code}, city = ${h.city}
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json(row);
  } catch (error) {
    console.error('Update household failed', error);
    return NextResponse.json({ error: 'Huishouden opslaan mislukt' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return notFound();

  try {
    const rows = await sql`DELETE FROM people_households WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) return notFound();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete household failed', error);
    return NextResponse.json({ error: 'Huishouden verwijderen mislukt' }, { status: 500 });
  }
}
