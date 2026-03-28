import chalk from 'chalk';
import { exec } from 'child_process';
import { getArticleFiles, readArticle } from '../lib/knowledge.js';
import { renderArticleHeader, renderMarkdown } from '../lib/render.js';

/**
 * Slugify a filename for comparison.
 * Strips extension, lowercases, replaces spaces/underscores with hyphens.
 */
function slugify(filename) {
  return filename
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '');
}

/**
 * Find the best matching article file for a given slug.
 */
async function findArticle(slug, articleFiles) {
  const normalizedSlug = slug.toLowerCase().replace(/[\s_]+/g, '-');

  // Pass 1: exact slug match on filename
  for (const filePath of articleFiles) {
    const filename = filePath.split('/').pop();
    const fileSlug = slugify(filename);
    if (fileSlug === normalizedSlug) {
      return filePath;
    }
  }

  // Pass 2: filename contains slug
  for (const filePath of articleFiles) {
    const filename = filePath.split('/').pop();
    const fileSlug = slugify(filename);
    if (
      fileSlug.includes(normalizedSlug) ||
      normalizedSlug.includes(fileSlug)
    ) {
      return filePath;
    }
  }

  // Pass 3: check frontmatter titles
  for (const filePath of articleFiles) {
    try {
      const article = await readArticle(filePath);
      if (article && article.frontmatter && article.frontmatter.title) {
        const titleSlug = article.frontmatter.title
          .toLowerCase()
          .replace(/[\s_]+/g, '-');
        if (
          titleSlug.includes(normalizedSlug) ||
          normalizedSlug.includes(titleSlug)
        ) {
          return filePath;
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  return null;
}

export function readCommand(program) {
  program
    .command('read <slug>')
    .description('Read a Taiwan.md article')
    .option('--en', 'Read English version')
    .option('--raw', 'Output raw markdown')
    .option('--web', 'Open in browser')
    .action(async (slug, opts) => {
      try {
        const articleFiles = await getArticleFiles();

        if (!articleFiles || articleFiles.length === 0) {
          console.log(chalk.yellow('\n  知識庫尚未同步。請先執行:'));
          console.log(chalk.cyan('  taiwanmd sync\n'));
          return;
        }

        const filePath = await findArticle(slug, articleFiles);

        if (!filePath) {
          console.log(chalk.yellow(`\n  找不到文章「${slug}」\n`));
          console.log(chalk.gray('  💡 試試搜尋:'));
          console.log(chalk.cyan(`  taiwanmd search ${slug}\n`));
          return;
        }

        const article = await readArticle(filePath);

        if (!article) {
          console.log(chalk.red('\n  無法讀取文章內容。\n'));
          return;
        }

        // Handle --en flag: try to find English version
        if (opts.en) {
          const enPath = filePath.replace(/\.md$/i, '-EN.md');
          const enFiles = articleFiles.filter((f) => f === enPath);
          if (enFiles.length > 0) {
            const enArticle = await readArticle(enFiles[0]);
            if (enArticle) {
              Object.assign(article, enArticle);
            }
          }
        }

        const fm = article.frontmatter;

        // Handle --web flag: open in browser
        if (opts.web) {
          const url = `https://taiwan.md/${fm.category}/${fm.slug}`;
          console.log(chalk.gray(`\n  Opening ${url} ...\n`));
          exec(`open "${url}"`);
          return;
        }

        // Handle --raw flag: output raw markdown
        if (opts.raw) {
          console.log(article.body || '');
          return;
        }

        // Default: render article
        console.log('');
        console.log(
          renderArticleHeader({
            title: fm.title,
            category: fm.category,
            date: fm.date,
            wordCount: fm.wordCount,
            tags: fm.tags,
            description: fm.description,
          }),
        );
        console.log('');
        console.log(renderMarkdown(article.body || ''));
      } catch (err) {
        console.error(chalk.red(`讀取失敗: ${err.message}`));
        process.exit(1);
      }
    });
}
