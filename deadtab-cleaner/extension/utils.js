/**
 * DeadTab Cleaner – Utility Functions
 */

/**
 * Convert a timestamp to a human-readable relative time string.
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Human-readable string like "2 hours ago"
 */
function formatTimeAgo(timestamp) {
  try {
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 0) return 'just now';

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  } catch (error) {
    console.error('formatTimeAgo error:', error);
    return 'unknown';
  }
}

/**
 * Truncate a string to a maximum length, appending ellipsis if truncated.
 * @param {string} str - The input string
 * @param {number} maxLen - Maximum allowed length (default 60)
 * @returns {string} Truncated string with ellipsis if needed
 */
function truncateTitle(str, maxLen = 60) {
  try {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1).trimEnd() + '…';
  } catch (error) {
    console.error('truncateTitle error:', error);
    return str || '';
  }
}

/**
 * Check if a URL's domain is in a whitelist.
 * @param {string} url - The URL to check
 * @param {string[]} whitelist - Array of whitelisted domain strings
 * @returns {boolean} True if the URL's domain matches any whitelisted domain
 */
function isWhitelisted(url, whitelist) {
  try {
    if (!url || !whitelist || !Array.isArray(whitelist) || whitelist.length === 0) {
      return false;
    }
    const hostname = new URL(url).hostname.toLowerCase();
    return whitelist.some((domain) => {
      const d = domain.toLowerCase().trim();
      return hostname === d || hostname.endsWith('.' + d);
    });
  } catch (error) {
    console.error('isWhitelisted error:', error);
    return false;
  }
}
