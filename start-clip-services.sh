#!/bin/bash

# Kill any existing processes
pkill -f "process-clips\|clip-processor\|clips-api" 2>/dev/null
sleep 2

# Start the API server
echo "🚀 Starting Clips API server..."
cd /home/daniel-parker/Desktop/LOSenviorment/los-app
node clips-api.js &
API_PID=$!

# Wait for API to start
sleep 2

# Start the clip processor
echo "📎 Starting Clip Processor..."
node clip-processor.js &
PROCESSOR_PID=$!

# Wait for processor to start
sleep 2

# Start the file mover
echo "📁 Starting File Processor..."
./process-clips.sh &
FILE_PID=$!

echo "✅ All services started!"
echo "API PID: $API_PID"
echo "Processor PID: $PROCESSOR_PID" 
echo "File Processor PID: $FILE_PID"

# Keep script running
wait
