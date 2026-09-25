'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useTasks } from '@/lib/hooks/useTasks';
import { TaskRow } from '@/components/tasks/TaskRow';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { PostponeDialog } from '@/components/tasks/PostponeDialog';
import {
  DUE_GROUPS, TASK_CATEGORIES, categoryDef, compareTasks, dueGroup, todayKey,
  type Task, type TaskCategory, type TaskEventKind,
} from '@/lib/tasks/shared';

export default function TasksPage() {
  const { tasks, loading, refetch, createTask, updateTask, completeTask } = useTasks();
  const archived = useTasks(true);
  const { toast } = useToast();
  const [filter, setFilter] = useState<TaskCategory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [postponing, setPostponing] = useState<Task | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const today = todayKey();

  const groups = useMemo(() => {
    const visible = filter ? tasks.filter((t) => t.category === filter) : tasks;
    return DUE_GROUPS.map((g) => ({
      ...g,
      tasks: visible.filter((t) => dueGroup(t.next_due, today) === g.group).sort(compareTasks),
    })).filter((g) => g.tasks.length > 0);
  }, [tasks, filter, today]);

  const complete = async (task: Task, kind: TaskEventKind) => {
    setBusyId(task.id);
    const error = await completeTask(task.id, kind);
    setBusyId(null);
    if (error) toast(error, 'error');
    else toast(kind === 'done' ? `✓ ${task.title}` : `⏭ ${task.title} overgeslagen`);
  };

  const reactivate = async (task: Task) => {
    setBusyId(task.id);
    const error = await archived.updateTask(task.id, { archived: false });
    await refetch();
    setBusyId(null);
    if (error) toast(error, 'error');
    else toast(`${task.title} is weer actief`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      active ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
    }`;

  return (
    <div className="min-h-screen bg-teal-50/40 px-4 py-6">
      <div className="mx-auto w-full max-w-[780px] space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Terug" className="text-xl text-gray-400 hover:text-gray-600">
              ←
            </Link>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-xl">🔁</span>
            <h1 className="text-2xl font-bold text-teal-900">Taken</h1>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Taak
          </Button>
        </header>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilter(null)} className={chipClass(filter === null)}>
            Alles
          </button>
          {TASK_CATEGORIES.map((c) => (
            <button
              key={c.category}
              type="button"
              onClick={() => setFilter(c.category)}
              className={chipClass(filter === c.category)}
            >
              {c.icon} {c.label}
            </button>
          ))}
        </div>

        {tasks.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500">Nog geen taken. Voeg er een toe.</p>
          </Card>
        ) : groups.length === 0 ? (
          <Card>
            <p className="text-sm text-gray-500">Geen taken in deze categorie.</p>
          </Card>
        ) : (
          groups.map((g) => (
            <section key={g.group} className="space-y-2">
              <h2
                className={`text-sm font-semibold uppercase tracking-wide ${
                  g.group === 'overdue' ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                {g.label} ({g.tasks.length})
              </h2>
              <Card padding={false}>
                <ul className="divide-y divide-gray-100">
                  {g.tasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      today={today}
                      busy={busyId === t.id}
                      onDone={() => complete(t, 'done')}
                      onSkip={() => complete(t, 'skipped')}
                      onPostpone={() => setPostponing(t)}
                      onEdit={() => {
                        setEditing(t);
                        setFormOpen(true);
                      }}
                    />
                  ))}
                </ul>
              </Card>
            </section>
          ))
        )}

        {archived.tasks.length > 0 && (
          <section className="space-y-2">
            <button
              type="button"
              onClick={() => setShowArchived((s) => !s)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {showArchived ? '▾' : '▸'} Gestopte taken ({archived.tasks.length})
            </button>
            {showArchived && (
              <Card padding={false}>
                <ul className="divide-y divide-gray-100">
                  {archived.tasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-2xl opacity-50">{categoryDef(t.category).icon}</span>
                      <Link href={`/tasks/${t.id}`} className="min-w-0 flex-1 truncate text-gray-500">
                        {t.title}
                      </Link>
                      <Button size="sm" variant="secondary" disabled={busyId === t.id} onClick={() => reactivate(t)}>
                        Weer activeren
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        )}
      </div>

      <TaskFormDialog
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => (editing ? updateTask(editing.id, input) : createTask(input))}
      />
      <PostponeDialog
        task={postponing}
        onClose={() => setPostponing(null)}
        onSubmit={(date) => (postponing ? updateTask(postponing.id, { next_due: date }) : Promise.resolve(null))}
      />
    </div>
  );
}
