/**
 * DeadTab Cleaner – Background Service Worker
 * Tracks tab activity, detects dead tabs, and handles archiving.
 */

const ALARM_NAME = 'deadTabScan';
const DEFAULT_THRESHOLD_DAYS = 3;
const DEFAULT_BACKEND_URL = 'http://localhost:3000';

/* ─────────────────────── Helpers ─────────────────────── */

async function getSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    let localSettings = {
      thresholdMinutes: 4320, // default 3 days
      backendUrl: DEFAULT_BACKEND_URL,
      apiKey: '',
      whitelist: [],
      lastSync: 0,
      ...result.settings,
    };

    // Attempt to sync from backend if API key is present, but limit to once every 1 minute
    const now = Date.now();
    if (localSettings.backendUrl && !localSettings.backendUrl.startsWith('http://') && !localSettings.backendUrl.startsWith('https://')) {
      localSettings.backendUrl = 'http://' + localSettings.backendUrl;
    }

    console.log(`DeadTab Sync: Checking if we can sync... API Key exists: ${!!localSettings.apiKey}, Time since last sync: ${Math.round((now - localSettings.lastSync)/1000)}s`);
    if (localSettings.apiKey && localSettings.backendUrl && (now - localSettings.lastSync > 60000)) {
      console.log(`DeadTab Sync: Requesting settings from ${localSettings.backendUrl}/api/settings`);
      try {
        const response = await fetch(`${localSettings.backendUrl}/api/settings`, {
          headers: { 'Authorization': `Bearer ${localSettings.apiKey}` }
        });
        if (response.ok) {
          const apiSettings = await response.json();
          console.log(`DeadTab Sync Success: Received threshold => ${apiSettings.inactivityThresholdMinutes} mins`);
          localSettings.thresholdMinutes = apiSettings.inactivityThresholdMinutes || localSettings.thresholdMinutes;
          localSettings.whitelist = apiSettings.whitelistDomains || localSettings.whitelist;
          localSettings.lastSync = now;
          // Save it back
          await chrome.storage.local.set({ settings: localSettings });
        } else {
          console.warn(`DeadTab Sync Failed: HTTP ${response.status} ${response.statusText}`);
          localSettings.lastSync = now; // Prevent spamming on failed auth
          await chrome.storage.local.set({ settings: localSettings });
        }
      } catch (e) {
        console.warn('DeadTab: Cloud sync failed, network error. ', e);
      }
    }

    return localSettings;
  } catch (error) {
    console.error('DeadTab: getSettings error', error);
    return {
      thresholdMinutes: 4320,
      backendUrl: DEFAULT_BACKEND_URL,
      apiKey: '',
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
    const thresholdMs = settings.thresholdMinutes * 60 * 1000;
    const now = Date.now();

    const tabs = await chrome.tabs.query({});
    const candidates = [];

    for (const tab of tabs) {
      if (tab.active) {
        // Skip the tab the user is currently looking at
        continue;
      }
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        continue;
      }

      if (settings.whitelist && settings.whitelist.length > 0) {
        try {
          const hostname = new URL(tab.url).hostname.toLowerCase();
          const isWL = settings.whitelist.some((d) => {
            const domain = d.toLowerCase().trim();
            return hostname === domain || hostname.endsWith('.' + domain);
          });
          if (isWL) continue;
        } catch (_) {}
      }

      const key = `tab_${tab.id}`;
      const data = await chrome.storage.local.get(key);
      const entry = data[key] || {};
      const lastActive = entry.lastActive || now;
      const inactiveForMs = now - lastActive;

      console.log(`DeadTab Check: Tab ${tab.id} offline for ${Math.round(inactiveForMs/1000)}s. Req: ${Math.round(thresholdMs/1000)}s`);

      if (inactiveForMs > thresholdMs) {
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
    console.log(`DeadTab: scan complete – ${candidates.length} dead tab(s) found out of ${tabs.length} tabs`);
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
      if (!settings.apiKey) {
        return { success: false, error: 'Missing API Key setting' };
      }

      const response = await fetch(`${settings.backendUrl}/api/archive`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
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

    if (message.type === 'triggerArchiveAll') {
      archiveAllDead().then(sendResponse);
      return true;
    }

    if (message.type === 'triggerArchiveOldest') {
      archiveTab(message.tabId).then(sendResponse);
      return true;
    }

    if (message.type === 'snoozeArchive') {
      const snoozeUntil = Date.now() + 5 * 60 * 1000;
      chrome.storage.local.set({ snoozeUntil }).then(() => sendResponse({ success: true }));
      console.log('DeadTab: Snoozed alarm for 5 minutes');
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

    // Create the background alarm (checks every minute)
    await chrome.alarms.create(ALARM_NAME, {
      periodInMinutes: 1,
    });
    console.log('DeadTab: 1-minute scan alarm created');

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
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('DeadTab: alarm triggered');

    const storage = await chrome.storage.local.get('snoozeUntil');
    if (storage.snoozeUntil && Date.now() < storage.snoozeUntil) {
      console.log('DeadTab: snoozed, skipping alarm check');
      return;
    }

    await scanForDeadTabs();
    
    // Prompt the user if there are dead tabs
    const result = await chrome.storage.local.get('deadTabCandidates');
    if (result.deadTabCandidates && result.deadTabCandidates.length > 0) {
      console.log(`DeadTab: Prompting user for ${result.deadTabCandidates.length} tabs...`);
      
      const oldestTab = [...result.deadTabCandidates].sort((a, b) => a.lastActive - b.lastActive)[0];

      // Identify currently active tab to inject the prompt
      const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTabs.length > 0) {
        chrome.tabs.sendMessage(activeTabs[0].id, { 
          type: 'showArchivePrompt', 
          count: result.deadTabCandidates.length,
          oldestTabId: oldestTab.tabId 
        }).catch(() => {
          console.warn('DeadTab: could not display prompt on active tab (likely blocked by Chrome permissions)');
        });
      }
    }
  }
});
