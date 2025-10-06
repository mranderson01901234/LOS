#!/bin/bash

# Clean environment - remove conda paths
export PATH="/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$HOME/.cargo/bin"
export CC=gcc
export CXX=g++
export PKG_CONFIG_PATH="/usr/lib/x86_64-linux-gnu/pkgconfig:/usr/lib/pkgconfig"
export LD_LIBRARY_PATH="/usr/lib/x86_64-linux-gnu"

# Kill any existing processes
pkill -f "tauri\|vite\|cargo" 2>/dev/null || true
sleep 2

# Kill port 1420
lsof -ti:1420 | xargs kill -9 2>/dev/null || true

# Launch Tauri
cd /home/daniel-parker/Desktop/LOSenviorment/los-app
npm run tauri dev
