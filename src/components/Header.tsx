import React, { useState } from 'react';
import {
  Video,
  Flame,
  Sliders,
  History,
  Settings,
  Youtube,
  Instagram,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  DownloadCloud,
  Users,
  Menu,
  X,
} from 'lucide-react';
import { PlatformAuthStatus } from '@shared/types';

interface HeaderProps {
  activeTab: 'create' | 'trends' | 'presets' | 'queue' | 'accounts' | 'settings';
  setActiveTab: (tab: 'create' | 'trends' | 'presets' | 'queue' | 'accounts' | 'settings') => void;
  authStatus: PlatformAuthStatus | null;
  activeJobsCount: number;
  onRefreshAuth: () => void;
  onOpenDownloadModal: () => void;
  isPwaInstallable: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  authStatus,
  activeJobsCount,
  onRefreshAuth,
  onOpenDownloadModal,
  isPwaInstallable,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const youtubeCount = authStatus?.youtube.accounts?.length || 0;
  const instagramCount = authStatus?.instagram.accounts?.length || 0;
  const totalAccounts = youtubeCount + instagramCount;

  const handleTabClick = (tab: 'create' | 'trends' | 'presets' | 'queue' | 'accounts' | 'settings') => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full max-w-full border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-14 sm:h-16 gap-1.5 sm:gap-4 py-1 sm:py-0">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center space-x-2 sm:space-x-3 cursor-pointer shrink-0 mr-1 sm:mr-0"
            onClick={() => handleTabClick('create')}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <span className="text-base sm:text-xl">⚡</span>
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center">
                <span className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  OmniPost
                </span>
                {/* PRO badge inline on >= sm screens with generous spacing */}
                <span className="hidden sm:inline-flex ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold tracking-wide">
                  PRO
                </span>
              </div>
              {/* PRO badge placed under the logo/name on mobile (< 640px) to prevent any overlap */}
              <div className="flex items-center sm:hidden mt-0.5">
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold leading-tight">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">YouTube & Instagram Reels Publisher</p>
            </div>
          </div>

          {/* Desktop Platform Status Badges */}
          <div className="hidden lg:flex items-center space-x-2 shrink-0">
            {/* YouTube Auth Badge */}
            <div
              onClick={() => handleTabClick('accounts')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                youtubeCount > 0
                  ? 'bg-red-950/40 border border-red-800/60 text-red-300 hover:bg-red-950/60'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Youtube className="w-3.5 h-3.5 text-red-500" />
              <span>{youtubeCount > 0 ? `${youtubeCount} YouTube ${youtubeCount === 1 ? 'Channel' : 'Channels'}` : 'Connect YouTube'}</span>
              {youtubeCount > 0 ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3 h-3 text-amber-400" />
              )}
            </div>

