/**
 * DeadTab Cleaner – Background Service Worker
 * Tracks tab activity, detects dead tabs, and handles archiving.
 */

const ALARM_NAME = 'deadTabScan';
const DEFAULT_THRESHOLD_DAYS = 3;
const DEFAULT_BACKEND_URL = 'http://localhost:3000';

/* ─────────────────────── Helpers ─────────────────────── */

/**
 * Read settings from storage with defaults.
 */
async function getSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    return {
      thresholdDays: DEFAULT_THRESHOLD_DAYS,
      backendUrl: DEFAULT_BACKEND_URL,
      whitelist: [],
      ...result.settings,
    };
  } catch (error) {
    console.error('DeadTab: getSettings error', error);
    return {
      thresholdDays: DEFAULT_THRESHOLD_DAYS,
      backendUrl: DEFAULT_BACKEND_URL,
      whitelist: [],
    };
  }
}

/**
 * Record the last-active timestamp for a tab.
 */
async function recordTabActivity(tabId) {
  try {
    const key = `tab_${tabId}`;
    const data = await chrome.storage.local.get(key);
    const entry = data[key] || {};
    entry.lastActive = Date.now();
    await chrome.storage.local.set({ [key]: entry });
    console.log(`DeadTab: recorded activity for tab ${tabId}`);
  } catch (error) {
    console.error('DeadTab: recordTabActivity error', error);
  }
}

/**
 * Remove stored data for a tab.
 */
async function removeTabData(tabId) {
  try {
    await chrome.storage.local.remove(`tab_${tabId}`);
    console.log(`DeadTab: removed data for tab ${tabId}`);
  } catch (error) {
    console.error('DeadTab: removeTabData error', error);
  }
}

/* ─────────────────── Tab Event Listeners ──────────────── */

chrome.tabs.onCreated.addListener((tab) => {
  console.log(`DeadTab: tab created – ${tab.id}`);
  recordTabActivity(tab.id);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log(`DeadTab: tab activated – ${activeInfo.tabId}`);
  recordTabActivity(activeInfo.tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  console.log(`DeadTab: tab removed – ${tabId}`);
  removeTabData(tabId);
  // Also remove from dead-tab candidates
  removeFromCandidates(tabId);
});

/**
 * Remove a tab from the dead-tab candidates list.
 */
async function removeFromCandidates(tabId) {
  try {
    const result = await chrome.storage.local.get('deadTabCandidates');
    let candidates = result.deadTabCandidates || [];
    candidates = candidates.filter((c) => c.tabId !== tabId);
    await chrome.storage.local.set({ deadTabCandidates: candidates });
  } catch (error) {
    console.error('DeadTab: removeFromCandidates error', error);
  }
}

/* ─────────────────── Dead Tab Scanner ─────────────────── */

/**
 * Scan all open tabs and flag inactive ones as dead-tab candidates.
 */
async function scanForDeadTabs() {
  try {
    console.log('DeadTab: scanning for dead tabs…');
    const settings = await getSettings();
    const thresholdMs = settings.thresholdDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const tabs = await chrome.tabs.query({});
    const candidates = [];

    for (const tab of tabs) {
      // Skip chrome:// and extension pages
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        continue;
      }

      // Skip whitelisted domains
      if (settings.whitelist && settings.whitelist.length > 0) {
        try {
          const hostname = new URL(tab.url).hostname.toLowerCase();
          const isWL = settings.whitelist.some((d) => {
            const domain = d.toLowerCase().trim();
            return hostname === domain || hostname.endsWith('.' + domain);
          });
          if (isWL) continue;
        } catch (_) {
          // Invalid URL, skip whitelist check
        }
      }

      const key = `tab_${tab.id}`;
      const data = await chrome.storage.local.get(key);
      const entry = data[key] || {};
      const lastActive = entry.lastActive || now; // Treat unknown tabs as just-active

      if (now - lastActive > thresholdMs) {
        candidates.push({
          tabId: tab.id,
          title: tab.title || 'Untitled',
          url: tab.url,
          favIconUrl: tab.favIconUrl || '',
          lastActive: lastActive,
        });
      }
    }

    await chrome.storage.local.set({ deadTabCandidates: candidates });
    console.log(`DeadTab: scan complete – ${candidates.length} dead tab(s) found`);
  } catch (error) {
    console.error('DeadTab: scanForDeadTabs error', error);
  }
}

/* ─────────────────── Archive Functions ─────────────────── */

/**
 * Archive a single tab: POST data to the backend, close tab on success.
 * On failure, save to pendingArchives for retry.
 */
