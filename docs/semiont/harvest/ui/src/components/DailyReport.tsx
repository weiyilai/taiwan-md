/**
 * Section 4: 每日 status report.
 * Loads /api/reports/today by default; date picker walks history.
 * "Re-generate today" hits POST /api/reports/generate.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query';
import { QueryClientProvider } from '@tanstack/solid-query';
import { Show, createMemo, createSignal } from 'solid-js';
import { marked } from 'marked';
import { api } from '~/lib/api';
import { getQueryClient } from '~/lib/query-client';
import { formatLocalDate } from '~/lib/format';

marked.setOptions({ breaks: true, gfm: true });

function Inner() {
  const qc = useQueryClient();
  const [date, setDate] = createSignal<string>(formatLocalDate());

  const q = useQuery(() => ({
    queryKey: ['report', date()],
    queryFn: () =>
      date() === formatLocalDate()
        ? api.reportToday()
        : api.reportByDate(date()),
    refetchInterval: 30_000,
    retry: 0,
  }));

  const html = createMemo(() => {
    const md = q.data ?? '';
    if (!md) return '';
    try {
      return marked.parse(md) as string;
    } catch {
      return `<pre>${escapeHtml(md)}</pre>`;
    }
  });

  const regen = useMutation(() => ({
    mutationFn: () => api.generateReport(date()),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['report'] });
    },
  }));

  return (
    <div>
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="date"
          class="input max-w-[180px]"
          value={date()}
          onChange={(e) => setDate(e.currentTarget.value || formatLocalDate())}
        />
        <button class="btn" onClick={() => setDate(formatLocalDate())}>
          today
        </button>
        <button
          class="btn btn-primary ml-auto"
          onClick={() => regen.mutate()}
          disabled={regen.isPending}
        >
          {regen.isPending ? 'generating…' : 're-generate'}
        </button>
      </div>

      <Show when={regen.isError}>
        <div class="text-xs text-accent-red mb-2">
          generate 失敗：{String(regen.error)}
        </div>
      </Show>
      <Show when={regen.isSuccess && regen.data?.path}>
        <div class="text-xs text-accent-green-soft mb-2">
          ok · {regen.data?.path}
        </div>
      </Show>

      <Show when={q.isPending}>
        <div class="skeleton h-64" />
      </Show>

      <Show when={!q.isPending && !q.data}>
        <div class="text-sm text-text-muted py-6 text-center border border-dashed border-line rounded">
          {date()} 還沒有 report — 試試 re-generate
        </div>
      </Show>

      <Show when={!q.isPending && q.data}>
        <article
          class="prose-report"
          // eslint-disable-next-line solid/no-innerhtml
          innerHTML={html()}
        />
      </Show>

      <style>{`
        .prose-report {
          color: #e8e6e1;
          font-size: 14px;
          line-height: 1.7;
        }
        .prose-report h1, .prose-report h2, .prose-report h3 {
          color: #e8e6e1;
          margin: 1.2em 0 0.5em;
          font-weight: 600;
        }
        .prose-report h1 { font-size: 1.5em; border-bottom: 1px solid #2f2f38; padding-bottom: 0.3em; }
        .prose-report h2 { font-size: 1.2em; }
        .prose-report h3 { font-size: 1.05em; }
        .prose-report p, .prose-report ul, .prose-report ol { margin: 0.6em 0; }
        .prose-report ul, .prose-report ol { padding-left: 1.5em; }
        .prose-report li { margin: 0.2em 0; }
        .prose-report code {
          background: #2a2a32; padding: 0.1em 0.4em;
          border-radius: 3px; font-size: 0.9em;
        }
        .prose-report pre {
          background: #1f1f26; border: 1px solid #2f2f38;
          padding: 0.75em; border-radius: 6px; overflow-x: auto;
        }
        .prose-report pre code { background: transparent; padding: 0; }
        .prose-report blockquote {
          border-left: 3px solid #2f2f38; padding-left: 1em;
          color: #a0a0a8; margin: 0.6em 0;
        }
        .prose-report a { color: #34d399; text-decoration: underline; }
        .prose-report table {
          width: 100%; border-collapse: collapse; margin: 0.8em 0;
          font-size: 0.92em;
        }
        .prose-report th, .prose-report td {
          border: 1px solid #2f2f38; padding: 0.4em 0.6em; text-align: left;
        }
        .prose-report th { background: #22222a; }
      `}</style>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function DailyReport() {
  return (
    <QueryClientProvider client={getQueryClient()}>
      <Inner />
    </QueryClientProvider>
  );
}
