import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { fetchSettings, updateSettings } from '../lib/api';

export default function Settings() {
  const { apiKey, userEmail } = useAuthStore();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
  });

  const [inactivityValue, setInactivityValue] = useState<number>(3);
  const [inactivityUnit, setInactivityUnit] = useState<string>('days');
  const [whitelist, setWhitelist] = useState('');
  const [notifications, setNotifications] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Sync state when data loads
  useEffect(() => {
    if (settings) {
      let minutes = settings.inactivityThresholdMinutes || 4320;
      if (minutes % (24 * 60) === 0) {
        setInactivityValue(minutes / (24 * 60));
        setInactivityUnit('days');
      } else if (minutes % 60 === 0) {
        setInactivityValue(minutes / 60);
        setInactivityUnit('hours');
      } else {
        setInactivityValue(minutes);
        setInactivityUnit('minutes');
      }
      
      setWhitelist(settings.whitelistDomains?.join('\n') || '');
      setNotifications(settings.notificationsEnabled || false);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toast.success('Settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    let totalMinutes = inactivityValue;
    if (inactivityUnit === 'days') totalMinutes *= 24 * 60;
    if (inactivityUnit === 'hours') totalMinutes *= 60;

    const domains = whitelist.split('\n').map(d => d.trim()).filter(Boolean);

    updateMutation.mutate({
      inactivityThresholdMinutes: totalMinutes,
      whitelistDomains: domains,
      notificationsEnabled: notifications,
    });
  };

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const { deleteAllArchives } = await import('../lib/api');
      return deleteAllArchives();
    },
    onSuccess: () => {
      toast.success('All archives permanently deleted');
      setDeleteConfirm('');
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      queryClient.invalidateQueries({ queryKey: ['habitScore'] });
    },
    onError: () => {
      toast.error('Failed to delete archives');
    }
  });

  const handleDeleteAll = () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }
    deleteAllMutation.mutate();
  };

  const maskApiKey = (key: string | null) => {
    if (!key) return '';
    return '•'.repeat(20) + key.slice(-8);
  };

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success('API Key copied to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure extension preferences and manage your account.</p>
      </header>

      {/* Account Info */}
      <div className="glass-card overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-200/50 bg-white/40">
          <h2 className="text-lg font-bold text-white">Account Details</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Email</label>
            <div className="text-slate-800">{userEmail || 'Unknown'}</div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">API Key</label>
            <div className="flex gap-2 items-center">
              <code className="bg-transparent px-3 py-2 rounded text-slate-700 font-mono text-sm border border-slate-300">
                {maskApiKey(apiKey)}
              </code>
              <button 
                onClick={copyApiKey}
                className="btn-secondary px-3 py-1.5 text-xs min-h-[36px]"
              >
                Copy Full Key
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Paste this into the extension popup if you log out.</p>
          </div>
        </div>
      </div>

      {/* Extension Preferences */}
      <div className="glass-card overflow-hidden mb-6">
        <form onSubmit={handleSave}>
          <div className="p-6 border-b border-slate-200/50 bg-white/40">
            <h2 className="text-lg font-bold text-white">Extension Preferences</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Inactivity Threshold
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  value={inactivityValue}
                  onChange={(e) => setInactivityValue(Number(e.target.value))}
                  className="glass-input max-w-[100px]"
                />
                <select
                  value={inactivityUnit}
                  onChange={(e) => setInactivityUnit(e.target.value)}
                  className="glass-input max-w-[150px] appearance-none"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
              <p className="text-xs text-slate-400 mt-1">Tabs untouched for this duration will be automatically flagged as dead and archived.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Whitelist Domains
              </label>
              <textarea
                value={whitelist}
                onChange={(e) => setWhitelist(e.target.value)}
                rows={4}
                className="glass-input"
                placeholder="github.com&#10;youtube.com"
              />
              <p className="text-xs text-slate-400 mt-1">One domain per line. These domains will never be archived.</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="notifs"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="w-4 h-4 rounded bg-white/80 border-slate-200 text-purple-accent focus:ring-purple-accent"
              />
              <label htmlFor="notifs" className="text-sm font-medium text-slate-700">
                Enable desktop notifications when tabs are archived
              </label>
            </div>
          </div>
          <div className="p-4 bg-transparent/50 border-t border-slate-200/50 flex justify-end">
            <button type="submit" className="btn-primary min-h-[44px]" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="glass-card overflow-hidden border-red-900/30">
        <div className="p-6 border-b border-red-900/30 bg-red-950/20">
          <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-400 mb-4">
            Permanently delete all your tracked archives and AI notes. This drops your Habit Score history to zero.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Type DELETE to confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="glass-input sm:max-w-xs border-red-900/50 focus:border-red-500 focus:ring-red-500"
            />
            <button 
              onClick={handleDeleteAll}
              disabled={deleteConfirm !== 'DELETE' || deleteAllMutation.isPending}
              className="btn-danger w-full sm:w-auto min-h-[44px]"
            >
              {deleteAllMutation.isPending ? 'Deleting...' : 'Delete All Archives'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
