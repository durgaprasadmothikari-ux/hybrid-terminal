#!/usr/bin/env bash
# ==============================================================================
# PANDASAY INSTALLER FOR WSL / LINUX
# ==============================================================================
set -e

echo "=== Installing pandasay for WSL / Linux ==="

# 1. Detect environment
if [ -z "$HOME" ]; then
    HOME=$(eval echo "~$USER")
fi

TARGET_DIR="$HOME/.local/bin"
TARGET_FILE="$TARGET_DIR/pandasay"

# Find source file location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_FILE="$SCRIPT_DIR/../bin/pandasay"

if [ ! -f "$SOURCE_FILE" ]; then
    # Fallback to current directory or script directory
    if [ -f "$SCRIPT_DIR/pandasay" ]; then
        SOURCE_FILE="$SCRIPT_DIR/pandasay"
    else
        echo "Error: Source pandasay executable not found at $SOURCE_FILE" >&2
        exit 1
    fi
fi

# 2. Ensure target directory exists
mkdir -p "$TARGET_DIR"

# 3. Copy and set executable permissions
cp "$SOURCE_FILE" "$TARGET_FILE"
# Ensure Unix line endings
sed -i 's/\r$//' "$TARGET_FILE"
chmod +x "$TARGET_FILE"

# 4. Ensure ~/.local/bin is in PATH for all bash shells
BASHRC="$HOME/.bashrc"
PROFILE="$HOME/.profile"

PATH_LINE='export PATH="$HOME/.local/bin:$PATH"'

if [ -f "$BASHRC" ]; then
    if ! grep -Fq "$TARGET_DIR" "$BASHRC" && ! grep -Fq '.local/bin' "$BASHRC"; then
        echo "" >> "$BASHRC"
        echo "# User private bin directory for local executables (pandasay)" >> "$BASHRC"
        echo 'if [ -d "$HOME/.local/bin" ] ; then' >> "$BASHRC"
        echo '    PATH="$HOME/.local/bin:$PATH"' >> "$BASHRC"
        echo 'fi' >> "$BASHRC"
    fi
fi

export PATH="$TARGET_DIR:$PATH"

# 5. Verify installation
if [ ! -x "$TARGET_FILE" ]; then
    echo "Error: Failed to verify $TARGET_FILE as executable." >&2
    exit 1
fi

INSTALLED_PATH=$(which pandasay 2>/dev/null || echo "$TARGET_FILE")

echo ""
echo "PANDASAY INSTALLED"
echo ""
echo "Location:"
echo "$INSTALLED_PATH"
echo ""
echo "Test:"
"$TARGET_FILE" "CyberTerm online"
echo ""
echo "Installation complete!"
