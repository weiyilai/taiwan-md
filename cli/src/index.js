#!/usr/bin/env node
import { Command } from 'commander';
import { searchCommand } from './commands/search.js';
import { readCommand } from './commands/read.js';
import { listCommand } from './commands/list.js';
import { randomCommand } from './commands/random.js';
import { syncCommand } from './commands/sync.js';
import { statsCommand } from './commands/stats.js';

const program = new Command();

program
  .name('taiwanmd')
  .description(
    'Taiwan.md — 台灣知識庫 CLI\nSearch, read, and explore 900+ curated articles about Taiwan.',
  )
  .version('0.1.0');

// Register all commands
searchCommand(program);
readCommand(program);
listCommand(program);
randomCommand(program);
syncCommand(program);
statsCommand(program);

program.parse();
