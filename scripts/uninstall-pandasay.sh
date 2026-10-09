#!/usr/bin/env bash
# ==============================================================================
# PANDASAY UNINSTALLER FOR WSL / LINUX
# ==============================================================================
set -e

echo "=== Uninstalling pandasay from WSL / Linux ==="

if [ -z "$HOME" ]; then
    HOME=$(eval echo "~$USER")
fi

TARGET_FILE="$HOME/.local/bin/pandasay"

if [ -f "$TARGET_FILE" ]; then
    rm -f "$TARGET_FILE"
    echo "Removed executable: $TARGET_FILE"
else
    echo "Executable not found at: $TARGET_FILE"
fi

echo "PANDASAY UNINSTALLED"
