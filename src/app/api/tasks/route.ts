import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { initialNextDue } from '@/lib/tasks/shared';
import { parseTaskInput } from '@/lib/tasks/validate';
import { findTask, findTasks, weekdaysParam } from '@/lib/tasks/queries';

export async function GET(request: NextRequest) {
  const archived = request.nextUrl.searchParams.get('archived') === '1';
  try {
    return NextResponse.json(await findTasks(archived));
  } catch (error) {
    console.error('Tasks query failed', error);
    return NextResponse.json({ error: 'Taken laden mislukt' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const parsed = parseTaskInput(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const t = parsed.value;

  try {
    const [row] = await sql`
      INSERT INTO tasks (title, category, notes, schedule_type, every_n, unit, weekdays, month_day, start_date, next_due)
      VALUES (
        ${t.title}, ${t.category}, ${t.notes}, ${t.schedule_type}, ${t.every_n}, ${t.unit},
        ${weekdaysParam(t.weekdays)}, ${t.month_day}, ${t.start_date}, ${initialNextDue(t)}
      )
      RETURNING id
    `;
    return NextResponse.json(await findTask(row.id as string), { status: 201 });
  } catch (error) {
    console.error('Create task failed', error);
    return NextResponse.json({ error: 'Taak opslaan mislukt' }, { status: 500 });
  }
}
