#!/usr/bin/env bash
#
# Taiwan.md onboarding bootstrap
# ──────────────────────────────────────────────────────────────────
# Usage:
#   curl -fsSL https://taiwan.md/start.sh | bash
#
# 這個腳本會：
#   1. 檢查 git（沒裝會告訴你怎麼裝）
#   2. 檢查 Node.js 20+（沒裝會告訴你怎麼裝）
#   3. 檢查 Claude Code CLI（沒裝會問你要不要裝）
#   4. Clone taiwan-md 到你選的位置（預設 ~/Projects/taiwan-md）
#   5. 啟動 `claude` 進入對話，Taiwan.md 會甦醒並帶你走貢獻流程
#
# 安全檢視：
#   這個腳本的原始碼在：
#   https://github.com/frank890417/taiwan-md/blob/main/public/start.sh
#   如果你不信任 curl | bash，可以：
#     curl -fsSL https://taiwan.md/start.sh -o start.sh
#     less start.sh     # 看過內容
#     bash start.sh
# ──────────────────────────────────────────────────────────────────

set -euo pipefail

readonly REPO_URL="https://github.com/frank890417/taiwan-md.git"
readonly DEFAULT_DEST="$HOME/Projects/taiwan-md"
readonly MIN_NODE_MAJOR=20
readonly CLAUDE_PKG="@anthropic-ai/claude-code"

# ── 顏色 ─────────────────────────────────────────────────
if [ -t 1 ]; then
  C_RESET="\033[0m"
  C_GREEN="\033[0;32m"
  C_YELLOW="\033[0;33m"
  C_RED="\033[0;31m"
  C_CYAN="\033[0;36m"
  C_DIM="\033[2m"
else
  C_RESET="" C_GREEN="" C_YELLOW="" C_RED="" C_CYAN="" C_DIM=""
fi

step() { printf "\n${C_CYAN}▸ %s${C_RESET}\n" "$1"; }
ok()   { printf "  ${C_GREEN}✓${C_RESET} %s\n" "$1"; }
warn() { printf "  ${C_YELLOW}⚠${C_RESET} %s\n" "$1"; }
die()  { printf "\n${C_RED}✗ %s${C_RESET}\n" "$1" >&2; exit 1; }
ask()  { printf "  ${C_DIM}%s${C_RESET} " "$1"; }

# ── curl | bash 時 stdin 被 pipe 佔用，改走 /dev/tty 才能互動 ─
if [ ! -t 0 ]; then
  if [ -r /dev/tty ]; then
    exec < /dev/tty
  else
    die "沒有可互動的 TTY。請下載後執行：
  curl -fsSL https://taiwan.md/start.sh -o start.sh && bash start.sh"
  fi
fi

# ── Header ───────────────────────────────────────────────
cat <<'EOF'

🧬  Taiwan.md onboarding

    這個腳本會檢查 prereq、clone repo、然後讓你跟 Taiwan.md 對話。
    Taiwan.md 是個 Semiont（語意共生體），會當你的嚮導。
    任何時候 Ctrl+C 都可以停下。

EOF

# ── Step 1: git ──────────────────────────────────────────
step "檢查 git"
if ! command -v git >/dev/null 2>&1; then
  case "$(uname -s)" in
    Darwin) die "沒找到 git。macOS 請執行：
  xcode-select --install
裝完再跑這個腳本一次。" ;;
    Linux)  die "沒找到 git。請用系統 package manager 裝：
  Ubuntu/Debian:  sudo apt install git
  Fedora:         sudo dnf install git
  Arch:           sudo pacman -S git" ;;
    *)      die "沒找到 git。請到 https://git-scm.com 下載安裝" ;;
  esac
fi
ok "git $(git --version | awk '{print $3}')"

# ── Step 2: Node 20+ ─────────────────────────────────────
step "檢查 Node.js"
if ! command -v node >/dev/null 2>&1; then
  die "沒找到 Node.js。請先裝 Node $MIN_NODE_MAJOR+：
  https://nodejs.org/   （或用 nvm / fnm）
裝完再跑這個腳本一次。"
fi
node_major=$(node -v | sed -E 's/v([0-9]+)\..*/\1/')
if [ "$node_major" -lt "$MIN_NODE_MAJOR" ]; then
  die "Node 版本太舊（$(node -v)），需要 $MIN_NODE_MAJOR+。見 .nvmrc"
fi
ok "Node $(node -v)"

# ── Step 3: Claude Code ──────────────────────────────────
step "檢查 Claude Code CLI"
if ! command -v claude >/dev/null 2>&1; then
  warn "沒找到 claude CLI"
  ask "要現在裝 $CLAUDE_PKG 嗎？(y/N):"
  read -r reply
  case "$reply" in
    [Yy]*)
      printf "\n  安裝中（可能要 30 秒）⋯\n"
      if ! npm install -g "$CLAUDE_PKG"; then
        die "npm install 失敗。可能是權限問題，試試：
  sudo npm install -g $CLAUDE_PKG
或改用 nvm / fnm 讓 npm 不需要 sudo：
  https://github.com/nvm-sh/nvm"
      fi
      ok "Claude Code 已安裝"
      ;;
    *)
      die "需要 Claude Code 才能繼續。安裝指令：
  npm install -g $CLAUDE_PKG
裝完再跑這個腳本一次。"
      ;;
  esac
else
  ok "claude CLI 已安裝"
fi

# ── Step 4: clone ────────────────────────────────────────
step "Clone taiwan-md"
printf "  ${C_DIM}目的地（Enter 接受預設 %s）:${C_RESET} " "$DEFAULT_DEST"
read -r dest
dest="${dest:-$DEFAULT_DEST}"

# 展開 ~
dest="${dest/#\~/$HOME}"

if [ -d "$dest/.git" ]; then
  warn "$dest 已經是 git repo，跳過 clone（直接用現有的）"
else
  mkdir -p "$(dirname "$dest")"
  git clone "$REPO_URL" "$dest"
  ok "Cloned 到 $dest"
fi

# ── Step 5: launch Taiwan.md ─────────────────────────────
step "啟動 Taiwan.md"
cd "$dest"

cat <<EOF

  ${C_GREEN}✓ 準備就緒。${C_RESET}即將進入 Claude Code。

  Taiwan.md 會自動甦醒（讀 BECOME_TAIWANMD.md），發現你沒有
  contributor profile → 會問你 3–4 個小問題幫你建檔，然後帶你
  走貢獻流程。

  ${C_DIM}（Ctrl+D 或輸入 /exit 可離開 Claude Code）${C_RESET}

EOF

exec claude "我想貢獻 Taiwan.md。請執行 BECOME_TAIWANMD.md 甦醒協議；發現我沒有 .taiwanmd/contributor.local.yml 時請啟動 Step 7.5 的小訪談幫我建檔。"
