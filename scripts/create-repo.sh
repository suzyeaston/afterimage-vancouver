#!/usr/bin/env bash
# Execute locally from the unzipped AFTERIMAGE directory.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
OWNER="suzyeaston"
NAME="afterimage-vancouver"
REPO="$OWNER/$NAME"
if ! command -v gh >/dev/null 2>&1; then
  echo 'Install GitHub CLI first: https://cli.github.com/ (or brew install gh)' >&2
  exit 1
fi
if ! command -v git >/dev/null 2>&1; then echo 'git is required' >&2; exit 1; fi
if ! gh auth status >/dev/null 2>&1; then echo 'Run: gh auth login' >&2; exit 1; fi
ACCOUNT="$(gh api user --jq .login)"
if [[ "$ACCOUNT" != "$OWNER" ]]; then
  echo "Authenticated as $ACCOUNT, but this script targets $OWNER. Switch accounts with gh auth switch." >&2
  exit 1
fi
if gh repo view "$REPO" >/dev/null 2>&1; then
  echo "Repository already exists: https://github.com/$REPO"
  echo 'To avoid accidental overwrites, stopping here.'
  exit 0
fi
python3 scripts/build_catalog.py
python3 -m unittest discover -s tests -v
if [[ ! -d .git ]]; then
  git init -b main
  git add .
  git commit -m 'Initial transmission: AFTERIMAGE Vancouver creative work atlas'
fi
# The map itself is intended to be public. The private application notebook is gitignored.
gh repo create "$REPO" --public --source=. --remote=origin --push --description 'An experimental Vancouver atlas of creative technology, engineering, film, games and music jobs.'
echo "Created https://github.com/$REPO"
# Create Pages using Actions. Nonfatal for organizations/accounts where Pages must be enabled in the UI.
if gh api --method POST "repos/$REPO/pages" -f build_type=workflow >/dev/null 2>&1; then
  echo 'GitHub Pages configured via Actions.'
else
  echo 'Enable Settings → Pages → Build and deployment: GitHub Actions (if not already enabled).'
fi
if gh workflow run publish.yml --repo "$REPO"; then
  echo 'Requested Pages publication.'
else
  echo 'If needed, open Actions → Publish AFTERIMAGE → Run workflow.'
fi
printf '\nAtlas URL once published: https://%s.github.io/%s/\n' "$OWNER" "$NAME"
printf 'For your WordPress page: merge the optional site integration PR and create a page with slug "afterimage".\n'
