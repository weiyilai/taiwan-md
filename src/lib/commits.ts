import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Lang } from '../types';

export interface Commit {
  hash: string;
  date: string;
  message: string;
  author?: string;
}

export interface CommitFeed {
  commits: Commit[];
  source: 'git' | 'cache' | 'github' | 'none';
}

interface CommitCache {
  generatedAt?: string;
  source?: string;
  commits?: Commit[];
}

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CACHE_PATH = fileURLToPath(
  new URL('../data/changelog-feed.json', import.meta.url),
);

function parseCommitMessage(message: string): string {
  return message.trim().split('\n')[0];
}

function dedupeAndTrim(commits: Commit[], limit: number): Commit[] {
  const seen = new Set<string>();

  return commits
    .map((commit) => ({
      ...commit,
      message: parseCommitMessage(commit.message),
    }))
    .filter((commit) => {
      if (!commit.hash || !commit.date || !commit.message) return false;
      if (seen.has(commit.hash)) return false;
      seen.add(commit.hash);
      return true;
    })
    .slice(0, limit);
}

function getCommitsFromGit(limit = 100): Commit[] {
  try {
    const raw = execSync(
      `git log -n ${Math.max(limit, 1)} --date=iso-strict --pretty=format:%H%x1f%aI%x1f%an%x1f%s`,
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim();

    if (!raw) return [];

    return raw
      .split('\n')
      .map((line) => {
        const [hash, date, author, message] = line.split('\x1f');
        if (!hash || !date || !message) return null;
        return { hash, date, author, message };
      })
      .filter(Boolean) as Commit[];
  } catch {
    return [];
  }
}

function getCommitsFromCache(limit = 100): Commit[] {
  try {
    const raw = readFileSync(CACHE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as CommitCache;

    if (!Array.isArray(parsed.commits)) return [];
    return parsed.commits
      .map((commit) => {
        if (!commit?.hash || !commit?.date || !commit?.message) return null;
        return {
          hash: commit.hash,
          date: commit.date,
          author: commit.author,
          message: commit.message,
        };
      })
      .filter(Boolean)
      .slice(0, limit) as Commit[];
  } catch {
    return [];
  }
}

async function getCommitsFromGitHub(limit = 100): Promise<Commit[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/frank890417/taiwan-md/commits?per_page=${Math.max(limit, 1)}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'taiwan-md-commits',
        },
      },
    );

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .map((commit: any) => {
        const hash = commit?.sha;
        const date = commit?.commit?.author?.date;
        const author = commit?.commit?.author?.name;
        const message = commit?.commit?.message;
        if (!hash || !date || !message) return null;
        return { hash, date, author, message };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function fetchCommitFeed(limit = 100): Promise<CommitFeed> {
  const gitCommits = dedupeAndTrim(getCommitsFromGit(limit), limit);
  if (gitCommits.length) {
    return { commits: gitCommits, source: 'git' };
  }

  const cachedCommits = dedupeAndTrim(getCommitsFromCache(limit), limit);
  if (cachedCommits.length) {
    return { commits: cachedCommits, source: 'cache' };
  }

  const githubCommits = dedupeAndTrim(await getCommitsFromGitHub(limit), limit);
  if (githubCommits.length) {
    return { commits: githubCommits, source: 'github' };
  }

  return { commits: [], source: 'none' };
}

export async function fetchRecentCommits(perPage = 5): Promise<Commit[]> {
  return (await fetchCommitFeed(perPage)).commits;
}

export function commitIcon(message: string): string {
  const normalized = message
    .toLowerCase()
    .replace(/^🧬\s*\[semiont\]\s*/i, '')
    .trim();

  if (normalized.startsWith('rewrite')) return '✍️';
  if (normalized.startsWith('evolve')) return '🧬';
  if (
    normalized.startsWith('translate(') ||
    normalized.startsWith('add japanese translation') ||
    normalized.startsWith('add korean translation') ||
    normalized.startsWith('add english translation') ||
    normalized.startsWith('add spanish translation')
  ) {
    return '🌐';
  }
  if (normalized.startsWith('feat')) return '✨';
  if (normalized.startsWith('fix')) return '🐛';
  if (normalized.startsWith('content')) return '📝';
  if (normalized.startsWith('docs')) return '📖';
  if (normalized.startsWith('style')) return '🎨';
  if (normalized.startsWith('refactor')) return '♻️';
  if (normalized.startsWith('chore')) return '🔧';
  if (normalized.startsWith('merge')) return '🔀';
  return '📌';
}

export type CommitType =
  | 'rewrite'
  | 'evolve'
  | 'translate'
  | 'feat'
  | 'fix'
  | 'content'
  | 'merge'
  | 'maintenance'
  | 'other';

export function commitType(message: string): CommitType {
  const normalized = message
    .toLowerCase()
    .replace(/^🧬\s*\[semiont\]\s*/i, '')
    .trim();

  if (normalized.startsWith('rewrite')) return 'rewrite';
  if (normalized.startsWith('evolve')) return 'evolve';
  if (
    normalized.startsWith('translate(') ||
    normalized.startsWith('add japanese translation') ||
    normalized.startsWith('add korean translation') ||
    normalized.startsWith('add english translation') ||
    normalized.startsWith('add spanish translation')
  )
    return 'translate';
  if (normalized.startsWith('feat')) return 'feat';
  if (normalized.startsWith('fix')) return 'fix';
  if (normalized.startsWith('content')) return 'content';
  if (normalized.startsWith('merge')) return 'merge';
  if (
    normalized.startsWith('chore') ||
    normalized.startsWith('heal') ||
    normalized.startsWith('immune') ||
    normalized.startsWith('memory') ||
    normalized.startsWith('diagnose') ||
    normalized.startsWith('docs') ||
    normalized.startsWith('style') ||
    normalized.startsWith('refactor') ||
    normalized.startsWith('ingest')
  )
    return 'maintenance';
  return 'other';
}

export function timeAgo(dateStr: string, lang: Lang): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (lang === 'zh-TW') {
    if (diff < 60) return '剛剛';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
    return then.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  }

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
