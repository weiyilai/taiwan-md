/**
 * Section 7: 歷史 log — done/failed/retired tasks grouped by date,
 * plus an ECharts line chart of daily completion counts.
 */
import { QueryClientProvider, useQuery } from '@tanstack/solid-query';
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import * as echarts from 'echarts';
import { api } from '~/lib/api';
import { getQueryClient } from '~/lib/query-client';
import { statusBadgeClass, typeEmoji } from '~/lib/format';
import type { Task } from '~/lib/types';

const TERMINAL = new Set(['done', 'failed', 'retired']);

function Inner() {
  const [days, setDays] = createSignal<7 | 30>(7);

  const q = useQuery(() => ({
    queryKey: ['tasks', 'history'],
    queryFn: () => api.listTasks({ limit: 1000 }),
    refetchInterval: 30_000,
  }));

  const cutoff = createMemo<number>(() => Date.now() - days() * 86400 * 1000);

  const filtered = createMemo<Task[]>(() => {
    const tasks = q.data?.tasks ?? [];
    return tasks
      .filter((t) => TERMINAL.has(t.status))
      .filter((t) => new Date(t.updated_at).getTime() >= cutoff())
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  });

  const grouped = createMemo<Array<[string, Task[]]>>(() => {
    const map = new Map<string, Task[]>();
    for (const t of filtered()) {
      const day = (t.updated_at || '').slice(0, 10);
      if (!day) continue;
      const arr = map.get(day) ?? [];
      arr.push(t);
      map.set(day, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  });

  const seriesData = createMemo<
    Array<{ day: string; done: number; failed: number; retired: number }>
  >(() => {
    const map = new Map<
      string,
      { done: number; failed: number; retired: number }
    >();
    // seed last N days with zeros so chart x-axis is dense
    for (let i = days() - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400 * 1000);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { done: 0, failed: 0, retired: 0 });
    }
    for (const t of filtered()) {
      const day = (t.updated_at || '').slice(0, 10);
      if (!day || !map.has(day)) continue;
      const row = map.get(day)!;
      if (t.status === 'done') row.done += 1;
      else if (t.status === 'failed') row.failed += 1;
      else if (t.status === 'retired') row.retired += 1;
    }
    return Array.from(map.entries()).map(([day, v]) => ({ day, ...v }));
  });

  let chartEl: HTMLDivElement | undefined;
  let chart: echarts.ECharts | undefined;

  onMount(() => {
    if (!chartEl) return;
    chart = echarts.init(chartEl);
    const onResize = (): void => chart?.resize();
    window.addEventListener('resize', onResize);
    onCleanup(() => {
      window.removeEventListener('resize', onResize);
      chart?.dispose();
    });
  });

  createEffect(() => {
    if (!chart) return;
    const data = seriesData();
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#22222a',
        borderColor: '#2f2f38',
        textStyle: { color: '#e8e6e1' },
      },
      legend: { textStyle: { color: '#a0a0a8' }, top: 0 },
      grid: { left: 30, right: 16, top: 30, bottom: 24 },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.day.slice(5)),
        axisLine: { lineStyle: { color: '#2f2f38' } },
        axisLabel: { color: '#a0a0a8' },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#2f2f38' } },
        axisLabel: { color: '#a0a0a8' },
      },
      series: [
        {
          name: 'done',
          type: 'line',
          smooth: true,
          data: data.map((d) => d.done),
          itemStyle: { color: '#10b981' },
          areaStyle: { color: 'rgba(16,185,129,0.15)' },
        },
        {
          name: 'failed',
          type: 'line',
          smooth: true,
          data: data.map((d) => d.failed),
          itemStyle: { color: '#ef4444' },
        },
        {
          name: 'retired',
          type: 'line',
          smooth: true,
          data: data.map((d) => d.retired),
          itemStyle: { color: '#6e6e78' },
        },
      ],
    });
  });

  return (
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <span class="text-xs text-text-muted">range:</span>
        <button
          class={`pill ${
            days() === 7
              ? 'bg-accent-green/20 text-accent-green-soft border border-accent-green/40'
              : 'bg-bg-raised text-text-secondary border border-line'
          }`}
          onClick={() => setDays(7)}
        >
          7 days
        </button>
        <button
          class={`pill ${
            days() === 30
              ? 'bg-accent-green/20 text-accent-green-soft border border-accent-green/40'
              : 'bg-bg-raised text-text-secondary border border-line'
          }`}
          onClick={() => setDays(30)}
        >
          30 days
        </button>
        <span class="ml-auto text-xs text-text-muted">
          {filtered().length} terminal tasks
        </span>
      </div>

      <div class="card">
        <div class="card-body">
          <div ref={chartEl} class="w-full h-[200px]" />
        </div>
      </div>

      <Show when={q.isPending}>
        <div class="space-y-2">
          <For each={Array.from({ length: 3 })}>
            {() => <div class="skeleton h-12" />}
          </For>
        </div>
      </Show>

      <Show when={!q.isPending && grouped().length === 0}>
        <div class="text-sm text-text-muted py-4 text-center">沒有歷史紀錄</div>
      </Show>

      <For each={grouped()}>
        {([day, tasks]) => (
          <div>
            <div class="text-xs uppercase tracking-wider text-text-secondary mb-1">
              {day} · {tasks.length} task{tasks.length > 1 ? 's' : ''}
            </div>
            <ul class="space-y-1">
              <For each={tasks}>
                {(t) => (
                  <li class="flex items-center gap-2 text-sm py-1.5 px-2 hover:bg-bg-raised rounded">
                    <span class="text-base">{typeEmoji(t.type)}</span>
                    <span class={`pill ${statusBadgeClass(t.status)}`}>
                      {t.status}
                    </span>
                    <span class="truncate">{t.title}</span>
                  </li>
                )}
              </For>
            </ul>
          </div>
        )}
      </For>
    </div>
  );
}

export default function HistoryLog() {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <Inner />
    </QueryClientProvider>
  );
}
