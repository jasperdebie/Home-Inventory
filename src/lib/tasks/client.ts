import { todayKey, type TaskEventKind } from '@/lib/tasks/shared';
import type { TaskInput, TaskPatch } from '@/lib/tasks/validate';

async function send(url: string, method: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data && typeof data.error === 'string' ? data.error : 'Er ging iets mis';
  } catch {
    return 'Geen verbinding met de server';
  }
}

export const tasksApi = {
  create: (input: TaskInput) => send('/api/tasks', 'POST', input),
  update: (id: string, patch: TaskPatch) => send(`/api/tasks/${id}`, 'PATCH', { ...patch, today: todayKey() }),
  complete: (id: string, kind: TaskEventKind) =>
    send(`/api/tasks/${id}/complete`, 'POST', { kind, date: todayKey() }),
  undo: (id: string) => send(`/api/tasks/${id}/undo`, 'POST'),
  remove: (id: string) => send(`/api/tasks/${id}`, 'DELETE'),
};
