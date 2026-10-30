---
name: run-ralph
description: Start Ralph loops through OpenClaw using a repository's plans/afk.sh runner. Use when starting Ralph automation or running a specified number of Ralph iterations.
---

# Run Ralph Skill

## Description

This skill automates the process of starting Ralph loops in a repository. It identifies the correct working directory, runs the `./plans/afk.sh` script with specified parameters (e.g., loop count), and logs the OpenClaw namespace for tracking.

## Features

- Automatically runs Ralph loops by invoking `./plans/afk.sh`.
- Supports dynamic repository paths (uses the current working directory/project context).
- Logs and prints the OpenClaw session name for better observability.

## Usage

The skill assumes that the `./plans/afk.sh` script exists in the repository root. Current behavior includes:

1. Detecting the repository (based on the current directory where the skill is run).
2. Taking an optional argument for the number of iterations (defaults to 20 if not provided).
3. Logging the process and ensuring visibility of the OpenClaw namespace.

## Example

To start Ralph loops:

```bash
bash "$SKILL_DIR/run-ralph.sh" -i 15
```

Run from the target repository root, with `SKILL_DIR` set to the absolute path
of this installed skill's directory. The bundled runner accepts `-i` and defaults
to 20 iterations.

## Development Notes

- Ensure that the OpenClaw workspace supports dynamic working directories.
- Any errors during script execution should be handled gracefully and provide detailed output to the user.
- Test in different repositories to validate flexibility.
