#!/bin/bash

# run-ralph.sh
# This script runs Ralph loops in the current repository.

# Default iteration count
ITERATIONS=20

# Process arguments
while getopts "i:" opt; do
  case $opt in
    i) ITERATIONS=$OPTARG ;;
    *) echo "Usage: $0 [-i iterations]"; exit 1 ;;
  esac
done

# Ensure the ./plans/afk.sh script exists
if [[ ! -f "./plans/afk.sh" ]]; then
  echo "Error: ./plans/afk.sh not found in the current directory."
  exit 1
fi

# Start the Ralph loop and log OpenClaw namespace
SESSION_NAME=$(openclaw exec --background --pty -- "cd $(pwd) && ./plans/afk.sh $ITERATIONS")

if [[ $? -eq 0 ]]; then
  echo "Ralph loop started successfully. OpenClaw session: $SESSION_NAME"
else
  echo "Failed to start Ralph loop. Check the logs for more details."
  exit 1
fi