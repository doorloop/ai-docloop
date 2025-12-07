#!/bin/bash
# Release script for GitHub Action
# This script builds the action and prepares it for release

set -e

echo "🚀 Preparing release..."

# Get version from argument or prompt
VERSION=${1:-}
if [ -z "$VERSION" ]; then
  echo "Usage: ./scripts/release.sh v1.0.0"
  exit 1
fi

# Remove 'v' prefix if present for tag
TAG_VERSION=${VERSION#v}
FULL_TAG="v${TAG_VERSION}"

echo "📦 Building action..."
npm run build

echo "🧪 Running tests..."
npm test

echo "📝 Checking git status..."
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  Warning: You have uncommitted changes."
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Temporarily allow dist/ to be committed
# Note: This assumes dist/ is in .gitignore
echo "📁 Staging dist/ directory..."
git add -f dist/

# Check if there are changes to commit
if [ -z "$(git diff --cached --name-only)" ]; then
  echo "⚠️  No changes to commit. dist/ may already be up to date."
else
  echo "💾 Committing built files..."
  git commit -m "chore: build action for ${FULL_TAG}" || echo "No changes to commit"
fi

echo "🏷️  Creating tag ${FULL_TAG}..."
git tag -a "${FULL_TAG}" -m "Release ${FULL_TAG}"

echo "✅ Release prepared!"
echo ""
echo "Next steps:"
echo "  1. Review the changes: git log --oneline -5"
echo "  2. Push commits: git push"
echo "  3. Push tag: git push origin ${FULL_TAG}"
echo ""
echo "The release workflow will automatically create a GitHub release."

