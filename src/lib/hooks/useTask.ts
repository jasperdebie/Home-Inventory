'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Task, TaskEvent, TaskEventKind } from '@/lib/tasks/shared';
import type { TaskPatch } from '@/lib/tasks/validate';
import { tasksApi } from '@/lib/tasks/client';

export function useTask(id: string) {
  const [task, setTask] = useState<Task | null>(null);
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) return;
      const data: { task: Task; events: TaskEvent[] } = await res.json();
      setTask(data.task);
      setEvents(data.events);
    } catch {
      /* netwerkfout */
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  const run = useCallback(
    async (action: Promise<string | null>) => {
      const error = await action;
      await refetch();
      return error;
    },
    [refetch],
  );

  const updateTask = useCallback((patch: TaskPatch) => run(tasksApi.update(id, patch)), [id, run]);
  const completeTask = useCallback((kind: TaskEventKind) => run(tasksApi.complete(id, kind)), [id, run]);
  const undo = useCallback(() => run(tasksApi.undo(id)), [id, run]);
  const deleteTask = useCallback(() => tasksApi.remove(id), [id]);

  return { task, events, loading, notFound, refetch, updateTask, completeTask, undo, deleteTask };
}
