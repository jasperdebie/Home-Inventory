import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { isUuid } from '@/lib/tasks/validate';
import { findTask } from '@/lib/tasks/queries';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Taak niet gevonden' }, { status: 404 });

  try {
    const task = await findTask(id);
    if (!task) return NextResponse.json({ error: 'Taak niet gevonden' }, { status: 404 });

    const restored = await sql.begin(async (tx) => {
      const [last] = await tx`
        DELETE FROM task_events
        WHERE id = (
          SELECT id FROM task_events WHERE task_id = ${id} ORDER BY created_at DESC LIMIT 1
        )
        RETURNING due_date::text AS due_date
      `;
      if (!last) return false;
      await tx`UPDATE tasks SET next_due = ${last.due_date} WHERE id = ${id}`;
      return true;
    });
    if (!restored) return NextResponse.json({ error: 'Er is niets om ongedaan te maken' }, { status: 400 });
    return NextResponse.json(await findTask(id));
  } catch (error) {
    console.error('Undo task event failed', error);
    return NextResponse.json({ error: 'Ongedaan maken mislukt' }, { status: 500 });
  }
}
