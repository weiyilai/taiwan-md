import { Show } from 'solid-js';
import {
  priorityBadgeClass,
  relativeTime,
  statusBadgeClass,
  typeEmoji,
} from '~/lib/format';
import type { Task } from '~/lib/types';

export default function TaskRow(props: {
  task: Task;
  onClick?: (task: Task) => void;
  compact?: boolean;
}) {
  const t = (): Task => props.task;
  return (
    <button
      type="button"
      onClick={() => props.onClick?.(t())}
      class="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md
             border border-transparent hover:border-line hover:bg-bg-raised
             focus:outline-none focus:border-accent-green/40 transition-colors"
    >
      <div class="text-xl shrink-0">{typeEmoji(t().type)}</div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 mb-0.5">
          <span class={`pill ${statusBadgeClass(t().status)}`}>
            {t().status}
          </span>
          <span class={`pill ${priorityBadgeClass(t().priority)}`}>
            {t().priority}
          </span>
          <Show when={!props.compact}>
            <span class="text-xs text-text-muted truncate">{t().type}</span>
          </Show>
        </div>
        <div class="text-sm text-text-primary truncate">{t().title}</div>
        <Show when={!props.compact}>
          <div class="text-xs text-text-muted truncate">
            {relativeTime(t().created_at)} · by {t().created_by}
            {t().sessions.length > 0
              ? ` · ${t().sessions.length} session(s)`
              : ''}
          </div>
        </Show>
      </div>
    </button>
  );
}
