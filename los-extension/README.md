# LOS Browser Extension - Web Clipper

A browser extension that allows users to right-click articles or images and save them directly to their LOS desktop app. This creates a seamless workflow for capturing web content without leaving the browser.

## Features

- **Save Articles**: Right-click any webpage → "Save to LOS" to capture the full article
- **Save Images**: Right-click any image → "Save Image to LOS" to save with context
- **Save Selections**: Select text and right-click → "Save Selection to LOS" for quick notes
- **Save Links**: Right-click any link → "Save Link to LOS" to bookmark URLs
- **Real-time Sync**: Content appears instantly in your LOS desktop app
- **Smart Processing**: Articles are automatically processed for RAG (Retrieval-Augmented Generation)

## Installation

### Prerequisites
1. **LOS Desktop App** must be installed and running
2. **Chrome Browser** (or Chromium-based browser)

### Step 1: Install LOS Desktop App
- Download and install the LOS desktop application
- The app automatically starts a clipper server on port 8765

### Step 2: Install Browser Extension

#### For Development (Chrome):
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Navigate to the `los-extension` folder in your LOS app directory
5. Select the folder and click "Select Folder"

#### For Production (Future):
- Extension will be published to Chrome Web Store
- One-click install from the store

### Step 3: Verify Installation
1. Look for the LOS Clipper icon in your browser toolbar
2. Click the icon to open the popup
3. You should see "✓ Connected to LOS" if everything is working

## Usage

### Save an Article
1. Navigate to any article or webpage
2. Right-click anywhere on the page
3. Select "Save to LOS" from the context menu
4. The article will be saved and processed automatically

### Save an Image
1. Right-click on any image
2. Select "Save Image to LOS" from the context menu
3. The image will be saved with its source URL and context

### Save Selected Text
1. Select any text on a webpage
2. Right-click on the selection
3. Select "Save Selection to LOS" from the context menu
4. The text will be saved as a note

### Save a Link
1. Right-click on any link
2. Select "Save Link to LOS" from the context menu
3. The URL will be bookmarked

## How It Works

```
Browser Extension (Chrome/Firefox)
    ↓
Context Menu Click
    ↓
Extract Content (URL, title, selection, image)
    ↓
HTTP POST to localhost:8765
    ↓
LOS Desktop App (local API server)
    ↓
Save to IndexedDB
    ↓
Process for RAG
```

## Architecture

### Browser Extension Components
- **manifest.json**: Extension configuration and permissions
- **background.js**: Service worker handling context menus and API calls
- **content.js**: Content extraction from web pages
- **popup.html/js**: Extension popup UI for quick actions

### Desktop App Integration
- **Rust HTTP Server**: Receives clips on localhost:8765
- **Frontend Handler**: Processes clips and saves to database
- **RAG Processing**: Automatically processes articles for search

## Troubleshooting

### "LOS app not running" Error
- Make sure the LOS desktop app is running
- Check that port 8765 is not blocked by firewall
- Restart the LOS app if needed

### Extension Not Working
- Check if extension is enabled in `chrome://extensions/`
- Try reloading the extension
- Check browser console for errors (F12 → Console)

### Content Not Appearing in LOS
- Check LOS app console for errors
- Verify database is working properly
- Try saving a simple text selection first

## Development

### Building the Extension
The extension is already built and ready to use. No build process required.

### Testing
1. Install extension in Chrome
2. Start LOS desktop app
3. Test each context menu option
4. Verify content appears in LOS library

### Customization
- Modify `background.js` to add new context menu items
- Update `content.js` to change content extraction logic
- Customize `popup.html` for different UI

## Security

- Extension only communicates with localhost:8765
- No data is sent to external servers
- All content stays on your local machine
- CORS headers properly configured for local communication

## Future Enhancements

- **Keyboard Shortcuts**: Ctrl+Shift+L to save current page
- **Batch Save**: Save all open tabs at once
- **Custom Collections**: Save to specific folders/categories
- **OCR Integration**: Extract text from images
- **Video Transcripts**: Capture YouTube/other video transcripts
- **Firefox Support**: Port to Firefox WebExtensions
- **Safari Support**: Port to Safari App Extensions

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Check browser console for errors
3. Check LOS app console for errors
4. Restart both extension and LOS app

---

**This extension creates the seamless web-to-desktop experience for capturing and organizing web content in your personal knowledge base.**
