/**
 * Bug 3 — Live session log drawer.
 *
 * Slides up from the bottom when a session is selected. Uses SSE
 * (EventSource) when available, falls back to polling /api/sessions/:sid/log.
 *
 * Auto-scrolls to bottom unless the user has scrolled up. Last 200 lines
 * kept in memory.
 */
import {
  Show,
  For,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js';
import { api } from '~/lib/api';

const MAX_LINES = 200;

interface Props {
  sessionId: string | null;
  taskTitle?: string;
  onClose: () => void;
}

export default function SessionLogDrawer(props: Props) {
  const [lines, setLines] = createSignal<string[]>([]);
  const [done, setDone] = createSignal(false);
  const [stickToBottom, setStickToBottom] = createSignal(true);
  const [mode, setMode] = createSignal<'sse' | 'polling' | 'idle'>('idle');
  let bodyEl: HTMLDivElement | undefined;
  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let eventSource: EventSource | undefined;

  const append = (newLines: string[]): void => {
    if (newLines.length === 0) return;
    setLines((prev) => {
      const combined = [...prev, ...newLines.filter((l) => l.length > 0)];
      return combined.length > MAX_LINES
        ? combined.slice(combined.length - MAX_LINES)
        : combined;
    });
  };

  const reset = (): void => {
    setLines([]);
    setDone(false);
    if (eventSource) eventSource.close();
    eventSource = undefined;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = undefined;
    setMode('idle');
  };

  const startStream = (sid: string): void => {
    reset();
    if (typeof window === 'undefined') return;
    if (typeof EventSource !== 'undefined') {
      try {
        const es = new EventSource(api.sessionLogStreamUrl(sid));
        es.onmessage = (e: MessageEvent) => {
          append([typeof e.data === 'string' ? e.data : String(e.data)]);
        };
        es.addEventListener('done', () => {
          setDone(true);
          es.close();
        });
        es.onerror = () => {
          // Fall back to polling on SSE failure.
          es.close();
          startPolling(sid);
        };
        eventSource = es;
        setMode('sse');
        return;
      } catch {
        // fall through to polling
      }
    }
    startPolling(sid);
  };

  const startPolling = (sid: string): void => {
    setMode('polling');
    let offset = 0;
    const tick = async (): Promise<void> => {
      try {
        const resp = await api.pollSessionLog(sid, offset);
        offset = resp.nextOffset;
        append(resp.lines);
        if (resp.done) {
          setDone(true);
          if (pollTimer) clearInterval(pollTimer);
        }
      } catch {
        // Swallow — UI stays last-known.
      }
    };
    void tick();
    pollTimer = setInterval(() => void tick(), 2_000);
  };

  createEffect(() => {
    const sid = props.sessionId;
    if (!sid) {
      reset();
      return;
    }
    startStream(sid);
  });

  onMount(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    onCleanup(() => window.removeEventListener('keydown', onKey));
  });

  onCleanup(() => reset());

  // Auto-scroll on new lines if user is at bottom.
  createEffect(() => {
    lines();
    if (!stickToBottom() || !bodyEl) return;
    queueMicrotask(() => {
      if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
    });
  });

  const onScroll = (): void => {
    if (!bodyEl) return;
    const atBottom =
      bodyEl.scrollHeight - bodyEl.scrollTop - bodyEl.clientHeight < 20;
    setStickToBottom(atBottom);
  };

  const renderLine = (line: string): { cls: string; text: string } => {
    if (/\bERROR\b/i.test(line) || /Error:/.test(line))
      return { cls: 'text-red-400', text: line };
    if (/\bWARN(ING)?\b/i.test(line))
      return { cls: 'text-amber-300', text: line };
    if (/\bINFO\b/i.test(line)) return { cls: 'text-emerald-300', text: line };
    return { cls: 'text-zinc-200', text: line };
  };

  return (
    <Show when={props.sessionId}>
      <div
        class="fixed inset-x-0 bottom-0 z-50 bg-zinc-950 border-t border-zinc-700 shadow-2xl"
        style="height: 50vh"
      >
        <div class="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-emerald-400 text-xs font-mono">●</span>
            <span class="text-sm text-zinc-200 truncate">
              {props.taskTitle ?? props.sessionId}
            </span>
            <span class="text-xs text-zinc-500 font-mono">
              · {mode()} · {lines().length} lines
              <Show when={done()}>
                <span class="ml-2 text-amber-300">· ended</span>
              </Show>
              <Show when={!stickToBottom()}>
                <span class="ml-2 text-zinc-400">(scroll-locked)</span>
              </Show>
            </span>
          </div>
          <div class="flex items-center gap-2">
            <Show when={!stickToBottom()}>
              <button
                type="button"
                class="text-xs text-zinc-300 hover:text-white px-2 py-1 rounded border border-zinc-700"
                onClick={() => {
                  setStickToBottom(true);
                  if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
                }}
              >
                ↓ jump to bottom
              </button>
            </Show>
            <button
              type="button"
              class="text-xs text-zinc-300 hover:text-white px-2 py-1 rounded border border-zinc-700"
              onClick={() => props.onClose()}
            >
              ✕ close (esc)
            </button>
          </div>
        </div>
        <div
          ref={(el) => {
            bodyEl = el;
          }}
          onScroll={onScroll}
          class="overflow-y-auto h-[calc(50vh-2.5rem)] font-mono text-xs leading-snug px-4 py-3 bg-black"
        >
          <Show when={lines().length === 0}>
            <div class="text-zinc-500 italic">
              waiting for output… ({mode()})
            </div>
          </Show>
          <For each={lines()}>
            {(line) => {
              const r = renderLine(line);
              return <div class={`whitespace-pre-wrap ${r.cls}`}>{r.text}</div>;
            }}
          </For>
        </div>
      </div>
    </Show>
  );
}
