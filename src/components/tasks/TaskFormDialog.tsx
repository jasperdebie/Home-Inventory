'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  SCHEDULE_UNITS, TASK_CATEGORIES, UNIT_LABELS, WEEKDAY_SHORT,
  followingDue, formatShortDate, initialNextDue, isoWeekday, recomputeNextDue, todayKey,
  type ScheduleType, type ScheduleUnit, type Task, type TaskCategory,
} from '@/lib/tasks/shared';
import { parseTaskInput, scheduleChanged, type TaskInput } from '@/lib/tasks/validate';

interface Props {
  open: boolean;
  initial: Task | null;
  onClose: () => void;
  onSubmit: (input: TaskInput) => Promise<string | null>;
}

interface FormState {
  title: string;
  category: TaskCategory;
  notes: string;
  schedule_type: ScheduleType;
  every_n: string;
  unit: ScheduleUnit;
  weekdays: number[];
  month_day: string;
  start_date: string;
}

function emptyForm(): FormState {
  const today = todayKey();
  return {
    title: '', category: 'household', notes: '',
    schedule_type: 'fixed', every_n: '1', unit: 'week',
    weekdays: [isoWeekday(today)], month_day: String(Number(today.slice(8))), start_date: today,
  };
}

function formFromTask(t: Task): FormState {
  return {
    title: t.title, category: t.category, notes: t.notes ?? '',
    schedule_type: t.schedule_type, every_n: String(t.every_n), unit: t.unit,
    weekdays: t.weekdays ?? [isoWeekday(t.start_date)],
    month_day: String(t.month_day ?? Number(t.start_date.slice(8))),
    start_date: t.start_date,
  };
}

function previewDates(initial: Task | null, input: TaskInput): [string, string] | null {
  try {
    const first = !initial
      ? initialNextDue(input)
      : scheduleChanged(initial, input)
        ? recomputeNextDue(input, todayKey(), initial.last_done)
        : initial.next_due;
    return [first, followingDue(input, first)];
  } catch {
    return null;
  }
}

const FIELD_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500';

export function TaskFormDialog({ open, initial, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initial ? formFromTask(initial) : emptyForm());
    setError(null);
  }, [open, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const parsed = useMemo(
    () => parseTaskInput({ ...form, every_n: Number(form.every_n), month_day: Number(form.month_day) }),
    [form],
  );
  const dates = parsed.ok ? previewDates(initial, parsed.value) : null;
  const today = todayKey();

  const toggleWeekday = (w: number) =>
    set('weekdays', form.weekdays.includes(w) ? form.weekdays.filter((x) => x !== w) : [...form.weekdays, w]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    const err = await onSubmit(parsed.value);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  };

  const n = Number(form.every_n);
  const fixedWeek = form.schedule_type === 'fixed' && form.unit === 'week';
  const fixedMonth = form.schedule_type === 'fixed' && form.unit === 'month';

  return (
    <Dialog open={open} onClose={onClose} title={initial ? 'Taak bewerken' : 'Nieuwe taak'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <Input label="Titel" value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Categorie</label>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value as TaskCategory)}
            className={FIELD_CLASS}
          >
            {TASK_CATEGORIES.map((c) => (
              <option key={c.category} value={c.category}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
          {(['fixed', 'interval'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => set('schedule_type', type)}
              aria-pressed={form.schedule_type === type}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                form.schedule_type === type ? 'bg-white text-teal-800 shadow-sm' : 'text-gray-600'
              }`}
            >
              {type === 'fixed' ? 'Vast schema' : 'Vanaf laatst gedaan'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Elke</span>
          <input
            type="number"
            min={1}
            max={999}
            value={form.every_n}
            onChange={(e) => set('every_n', e.target.value)}
            aria-label="Aantal"
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
          />
          <select
            value={form.unit}
            onChange={(e) => set('unit', e.target.value as ScheduleUnit)}
            aria-label="Periode"
            className={FIELD_CLASS}
          >
            {SCHEDULE_UNITS.map((u) => (
              <option key={u} value={u}>
                {n === 1 ? UNIT_LABELS[u].one : UNIT_LABELS[u].many}
              </option>
            ))}
          </select>
        </div>

        {fixedWeek && (
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_SHORT.map((label, i) => {
              const w = i + 1;
              const on = form.weekdays.includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => toggleWeekday(w)}
                  aria-pressed={on}
                  className={`h-10 w-10 rounded-full text-sm font-medium ${
                    on ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {fixedMonth && (
          <Input
            label="Dag van de maand"
            type="number"
            min={1}
            max={31}
            value={form.month_day}
            onChange={(e) => set('month_day', e.target.value)}
          />
        )}

        <Input
          label="Startdatum"
          type="date"
          value={form.start_date}
          onChange={(e) => set('start_date', e.target.value)}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Notitie (optioneel)</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            className={FIELD_CLASS}
          />
        </div>

        {dates && (
          <p className="text-sm text-teal-800">
            Volgende keer: {formatShortDate(dates[0], today)}, daarna {formatShortDate(dates[1], today)}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuleren
          </Button>
          <Button type="submit" loading={saving}>
            {initial ? 'Opslaan' : 'Toevoegen'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
