#!/bin/bash
# Port cleanup script for LOS app development
# Kills any processes running on port 1420 to prevent conflicts

PORT=1420
echo "🧹 Cleaning up port $PORT..."

# Find processes using the port
PIDS=$(lsof -ti:$PORT 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "✅ Port $PORT is already free"
else
    echo "🔍 Found processes on port $PORT: $PIDS"
    
    # Kill the processes
    for PID in $PIDS; do
        echo "🔄 Killing process $PID..."
        kill -9 $PID 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ Process $PID killed successfully"
        else
            echo "⚠️  Failed to kill process $PID (may have already exited)"
        fi
    done
    
    # Wait a moment for cleanup
    sleep 1
    
    # Verify port is free
    REMAINING=$(lsof -ti:$PORT 2>/dev/null)
    if [ -z "$REMAINING" ]; then
        echo "✅ Port $PORT is now free"
    else
        echo "❌ Port $PORT still in use by: $REMAINING"
        echo "   You may need to manually kill these processes"
    fi
fi

echo "🎯 Port cleanup complete"