async function archiveTab(tabId) {
  try {
    const settings = await getSettings();

    // Get tab details
    let tab;
    try {
      tab = await chrome.tabs.get(tabId);
    } catch (_) {
      console.warn(`DeadTab: tab ${tabId} no longer exists`);
      await removeFromCandidates(tabId);
      return { success: false, error: 'Tab no longer exists' };
    }

    // Try to get page data from content script
    let pageData = { scrollDepth: 0, metaDescription: '', bodyPreview: '' };
    try {
      pageData = await chrome.tabs.sendMessage(tabId, { type: 'getPageData' });
    } catch (_) {
      // Content script may not be available (e.g. chrome:// pages)
      console.warn(`DeadTab: could not get page data for tab ${tabId}`);
    }

    const payload = {
      tabId: tab.id,
      title: tab.title || 'Untitled',
      url: tab.url,
      favIconUrl: tab.favIconUrl || '',
      archivedAt: new Date().toISOString(),
      scrollDepth: pageData.scrollDepth || 0,
      metaDescription: pageData.metaDescription || '',
      bodyPreview: pageData.bodyPreview || '',
    };

    // POST to backend
    try {
      const response = await fetch(`${settings.backendUrl}/api/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Close the tab on success
      await chrome.tabs.remove(tabId);
      await removeFromCandidates(tabId);
      await removeTabData(tabId);
      console.log(`DeadTab: archived and closed tab ${tabId}`);
      return { success: true };
    } catch (fetchError) {
      // Backend unreachable – save to pendingArchives
      console.error('DeadTab: backend unreachable, saving to pendingArchives', fetchError);
      await savePendingArchive(payload);
      return { success: false, error: 'Backend unreachable. Saved for retry.' };
    }
  } catch (error) {
    console.error('DeadTab: archiveTab error', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save a failed archive attempt for later retry.
 */
async function savePendingArchive(payload) {
  try {
    const result = await chrome.storage.local.get('pendingArchives');
    const pending = result.pendingArchives || [];
    pending.push({
      ...payload,
      failedAt: new Date().toISOString(),
    });
    await chrome.storage.local.set({ pendingArchives: pending });
    console.log('DeadTab: saved pending archive for retry');
  } catch (error) {
    console.error('DeadTab: savePendingArchive error', error);
  }
}

/**
 * Archive all dead-tab candidates.
 */
async function archiveAllDead() {
  try {
    const result = await chrome.storage.local.get('deadTabCandidates');
    const candidates = result.deadTabCandidates || [];
    const results = [];

    for (const candidate of candidates) {
      const res = await archiveTab(candidate.tabId);
      results.push({ tabId: candidate.tabId, ...res });
    }

    console.log('DeadTab: archiveAllDead complete', results);
    return results;
  } catch (error) {
    console.error('DeadTab: archiveAllDead error', error);
    return [];
  }
}

/* ──────────────────── Message Handlers ─────────────────── */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.type === 'archiveTab') {
      archiveTab(message.tabId).then(sendResponse);
      return true; // async response
    }

    if (message.type === 'archiveAllDead') {
      archiveAllDead().then(sendResponse);
      return true; // async response
    }

    if (message.type === 'triggerScan') {
      scanForDeadTabs().then(() => sendResponse({ success: true }));
      return true;
    }
  } catch (error) {
    console.error('DeadTab: message handler error', error);
    sendResponse({ success: false, error: error.message });
  }
});

/* ────────────────── Install & Alarm Setup ──────────────── */

chrome.runtime.onInstalled.addListener(async () => {
  try {
    console.log('DeadTab: extension installed');

    // Set default settings if not already set
    const result = await chrome.storage.local.get('settings');
    if (!result.settings) {
      await chrome.storage.local.set({
        settings: {
          thresholdDays: DEFAULT_THRESHOLD_DAYS,
          backendUrl: DEFAULT_BACKEND_URL,
          whitelist: [],
        },
      });
    }

    // Initialize dead-tab candidates
    const candidatesResult = await chrome.storage.local.get('deadTabCandidates');
    if (!candidatesResult.deadTabCandidates) {
      await chrome.storage.local.set({ deadTabCandidates: [] });
    }

    // Create the hourly alarm
    await chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: 60,
    });
    console.log('DeadTab: hourly scan alarm created');

    // Record activity for all currently open tabs
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      await recordTabActivity(tab.id);
    }
  } catch (error) {
    console.error('DeadTab: onInstalled error', error);
  }
});

// Handle alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('DeadTab: hourly alarm triggered');
    scanForDeadTabs();
  }
});
