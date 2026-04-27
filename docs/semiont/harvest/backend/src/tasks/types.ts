/**
 * Task domain types.
 *
 * These mirror the schema in `.harvest/tasks/{id}/task.yml` (per strategy
 * report §3.3). The on-disk YAML is the source of truth; SQLite is an index.
 */

export const TASK_STATUSES = [
  'pending',
  'spawning',
  'in-progress',
  'blocked',
  'done',
  'failed',
  'retired',
  'awaiting-cheyu',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_TYPES = [
  'article-rewrite',
  'article-new',
  'article-evolve',
  'spore-publish',
  'spore-harvest',
  'pr-review',
  'issue-handle',
  'data-refresh',
  'status-report',
  'self-diagnose',
  'heartbeat',
  'contributor-thank-you',
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const BOOT_PROFILES = [
  'minimal',
  'content-writing',
  'spore-publishing',
  'maintainer',
  'full-awakening',
] as const;
export type BootProfileName = (typeof BOOT_PROFILES)[number];

export interface TaskSession {
  id: string;
  spawned_at: string;
  completed_at?: string;
  exit_code?: number;
  log_path?: string;
  prompt_path?: string;
  commits?: string[];
}

export interface Task {
  schema_version: 1;
  id: string;
  type: TaskType | string;
  boot_profile: BootProfileName | string;
  status: TaskStatus;
  priority: TaskPriority;
  title: string;
  folder_path: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  dependencies: string[];
  blockers: string[];
  sessions: TaskSession[];
  attempts: number;
  max_attempts: number;
  deadline?: string;
  notes?: string;
  /**
   * Free-form intake metadata — e.g. parsed ARTICLE-INBOX entry fields,
   * Issue body, or observer-supplied JSON. Persisted to YAML; not indexed.
   */
  inputs?: Record<string, unknown>;
}

/** Subset used when creating a new task before it has a folder/id. */
export interface NewTaskInput {
  type: string;
  boot_profile: string;
  priority: TaskPriority;
  title: string;
  created_by: string;
  dependencies?: string[];
  notes?: string;
  inputs?: Record<string, unknown>;
  deadline?: string;
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === 'string' &&
    (TASK_STATUSES as readonly string[]).includes(value)
  );
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return (
    typeof value === 'string' &&
    (TASK_PRIORITIES as readonly string[]).includes(value)
  );
}
