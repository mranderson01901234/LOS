#!/bin/bash

# LOS Clip Processor - Watches Downloads folder for clip files
# This script processes JSON clip files downloaded by the browser extension

DOWNLOADS_DIR="$HOME/Downloads"
LOS_CLIPS_DIR="$DOWNLOADS_DIR/los-clips"
LOS_APP_DIR="/home/daniel-parker/Desktop/LOSenviorment/los-app"

echo "🔍 LOS Clip Processor starting..."
echo "📁 Watching: $LOS_CLIPS_DIR"
echo "📱 LOS App: $LOS_APP_DIR"

# Create los-clips directory if it doesn't exist
mkdir -p "$LOS_CLIPS_DIR"

# Function to process a clip file
process_clip() {
    local file="$1"
    echo "📎 Processing clip: $(basename "$file")"
    
    # Copy to LOS app directory for processing
    cp "$file" "$LOS_APP_DIR/clips/"
    
    # Remove from downloads to avoid reprocessing
    rm "$file"
    
    echo "✅ Clip processed and moved to LOS app"
}

# Watch for new files in los-clips directory
inotifywait -m -e create,moved_to "$LOS_CLIPS_DIR" --format '%w%f' |
while read file; do
    if [[ "$file" == *.json ]]; then
        echo "🆕 New clip detected: $(basename "$file")"
        sleep 1  # Wait for file to be fully written
        process_clip "$file"
    fi
done
