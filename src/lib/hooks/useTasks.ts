'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Task, TaskEventKind } from '@/lib/tasks/shared';
import type { TaskInput, TaskPatch } from '@/lib/tasks/validate';
import { tasksApi } from '@/lib/tasks/client';

export function useTasks(archived = false) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(archived ? '/api/tasks?archived=1' : '/api/tasks');
      if (res.ok) setTasks(await res.json());
    } catch {
      /* netwerkfout */
    }
  }, [archived]);

  useEffect(() => {
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

  const createTask = useCallback((input: TaskInput) => run(tasksApi.create(input)), [run]);
  const updateTask = useCallback((id: string, patch: TaskPatch) => run(tasksApi.update(id, patch)), [run]);
  const completeTask = useCallback((id: string, kind: TaskEventKind) => run(tasksApi.complete(id, kind)), [run]);

  return { tasks, loading, refetch, createTask, updateTask, completeTask };
}
