/**
 * Polls /api/health every 5s. After 2 consecutive failures shows a red
 * banner with a retry hint. Sticky at the top of the page.
 */
import { QueryClientProvider, useQuery } from '@tanstack/solid-query';
import { Show, createSignal, createEffect } from 'solid-js';
import { api } from '~/lib/api';
import { getQueryClient } from '~/lib/query-client';

function Banner() {
  const [consecutiveFailures, setConsecutiveFailures] = createSignal(0);

  const q = useQuery(() => ({
    queryKey: ['health'],
    queryFn: () => api.health(),
    refetchInterval: 5_000,
    retry: 0,
  }));

  createEffect(() => {
    if (q.isError) {
      setConsecutiveFailures((n) => n + 1);
    } else if (q.isSuccess) {
      setConsecutiveFailures(0);
    }
  });

  const offline = () => consecutiveFailures() >= 2;
  const paused = () => q.data?.scheduler_paused === true;

  return (
    <Show
      when={offline() || paused()}
      fallback={
        <div class="hidden md:flex items-center gap-3 text-xs text-text-muted px-4 py-1.5">
          <span class="inline-block w-2 h-2 rounded-full bg-accent-green-soft animate-pulse" />
          <span>
            backend ok · uptime {q.data?.uptime_s ?? 0}s · db{' '}
            {q.data?.db_ok ? 'ok' : 'down'}
          </span>
        </div>
      }
    >
      <div
        class={`px-4 py-2 text-sm border-b ${
          offline()
            ? 'bg-accent-red/15 text-accent-red border-accent-red/40'
            : 'bg-accent-amber/15 text-accent-amber border-accent-amber/40'
        }`}
      >
        <Show when={offline()}>
          <strong>Backend offline.</strong> 連 {consecutiveFailures()} 次 ping
          失敗。試試
          <code class="mx-1 px-1.5 py-0.5 rounded bg-bg-raised text-text-primary">
            launchctl kickstart -k gui/$UID/com.taiwanmd.harvest
          </code>
          重啟 launchd job。
        </Show>
        <Show when={!offline() && paused()}>
          <strong>Scheduler paused.</strong> Cron 已被人手暫停 — 沒有新 task
          會被 spawn。下方控制區可恢復。
        </Show>
      </div>
    </Show>
  );
}

export default function BackendStatusBanner() {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <Banner />
    </QueryClientProvider>
  );
}
