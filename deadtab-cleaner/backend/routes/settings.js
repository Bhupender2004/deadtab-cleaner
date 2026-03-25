/**
 * Settings Routes – GET and PUT /api/settings
 */
const express = require('express');
const router = express.Router();
const supabase = require('../db/supabaseClient');
const authMiddleware = require('../middleware/auth');

/**
 * GET /api/settings – Retrieve user settings
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, maybe create defaults?
        const defaultSettings = {
          id: 'default',
          inactivityThresholdMinutes: 4320,
          whitelistDomains: [],
          notificationsEnabled: false
        };
        return res.json(defaultSettings);
      }
      throw error;
    }

    res.json({
      id: settings.id,
      inactivityThresholdMinutes: settings.inactivity_threshold_minutes,
      whitelistDomains: settings.whitelist_domains,
      notificationsEnabled: settings.notifications_enabled
    });
  } catch (error) {
    console.error('GET /api/settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/settings – Update user settings
 */
router.put('/', authMiddleware, async (req, res) => {
  try {
    const updates = req.body;
    
    // Map frontend fields (camelCase) to backend columns (snake_case)
    const dbUpdates = {};
    if (updates.inactivityThresholdMinutes !== undefined) {
      dbUpdates.inactivity_threshold_minutes = updates.inactivityThresholdMinutes;
      // Sync the old column just in case something still uses it
      dbUpdates.inactivity_threshold_days = Math.max(1, Math.round(updates.inactivityThresholdMinutes / (24 * 60)));
    }
    if (updates.whitelistDomains !== undefined) {
      dbUpdates.whitelist_domains = updates.whitelistDomains;
    }
    if (updates.notificationsEnabled !== undefined) {
      dbUpdates.notifications_enabled = updates.notificationsEnabled;
    }

    const { data: settings, error } = await supabase
      .from('settings')
      .update(dbUpdates)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({
      id: settings.id,
      inactivityThresholdMinutes: settings.inactivity_threshold_minutes,
      whitelistDomains: settings.whitelist_domains,
      notificationsEnabled: settings.notifications_enabled
    });
  } catch (error) {
    console.error('PUT /api/settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
