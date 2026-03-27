#!/bin/bash
set -euo pipefail

ensure_origin_main() {
  if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ] || [ -f .git/MERGE_HEAD ] || [ -f .git/CHERRY_PICK_HEAD ]; then
    echo "Error: git operation already in progress. Resolve it before running Ralph." >&2
    exit 1
  fi

  git fetch origin --prune
  git checkout main
  git reset --hard origin/main
  git clean -fd
}

ensure_origin_main

issues=$(gh issue list --state open --json number,title,body,comments)
ralph_commits=$(git log --grep="RALPH" -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No RALPH commits found")

tmp_dir="tmp"
mkdir -p "$tmp_dir"

issues_file=$(mktemp "$tmp_dir/ralph-issues.XXXXXX")
commits_file=$(mktemp "$tmp_dir/ralph-commits.XXXXXX")
trap 'rm -f "$issues_file" "$commits_file"' EXIT

printf '%s\n' "$issues" > "$issues_file"
printf '%s\n' "$ralph_commits" > "$commits_file"

/Users/tomas/.opencode/bin/opencode run \
	-f "$issues_file" \
	-f "$commits_file" \
	-- \
	"$(<plans/prompt.md)"
