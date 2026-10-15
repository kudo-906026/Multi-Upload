import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  LogOut,
  Download,
  User as UserIcon,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { PlatformAuthStatus, UserProfile, AIUsageQuota } from '@shared/types';
import { TabId } from './BottomTabBar';

interface HeaderProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  authStatus: PlatformAuthStatus | null;
  activeJobsCount: number;
  user?: UserProfile | null;
  aiQuota?: AIUsageQuota | null;
  onRefreshAuth: () => void;
  onOpenDownloadModal: () => void;
  onLogout: () => void;
  isPwaInstallable: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  authStatus,
  user,
  aiQuota,
  onOpenDownloadModal,
  onLogout,
  isPwaInstallable,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const ytConnected = (authStatus?.youtube.accounts?.length || 0) > 0;
  const igConnected = (authStatus?.instagram.accounts?.length || 0) > 0;

  const remainingQuota = aiQuota
    ? Math.max(0, (aiQuota.dailyLimit || 20) - (aiQuota.analyzeUsed || 0))
    : null;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          onClick={() => setActiveTab('create')}
          className="flex items-center space-x-2.5 cursor-pointer select-none group"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-pink-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <span className="text-base sm:text-lg">⚡</span>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                OmniPost
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 font-semibold border border-indigo-500/25">
                Studio
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls on the Right */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* AI Quota Pill (if available) */}
          {remainingQuota !== null && (
            <div
              className="hidden xs:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-300"
              title={`${remainingQuota} AI analyses remaining today (resets at 00:00 UTC)`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{remainingQuota} Left</span>
            </div>
          )}

          {/* Presets Quick Action */}
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
              activeTab === 'presets'
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
            title="Custom Hashtags & Publishing Presets"
          >
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Presets</span>
          </button>

          {/* Download App / PWA Install Button */}
          <button
            type="button"
            onClick={onOpenDownloadModal}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition-all"
            title="Download Android APK or Install PWA"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">{isPwaInstallable ? 'Install' : 'App'}</span>
          </button>

          {/* User Profile & Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 p-3 space-y-3 animate-fade-in text-xs">
                  {/* User Email */}
                  <div className="border-b border-slate-800 pb-2.5 px-1">
                    <p className="text-[11px] text-slate-400">Signed in as</p>
                    <p className="font-semibold text-white truncate text-xs mt-0.5">
                      {user?.email || 'User'}
                    </p>
                  </div>

                  {/* Channel Connection Quick Indicators */}
                  <div className="space-y-1.5 px-1">
                    <div
                      onClick={() => {
                        setActiveTab('accounts');
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center justify-between text-slate-300 py-1 cursor-pointer hover:text-white transition-colors"
                    >
                      <span>YouTube Channel</span>
                      {ytConnected ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                          <AlertCircle className="w-3 h-3" /> Not linked
                        </span>
                      )}
                    </div>

                    <div
                      onClick={() => {
                        setActiveTab('accounts');
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center justify-between text-slate-300 py-1 cursor-pointer hover:text-white transition-colors"
                    >
                      <span>Instagram Account</span>
                      {igConnected ? (
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                          <AlertCircle className="w-3 h-3" /> Not linked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Logout Button */}
                  <div className="border-t border-slate-800 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-900/50 flex items-center justify-center space-x-1.5 transition-colors font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
