# taiwanmd

> CLI for [Taiwan.md](https://taiwan.md) — the open-source, AI-native knowledge base about Taiwan.

Search, read, and explore 900+ curated articles about Taiwan from your terminal.

## Install

```bash
npm install -g taiwanmd
```

## Commands

```bash
taiwanmd search 珍珠奶茶       # Search articles (中英雙語)
taiwanmd read 珍珠奶茶         # Read an article in terminal
taiwanmd list food             # List articles by category
taiwanmd list --categories     # Show all categories
taiwanmd random                # Discover a random article
taiwanmd stats                 # Project statistics & health
taiwanmd sync                  # Sync knowledge base locally
```

## Options

```bash
taiwanmd search 半導體 --json          # JSON output (for piping)
taiwanmd read 珍珠奶茶 --raw           # Raw markdown (for LLM/RAG)
taiwanmd read 珍珠奶茶 --en            # English version
taiwanmd read 珍珠奶茶 --web           # Open in browser
taiwanmd list food --sort words        # Sort by word count
taiwanmd list --reviewed               # Only human-reviewed
taiwanmd random --category nature      # Random from category
```

## Links

- Website: [taiwan.md](https://taiwan.md)
- Dashboard: [taiwan.md/dashboard](https://taiwan.md/dashboard)
- GitHub: [frank890417/taiwan-md](https://github.com/frank890417/taiwan-md)
