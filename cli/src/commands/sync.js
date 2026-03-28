import chalk from 'chalk';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const KNOWLEDGE_DIR = join(homedir(), '.taiwanmd', 'knowledge');
const CACHE_DIR = join(homedir(), '.taiwanmd', 'cache');
const REPO_URL = 'https://github.com/frank890417/taiwan-md.git';

/**
 * Run a shell command and return its output.
 */
function run(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: 'utf-8',
    stdio: opts.silent ? 'pipe' : 'inherit',
    timeout: 120_000,
    ...opts,
  });
}

/**
 * Count markdown files recursively in a directory.
 */
function countMarkdownFiles(dir) {
  let count = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countMarkdownFiles(fullPath);
      } else if (entry.name.endsWith('.md')) {
        count++;
      }
    }
  } catch {
    // directory might not exist
  }
  return count;
}

export function syncCommand(program) {
  program
    .command('sync')
    .description('Sync knowledge base from GitHub')
    .option('--force', 'Force re-sync')
    .action(async (opts) => {
      try {
        // Check if git is available
        try {
          execSync('git --version', { stdio: 'pipe' });
        } catch {
          console.error(chalk.red('\n  ❌ Git 未安裝。請先安裝 Git。\n'));
          process.exit(1);
        }

        console.log(chalk.bold('\n  📦 同步 Taiwan.md 知識庫...\n'));

        const repoExists = existsSync(join(KNOWLEDGE_DIR, '.git'));

        if (repoExists && !opts.force) {
          // Pull latest changes
          console.log(chalk.gray('  更新現有知識庫...'));
          try {
            run(`git -C "${KNOWLEDGE_DIR}" pull --ff-only`, { silent: true });
            console.log(chalk.green('  ✓ 更新完成'));
          } catch (err) {
            console.log(chalk.yellow('  ⚠ Pull 失敗，嘗試重設...'));
            run(`git -C "${KNOWLEDGE_DIR}" fetch origin`, { silent: true });
            run(`git -C "${KNOWLEDGE_DIR}" reset --hard origin/main`, {
              silent: true,
            });
            console.log(chalk.green('  ✓ 重設完成'));
          }
        } else {
          // Clone fresh
          if (repoExists && opts.force) {
            console.log(chalk.gray('  強制重新同步，移除舊資料...'));
            run(`rm -rf "${KNOWLEDGE_DIR}"`);
          }

          // Ensure parent directory exists
          mkdirSync(join(homedir(), '.taiwanmd'), { recursive: true });

          console.log(chalk.gray('  克隆知識庫 (sparse checkout)...'));
          run(
            `git clone --depth 1 --filter=blob:none --sparse "${REPO_URL}" "${KNOWLEDGE_DIR}"`,
            { silent: true },
          );

          console.log(chalk.gray('  設定 sparse-checkout...'));
          run(
            `git -C "${KNOWLEDGE_DIR}" sparse-checkout set knowledge public/api`,
            { silent: true },
          );

          console.log(chalk.green('  ✓ 克隆完成'));
        }

        // Copy search index to cache
        mkdirSync(CACHE_DIR, { recursive: true });

        const searchIndexSrc = join(
          KNOWLEDGE_DIR,
          'public',
          'api',
          'search-minisearch.json',
        );
        const searchIndexDst = join(CACHE_DIR, 'search-minisearch.json');

        if (existsSync(searchIndexSrc)) {
          copyFileSync(searchIndexSrc, searchIndexDst);
          console.log(chalk.gray('  ✓ 搜尋索引已快取'));
        }

        // Print summary
        const knowledgeDir = join(KNOWLEDGE_DIR, 'knowledge');
        const articleCount = countMarkdownFiles(knowledgeDir);
        const now = new Date().toLocaleString('zh-TW', {
          timeZone: 'Asia/Taipei',
        });

        console.log('');
        console.log(chalk.bold('  📊 同步摘要'));
        console.log(chalk.gray('  ─'.repeat(20)));
        console.log(`  文章數量: ${chalk.green(articleCount)} 篇`);
        console.log(`  同步時間: ${chalk.gray(now)}`);
        console.log(`  知識庫路徑: ${chalk.dim(KNOWLEDGE_DIR)}`);
        console.log('');
      } catch (err) {
        console.error(chalk.red(`\n  ❌ 同步失敗: ${err.message}\n`));
        if (
          err.message.includes('Could not resolve host') ||
          err.message.includes('unable to access')
        ) {
          console.log(chalk.gray('  請檢查網路連線。\n'));
        }
        process.exit(1);
      }
    });
}
