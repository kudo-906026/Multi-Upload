import React from 'react';
import { Video, Sliders, History, Settings, Youtube, Instagram, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { PlatformAuthStatus } from '@shared/types';

interface HeaderProps {
  activeTab: 'create' | 'presets' | 'queue' | 'settings';
  setActiveTab: (tab: 'create' | 'presets' | 'queue' | 'settings') => void;
  authStatus: PlatformAuthStatus | null;
  activeJobsCount: number;
  onRefreshAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  authStatus,
  activeJobsCount,
  onRefreshAuth,
}) => {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('create')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  OmniPost
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">YouTube & Instagram Reels Publisher</p>
            </div>
          </div>

          {/* Platform Status Badges */}
          <div className="hidden md:flex items-center space-x-2">
            {/* YouTube Auth Badge */}
            <div
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                authStatus?.youtube.authenticated
                  ? 'bg-red-950/40 border border-red-800/60 text-red-300 hover:bg-red-950/60'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Youtube className="w-3.5 h-3.5 text-red-500" />
              <span>{authStatus?.youtube.authenticated ? 'YouTube Connected' : 'YouTube (Test Mode)'}</span>
              {authStatus?.youtube.authenticated ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3 h-3 text-amber-400" />
              )}
            </div>

            {/* Instagram Auth Badge */}
            <div
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                authStatus?.instagram.authenticated
                  ? 'bg-pink-950/40 border border-pink-800/60 text-pink-300 hover:bg-pink-950/60'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Instagram className="w-3.5 h-3.5 text-pink-500" />
              <span>
                {authStatus?.instagram.authenticated
                  ? `IG Reels (${authStatus.instagram.tokenDaysRemaining}d)`
                  : 'IG Reels (Test Mode)'}
              </span>
              {authStatus?.instagram.authenticated ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3 h-3 text-amber-400" />
              )}
            </div>

            <button
              onClick={onRefreshAuth}
              title="Refresh platform credentials status"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'create'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('presets')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'presets'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Presets</span>
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`relative flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'queue'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Queue</span>
              {activeJobsCount > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-pink-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
                  {activeJobsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all ${
                activeTab === 'settings' ? 'bg-slate-800 text-white' : ''
              }`}
              title="API & Accounts Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
