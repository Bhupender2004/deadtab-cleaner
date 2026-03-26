import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  currentScore?: number;
}

export default function Sidebar({ currentScore = 0 }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  const handleSignOut = () => {
    clearAuth();
    navigate('/login');
  };

  const closeMenu = () => setIsOpen(false);

  // Score color logic
  let scoreColor = 'bg-slate-700 text-slate-300';
  if (currentScore >= 70) scoreColor = 'bg-emerald-500 text-white';
  else if (currentScore >= 40) scoreColor = 'bg-amber-500 text-white';
  else if (currentScore > 0) scoreColor = 'bg-red-500 text-white';

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
      isActive 
        ? 'bg-purple-accent/20 text-purple-light border border-purple-accent/30' 
        : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
    }`;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-navy-800 border border-slate-700 rounded-lg text-slate-300"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-navy-950/80 backdrop-blur-sm z-40"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar Navigation */}
      <nav 
        className={`fixed md:translate-x-0 inset-y-0 left-0 z-40 w-[240px] bg-navy-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8 text-white">
            <span className="text-2xl">🧹</span>
            <span className="font-bold text-lg tracking-tight">DeadTab Cleaner</span>
          </div>

          <div className="space-y-2 flex-1">
            <NavLink to="/dashboard" onClick={closeMenu} className={navItemClass}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Dashboard</span>
              {currentScore > 0 && (
                <span className={`ml-auto text-xs px-2.5 py-0.5 rounded-full font-bold ${scoreColor}`}>
                  {currentScore}
                </span>
              )}
            </NavLink>

            <NavLink to="/archive" onClick={closeMenu} className={navItemClass}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Archive</span>
            </NavLink>

            <NavLink to="/settings" onClick={closeMenu} className={navItemClass}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </NavLink>
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800">
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 min-h-[44px] w-full rounded-lg font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
    </>
  );
}
