import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function Settings() {
  const { apiKey, userEmail } = useAuthStore();
  
  // Local state for basic form demo (real implementation would fetch from API)
  const [inactivityThreshold, setInactivityThreshold] = useState(3);
  const [whitelist, setWhitelist] = useState('localhost\ngithub.com\nfigma.com');
  const [notifications, setNotifications] = useState(false);
  
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Settings saved successfully');
    }, 600);
  };

  const handleDeleteAll = () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }
    toast.success('All archives deleted (mock)');
    setDeleteConfirm('');
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure extension preferences and manage your account.</p>
      </header>

      {/* Account Info */}
      <div className="glass-card overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-700/50 bg-navy-900/40">
          <h2 className="text-lg font-bold text-white">Account Details</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Email</label>
            <div className="text-slate-200">{userEmail || 'Unknown'}</div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">API Key</label>
            <div className="flex gap-2 items-center">
              <code className="bg-navy-950 px-3 py-2 rounded text-slate-300 font-mono text-sm border border-slate-800">
                {maskApiKey(apiKey)}
              </code>
              <button 
                onClick={copyApiKey}
                className="btn-secondary px-3 py-1.5 text-xs min-h-[36px]"
              >
                Copy Full Key
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Paste this into the extension popup if you log out.</p>
          </div>
        </div>
      </div>

      {/* Extension Preferences */}
      <div className="glass-card overflow-hidden mb-6">
        <form onSubmit={handleSave}>
          <div className="p-6 border-b border-slate-700/50 bg-navy-900/40">
            <h2 className="text-lg font-bold text-white">Extension Preferences</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Inactivity Threshold (Days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={inactivityThreshold}
                onChange={(e) => setInactivityThreshold(Number(e.target.value))}
                className="glass-input max-w-[150px]"
              />
              <p className="text-xs text-slate-500 mt-1">Tabs untouched for this many days will be flagged as dead.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Whitelist Domains
              </label>
              <textarea
                value={whitelist}
                onChange={(e) => setWhitelist(e.target.value)}
                rows={4}
                className="glass-input"
                placeholder="github.com&#10;youtube.com"
              />
              <p className="text-xs text-slate-500 mt-1">One domain per line. These domains will never be archived.</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="notifs"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="w-4 h-4 rounded bg-navy-900 border-slate-700 text-purple-accent focus:ring-purple-accent"
              />
              <label htmlFor="notifs" className="text-sm font-medium text-slate-300">
                Enable desktop notifications when tabs are archived
              </label>
            </div>
          </div>
          <div className="p-4 bg-navy-950/50 border-t border-slate-700/50 flex justify-end">
            <button type="submit" className="btn-primary min-h-[44px]" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Settings'}
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
              disabled={deleteConfirm !== 'DELETE'}
              className="btn-danger w-full sm:w-auto min-h-[44px]"
            >
              Delete All Archives
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
