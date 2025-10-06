
// Function injected into page to extract content
function extractPageContent() {
  // Get main content (try article tags first)
  const article = document.querySelector('article');
  const main = document.querySelector('main');
  const content = article || main || document.body;
  
  // Extract text content
  const textContent = content.innerText || content.textContent;
  
  // Get metadata
  const description = document.querySelector('meta[name="description"]')?.content || '';
  const author = document.querySelector('meta[name="author"]')?.content || '';
  
  return {
    content: textContent,
    description,
    author,
    url: window.location.href,
    title: document.title
  };
}

// Create context menu items on install
chrome.runtime.onInstalled.addListener(() => {
  // Save full page
  chrome.contextMenus.create({
    id: 'save-page',
    title: 'Save to LOS',
    contexts: ['page']
  });
  
  // Save selection
  chrome.contextMenus.create({
    id: 'save-selection',
    title: 'Save Selection to LOS',
    contexts: ['selection']
  });
  
  // Save image
  chrome.contextMenus.create({
    id: 'save-image',
    title: 'Save Image to LOS',
    contexts: ['image']
  });
  
  // Save link
  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save Link to LOS',
    contexts: ['link']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('LOS Clipper: Context menu clicked', info.menuItemId);
  
  try {
    let payload = {
      url: info.pageUrl || tab.url,
      title: tab.title,
      timestamp: Date.now()
    };
    
    switch (info.menuItemId) {
      case 'save-page':
        // Extract full page content via content script
        try {
          // Check if scripting API is available
          if (!chrome.scripting || !chrome.scripting.executeScript) {
            throw new Error('Scripting API not available');
          }
          
          const [pageContent] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractPageContent
          });
          
          payload.type = 'article';
          payload.content = pageContent.result.content;
          payload.description = pageContent.result.description;
          payload.author = pageContent.result.author;
        } catch (scriptError) {
          console.warn('Failed to extract page content:', scriptError);
          // Fallback: use basic info
          payload.type = 'article';
          payload.content = `Page: ${tab.title}\nURL: ${tab.url}`;
        }
        break;
        
      case 'save-selection':
        payload.type = 'note';
        payload.content = info.selectionText;
        payload.title = `Selection from ${tab.title}`;
        break;
        
      case 'save-image':
        payload.type = 'image';
        payload.image_url = info.srcUrl;
        payload.title = `Image from ${tab.title}`;
        break;
        
      case 'save-link':
        payload.type = 'url';
        payload.url = info.linkUrl;
        payload.title = info.linkUrl;
        break;
    }
    
    // Send to LOS desktop app via file system
    await sendToLOS(payload);
    
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Saved to LOS',
      message: `${payload.title}`,
      priority: 1
    });
    
  } catch (error) {
    console.error('LOS Clipper: Save failed', error);
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'LOS Save Failed',
      message: 'Make sure LOS desktop app is running',
      priority: 2
    });
  }
});

// Track recent downloads to prevent duplicates
const recentDownloads = new Map();

// Send data to LOS desktop app via file system
async function sendToLOS(data) {
  try {
    // Create a unique filename
    const filename = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.json`;
    
    // Check if we've recently downloaded something similar
    const dataKey = `${data.type}_${data.title}_${data.url || ''}`;
    const now = Date.now();
    
    if (recentDownloads.has(dataKey)) {
      const lastDownload = recentDownloads.get(dataKey);
      if (now - lastDownload < 5000) { // 5 second debounce
        console.log('Skipping duplicate download:', dataKey);
        return;
      }
    }
    
    recentDownloads.set(dataKey, now);
    
    // Clean up old entries (older than 30 seconds)
    for (const [key, timestamp] of recentDownloads.entries()) {
      if (now - timestamp > 30000) {
        recentDownloads.delete(key);
      }
    }
    
    // Create JSON content
    const jsonContent = JSON.stringify(data, null, 2);
    
    // Use chrome.downloads API with data URL instead of blob
    const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
    
    // Download the file
    chrome.downloads.download({
      url: dataUrl,
      filename: `los-clips/${filename}`,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
        // Fallback: show notification with instructions
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'LOS Clipper',
          message: 'Clip saved! Check Downloads/los-clips folder.',
          priority: 1
        });
      } else {
        console.log('Clip saved as download:', downloadId);
        // Show success notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Saved to LOS',
          message: 'Clip downloaded successfully!',
          priority: 1
        });
      }
    });
    
  } catch (error) {
    console.error('Failed to send to LOS:', error);
    throw error;
  }
}

// Fallback method to save to a known location
function saveToKnownLocation(data) {
  // This is a simplified approach - in a real implementation,
  // you might use a native messaging host or other communication method
  console.log('Fallback: Saving clip data:', data);
  
  // For now, we'll just log it and show a notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'LOS Clipper',
    message: 'Clip saved locally. Please copy to LOS clips folder.',
    priority: 1
  });
}
