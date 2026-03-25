/**
 * DeadTab Cleaner – Content Script
 * Injected into every page to track scroll depth and extract page metadata.
 */

(() => {
  'use strict';

  let maxScrollDepth = 0;

  /**
   * Calculate current scroll depth as a percentage (0–100).
   */
  function getCurrentScrollDepth() {
    try {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      const scrollHeight = document.documentElement.scrollHeight || 1;
      const clientHeight = document.documentElement.clientHeight || 1;
      const maxScroll = scrollHeight - clientHeight;
      if (maxScroll <= 0) return 100; // Page fits in viewport
      return Math.min(100, Math.round((scrollTop / maxScroll) * 100));
    } catch (error) {
      console.error('DeadTab: scroll depth calc error', error);
      return 0;
    }
  }

  /**
   * Update max scroll depth on scroll.
   */
  function onScroll() {
    try {
      const current = getCurrentScrollDepth();
      if (current > maxScrollDepth) {
        maxScrollDepth = current;
      }
    } catch (error) {
      console.error('DeadTab: scroll handler error', error);
    }
  }

  // Track scroll events (throttled via passive listener)
  window.addEventListener('scroll', onScroll, { passive: true });

  // Also capture initial state
  setTimeout(() => onScroll(), 500);

  /**
   * Get the page's meta description.
   */
  function getMetaDescription() {
    try {
      const meta =
        document.querySelector('meta[name="description"]') ||
        document.querySelector('meta[property="og:description"]');
      return meta ? meta.getAttribute('content') || '' : '';
    } catch (error) {
      return '';
    }
  }

  /**
   * Get the first 500 characters of the body text.
   */
  function getBodyPreview() {
    try {
      const text = (document.body && document.body.innerText) || '';
      return text.slice(0, 500).replace(/\s+/g, ' ').trim();
    } catch (error) {
      return '';
    }
  }

  /**
   * Inject Shadow DOM Popup
   */
  function showArchivePrompt(count, oldestTabId) {
    if (document.getElementById('__dtc_archive_prompt')) return;

    const container = document.createElement('div');
    container.id = '__dtc_archive_prompt';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '2147483647';
    
    const shadow = container.attachShadow({ mode: 'closed' });
    
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; font-family: system-ui, -apple-system, sans-serif; }
      @keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } }
      .dtc-popup {
        background: rgba(17, 24, 39, 0.95); backdrop-filter: blur(12px);
        border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 16px;
        padding: 20px; width: 320px; color: #fff;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(139, 92, 246, 0.2);
        animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .dtc-popup.closing { animation: slideOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .dtc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-weight: 700; font-size: 16px; }
      .dtc-icon { font-size: 20px; }
      .dtc-desc { color: #94a3b8; font-size: 13px; margin-bottom: 16px; line-height: 1.4; }
      .dtc-btn { display: block; width: 100%; padding: 10px; margin-bottom: 8px; border-radius: 8px; border: none; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s ease; }
      .dtc-btn:last-child { margin-bottom: 0; }
      .btn-primary { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: white; }
      .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
      .btn-secondary { background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(71, 85, 105, 0.5); color: #cbd5e1; }
      .btn-secondary:hover { background: rgba(51, 65, 85, 0.8); color: white; }
    `;

    const popup = document.createElement('div');
    popup.className = 'dtc-popup';
    
    popup.innerHTML = `
      <div class="dtc-header">
        <span class="dtc-icon">🧹</span>
        <span>DeadTab Cleaner</span>
      </div>
      <div class="dtc-desc">
        You have <strong>${count}</strong> inactive tab${count > 1 ? 's' : ''} waiting to be archived. What would you like to do?
      </div>
      <button id="btn-all" class="dtc-btn btn-primary">Archive All Inactive (${count})</button>
      <button id="btn-oldest" class="dtc-btn btn-secondary">Close Oldest Tab</button>
      <button id="btn-snooze" class="dtc-btn btn-secondary">Snooze for 5 Mins</button>
    `;

    shadow.appendChild(style);
    shadow.appendChild(popup);
    document.body.appendChild(container);

    const closePopup = () => {
      popup.classList.add('closing');
      setTimeout(() => container.remove(), 300);
    };

    shadow.getElementById('btn-all').onclick = () => {
      chrome.runtime.sendMessage({ type: 'triggerArchiveAll' });
      closePopup();
    };

    shadow.getElementById('btn-oldest').onclick = () => {
      chrome.runtime.sendMessage({ type: 'triggerArchiveOldest', tabId: oldestTabId });
      closePopup();
    };

    shadow.getElementById('btn-snooze').onclick = () => {
      chrome.runtime.sendMessage({ type: 'snoozeArchive' });
      closePopup();
    };
  }

  /**
   * Listen for messages from the background script.
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      if (message.type === 'getPageData') {
        sendResponse({
          scrollDepth: maxScrollDepth,
          metaDescription: getMetaDescription(),
          bodyPreview: getBodyPreview(),
        });
      } else if (message.type === 'showArchivePrompt') {
        showArchivePrompt(message.count, message.oldestTabId);
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error('DeadTab: message handler error', error);
      sendResponse({ scrollDepth: 0, metaDescription: '', bodyPreview: '' });
    }
    return true; // Keep the message channel open for async response
  });
})();
