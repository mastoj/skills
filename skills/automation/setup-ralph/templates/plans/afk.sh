#!/bin/bash
set -euo pipefail

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

iterations="$1"
echo "Starting Ralph AFK mode for $iterations iteration(s)..."

if [ ! -f "plans/prompt.md" ]; then
  echo "Error: plans/prompt.md not found"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh is required but not installed or not in PATH"
  exit 1
fi

OPENCODE_BIN="/Users/tomas/.opencode/bin/opencode"
if [ ! -x "$OPENCODE_BIN" ]; then
  echo "Error: $OPENCODE_BIN is missing or not executable"
  exit 1
fi

timeout_cmd=()
if command -v gtimeout >/dev/null 2>&1; then
  timeout_cmd=(gtimeout "${RALPH_TIMEOUT_SECONDS:-900}")
elif command -v timeout >/dev/null 2>&1; then
  timeout_cmd=(timeout "${RALPH_TIMEOUT_SECONDS:-900}")
fi

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

tmp_dir="tmp"
mkdir -p "$tmp_dir"

save_dirty_iteration_artifacts() {
  local iteration="$1"
  local status_code="$2"
  local patch_file="$tmp_dir/ralph-wip-iteration-${iteration}.patch"
  local report_file="$tmp_dir/ralph-wip-iteration-${iteration}.txt"

  {
    git diff
    echo
    git diff --cached
  } > "$patch_file"

  {
    echo "Ralph iteration left uncommitted work and was stopped."
    echo "iteration=$iteration"
    echo "exit_status=$status_code"
    echo "timestamp=$(date --iso-8601=seconds 2>/dev/null || date)"
    echo "head=$(git rev-parse HEAD)"
    echo "branch=$(git branch --show-current)"
    echo
    echo "git status --short"
    git status --short
    echo
    echo "last 200 lines of output"
    printf '%s\n' "$output" | tail -n 200
  } > "$report_file"

  echo "Dirty uncommitted work detected after iteration $iteration"
  echo "Saved patch: $patch_file"
  echo "Saved report: $report_file"
}

ensure_origin_main

last_head=$(git rev-parse HEAD)

for ((i=1; i<=iterations; i++)); do
  echo "Iteration $i/$iterations"

  issues_file=$(mktemp "$tmp_dir/ralph-issues.XXXXXX")
  commits_file=$(mktemp "$tmp_dir/ralph-commits.XXXXXX")
  trap 'rm -f "$issues_file" "$commits_file"' EXIT

  issues=$(gh issue list --state open --json number,title,body,comments)
  ralph_commits=$(git log --grep="RALPH" -n 10 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No RALPH commits found")

  printf '%s\n' "$issues" > "$issues_file"
  printf '%s\n' "$ralph_commits" > "$commits_file"

  if [ ${#timeout_cmd[@]} -gt 0 ]; then
    echo "Using timeout: ${RALPH_TIMEOUT_SECONDS:-900}s per iteration"
  fi

  set +e
  if [ ${#timeout_cmd[@]} -gt 0 ]; then
    output=$("${timeout_cmd[@]}" "$OPENCODE_BIN" run \
      -f "$issues_file" \
      -f "$commits_file" \
      -- \
      "$(<plans/prompt.md)" 2>&1)
    status=$?
  else
    output=$("$OPENCODE_BIN" run \
      -f "$issues_file" \
      -f "$commits_file" \
      -- \
      "$(<plans/prompt.md)" 2>&1)
    status=$?
  fi
  set -e

  printf '%s\n' "$output"

  if [ $status -ne 0 ]; then
    if [ $status -eq 124 ]; then
      echo "Iteration $i timed out after ${RALPH_TIMEOUT_SECONDS:-900}s"
    else
      echo "Iteration $i failed with exit code $status"
    fi
    continue
  fi

  current_head=$(git rev-parse HEAD)
  if [ "$current_head" != "$last_head" ]; then
    echo "New commit detected: $current_head"
    git push origin HEAD:main
    last_head="$current_head"
  fi

  if [ -n "$(git status --porcelain)" ]; then
    save_dirty_iteration_artifacts "$i" "$status"
    exit 1
  fi

  if [[ "$output" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "Ralph complete after $i iterations."
    exit 0
  fi

  echo "Iteration $i finished without COMPLETE marker."
done

echo "Reached max iterations ($iterations) without COMPLETE marker."
