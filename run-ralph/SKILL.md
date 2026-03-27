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
run-ralph --iterations 15
```

## Development Notes
- Ensure that the OpenClaw workspace supports dynamic working directories.
- Any errors during script execution should be handled gracefully and provide detailed output to the user.
- Test in different repositories to validate flexibility.
