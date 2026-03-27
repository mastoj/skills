---
name: setup-ralph
description: Set up a Ralph planning workflow by installing prompt and runner scripts into a repo's ./plans directory. Use when user asks to add Ralph planning/automation scripts, prompt files, once.sh, or afk.sh setup.
---

# Setup Ralph

## Quick start

1. Ensure you are at the target repository root.
2. Copy the bundled templates from this skill into `./plans`.
3. Make scripts executable and verify the files exist.

## Workflow

### 1. Validate target repo

- Confirm current directory is the repo root.
- Create destination folder:

```bash
mkdir -p ./plans
```

### 2. Copy bundled files

Copy from this skill's template directory to the target repo:

- `templates/plans/prompt.md`
- `templates/plans/once.sh`
- `templates/plans/afk.sh`

Example copy command (run from skill directory's parent if needed):

```bash
cp setup-ralph/templates/plans/* ./plans/
```

If paths differ in the current environment, locate the skill folder first and then copy those three files into `./plans`.

### 3. Finalize scripts

```bash
chmod +x ./plans/once.sh ./plans/afk.sh
```

### 4. Verify

```bash
ls -la ./plans
```

Required files:

- `./plans/prompt.md`
- `./plans/once.sh`
- `./plans/afk.sh`

## Notes

- This variant uses `opencode` directly (no sandbox wrapper).
- `once.sh` runs one iteration.
- `afk.sh` runs multiple iterations and exits early when `<promise>COMPLETE</promise>` is returned.
- The bundled runners now hard-sync to `origin/main` before each run and refuse to start if Git is already mid-rebase, merge, or cherry-pick.
