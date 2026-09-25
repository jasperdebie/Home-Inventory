import { sql } from '@/lib/db';
import type { Task, TaskEvent } from '@/lib/tasks/shared';

function taskColumns() {
  return sql`
    t.id, t.title, t.category, t.notes, t.schedule_type, t.every_n, t.unit, t.weekdays, t.month_day,
    t.start_date::text AS start_date,
    t.next_due::text AS next_due,
    t.archived, t.created_at,
    (SELECT MAX(e.event_date)::text FROM task_events e WHERE e.task_id = t.id AND e.kind = 'done') AS last_done
  `;
}

export async function findTasks(archived: boolean): Promise<Task[]> {
  return sql<Task[]>`
    SELECT ${taskColumns()}
    FROM tasks t
    WHERE t.archived = ${archived}
    ORDER BY t.next_due ASC, t.title ASC
  `;
}

export async function findTask(id: string): Promise<Task | null> {
  const [task] = await sql<Task[]>`SELECT ${taskColumns()} FROM tasks t WHERE t.id = ${id}`;
  return task ?? null;
}

export async function findEvents(taskId: string): Promise<TaskEvent[]> {
  return sql<TaskEvent[]>`
    SELECT id, task_id, kind, event_date::text AS event_date, due_date::text AS due_date, created_at
    FROM task_events
    WHERE task_id = ${taskId}
    ORDER BY created_at DESC
  `;
}

// 21 = OID van smallint, zodat Postgres de array als SMALLINT[] ontvangt.
export function weekdaysParam(weekdays: number[] | null) {
  return weekdays ? sql.array(weekdays, 21) : null;
}
