// Invoervalidatie en patch-logica voor de API van "Taken". Puur, zodat node:test het kan laden.
import {
  SCHEDULE_UNITS, TASK_CATEGORIES, isDateKey, reactivatedNextDue, recomputeNextDue,
  type ScheduleUnit, type Task, type TaskCategory, type TaskEventKind, type TaskSchedule,
} from './shared.ts';

export interface TaskInput extends TaskSchedule {
  title: string;
  category: TaskCategory;
  notes: string | null;
}

export type TaskPatch = Partial<TaskInput> & { next_due?: string; archived?: boolean };

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

const EDITABLE_FIELDS = [
  'title', 'category', 'notes', 'schedule_type', 'every_n', 'unit', 'weekdays', 'month_day', 'start_date',
] as const;

const SCHEDULE_FIELDS = ['schedule_type', 'every_n', 'unit', 'weekdays', 'month_day', 'start_date'] as const;

export function parseTaskInput(body: unknown): Result<TaskInput> {
  if (typeof body !== 'object' || body === null) return fail('Ongeldige invoer');
  const b = body as Record<string, unknown>;

  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title) return fail('Titel is verplicht');

  const category = b.category ?? 'household';
  if (!TASK_CATEGORIES.some((c) => c.category === category)) return fail('Ongeldige categorie');

  const scheduleType = b.schedule_type;
  if (scheduleType !== 'fixed' && scheduleType !== 'interval') return fail('Kies een soort schema');

  if (!SCHEDULE_UNITS.includes(b.unit as ScheduleUnit)) return fail('Ongeldige periode');
  const unit = b.unit as ScheduleUnit;

  const everyN = Number(b.every_n);
  if (!Number.isInteger(everyN) || everyN < 1 || everyN > 999) {
    return fail('"Elke" moet een geheel getal tussen 1 en 999 zijn');
  }

  if (!isDateKey(b.start_date)) return fail('Ongeldige startdatum');

  let weekdays: number[] | null = null;
  if (scheduleType === 'fixed' && unit === 'week') {
    if (!Array.isArray(b.weekdays) || b.weekdays.length === 0) return fail('Kies minstens één weekdag');
    if (!b.weekdays.every((w) => Number.isInteger(w) && w >= 1 && w <= 7)) return fail('Ongeldige weekdag');
    weekdays = [...new Set(b.weekdays as number[])].sort((x, y) => x - y);
  }

  let monthDay: number | null = null;
  if (scheduleType === 'fixed' && unit === 'month') {
    const md = Number(b.month_day);
    if (!Number.isInteger(md) || md < 1 || md > 31) return fail('Dag van de maand moet tussen 1 en 31 liggen');
    monthDay = md;
  }

  const notes = typeof b.notes === 'string' && b.notes.trim() ? b.notes.trim() : null;

  return {
    ok: true,
    value: {
      title,
      category: category as TaskCategory,
      notes,
      schedule_type: scheduleType,
      every_n: everyN,
      unit,
      weekdays,
      month_day: monthDay,
      start_date: b.start_date,
    },
  };
}

export function parseEventInput(body: unknown): Result<{ kind: TaskEventKind; date: string }> {
  if (typeof body !== 'object' || body === null) return fail('Ongeldige invoer');
  const b = body as Record<string, unknown>;
  if (b.kind !== 'done' && b.kind !== 'skipped') return fail('Ongeldige actie');
  if (!isDateKey(b.date)) return fail('Ongeldige datum');
  return { ok: true, value: { kind: b.kind, date: b.date } };
}

export function scheduleChanged(a: TaskSchedule, b: TaskSchedule): boolean {
  return SCHEDULE_FIELDS.some((f) => JSON.stringify(a[f]) !== JSON.stringify(b[f]));
}

export function applyTaskPatch(
  current: Task,
  body: unknown,
): Result<{ input: TaskInput; next_due: string; archived: boolean }> {
  if (typeof body !== 'object' || body === null) return fail('Ongeldige invoer');
  const b = body as Record<string, unknown>;

  const merged: Record<string, unknown> = { ...current };
  for (const field of EDITABLE_FIELDS) {
    if (field in b) merged[field] = b[field];
  }
  const parsed = parseTaskInput(merged);
  if (!parsed.ok) return parsed;
  const input = parsed.value;

  let archived = current.archived;
  if ('archived' in b) {
    if (typeof b.archived !== 'boolean') return fail('Ongeldige waarde voor gestopt');
    archived = b.archived;
  }

  const changed = scheduleChanged(current, input);
  const reactivated = current.archived && !archived;
  const postponed = 'next_due' in b;

  let today = '';
  if (changed || reactivated || postponed) {
    const t = b.today;
    if (!isDateKey(t)) return fail('Datum van vandaag ontbreekt');
    today = t;
  }

  let nextDue = current.next_due;
  if (changed) nextDue = recomputeNextDue(input, today, current.last_done);
  if (reactivated) nextDue = reactivatedNextDue(input, today, current.last_done);
  if (postponed) {
    const d = b.next_due;
    if (!isDateKey(d) || d < today) return fail('Uitstellen kan enkel naar vandaag of later');
    nextDue = d;
  }

  return { ok: true, value: { input, next_due: nextDue, archived } };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
