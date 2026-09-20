import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { rollForwardAnnual } from '@/lib/people/shared';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  if ('text' in body && !body.text?.trim()) {
    return NextResponse.json({ error: 'Tekst is verplicht' }, { status: 400 });
  }
  if ('due_date' in body && body.due_date && !DATE_RE.test(body.due_date)) {
    return NextResponse.json({ error: 'Ongeldige datum' }, { status: 400 });
  }

  try {
    const [current] = await sql`SELECT * FROM people_reminders WHERE id = ${id}`;
    if (!current) {
      return NextResponse.json({ error: 'Herinnering niet gevonden' }, { status: 404 });
    }

    let nextDueDate = 'due_date' in body ? body.due_date || null : current.due_date;
    let nextRecurring = 'recurs_annually' in body ? Boolean(body.recurs_annually) : current.recurs_annually;
    let nextDone = current.done;
    let nextDoneAt = current.done_at;

    if ('done' in body) {
      if (body.done === true) {
        const currentDueDate = current.due_date ? String(current.due_date) : null;
        if (current.type === 'event' && current.recurs_annually && currentDueDate) {
          nextDueDate = rollForwardAnnual(currentDueDate, new Date());
          nextDone = false;
          nextDoneAt = null;
        } else {
          nextDone = true;
          nextDoneAt = new Date();
        }
      } else {
        nextDone = false;
        nextDoneAt = null;
      }
    }

    const [row] = await sql`
      UPDATE people_reminders
      SET
        text = ${'text' in body ? body.text.trim() : current.text},
        due_date = ${nextDueDate},
        recurs_annually = ${nextRecurring},
        done = ${nextDone},
        done_at = ${nextDoneAt}
      WHERE id = ${id}
      RETURNING *
    `;

    return NextResponse.json(row);
  } catch (error) {
    console.error('Update reminder failed', error);
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    await sql`DELETE FROM people_reminders WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete reminder failed', error);
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  }
}
