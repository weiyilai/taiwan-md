/**
 * Section 1: 生命徵象 — 8 organ score cards + ECharts radar.
 * Single Solid island that renders both the cards and the radar so we share
 * one /api/vitals query and one polling cadence.
 */
import { QueryClientProvider, useQuery } from '@tanstack/solid-query';
import { For, Show, createEffect, onCleanup, onMount } from 'solid-js';
import * as echarts from 'echarts';
import { api } from '~/lib/api';
import { getQueryClient } from '~/lib/query-client';
import { firstMetricSummary, trendArrow, trendClass } from '~/lib/format';
import type { VitalsOrgan } from '~/lib/types';

function Inner() {
  const q = useQuery(() => ({
    queryKey: ['vitals'],
    queryFn: () => api.vitals(),
    refetchInterval: 30_000,
  }));

  let chartEl: HTMLDivElement | undefined;
  let chart: echarts.ECharts | undefined;

  onMount(() => {
    if (!chartEl) return;
    chart = echarts.init(chartEl, undefined, { renderer: 'canvas' });
    const onResize = (): void => chart?.resize();
    window.addEventListener('resize', onResize);
    onCleanup(() => {
      window.removeEventListener('resize', onResize);
      chart?.dispose();
      chart = undefined;
    });
  });

  createEffect(() => {
    const data = q.data;
    if (!chart || !data?.organs?.length) return;
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: '#22222a',
        borderColor: '#2f2f38',
        textStyle: { color: '#e8e6e1' },
      },
      radar: {
        indicator: data.organs.map((o) => ({
          name: `${o.emoji} ${o.nameZh}`,
          max: 100,
        })),
        radius: '70%',
        splitLine: { lineStyle: { color: '#2f2f38' } },
        splitArea: { areaStyle: { color: ['transparent'] } },
        axisLine: { lineStyle: { color: '#2f2f38' } },
        name: { textStyle: { color: '#a0a0a8', fontSize: 11 } },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: data.organs.map((o) => o.score),
              name: 'organ scores',
              areaStyle: { color: 'rgba(16,185,129,0.18)' },
              lineStyle: { color: '#10b981', width: 2 },
              itemStyle: { color: '#34d399' },
            },
          ],
        },
      ],
    });
  });

  return (
    <div class="grid lg:grid-cols-[1fr,320px] gap-4">
      <div>
        <Show
          when={!q.isPending}
          fallback={
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <For each={Array.from({ length: 8 })}>
                {() => <div class="skeleton h-24" />}
              </For>
            </div>
          }
        >
          <Show
            when={!q.isError}
            fallback={<ErrorBox onRetry={() => q.refetch()} />}
          >
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <For each={q.data?.organs ?? []}>
                {(organ) => <OrganCard organ={organ} />}
              </For>
            </div>
            <Show when={q.data?.lastUpdated}>
              <div class="mt-3 text-xs text-text-muted">
                last refresh: {q.data?.lastUpdated}
              </div>
            </Show>
          </Show>
        </Show>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="text-xs uppercase tracking-wider text-text-secondary mb-2">
            organ harmony
          </div>
          <div ref={chartEl} class="w-full h-[280px]" />
        </div>
      </div>
    </div>
  );
}

function OrganCard(props: { organ: VitalsOrgan }) {
  const o = props.organ;
  const scoreColor =
    o.score >= 80
      ? 'text-accent-green-soft'
      : o.score >= 60
        ? 'text-accent-amber'
        : 'text-accent-red';
  return (
    <div class="card">
      <div class="card-body">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="text-2xl leading-none">{o.emoji}</div>
            <div class="mt-1 text-sm font-medium">{o.nameZh}</div>
            <div class="text-xs text-text-muted">{o.metaphor ?? ''}</div>
          </div>
          <div class="text-right">
            <div class={`text-2xl font-semibold ${scoreColor}`}>{o.score}</div>
            <div class={`text-xs ${trendClass(o.trend)}`}>
              {trendArrow(o.trend)} {o.trend ?? ''}
            </div>
          </div>
        </div>
        <Show when={o.metrics}>
          <div class="mt-2 text-xs text-text-secondary truncate">
            {firstMetricSummary(o.metrics)}
          </div>
        </Show>
      </div>
    </div>
  );
}

function ErrorBox(props: { onRetry: () => void }) {
  return (
    <div class="card">
      <div class="card-body text-sm text-accent-red">
        無法載入 vitals。Backend 可能沒有 dashboard-organism.json。
        <button class="btn ml-2" onClick={() => props.onRetry()}>
          retry
        </button>
      </div>
    </div>
  );
}

export default function VitalRadar() {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <Inner />
    </QueryClientProvider>
  );
}
