#!/bin/bash

# Completely remove conda from environment
unset CONDA_DEFAULT_ENV
unset CONDA_EXE
unset CONDA_PREFIX
unset CONDA_PROMPT_MODIFIER
unset CONDA_PYTHON_EXE
unset CONDA_SHLVL

# Clean PATH - remove all conda paths
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$HOME/.cargo/bin"

# Set system compiler
export CC=gcc
export CXX=g++
export PKG_CONFIG_PATH="/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/lib/pkgconfig"
export LD_LIBRARY_PATH="/usr/lib/x86_64-linux-gnu"

# Kill any existing processes
pkill -f "tauri\|vite\|cargo" 2>/dev/null || true
sleep 2

# Kill port 1420
lsof -ti:1420 | xargs kill -9 2>/dev/null || true

echo "✅ Clean environment ready"
echo "GCC: $(which gcc)"
echo "PATH: $PATH"

# Launch Tauri
cd /home/daniel-parker/Desktop/LOSenviorment/los-app
npm run tauri dev
