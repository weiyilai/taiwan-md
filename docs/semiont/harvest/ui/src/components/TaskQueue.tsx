/**
 * Section 3: 任務佇列 — main work surface.
 * All tasks, filterable by status / priority / type. Sorted P0→P3 then created desc.
 */
import { QueryClientProvider, useQuery } from '@tanstack/solid-query';
import { For, Show, createMemo, createSignal } from 'solid-js';
import { api } from '~/lib/api';
import { getQueryClient } from '~/lib/query-client';
import {
  priorityBadgeClass,
  priorityRank,
  relativeTime,
  statusBadgeClass,
  typeEmoji,
} from '~/lib/format';
import TaskDetailDrawer from './TaskDetailDrawer';
import type { Task, TaskPriority, TaskStatus } from '~/lib/types';

const STATUS_FILTERS: Array<TaskStatus | 'all'> = [
  'all',
  'pending',
  'in-progress',
  'spawning',
  'blocked',
  'awaiting-cheyu',
  'done',
  'failed',
  'retired',
];
const PRIORITY_FILTERS: Array<TaskPriority | 'all'> = [
  'all',
  'P0',
  'P1',
  'P2',
  'P3',
];

function Inner() {
  const [statusF, setStatusF] = createSignal<TaskStatus | 'all'>('all');
  const [priorityF, setPriorityF] = createSignal<TaskPriority | 'all'>('all');
  const [typeF, setTypeF] = createSignal<string>('');
  const [openId, setOpenId] = createSignal<string | null>(null);

  const q = useQuery(() => ({
    queryKey: ['tasks', 'queue'],
    queryFn: () => api.listTasks({ limit: 500 }),
    refetchInterval: 5_000,
  }));

  const filtered = createMemo<Task[]>(() => {
    const tasks = q.data?.tasks ?? [];
    return tasks
      .filter((t) => {
        if (statusF() !== 'all' && t.status !== statusF()) return false;
        if (priorityF() !== 'all' && t.priority !== priorityF()) return false;
        if (
          typeF() &&
          !String(t.type).toLowerCase().includes(typeF().toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        const pr = priorityRank(a.priority) - priorityRank(b.priority);
        if (pr !== 0) return pr;
        return b.created_at.localeCompare(a.created_at);
      });
  });

  return (
    <>
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <FilterChips
          label="status"
          value={statusF()}
          options={STATUS_FILTERS}
          onChange={(v) => setStatusF(v as TaskStatus | 'all')}
        />
        <FilterChips
          label="priority"
          value={priorityF()}
          options={PRIORITY_FILTERS}
          onChange={(v) => setPriorityF(v as TaskPriority | 'all')}
        />
        <input
          class="input max-w-[200px]"
          placeholder="filter type…"
          value={typeF()}
          onInput={(e) => setTypeF(e.currentTarget.value)}
        />
        <div class="ml-auto text-xs text-text-muted">
          {filtered().length} / {q.data?.count ?? 0}
        </div>
      </div>

      <Show when={q.isPending}>
        <div class="space-y-2">
          <For each={Array.from({ length: 5 })}>
            {() => <div class="skeleton h-10" />}
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

      <Show when={!q.isPending && !q.isError}>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wider text-text-muted border-b border-line">
                <th class="py-2 pr-2">type</th>
                <th class="py-2 pr-2">status</th>
                <th class="py-2 pr-2">P</th>
                <th class="py-2 pr-2 w-full">title</th>
                <th class="py-2 pr-2">age</th>
              </tr>
            </thead>
            <tbody>
              <For each={filtered()}>
                {(t) => (
                  <tr
                    class="border-b border-line/60 cursor-pointer hover:bg-bg-raised"
                    onClick={() => setOpenId(t.id)}
                  >
                    <td class="py-2 pr-2 whitespace-nowrap">
                      <span class="mr-1">{typeEmoji(t.type)}</span>
                      <span class="text-xs text-text-muted">{t.type}</span>
                    </td>
                    <td class="py-2 pr-2">
                      <span class={`pill ${statusBadgeClass(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td class="py-2 pr-2">
                      <span class={`pill ${priorityBadgeClass(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td class="py-2 pr-2 max-w-md truncate">{t.title}</td>
                    <td class="py-2 pr-2 text-xs text-text-muted whitespace-nowrap">
                      {relativeTime(t.created_at)}
                    </td>
                  </tr>
                )}
              </For>
              <Show when={filtered().length === 0}>
                <tr>
                  <td
                    colSpan={5}
                    class="py-6 text-center text-text-muted text-sm"
                  >
                    沒有符合條件的任務
                  </td>
                </tr>
              </Show>
            </tbody>
          </table>
        </div>
      </Show>

      <TaskDetailDrawer taskId={openId()} onClose={() => setOpenId(null)} />
    </>
  );
}

function FilterChips(props: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div class="flex items-center gap-1 flex-wrap">
      <span class="text-xs text-text-muted mr-1">{props.label}:</span>
      <For each={props.options}>
        {(opt) => (
          <button
            type="button"
            class={`pill ${
              props.value === opt
                ? 'bg-accent-green/20 text-accent-green-soft border border-accent-green/40'
                : 'bg-bg-raised text-text-secondary border border-line hover:bg-bg-input'
            }`}
            onClick={() => props.onChange(opt)}
          >
            {opt}
          </button>
        )}
      </For>
    </div>
  );
}

export default function TaskQueue() {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <Inner />
    </QueryClientProvider>
  );
}
