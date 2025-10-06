// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractContent') {
    const content = extractDetailedContent();
    sendResponse(content);
  }
});

function extractDetailedContent() {
  // Try multiple strategies to get clean content
  
  // Strategy 1: Look for article element
  let content = document.querySelector('article');
  
  // Strategy 2: Look for main content
  if (!content) {
    content = document.querySelector('main');
  }
  
  // Strategy 3: Look for content div (common patterns)
  if (!content) {
    const contentSelectors = [
      '[role="main"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '#content',
      '.content'
    ];
    
    for (const selector of contentSelectors) {
      content = document.querySelector(selector);
      if (content) break;
    }
  }
  
  // Fallback: use body
  if (!content) {
    content = document.body;
  }
  
  // Clean up the content
  const cleanContent = cleanHTML(content);
  
  return {
    content: cleanContent,
    title: document.title,
    url: window.location.href,
    description: getMetaContent('description'),
    author: getMetaContent('author'),
    publishDate: getMetaContent('article:published_time'),
    image: getMetaContent('og:image')
  };
}

function cleanHTML(element) {
  // Clone to avoid modifying page
  const clone = element.cloneNode(true);
  
  // Remove script and style tags
  clone.querySelectorAll('script, style, nav, footer, aside').forEach(el => el.remove());
  
  // Get text content
  return clone.innerText || clone.textContent;
}

function getMetaContent(name) {
  const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  return meta?.content || '';
}
