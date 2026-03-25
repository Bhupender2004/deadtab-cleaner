import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { createUser, fetchUserMe } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { apiKey, setAuth } = useAuthStore();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (apiKey) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const user = await createUser(email);
      setAuth(user.apiKey, user.email);
      toast.success('Account created! API Key saved.');
      navigate('/dashboard');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to create account';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = apiKeyInput.trim();
    if (!key.startsWith('dtc_')) {
      toast.error('Invalid API Key format');
      return;
    }
    
    setIsLoading(true);
    try {
      const user = await fetchUserMe(key);
      setAuth(key, user.email);
      toast.success('Logged in successfully');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error('Invalid API Key');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-accent/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="glass-card w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🧹</div>
          <h1 className="text-2xl font-bold text-white mb-2">DeadTab Cleaner</h1>
          <p className="text-slate-400 text-sm">Track & archive inactive browser tabs with AI-powered context saving.</p>
        </div>

        <form onSubmit={handleCreateUser} className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="email">
              Create New Account
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="glass-input"
              required
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary w-full min-h-[44px]"
            disabled={isLoading || !email}
          >
            {isLoading ? 'Creating...' : 'Get My API Key'}
          </button>
        </form>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-700/50" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#1a233a] px-2 text-slate-500 rounded-lg">Or use existing</span>
          </div>
        </div>

        <form onSubmit={handleLoginExisting} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5" htmlFor="apiKey">
              Paste API Key
            </label>
            <input
              id="apiKey"
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="dtc_..."
              className="glass-input font-mono text-sm"
              required
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit" 
            className="btn-secondary w-full min-h-[44px]"
            disabled={isLoading || !apiKeyInput}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
