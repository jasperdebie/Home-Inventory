import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { applyTaskPatch, isUuid } from '@/lib/tasks/validate';
import { findEvents, findTask, weekdaysParam } from '@/lib/tasks/queries';

type Ctx = { params: Promise<{ id: string }> };

function notFound() {
  return NextResponse.json({ error: 'Taak niet gevonden' }, { status: 404 });
}

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  try {
    const task = await findTask(id);
    if (!task) return notFound();
    return NextResponse.json({ task, events: await findEvents(id) });
  } catch (error) {
    console.error('Task query failed', error);
    return NextResponse.json({ error: 'Taak laden mislukt' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const body = await request.json().catch(() => null);

  try {
    const current = await findTask(id);
    if (!current) return notFound();

    const result = applyTaskPatch(current, body);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    const { input: t, next_due, archived } = result.value;

    await sql`
      UPDATE tasks SET
        title = ${t.title},
        category = ${t.category},
        notes = ${t.notes},
        schedule_type = ${t.schedule_type},
        every_n = ${t.every_n},
        unit = ${t.unit},
        weekdays = ${weekdaysParam(t.weekdays)},
        month_day = ${t.month_day},
        start_date = ${t.start_date},
        next_due = ${next_due},
        archived = ${archived}
      WHERE id = ${id}
    `;
    return NextResponse.json(await findTask(id));
  } catch (error) {
    console.error('Update task failed', error);
    return NextResponse.json({ error: 'Taak opslaan mislukt' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  try {
    const rows = await sql`DELETE FROM tasks WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) return notFound();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete task failed', error);
    return NextResponse.json({ error: 'Taak verwijderen mislukt' }, { status: 500 });
  }
}
