#!/bin/bash
# Enhanced script to start LOS app development server with proper setup

echo "🚀 Starting LOS App Development Server..."

# Navigate to project directory
cd /home/daniel-parker/Desktop/LOSenviorment/los-app

# Set up Rust/Cargo PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Load development environment variables
if [ -f "dev.env" ]; then
    echo "📋 Loading development environment..."
    export $(cat dev.env | grep -v '^#' | xargs)
fi

# Clean up any existing processes on port 1420
echo "🧹 Cleaning up port 1420..."
bash scripts/cleanup-port.sh

# Start Tauri development server
echo "🎯 Starting Tauri development server..."
npm run tauri dev
