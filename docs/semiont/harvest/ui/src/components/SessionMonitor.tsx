/**
 * Section 5: Session 監控.
 * For each task whose sessions[] is non-empty (latest first), shows session
 * metadata. Log streaming is Phase 3 — MVP shows log_path + commits only.
 */
import { QueryClientProvider, useQuery } from '@tanstack/solid-query';
import { For, Show, createMemo, createSignal } from 'solid-js';
import { api } from '~/lib/api';
import { getQueryClient } from '~/lib/query-client';
import {
  formatDateTime,
  relativeTime,
  statusBadgeClass,
  typeEmoji,
} from '~/lib/format';
import TaskDetailDrawer from './TaskDetailDrawer';
import type { Task } from '~/lib/types';

function Inner() {
  const q = useQuery(() => ({
    queryKey: ['tasks', 'session-monitor'],
    queryFn: () => api.listTasks({ limit: 200 }),
    refetchInterval: 5_000,
  }));

  const [openId, setOpenId] = createSignal<string | null>(null);

  const tasksWithSessions = createMemo<Task[]>(() => {
    const tasks = q.data?.tasks ?? [];
    return tasks
      .filter((t) => t.sessions.length > 0)
      .sort((a, b) => {
        const aLatest =
          a.sessions[a.sessions.length - 1]?.spawned_at ?? a.updated_at;
        const bLatest =
          b.sessions[b.sessions.length - 1]?.spawned_at ?? b.updated_at;
        return bLatest.localeCompare(aLatest);
      });
  });

  return (
    <>
      <Show when={q.isPending}>
        <div class="space-y-2">
          <For each={Array.from({ length: 3 })}>
            {() => <div class="skeleton h-20" />}
          </For>
        </div>
      </Show>
      <Show when={!q.isPending && tasksWithSessions().length === 0}>
        <div class="text-sm text-text-muted py-4">
          沒有 session 紀錄。等 spawner 第一次 fire 後會出現。
        </div>
      </Show>
      <Show when={tasksWithSessions().length > 0}>
        <ul class="space-y-3">
          <For each={tasksWithSessions()}>
            {(t) => {
              const latest = t.sessions[t.sessions.length - 1]!;
              const completed = !!latest.completed_at;
              return (
                <li class="card">
                  <div class="card-body">
                    <div class="flex items-start gap-3">
                      <div class="text-xl">{typeEmoji(t.type)}</div>
                      <div class="min-w-0 flex-1">
                        <button
                          type="button"
                          class="text-sm font-medium hover:underline truncate text-left"
                          onClick={() => setOpenId(t.id)}
                        >
                          {t.title}
                        </button>
                        <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <span class={`pill ${statusBadgeClass(t.status)}`}>
                            {t.status}
                          </span>
                          <span class="text-text-muted">
                            {t.sessions.length} session
                            {t.sessions.length > 1 ? 's' : ''}
                          </span>
                          <Show when={completed}>
                            <span class="text-accent-green-soft">
                              ✓ exit {latest.exit_code ?? '?'}
                            </span>
                          </Show>
                          <Show when={!completed}>
                            <span class="text-accent-amber animate-pulse">
                              ● running
                            </span>
                          </Show>
                        </div>
                        <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-text-secondary">
                          <div>
                            <span class="text-text-muted">spawned:</span>{' '}
                            {formatDateTime(latest.spawned_at)}
                            <span class="text-text-muted">
                              {' '}
                              · {relativeTime(latest.spawned_at)}
                            </span>
                          </div>
                          <Show when={latest.completed_at}>
                            <div>
                              <span class="text-text-muted">completed:</span>{' '}
                              {formatDateTime(latest.completed_at)}
                            </div>
                          </Show>
                        </div>
                        <Show when={latest.log_path}>
                          <div class="mt-1 text-xs text-text-muted truncate">
                            log: <code>{latest.log_path}</code>
                          </div>
                        </Show>
                        <Show when={latest.commits?.length}>
                          <div class="mt-1 text-xs">
                            <span class="text-text-muted">commits:</span>{' '}
                            <For each={latest.commits ?? []}>
                              {(c) => (
                                <code class="ml-1 px-1.5 py-0.5 bg-bg-raised rounded text-accent-green-soft">
                                  {c.slice(0, 8)}
                                </code>
                              )}
                            </For>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </div>
                </li>
              );
            }}
          </For>
        </ul>
      </Show>
      <TaskDetailDrawer taskId={openId()} onClose={() => setOpenId(null)} />
    </>
  );
}

export default function SessionMonitor() {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <Inner />
    </QueryClientProvider>
  );
}
