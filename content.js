// content.js – Extracts visible text from the current page

const MAX_CHARS = 8000;

/**
 * Extracts visible page text, removing script, style, nav, footer, header.
 * Returns the text truncated to MAX_CHARS.
 */
function extractPageText() {
  const clone = document.body.cloneNode(true);
  const removeTags = ['script', 'style', 'nav', 'footer', 'header', 'noscript', 'svg', 'iframe'];
  removeTags.forEach(tag => {
    clone.querySelectorAll(tag).forEach(el => el.remove());
  });
  let text = clone.innerText || clone.textContent || '';
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text.substring(0, MAX_CHARS);
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractText') {
    try {
      const text = extractPageText();
      sendResponse({
        success: true,
        text: text,
        url: window.location.href,
        title: document.title
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }
  // Return true to indicate async response
  return true;
});
