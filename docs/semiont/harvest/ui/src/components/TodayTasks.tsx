/**
 * Section 2: 今日任務 — tasks that are alive RIGHT NOW.
 * Definition: status in {spawning, in-progress, blocked, awaiting-cheyu}
 * OR (status in {pending} AND created within 24h).
 */
import { QueryClientProvider, useQuery } from '@tanstack/solid-query';
import { For, Show, createMemo, createSignal } from 'solid-js';
import { api } from '~/lib/api';
import { getQueryClient } from '~/lib/query-client';
import { priorityRank } from '~/lib/format';
import TaskRow from './TaskRow';
import TaskDetailDrawer from './TaskDetailDrawer';
import type { Task } from '~/lib/types';

const ACTIVE_STATUSES = new Set([
  'spawning',
  'in-progress',
  'blocked',
  'awaiting-cheyu',
]);

function Inner() {
  const q = useQuery(() => ({
    queryKey: ['tasks', 'all-for-today'],
    queryFn: () => api.listTasks({ limit: 200 }),
    refetchInterval: 5_000,
  }));

  const [openId, setOpenId] = createSignal<string | null>(null);

  const todays = createMemo<Task[]>(() => {
    const tasks = q.data?.tasks ?? [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return tasks
      .filter((t) => {
        if (ACTIVE_STATUSES.has(t.status)) return true;
        if (t.status === 'pending') {
          const created = new Date(t.created_at).getTime();
          if (Number.isFinite(created) && now - created < dayMs) return true;
        }
        if (t.status === 'done' || t.status === 'failed') {
          const updated = new Date(t.updated_at).getTime();
          if (Number.isFinite(updated) && now - updated < dayMs) return true;
        }
        return false;
      })
      .sort((a, b) => {
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return b.created_at.localeCompare(a.created_at);
      });
  });

  return (
    <>
      <Show when={q.isPending}>
        <div class="space-y-2">
          <For each={Array.from({ length: 3 })}>
            {() => <div class="skeleton h-14" />}
          </For>
        </div>
      </Show>
      <Show when={q.isError}>
        <div class="text-sm text-accent-red">
          載入失敗 ·{' '}
          <button class="btn ml-2" onClick={() => q.refetch()}>
            retry
          </button>
        </div>
      </Show>
      <Show when={!q.isPending && !q.isError && todays().length === 0}>
        <div class="text-sm text-text-muted py-4">
          沒有進行中的任務。整個生命體在休息 🌙
        </div>
      </Show>
      <Show when={todays().length > 0}>
        <ul class="space-y-1">
          <For each={todays()}>
            {(t) => (
              <li>
                <TaskRow task={t} onClick={() => setOpenId(t.id)} />
              </li>
            )}
          </For>
        </ul>
      </Show>
      <TaskDetailDrawer taskId={openId()} onClose={() => setOpenId(null)} />
    </>
  );
}

export default function TodayTasks() {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <Inner />
    </QueryClientProvider>
  );
}
