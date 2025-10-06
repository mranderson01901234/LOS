// Check LOS connection status
async function checkConnection() {
  const statusEl = document.getElementById('status');
  
  // Since we're using downloads, we don't need to check HTTP connection
  statusEl.className = 'status connected';
  statusEl.textContent = '✓ Ready to save clips';
  return true;
}

// Save current page
document.getElementById('save-page').addEventListener('click', async () => {
  const button = document.getElementById('save-page');
  const loading = document.getElementById('loading');
  
  button.disabled = true;
  loading.style.display = 'block';
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const [content] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        return {
          content: document.body.innerText,
          title: document.title,
          url: window.location.href,
          description: document.querySelector('meta[name="description"]')?.content || '',
          author: document.querySelector('meta[name="author"]')?.content || ''
        };
      }
    });
    
    // Use download approach instead of HTTP
    const clipData = {
      type: 'article',
      ...content.result,
      timestamp: Date.now()
    };
    
    // Create and download the clip file
    const filename = `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.json`;
    const jsonContent = JSON.stringify(clipData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: `los-clips/${filename}`,
      saveAs: false
    });
    
    // Update stats
    await loadStats();
    
    // Show success
    button.textContent = '✓ Saved!';
    setTimeout(() => {
      button.textContent = 'Save This Page';
      button.disabled = false;
      loading.style.display = 'none';
    }, 2000);
    
  } catch (error) {
    console.error('Save failed:', error);
    button.textContent = '✗ Failed';
    setTimeout(() => {
      button.textContent = 'Save This Page';
      button.disabled = false;
      loading.style.display = 'none';
    }, 2000);
  }
});

// Open LOS app (if possible via custom protocol)
document.getElementById('open-los').addEventListener('click', () => {
  // Try to open LOS app via custom protocol
  window.open('los://open', '_blank');
});

// Load stats
async function loadStats() {
  // Since we're using downloads, we can't get stats from HTTP
  // Just show placeholder values
  document.getElementById('saves-today').textContent = '-';
  document.getElementById('total-saves').textContent = '-';
}

// Initialize
checkConnection().then(connected => {
  if (connected) {
    loadStats();
  }
});
