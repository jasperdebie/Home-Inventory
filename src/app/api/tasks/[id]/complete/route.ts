import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { nextDueAfterEvent } from '@/lib/tasks/shared';
import { isUuid, parseEventInput } from '@/lib/tasks/validate';
import { findTask } from '@/lib/tasks/queries';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Taak niet gevonden' }, { status: 404 });

  const parsed = parseEventInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { kind, date } = parsed.value;

  try {
    const task = await findTask(id);
    if (!task) return NextResponse.json({ error: 'Taak niet gevonden' }, { status: 404 });
    if (task.archived) return NextResponse.json({ error: 'Deze taak is gestopt' }, { status: 400 });

    const nextDue = nextDueAfterEvent(task, kind, task.next_due, date);
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO task_events (task_id, kind, event_date, due_date)
        VALUES (${id}, ${kind}, ${date}, ${task.next_due})
      `;
      await tx`UPDATE tasks SET next_due = ${nextDue} WHERE id = ${id}`;
    });
    return NextResponse.json(await findTask(id));
  } catch (error) {
    console.error('Complete task failed', error);
    return NextResponse.json({ error: 'Afvinken mislukt' }, { status: 500 });
  }
}