            {/* Instagram Auth Badge */}
            <div
              onClick={() => handleTabClick('accounts')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                instagramCount > 0
                  ? 'bg-pink-950/40 border border-pink-800/60 text-pink-300 hover:bg-pink-950/60'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Instagram className="w-3.5 h-3.5 text-pink-500" />
              <span>
                {instagramCount > 0
                  ? `${instagramCount} Instagram ${instagramCount === 1 ? 'Account' : 'Accounts'}`
                  : 'Connect Instagram'}
              </span>
              {instagramCount > 0 ? (
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

          {/* Navigation Bar */}
          <nav className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            {/* Studio Tab */}
            <button
              onClick={() => handleTabClick('create')}
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'create'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
              title="Studio"
            >
              <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden min-[380px]:inline">Studio</span>
            </button>

            {/* Trends Tab (Right next to Studio) */}
            <button
              onClick={() => handleTabClick('trends')}
              className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'trends'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
              title="Viral Trend Finder"
            >
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span className="hidden min-[380px]:inline">Trends</span>
            </button>

            {/* Accounts Tab (Desktop only in top nav, mobile via hamburger & bottom bar) */}
            <button
              onClick={() => handleTabClick('accounts')}
              className={`hidden sm:flex relative items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'accounts'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
              title="Connected Accounts"
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Accounts</span>
              {totalAccounts > 0 && (
                <span className="px-1 sm:px-1.5 py-0.2 rounded-full bg-slate-800 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                  {totalAccounts}
                </span>
              )}
            </button>

            {/* Presets Tab (Visible on desktop, inside hamburger on mobile) */}
            <button
              onClick={() => handleTabClick('presets')}
              className={`hidden sm:flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'presets'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Presets</span>
            </button>

            {/* Queue Tab (Icon-only on mobile under 640px) */}
            <button
              onClick={() => handleTabClick('queue')}
              className={`relative flex items-center space-x-1.5 p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'queue'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
              title="Publishing Queue"
            >
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Queue</span>
              {activeJobsCount > 0 && (
                <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-pink-500 text-white text-[9px] sm:text-[10px] flex items-center justify-center font-bold animate-pulse">
                  {activeJobsCount}
                </span>
              )}
            </button>

            {/* Settings Tab (Icon-only everywhere) */}
            <button
              onClick={() => handleTabClick('settings')}
              className={`p-1.5 sm:p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/70 transition-all ${
                activeTab === 'settings' ? 'bg-slate-800 text-white' : ''
              }`}
              title="API & Developer Settings"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* App / Download Button (Icon-only on mobile under 640px) */}
            <button
              onClick={onOpenDownloadModal}
              className="flex items-center space-x-1.5 p-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white hover:opacity-95 transition-all shadow-md shadow-orange-500/20 active:scale-95"
              title="Install PWA or Download Release Package"
            >
              <DownloadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline">Download App</span>
              <span className="hidden sm:inline md:hidden">App</span>
            </button>

            {/* Mobile Hamburger Toggle (under 640px) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="sm:hidden p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-all ml-0.5"
              title="Toggle Menu"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4 text-pink-400" /> : <Menu className="w-4 h-4" />}
            </button>
          </nav>
        </div>

        {/* Mobile Dropdown Menu (Under 640px) */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-800/80 py-3 space-y-2 animate-fade-in bg-slate-950/98 rounded-b-2xl px-1">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleTabClick('create')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'create'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Studio</span>
              </button>

              <button
                onClick={() => handleTabClick('trends')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'trends'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Trends</span>
              </button>

              <button
                onClick={() => handleTabClick('accounts')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'accounts'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Accounts ({totalAccounts})</span>
              </button>

              <button
                onClick={() => handleTabClick('presets')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'presets'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Presets</span>
              </button>

              <button
                onClick={() => handleTabClick('queue')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'queue'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Queue {activeJobsCount > 0 ? `(${activeJobsCount})` : ''}</span>
              </button>

              <button
                onClick={() => handleTabClick('settings')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold ${
                  activeTab === 'settings'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>API Settings</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenDownloadModal();
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-800/50"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Download App</span>
              </button>
            </div>

            {/* Mobile Platform Auth Status Badges */}
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between px-1 text-xs">
              <div
                onClick={() => handleTabClick('accounts')}
                className="flex items-center space-x-1.5 cursor-pointer text-slate-300"
              >
                <Youtube className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[11px]">{youtubeCount > 0 ? `${youtubeCount} YT` : 'No YT'}</span>
              </div>

              <div
                onClick={() => handleTabClick('accounts')}
                className="flex items-center space-x-1.5 cursor-pointer text-slate-300"
              >
                <Instagram className="w-3.5 h-3.5 text-pink-500" />
                <span className="text-[11px]">{instagramCount > 0 ? `${instagramCount} IG` : 'No IG'}</span>
              </div>

              <button
                onClick={onRefreshAuth}
                className="p-1 rounded text-slate-400 hover:text-white"
                title="Refresh Status"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
