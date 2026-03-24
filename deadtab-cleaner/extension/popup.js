/**
 * DeadTab Cleaner – Popup Script
 * Renders live tab counts, dead-tab candidates, and settings.
 */

(async () => {
  'use strict';

  /* ─── DOM References ─── */
  const totalTabsEl = document.getElementById('totalTabs');
  const deadTabsEl = document.getElementById('deadTabs');
  const archiveAllBtn = document.getElementById('archiveAllBtn');
  const scanNowBtn = document.getElementById('scanNowBtn');
  const candidatesList = document.getElementById('candidatesList');
  const emptyState = document.getElementById('emptyState');
  const thresholdInput = document.getElementById('thresholdInput');
  const backendUrlInput = document.getElementById('backendUrlInput');
  const settingsSaved = document.getElementById('settingsSaved');
  const statusText = document.getElementById('statusText');

  /* ─── Load Data ─── */

  async function loadData() {
    try {
      // Total open tabs
      const tabs = await chrome.tabs.query({});
      totalTabsEl.textContent = tabs.length;

      // Dead tab candidates
      const result = await chrome.storage.local.get('deadTabCandidates');
      const candidates = result.deadTabCandidates || [];
      deadTabsEl.textContent = candidates.length;

      // Enable/disable archive-all button
      archiveAllBtn.disabled = candidates.length === 0;

      // Render candidate list (up to 5)
      renderCandidates(candidates.slice(0, 5));

      // Load settings
      const settingsResult = await chrome.storage.local.get('settings');
      const settings = settingsResult.settings || {};
      thresholdInput.value = settings.thresholdDays || 3;
      backendUrlInput.value = settings.backendUrl || 'http://localhost:3000';

      setStatus('Ready');
    } catch (error) {
      console.error('DeadTab popup: loadData error', error);
      setStatus('Error loading data');
    }
  }

  /* ─── Render Candidates ─── */

  function renderCandidates(candidates) {
    // Clear existing items (keep empty state)
    const existingItems = candidatesList.querySelectorAll('.candidate-item');
    existingItems.forEach((item) => item.remove());

    if (candidates.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    candidates.forEach((candidate, index) => {
      const item = document.createElement('div');
      item.className = 'candidate-item';
      item.style.animationDelay = `${index * 0.05}s`;

      const favicon = document.createElement('img');
      favicon.className = 'candidate-favicon';
      favicon.src = candidate.favIconUrl || 'icons/icon16.png';
      favicon.alt = '';
      favicon.onerror = () => {
        favicon.src = 'icons/icon16.png';
      };

      const info = document.createElement('div');
      info.className = 'candidate-info';

      const title = document.createElement('div');
      title.className = 'candidate-title';
      title.textContent = truncateTitle(candidate.title, 40);
      title.title = candidate.title;

      const meta = document.createElement('div');
      meta.className = 'candidate-meta';
      meta.textContent = formatTimeAgo(candidate.lastActive);

      info.appendChild(title);
      info.appendChild(meta);

      const archiveBtn = document.createElement('button');
      archiveBtn.className = 'candidate-archive-btn';
      archiveBtn.textContent = 'Archive';
      archiveBtn.addEventListener('click', () => handleArchiveTab(candidate.tabId, item));

      item.appendChild(favicon);
      item.appendChild(info);
      item.appendChild(archiveBtn);
      candidatesList.appendChild(item);
    });
  }

  /* ─── Archive Handlers ─── */

  async function handleArchiveTab(tabId, itemEl) {
    try {
      setStatus('Archiving…');
      if (itemEl) {
        itemEl.style.opacity = '0.5';
        itemEl.style.pointerEvents = 'none';
      }

      const response = await chrome.runtime.sendMessage({
        type: 'archiveTab',
        tabId: tabId,
      });

      if (response && response.success) {
        if (itemEl) {
          itemEl.style.transition = 'all 0.3s ease';
          itemEl.style.maxHeight = '0';
          itemEl.style.opacity = '0';
          itemEl.style.padding = '0';
          itemEl.style.margin = '0';
          setTimeout(() => itemEl.remove(), 300);
        }
        setStatus('Tab archived ✓');
      } else {
        setStatus(response?.error || 'Archive failed');
        if (itemEl) {
          itemEl.style.opacity = '1';
          itemEl.style.pointerEvents = 'auto';
        }
      }

      // Refresh counts
      setTimeout(loadData, 500);
    } catch (error) {
      console.error('DeadTab popup: archive error', error);
      setStatus('Archive failed');
      if (itemEl) {
        itemEl.style.opacity = '1';
        itemEl.style.pointerEvents = 'auto';
      }
    }
  }

  async function handleArchiveAll() {
    try {
      setStatus('Archiving all…');
      archiveAllBtn.disabled = true;

      const response = await chrome.runtime.sendMessage({ type: 'archiveAllDead' });

      const total = response ? response.length : 0;
      const succeeded = response ? response.filter((r) => r.success).length : 0;

      setStatus(`Archived ${succeeded}/${total} tabs`);
      setTimeout(loadData, 500);
    } catch (error) {
      console.error('DeadTab popup: archive all error', error);
      setStatus('Archive all failed');
      archiveAllBtn.disabled = false;
    }
  }

  /* ─── Scan Now ─── */

  async function handleScanNow() {
    try {
      setStatus('Scanning…');
      scanNowBtn.disabled = true;

      await chrome.runtime.sendMessage({ type: 'triggerScan' });

      setStatus('Scan complete');
      setTimeout(() => {
        scanNowBtn.disabled = false;
        loadData();
      }, 500);
    } catch (error) {
      console.error('DeadTab popup: scan error', error);
      setStatus('Scan failed');
      scanNowBtn.disabled = false;
    }
  }

  /* ─── Settings ─── */

  let saveTimeout = null;

  function saveSettings() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        const threshold = Math.max(1, parseInt(thresholdInput.value, 10) || 3);
        const backendUrl = backendUrlInput.value.trim() || 'http://localhost:3000';

        thresholdInput.value = threshold;

        const result = await chrome.storage.local.get('settings');
        const settings = result.settings || {};
        settings.thresholdDays = threshold;
        settings.backendUrl = backendUrl;

        await chrome.storage.local.set({ settings });

        // Flash "Saved" indicator
        settingsSaved.classList.add('visible');
        setTimeout(() => settingsSaved.classList.remove('visible'), 1500);
      } catch (error) {
        console.error('DeadTab popup: save settings error', error);
      }
    }, 400);
  }

  /* ─── Status ─── */

  function setStatus(text) {
    statusText.textContent = text;
  }

  /* ─── Event Listeners ─── */

  archiveAllBtn.addEventListener('click', handleArchiveAll);
  scanNowBtn.addEventListener('click', handleScanNow);
  thresholdInput.addEventListener('input', saveSettings);
  backendUrlInput.addEventListener('input', saveSettings);

  /* ─── Init ─── */

  await loadData();
})();
