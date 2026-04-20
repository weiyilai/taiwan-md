#!/bin/bash
# cli/scripts/release.sh — one-command CLI release
#
# Usage:
#   cd cli && scripts/release.sh patch   # 0.6.1 → 0.6.2
#   cd cli && scripts/release.sh minor   # 0.6.1 → 0.7.0
#   cd cli && scripts/release.sh major   # 0.6.1 → 1.0.0
#   cd cli && scripts/release.sh 0.6.5   # explicit version
#
# Flow:
#   1. Confirm working tree is clean
#   2. Run tests (npm test)
#   3. Bump version in cli/package.json (no git tag from npm version)
#   4. Commit the version bump
#   5. Create tag `cli-v<new-version>` and push
#   6. GitHub Actions picks up the tag and publishes to npm

set -euo pipefail

# Must be run from cli/
if [ ! -f "package.json" ] || [ "$(node -p "require('./package.json').name")" != "taiwanmd" ]; then
  echo "❌ Run this from cli/ directory"
  exit 1
fi

BUMP="${1:-patch}"

# Check working tree
if [ -n "$(git status --porcelain cli/)" ] && [ -n "$(git status --porcelain .)" ]; then
  # Check if only cli/ changes — acceptable
  if [ -n "$(cd .. && git status --porcelain cli/)" ]; then
    echo "❌ cli/ has uncommitted changes. Commit or stash first."
    git status --short
    exit 1
  fi
fi

# Run tests
echo "▶️  Running tests..."
npm test

# Bump version (no git tag — we control tag naming)
echo "▶️  Bumping version: $BUMP"
NEW_VERSION=$(npm version "$BUMP" --no-git-tag-version | tr -d 'v')
echo "    → $NEW_VERSION"

# Commit (from repo root so the commit references the right path)
cd ..
git add cli/package.json cli/package-lock.json
git commit -m "🧬 [semiont] evolve: CLI v$NEW_VERSION

Published via GitHub Actions on tag push (cli-v$NEW_VERSION).
"

# Tag with cli- prefix so the workflow triggers
TAG="cli-v$NEW_VERSION"
git tag "$TAG"
echo "▶️  Created tag: $TAG"

# Push both commit and tag
git push origin HEAD
git push origin "$TAG"

echo ""
echo "✅ Release kicked off: $TAG"
echo "   Watch: https://github.com/frank890417/taiwan-md/actions"
echo "   Will publish: https://www.npmjs.com/package/taiwanmd"
