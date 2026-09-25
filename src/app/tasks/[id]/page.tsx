'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useTask } from '@/lib/hooks/useTask';
import { TaskFormDialog } from '@/components/tasks/TaskFormDialog';
import { PostponeDialog } from '@/components/tasks/PostponeDialog';
import { TaskHistory } from '@/components/tasks/TaskHistory';
import { categoryDef, describeSchedule, dueGroup, dueLabel, formatLongDate, todayKey } from '@/lib/tasks/shared';

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { task, events, loading, notFound, updateTask, completeTask, undo, deleteTask } = useTask(id);
  const [formOpen, setFormOpen] = useState(false);
  const [postponing, setPostponing] = useState(false);
  const [busy, setBusy] = useState(false);

  const act = async (action: () => Promise<string | null>, success: string) => {
    setBusy(true);
    const error = await action();
    setBusy(false);
    if (error) toast(error, 'error');
    else toast(success);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notFound || !task) {
    return (
      <div className="min-h-screen bg-teal-50/40 px-4 py-6">
        <div className="mx-auto w-full max-w-[780px] space-y-4">
          <Link href="/tasks" className="text-teal-700 hover:underline">
            ← Terug naar taken
          </Link>
          <Card>
            <p className="text-gray-600">Taak niet gevonden.</p>
          </Card>
        </div>
      </div>
    );
  }

  const today = todayKey();
  const cat = categoryDef(task.category);
  const overdue = dueGroup(task.next_due, today) === 'overdue';

  const handleDelete = async () => {
    if (!window.confirm(`"${task.title}" en de volledige historiek verwijderen?`)) return;
    setBusy(true);
    const error = await deleteTask();
    setBusy(false);
    if (error) {
      toast(error, 'error');
      return;
    }
    toast('Taak verwijderd');
    router.push('/tasks');
  };

  return (
    <div className="min-h-screen bg-teal-50/40 px-4 py-6">
      <div className="mx-auto w-full max-w-[780px] space-y-6">
        <header className="flex items-center gap-3">
          <Link href="/tasks" aria-label="Terug" className="text-xl text-gray-400 hover:text-gray-600">
            ←
          </Link>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-xl">{cat.icon}</span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-teal-900">{task.title}</h1>
            <p className="text-sm text-gray-500">
              {cat.label}
              {task.archived && ' · gestopt'}
            </p>
          </div>
        </header>

        <Card className="space-y-3">
          <p className="text-gray-800">{describeSchedule(task)}</p>
          {!task.archived && (
            <p className={`font-medium ${overdue ? 'text-red-600' : 'text-teal-700'}`}>
              Volgende keer: {dueLabel(task.next_due, today)}{' '}
              <span className="font-normal text-gray-500">({formatLongDate(task.next_due)})</span>
            </p>
          )}
          {task.notes && <p className="whitespace-pre-wrap text-sm text-gray-600">{task.notes}</p>}
          <div className="flex flex-wrap gap-2 pt-2">
            {!task.archived && (
              <>
                <Button disabled={busy} onClick={() => act(() => completeTask('done'), `✓ ${task.title}`)}>
                  ✓ Gedaan
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => act(() => completeTask('skipped'), 'Overgeslagen')}>
                  ⏭ Overslaan
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => setPostponing(true)}>
                  ⏰ Uitstellen
                </Button>
              </>
            )}
            <Button variant="secondary" disabled={busy} onClick={() => setFormOpen(true)}>
              ✏️ Bewerken
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                act(() => updateTask({ archived: !task.archived }), task.archived ? 'Taak weer actief' : 'Taak gestopt')
              }
            >
              {task.archived ? '▶ Weer activeren' : '⏸ Stopzetten'}
            </Button>
            <Button variant="danger" disabled={busy} onClick={handleDelete}>
              🗑 Verwijderen
            </Button>
          </div>
        </Card>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Historiek</h2>
          <Card>
            <TaskHistory events={events} busy={busy} onUndo={() => act(undo, 'Ongedaan gemaakt')} />
          </Card>
        </section>
      </div>

      <TaskFormDialog open={formOpen} initial={task} onClose={() => setFormOpen(false)} onSubmit={(input) => updateTask(input)} />
      <PostponeDialog
        task={postponing ? task : null}
        onClose={() => setPostponing(false)}
        onSubmit={(date) => updateTask({ next_due: date })}
      />
    </div>
  );
}
