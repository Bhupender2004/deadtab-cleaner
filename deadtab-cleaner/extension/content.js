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
      }
    } catch (error) {
      console.error('DeadTab: message handler error', error);
      sendResponse({ scrollDepth: 0, metaDescription: '', bodyPreview: '' });
    }
    return true; // Keep the message channel open for async response
  });
})();
