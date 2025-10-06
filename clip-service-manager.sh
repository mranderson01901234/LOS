#!/bin/bash

# PID file locations
API_PID_FILE="/tmp/los-clips-api.pid"
PROCESSOR_PID_FILE="/tmp/los-clips-processor.pid"
FILE_PID_FILE="/tmp/los-clips-file.pid"

# Function to kill existing processes
cleanup() {
    echo "🧹 Cleaning up existing processes..."
    
    if [ -f "$API_PID_FILE" ]; then
        kill $(cat "$API_PID_FILE") 2>/dev/null
        rm -f "$API_PID_FILE"
    fi
    
    if [ -f "$PROCESSOR_PID_FILE" ]; then
        kill $(cat "$PROCESSOR_PID_FILE") 2>/dev/null
        rm -f "$PROCESSOR_PID_FILE"
    fi
    
    if [ -f "$FILE_PID_FILE" ]; then
        kill $(cat "$FILE_PID_FILE") 2>/dev/null
        rm -f "$FILE_PID_FILE"
    fi
    
    # Kill any remaining processes
    pkill -f "clips-api.js" 2>/dev/null
    pkill -f "clip-processor.js" 2>/dev/null
    pkill -f "process-clips.sh" 2>/dev/null
    
    sleep 2
}

# Function to start services
start_services() {
    cd /home/daniel-parker/Desktop/LOSenviorment/los-app
    
    echo "🚀 Starting Clips API server..."
    node clips-api.js &
    API_PID=$!
    echo $API_PID > "$API_PID_FILE"
    
    sleep 2
    
    echo "📎 Starting Clip Processor..."
    node clip-processor.js &
    PROCESSOR_PID=$!
    echo $PROCESSOR_PID > "$PROCESSOR_PID_FILE"
    
    sleep 2
    
    echo "📁 Starting File Processor..."
    ./process-clips.sh &
    FILE_PID=$!
    echo $FILE_PID > "$FILE_PID_FILE"
    
    echo "✅ All services started!"
    echo "API PID: $API_PID"
    echo "Processor PID: $PROCESSOR_PID"
    echo "File Processor PID: $FILE_PID"
}

# Function to check if services are running
check_services() {
    if [ -f "$API_PID_FILE" ] && kill -0 $(cat "$API_PID_FILE") 2>/dev/null; then
        echo "✅ API server is running"
    else
        echo "❌ API server is not running"
    fi
    
    if [ -f "$PROCESSOR_PID_FILE" ] && kill -0 $(cat "$PROCESSOR_PID_FILE") 2>/dev/null; then
        echo "✅ Clip processor is running"
    else
        echo "❌ Clip processor is not running"
    fi
    
    if [ -f "$FILE_PID_FILE" ] && kill -0 $(cat "$FILE_PID_FILE") 2>/dev/null; then
        echo "✅ File processor is running"
    else
        echo "❌ File processor is not running"
    fi
}

# Handle command line arguments
case "$1" in
    start)
        cleanup
        start_services
        ;;
    stop)
        cleanup
        echo "🛑 All services stopped"
        ;;
    restart)
        cleanup
        start_services
        ;;
    status)
        check_services
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        echo "  start   - Start all clip services"
        echo "  stop    - Stop all clip services"
        echo "  restart - Restart all clip services"
        echo "  status  - Check status of all services"
        exit 1
        ;;
esac
